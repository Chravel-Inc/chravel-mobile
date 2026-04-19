import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WEB_APP_URL, NATIVE_USER_AGENT_SUFFIX, COLORS, IS_TABLET } from "./constants";
import { buildInjectedJS, buildWebEvent, parseBridgeMessage } from "./bridge";
import {
  registerForPushNotifications,
  getNotificationDeepLink,
} from "./notifications";
import { triggerHaptic } from "./haptics";
import {
  buildWebViewLaunchUrl,
  buildNativeAuthLaunchUrl,
  getInitialURL,
  onDeepLink,
  isAuthScreenUrl,
} from "./deepLinking";
import {
  configureRevenueCat,
  identifyUser,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
} from "./revenuecat";
import { VoiceBridge, type VoiceBridgeMessage } from "./voiceBridge";
import { evaluateWebViewRequestPolicy } from "./webViewRequestFilter";
import { evaluateReadyDecision } from "./authRouting";

interface ChravelWebViewProps {
  onError: () => void;
}

export function ChravelWebView({ onError }: ChravelWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const wasOnAuthRef = useRef(true); // WebView starts at /auth
  const currentUrlRef = useRef(buildNativeAuthLaunchUrl());
  const isAuthRedirectRef = useRef(false); // true after OAuth deep link
  const voiceBridgeRef = useRef(new VoiceBridge());
  const isReadyRef = useRef(false);
  const initialUrlRef = useRef<string | null>(null);
  const loadingHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadingFallbackTimer = useCallback(() => {
    if (loadingHideTimerRef.current !== null) {
      clearTimeout(loadingHideTimerRef.current);
      loadingHideTimerRef.current = null;
    }
  }, []);

  const scheduleLoadingFallback = useCallback(() => {
    clearLoadingFallbackTimer();
    loadingHideTimerRef.current = setTimeout(() => {
      loadingHideTimerRef.current = null;
      setIsLoading(false);
    }, 5000);
  }, [clearLoadingFallbackTimer]);

  useEffect(() => () => clearLoadingFallbackTimer(), [clearLoadingFallbackTimer]);

  // ── Initialize native SDKs ──────────────────────────────────

  useEffect(() => {
    configureRevenueCat();
  }, []);

  // ── Voice bridge lifecycle ────────────────────────────────────

  useEffect(() => {
    return () => {
      voiceBridgeRef.current.dispose();
    };
  }, []);

  // ── Deep linking ────────────────────────────────────────────

  const navigateWebView = useCallback((path: string) => {
    const fullUrl = buildWebViewLaunchUrl(path);
    webViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(fullUrl)}; true;`,
    );
  }, []);

  /** Apply a deep-link path (OAuth callback vs in-app route). Used for live links and deferred cold-start / notification paths. */
  const handleIncomingPath = useCallback(
    (path: string) => {
      if (path.startsWith("/auth-callback")) {
        isAuthRedirectRef.current = true;
        clearLoadingFallbackTimer();
        setIsLoading(true);
        void WebBrowser.dismissBrowser();
        navigateWebView(path);
        return;
      }
      navigateWebView(path);
    },
    [navigateWebView, clearLoadingFallbackTimer],
  );

  useEffect(() => {
    getInitialURL().then((path) => {
      if (!path) return;
      if (isReadyRef.current) {
        handleIncomingPath(path);
      } else {
        initialUrlRef.current = path;
      }
    });

    const unsub = onDeepLink((path) => {
      if (isReadyRef.current) {
        handleIncomingPath(path);
      } else {
        initialUrlRef.current = path;
      }
    });
    return unsub;
  }, [handleIncomingPath]);

  // ── Push notification taps ──────────────────────────────────

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        const path = getNotificationDeepLink(data);
        if (path) {
          if (isReadyRef.current) {
            handleIncomingPath(path);
          } else {
            initialUrlRef.current = path;
          }
        }
      },
    );

    return () => subscription.remove();
  }, [handleIncomingPath]);

  // ── Bridge message handler ──────────────────────────────────

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    const message = parseBridgeMessage(event.nativeEvent.data);
    if (!message) return;

    switch (message.type) {
      case "ready": {
        clearLoadingFallbackTimer();
        const decision = evaluateReadyDecision({
          isAuthRedirect: isAuthRedirectRef.current,
          currentUrl: currentUrlRef.current,
          pendingPath: initialUrlRef.current,
        });

        if (decision.keepLoadingOverlay) {
          scheduleLoadingFallback();
        } else {
          isAuthRedirectRef.current = false;
          setIsLoading(false);
        }

        isReadyRef.current = true;
        if (decision.applyPathNow) {
          initialUrlRef.current = null;
          handleIncomingPath(decision.applyPathNow);
        }
        break;
      }

      case "haptic":
        await triggerHaptic(message.style);
        break;

      case "browser:open":
        if (message.url) {
          await WebBrowser.openBrowserAsync(message.url, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,
          });
        }
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
        webViewRef.current?.injectJavaScript(
          buildWebEvent("chravel:push-unregistered", { success: true }),
        );
        break;

      case "revenuecat:identify":
        await identifyUser(message.userId);
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

      // Voice bridge messages
      case "voice:request-permission":
      case "voice:start-capture":
      case "voice:stop-capture":
      case "voice:play-audio":
      case "voice:flush-playback": {
        const bridge = voiceBridgeRef.current;
        // Lazily attach the sendEvent function so the bridge can
        // inject JS events back into the WebView.
        bridge.attach((eventName, detail) => {
          webViewRef.current?.injectJavaScript(
            buildWebEvent(eventName, detail),
          );
        });
        await bridge.handle(message as VoiceBridgeMessage);
        break;
      }
    }
  }, [handleIncomingPath, clearLoadingFallbackTimer, scheduleLoadingFallback]);

  // ── URL filter ──────────────────────────────────────────────

  const shouldLoadRequest = useCallback(
    (request: { url: string; isTopFrame?: boolean }) => {
      const decision = evaluateWebViewRequestPolicy({
        url: request.url,
        isTopFrame: request.isTopFrame,
        platformOS: Platform.OS,
      });

      if (decision.externalUrlToOpen) {
        if (decision.openInAppBrowser) {
          void WebBrowser.openBrowserAsync(decision.externalUrlToOpen, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,
          });
        } else {
          Linking.openURL(decision.externalUrlToOpen);
        }
      }

      return decision.allowInWebView;
    },
    [],
  );

  // ── Render ──────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <WebView
        ref={webViewRef}
        source={{ uri: buildNativeAuthLaunchUrl() }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={buildInjectedJS(Platform.OS, insets.bottom, IS_TABLET)}
        onMessage={handleMessage}
        userAgent={Platform.OS === "ios"
          ? IS_TABLET
            ? `Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1 ${NATIVE_USER_AGENT_SUFFIX}`
            : `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 ${NATIVE_USER_AGENT_SUFFIX}`
          : undefined}
        applicationNameForUserAgent={Platform.OS === "android" ? NATIVE_USER_AGENT_SUFFIX : undefined}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mediaCapturePermissionGrantType="grant"
        geolocationEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        domStorageEnabled={true}
        javaScriptCanOpenWindowsAutomatically={true}
        onShouldStartLoadWithRequest={(request) => shouldLoadRequest(request)}
        onNavigationStateChange={(navState) => {
          const url = navState.url ?? "";
          currentUrlRef.current = url;
          const onAuth = isAuthScreenUrl(url);

          if (wasOnAuthRef.current && !onAuth && url.startsWith(WEB_APP_URL)) {
            if (isAuthRedirectRef.current) {
              // OAuth just completed — dismiss overlay now that we've
              // left /auth and landed on the authenticated page.
              isAuthRedirectRef.current = false;
              clearLoadingFallbackTimer();
              setIsLoading(false);
            }
            // Apply any deep link deferred while OAuth was finishing on /auth.
            if (initialUrlRef.current) {
              const pending = initialUrlRef.current;
              initialUrlRef.current = null;
              handleIncomingPath(pending);
            }
          }

          wasOnAuthRef.current = onAuth;
        }}
        onLoadEnd={() => {
          // Don't hide the overlay here — wait for the "ready" bridge
          // message from the web app (sent after auth hydration).
          // Fallback: hide after 5 seconds if the signal never arrives.
          // Replace any prior fallback so stacked loads / OAuth cannot fire stale timers.
          scheduleLoadingFallback();
        }}
        onError={() => onError()}
        onHttpError={(syntheticEvent) => {
          const { statusCode } = syntheticEvent.nativeEvent;
          if (statusCode >= 500) onError();
        }}
        onContentProcessDidTerminate={() => {
          webViewRef.current?.reload();
        }}
        pullToRefreshEnabled={Platform.OS === "android"}
        allowsBackForwardNavigationGestures={true}
        bounces={true}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.brandBlue} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
