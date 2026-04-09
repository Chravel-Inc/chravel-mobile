import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WEB_APP_URL, NATIVE_USER_AGENT_SUFFIX, COLORS } from "./constants";
import { buildInjectedJS, buildWebEvent, parseBridgeMessage } from "./bridge";
import {
  registerForPushNotifications,
  getNotificationDeepLink,
} from "./notifications";
import { triggerHaptic } from "./haptics";
import { getInitialURL, onDeepLink } from "./deepLinking";
import {
  configureRevenueCat,
  identifyUser,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
} from "./revenuecat";
import { VoiceBridge, type VoiceBridgeMessage } from "./voiceBridge";

const ALLOWED_ORIGINS = [WEB_APP_URL, "about:", "data:"];

const ALLOWED_ORIGINS_REGEX = new RegExp(
  "^(?:" +
    ALLOWED_ORIGINS.map((o) =>
      o.replace(/[.*+?^\$\{\}()|[\]\\]/g, "\\$&"),
    ).join("|") +
    ")",
);

const ALLOWED_HOSTS = [
  "supabase.co",
  "js.stripe.com",
  "checkout.stripe.com",
  "api.stripe.com",
  "maps.googleapis.com",
  "maps.google.com",
];

interface ChravelWebViewProps {
  onError: () => void;
}

export function ChravelWebView({ onError }: ChravelWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const wasOnAuthRef = useRef(true); // WebView starts at /auth
  const currentUrlRef = useRef(`${WEB_APP_URL}/auth`);
  const isAuthRedirectRef = useRef(false); // true after OAuth deep link
  const oauthOpenedAtRef = useRef<number | null>(null);
  const voiceBridgeRef = useRef(new VoiceBridge());
  const isReadyRef = useRef(false);
  const initialUrlRef = useRef<string | null>(null);

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
    const fullUrl = `${WEB_APP_URL}${path}`;
    webViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(fullUrl)}; true;`,
    );
  }, []);

  /** Apply a deep-link path (OAuth callback vs in-app route). Used for live links and deferred cold-start / notification paths. */
  const handleIncomingPath = useCallback(
    (path: string) => {
      if (path.startsWith("/auth-callback")) {
        oauthOpenedAtRef.current = null;
        isAuthRedirectRef.current = true;
        setIsLoading(true);
        const hash = path.includes("#")
          ? path.substring(path.indexOf("#"))
          : "";
        if (hash) {
          // Inject the token hash into the current page (/auth) so
          // Supabase JS detects the session tokens without navigating.
          webViewRef.current?.injectJavaScript(
            `window.location.href = ${JSON.stringify(`${WEB_APP_URL}/auth${hash}`)}; true;`,
          );
        } else {
          // No hash — reload auth page to re-check session
          navigateWebView("/auth");
        }
        return;
      }
      navigateWebView(path);
    },
    [navigateWebView],
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

  // ── OAuth Safari return recovery ────────────────────────────
  // If the user returns from Safari without completing OAuth
  // (cancelled, closed, etc.), reset the loading state.

  useEffect(() => {
    let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && oauthOpenedAtRef.current) {
        const openedAt = oauthOpenedAtRef.current;
        recoveryTimer = setTimeout(() => {
          if (oauthOpenedAtRef.current === openedAt) {
            oauthOpenedAtRef.current = null;
            isAuthRedirectRef.current = false;
            setIsLoading(false);
            // OAuth cancelled — apply any non-callback deep link deferred during /auth.
            const pending = initialUrlRef.current;
            if (pending && !pending.startsWith("/auth-callback")) {
              initialUrlRef.current = null;
              handleIncomingPath(pending);
            }
          }
        }, 3000);
      }
    });
    return () => {
      if (recoveryTimer) clearTimeout(recoveryTimer);
      subscription.remove();
    };
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
      case "ready":
        // After OAuth redirect, keep overlay up until we leave /auth.
        // On normal load (no redirect), dismiss immediately.
        if (
          isAuthRedirectRef.current &&
          currentUrlRef.current.includes("/auth")
        ) {
          // Still processing tokens on /auth — wait
        } else {
          isAuthRedirectRef.current = false;
          setIsLoading(false);
        }
        isReadyRef.current = true;
        if (initialUrlRef.current) {
          const pending = initialUrlRef.current;
          const deferForOAuth =
            isAuthRedirectRef.current &&
            currentUrlRef.current.includes("/auth") &&
            !pending.startsWith("/auth-callback");
          if (deferForOAuth) {
            // Keep pending trip / push route until OAuth leaves /auth (see onNavigationStateChange).
          } else {
            initialUrlRef.current = null;
            handleIncomingPath(pending);
          }
        }
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
  }, [handleIncomingPath]);

  // ── URL filter ──────────────────────────────────────────────

  const shouldLoadRequest = useCallback(
    (request: { url: string; isTopFrame?: boolean }) => {
      const url = request.url;

      if (request.isTopFrame === false) {
        return true;
      }

      if (ALLOWED_ORIGINS_REGEX.test(url)) {
        return true;
      }

      // Intercept OAuth URLs — Google blocks sign-in inside embedded WebViews.
      // Check raw URL string first (catches redirects before hostname resolves).
      const isOAuthURL =
        url.includes("accounts.google.com") ||
        url.includes("appleid.apple.com") ||
        (url.includes("supabase.co") &&
          (url.includes("provider=google") || url.includes("provider=apple")));

      if (isOAuthURL) {
        // Rewrite the Supabase redirect_to so OAuth lands on our
        // custom scheme instead of loading chravel.app in the browser.
        let oauthUrl = url;
        if (url.includes("supabase.co") && url.includes("redirect_to=")) {
          const callbackUrl = `chravel://auth-callback/${Date.now()}`;
          oauthUrl = url.replace(
            /redirect_to=[^&]+/,
            `redirect_to=${encodeURIComponent(callbackUrl)}`,
          );
        }
        oauthOpenedAtRef.current = Date.now();
        Linking.openURL(oauthUrl);
        return false;
      }

      try {
        const host = new URL(url).hostname;
        if (ALLOWED_HOSTS.some((h) => host.endsWith(h))) {
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

  // ── Render ──────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <WebView
        ref={webViewRef}
        source={{ uri: `${WEB_APP_URL}/auth` }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={buildInjectedJS(Platform.OS, insets.bottom)}
        onMessage={handleMessage}
        userAgent={Platform.OS === "ios" ? `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 ${NATIVE_USER_AGENT_SUFFIX}` : undefined}
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
          const onAuth = url.includes("/auth");

          if (wasOnAuthRef.current && !onAuth && url.startsWith(WEB_APP_URL)) {
            if (isAuthRedirectRef.current) {
              // OAuth just completed — dismiss overlay now that we've
              // left /auth and landed on the authenticated page.
              isAuthRedirectRef.current = false;
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
          setTimeout(() => setIsLoading(false), 5000);
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
