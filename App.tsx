import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { Share } from "react-native";

import { WEB_APP_URL, NATIVE_USER_AGENT_SUFFIX } from "./src/constants";
import {
  buildInjectedJS,
  buildWebEvent,
  parseBridgeMessage,
} from "./src/bridge";
import {
  registerForPushNotifications,
  getNotificationDeepLink,
} from "./src/notifications";
import { triggerHaptic } from "./src/haptics";
import { getInitialURL, onDeepLink } from "./src/deepLinking";
import {
  configureRevenueCat,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
} from "./src/revenuecat";
import {
  isBiometricAvailable,
  getBiometricType,
  getBiometricLabel,
  authenticate,
  type BiometricType,
} from "./src/biometrics";
import { PushPrePrompt } from "./src/PushPrePrompt";

// Keep the splash screen visible until the app is ready.
SplashScreen.preventAutoHideAsync();

// Allowed origins for in-WebView navigation.
const ALLOWED_ORIGINS = [WEB_APP_URL, "about:", "data:"];

// Hosts that open in an in-app system browser (SFSafariViewController)
// for OAuth flows. Google blocks OAuth in embedded WebViews.
const OAUTH_HOSTS = ["accounts.google.com", "appleid.apple.com"];

// Hosts allowed for top-level navigation inside the WebView.
const ALLOWED_HOSTS = [
  "supabase.co",
  "js.stripe.com",
  "checkout.stripe.com",
  "api.stripe.com",
  "maps.googleapis.com",
  "maps.google.com",
];

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const oauthInProgress = useRef(false);

  // ── Biometric auth state ────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(true);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);
  const appState = useRef(AppState.currentState);

  // Check biometric availability on mount.
  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricsAvailable(available);

      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
        // Auto-prompt on launch.
        const success = await authenticate();
        if (success) {
          setIsLocked(false);
          setShowPushPrompt(true);
        }
      } else {
        // No biometrics — skip lock screen.
        setIsLocked(false);
        setShowPushPrompt(true);
      }

      await SplashScreen.hideAsync();
    })();
  }, []);

  // Re-lock when app returns from background.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active" &&
          biometricsAvailable
        ) {
          setIsLocked(true);
          const success = await authenticate();
          if (success) {
            setIsLocked(false);
          }
        }
        appState.current = nextState;
      }
    );

    return () => subscription.remove();
  }, [biometricsAvailable]);

  // ── Initialize native SDKs ────────────────────────────────────

  useEffect(() => {
    configureRevenueCat();
  }, []);

  // ── Deep linking: handle URLs that open the app ───────────────

  const navigateWebView = useCallback((path: string) => {
    const fullUrl = `${WEB_APP_URL}${path}`;
    webViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(fullUrl)}; true;`,
    );
  }, []);

  useEffect(() => {
    getInitialURL().then((path) => {
      if (path) navigateWebView(path);
    });

    const unsub = onDeepLink((path) => navigateWebView(path));
    return unsub;
  }, [navigateWebView]);

  // ── Push notifications: handle taps ───────────────────────────

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        const path = getNotificationDeepLink(data);
        if (path) navigateWebView(path);
      },
    );

    return () => subscription.remove();
  }, [navigateWebView]);

  // ── Bridge: handle messages from the web app ──────────────────

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    const message = parseBridgeMessage(event.nativeEvent.data);
    if (!message) return;

    switch (message.type) {
      case "ready":
        setIsLoading(false);
        break;

      case "haptic":
        await triggerHaptic(message.style);
        break;

      case "push:register": {
        const result = await registerForPushNotifications();
        webViewRef.current?.injectJavaScript(
          buildWebEvent("chravel:push-token", {
            token: result.token,
            error: result.error ?? null,
          }),
        );
        break;
      }

      case "push:unregister":
        break;

      case "revenuecat:purchase": {
        const result = await purchasePackage(message.packageId);
        webViewRef.current?.injectJavaScript(
          buildWebEvent("chravel:purchase-result", {
            success: result.success,
            error: result.error ?? null,
          }),
        );
        break;
      }

      case "revenuecat:restore": {
        const result = await restorePurchases();
        webViewRef.current?.injectJavaScript(
          buildWebEvent("chravel:restore-result", {
            success: result.success,
            error: result.error ?? null,
          }),
        );
        break;
      }

      case "revenuecat:getCustomerInfo": {
        const info = await getCustomerInfo();
        const activeEntitlements = info
          ? Object.keys(info.entitlements.active)
          : [];
        webViewRef.current?.injectJavaScript(
          buildWebEvent("chravel:customer-info", {
            entitlements: activeEntitlements,
          }),
        );
        break;
      }

      case "share": {
        try {
          await Share.share({
            message: message.text ?? "",
            url: message.url,
            title: message.title,
          });
        } catch {
          // User cancelled or share failed.
        }
        break;
      }
    }
  }, []);

  // ── URL filter: keep chravel.app in WebView, open rest externally ─

  const shouldLoadRequest = useCallback(
    (request: { url: string; isTopFrame?: boolean }) => {
      const url = request.url;

      if (request.isTopFrame === false) {
        return true;
      }

      if (ALLOWED_ORIGINS.some((origin) => url.startsWith(origin))) {
        return true;
      }

      try {
        const host = new URL(url).hostname;

        if (
          OAUTH_HOSTS.some((h) => host.endsWith(h)) ||
          ALLOWED_HOSTS.some((h) => host.endsWith(h))
        ) {
          return true;
        }
      } catch {
        return false;
      }

      Linking.openURL(url);
      return false;
    },
    [],
  );

  // ── Error / offline screen ────────────────────────────────────

  const handleRetry = useCallback(() => {
    setHasError(false);
    webViewRef.current?.reload();
  }, []);

  // ── Lock screen ───────────────────────────────────────────────

  const handleUnlock = useCallback(async () => {
    const success = await authenticate();
    if (success) {
      setIsLocked(false);
    }
  }, []);

  if (biometricsAvailable === null) {
    // Still checking biometric availability — show nothing (splash is visible).
    return null;
  }

  if (isLocked && biometricsAvailable) {
    const label = getBiometricLabel(biometricType);
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.lockContainer}>
          <StatusBar style="light" />
          <View style={styles.lockContent}>
            <Text style={styles.lockIcon}>
              {biometricType === "faceid" ? "\u{1F510}" : "\u{1F513}"}
            </Text>
            <Text style={styles.lockTitle}>Chravel</Text>
            <Text style={styles.lockSubtitle}>
              Unlock to access your trips
            </Text>
            <TouchableOpacity
              style={styles.unlockButton}
              onPress={handleUnlock}
            >
              <Text style={styles.unlockText}>
                Unlock with {label}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (showPushPrompt) {
    return (
      <SafeAreaProvider>
        <PushPrePrompt onComplete={() => setShowPushPrompt(false)} />
      </SafeAreaProvider>
    );
  }

  if (hasError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.errorContainer}>
          <StatusBar style="light" />
          <Text style={styles.errorTitle}>Can't reach Chravel</Text>
          <Text style={styles.errorBody}>
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ── Main render ───────────────────────────────────────────────

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />

        <WebView
          ref={webViewRef}
          source={{ uri: WEB_APP_URL }}
          style={styles.webview}
          injectedJavaScriptBeforeContentLoaded={buildInjectedJS(Platform.OS)}
          onMessage={handleMessage}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mediaCapturePermissionGrantType="grant"
          geolocationEnabled={true}
          sharedCookiesEnabled={true}
          domStorageEnabled={true}
          onShouldStartLoadWithRequest={shouldLoadRequest}
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onError={() => setHasError(true)}
          onHttpError={(syntheticEvent) => {
            const { statusCode } = syntheticEvent.nativeEvent;
            if (statusCode >= 500) setHasError(true);
          }}
          pullToRefreshEnabled={Platform.OS === "android"}
          allowsBackForwardNavigationGestures={true}
          bounces={true}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3A60D0" />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#191817",
  },
  webview: {
    flex: 1,
    backgroundColor: "#191817",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#191817",
    justifyContent: "center",
    alignItems: "center",
  },
  lockContainer: {
    flex: 1,
    backgroundColor: "#191817",
  },
  lockContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 24,
  },
  lockTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  lockSubtitle: {
    color: "#999999",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  unlockButton: {
    backgroundColor: "#3A60D0",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 220,
    alignItems: "center",
  },
  unlockText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#191817",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorBody: {
    color: "#999999",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#3A60D0",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
