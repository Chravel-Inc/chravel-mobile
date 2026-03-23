import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

// Keep the splash screen visible until the WebView signals ready.
SplashScreen.preventAutoHideAsync();

// Allowed origins for in-WebView navigation.
// Everything else opens in the system browser.
const ALLOWED_ORIGINS = [WEB_APP_URL, "about:", "data:"];

const ALLOWED_HOSTS = [
  "accounts.google.com",
  "appleid.apple.com",
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
    // Cold start: check if app was opened via a link.
    getInitialURL().then((path) => {
      if (path) navigateWebView(path);
    });

    // Warm start: listen for links while app is running.
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
        await SplashScreen.hideAsync();
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

      // Always allow subresource loads (iframes, scripts, Stripe, Maps, etc.)
      if (request.isTopFrame === false) {
        return true;
      }

      // Allow top-level navigation within chravel.app and safe schemes.
      if (ALLOWED_ORIGINS.some((origin) => url.startsWith(origin))) {
        return true;
      }

      // Allow OAuth flows to complete inside the WebView.
      try {
        const host = new URL(url).hostname;
        if (ALLOWED_HOSTS.some((h) => host.endsWith(h))) {
          return true;
        }
      } catch {
        return false;
      }

      // Everything else opens in the system browser.
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
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <WebView
          ref={webViewRef}
          source={{ uri: `${WEB_APP_URL}/auth` }}
          style={styles.webview}
          injectedJavaScriptBeforeContentLoaded={buildInjectedJS(Platform.OS)}
          onMessage={handleMessage}
          applicationNameForUserAgent={NATIVE_USER_AGENT_SUFFIX}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mediaCapturePermissionGrantType="grant"
          geolocationEnabled={true}
          sharedCookiesEnabled={true}
          domStorageEnabled={true}
          onShouldStartLoadWithRequest={shouldLoadRequest}
          onLoadEnd={() => {
            // Hide loading overlay once the page finishes loading.
            // Later, the web app bridge adapter can send { type: "ready" }
            // for more precise control (e.g. after auth hydration).
            setIsLoading(false);
            SplashScreen.hideAsync();
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
      </SafeAreaView>
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
