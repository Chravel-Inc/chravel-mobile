/**
 * WebView ↔ Native bridge protocol.
 *
 * The WebView sends JSON messages via window.ReactNativeWebView.postMessage().
 * The native shell handles them in onMessage and can reply by injecting JS.
 *
 * To add a new action:
 * 1. Add a type to BridgeMessage
 * 2. Handle it in the switch inside App.tsx onMessage
 * 3. (Optional) add a response event the web app listens for
 */

// ── Web → Native messages ──────────────────────────────────────────

export type BridgeMessage =
  | { type: "haptic"; style: HapticStyle }
  | { type: "browser:open"; url: string; presentationStyle?: "fullscreen" | "pageSheet" | "formSheet" | "popover" }
  | { type: "push:register" }
  | { type: "push:unregister" }
  | { type: "revenuecat:purchase"; packageId: string }
  | { type: "revenuecat:restore" }
  | { type: "revenuecat:getCustomerInfo" }
  | { type: "share"; text?: string; url?: string; title?: string }
  | { type: "revenuecat:identify"; userId: string }
  | { type: "ready" } // web app signals it has loaded
  // Voice bridge messages (native audio I/O for Gemini Live)
  | { type: "voice:request-permission" }
  | { type: "voice:start-capture" }
  | { type: "voice:stop-capture" }
  | { type: "voice:play-audio"; audio: string; sampleRate?: number }
  | { type: "voice:flush-playback" };

export type HapticStyle =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

// ── Native → Web events (injected via webViewRef.injectJavaScript) ─

/**
 * Helper to build a JS string that dispatches a CustomEvent on the
 * web app's window. The web app listens with:
 *   window.addEventListener('chravel:push-token', (e) => e.detail.token)
 */
export function buildWebEvent(name: string, detail: Record<string, unknown>): string {
  const payload = JSON.stringify(detail);
  // The trailing `true;` prevents the WebView from navigating.
  return `window.dispatchEvent(new CustomEvent('${name}', { detail: ${payload} })); true;`;
}

/**
 * JS injected before the page loads to expose the native bridge.
 * The web app can check `window.ChravelNative` to detect it's
 * inside the Expo shell (as opposed to Capacitor or plain browser).
 */
export function buildInjectedJS(platform: string, bottomInset: number = 0, isTablet: boolean = false): string {
  return `
    window.Capacitor = window.Capacitor || {};
    window.Capacitor.isNativePlatform = function() { return true; };
    window.Capacitor.Plugins = window.Capacitor.Plugins || {};
    window.Capacitor.Plugins.Browser = {
      open: function(options) {
        var payload = {
          type: 'browser:open',
          url: options && options.url ? String(options.url) : '',
          presentationStyle: options && options.presentationStyle ? String(options.presentationStyle) : undefined
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        return Promise.resolve();
      },
      close: function() {
        return Promise.resolve();
      }
    };
    console.log('Capacitor Browser available:', !!window.Capacitor?.Plugins?.Browser);

    window.ChravelNative = {
      platform: "${platform}",
      isNative: true,
      version: "1.0.0",
      isTablet: ${isTablet},
    };

    // ── Native Audio API for Gemini Live voice ──────────────────
    // The web app can check window.ChravelNativeAudio.isAvailable
    // and route audio I/O through the native bridge instead of
    // Web Audio API (which is unreliable in iOS WKWebView).
    window.ChravelNativeAudio = {
      isAvailable: true,
      requestPermission: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'voice:request-permission'
        }));
      },
      startCapture: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'voice:start-capture'
        }));
      },
      stopCapture: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'voice:stop-capture'
        }));
      },
      playAudio: function(base64Pcm16, sampleRate) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'voice:play-audio',
          audio: base64Pcm16,
          sampleRate: sampleRate || 24000
        }));
      },
      flushPlayback: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'voice:flush-playback'
        }));
      }
    };

    // Add bottom safe area spacing for iOS home indicator.
    (function() {
      var style = document.createElement('style');
      var bottomPadding = Math.max(${bottomInset}, 0);
      // Fallback for older devices/simulators where inset might be 0 but we want some padding
      if (bottomPadding === 0 && "${platform}" === "ios") bottomPadding = ${isTablet} ? 20 : 34;
      style.textContent = [
        '#root { padding-bottom: ' + bottomPadding + 'px !important; }',
        'html { padding-bottom: ' + bottomPadding + 'px !important; }',
      ].join('\\n');
      document.head.appendChild(style);
    })();

    // Improve mobile tab UX (overflow clipping) and nudge data refresh
    // after pin/unpin actions so the Pinned view hydrates reliably.
    (function() {
      function makeTabRowsScrollable() {
        try {
          var nodes = document.querySelectorAll('nav, [role="tablist"], [data-testid*="tab"], [class*="tab"], [class*="segment"]');
          for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (!el || !el.children || el.children.length < 3) continue;
            if (el.scrollWidth <= el.clientWidth + 4) continue;

            el.style.overflowX = 'auto';
            el.style.overflowY = 'hidden';
            el.style.webkitOverflowScrolling = 'touch';
            el.style.scrollbarWidth = 'none';
            el.style.msOverflowStyle = 'none';
            if (!el.style.paddingBottom) el.style.paddingBottom = '2px';
          }
        } catch (error) {
          console.log('ChravelNative tab overflow patch error', error);
        }
      }

      function nudgePinnedHydration() {
        try {
          window.dispatchEvent(new Event('focus'));
          window.dispatchEvent(new Event('visibilitychange'));
          window.dispatchEvent(new Event('pageshow'));
          window.dispatchEvent(new Event('resize'));
          window.dispatchEvent(new CustomEvent('chravel:pinned-updated', { detail: { source: 'native-bridge' } }));
        } catch (error) {
          console.log('ChravelNative pinned hydration nudge error', error);
        }
      }

      function onRouteChange() {
        makeTabRowsScrollable();
        var href = String(window.location && window.location.href ? window.location.href : '').toLowerCase();
        if (href.indexOf('pinned') !== -1) {
          setTimeout(nudgePinnedHydration, 80);
        }
      }

      var observer = new MutationObserver(function(mutations) {
        makeTabRowsScrollable();
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (!node || node.nodeType !== 1) continue;
            var text = ((node.textContent || '') + ' ' + (((node).innerText) || '')).toLowerCase();
            if (text.indexOf('pinned successfully') !== -1 || text.indexOf('unpinned successfully') !== -1) {
              setTimeout(nudgePinnedHydration, 80);
              setTimeout(nudgePinnedHydration, 350);
            }
          }
        }
      });

      var pushState = history.pushState;
      history.pushState = function() {
        var result = pushState.apply(this, arguments);
        onRouteChange();
        return result;
      };

      var replaceState = history.replaceState;
      history.replaceState = function() {
        var result = replaceState.apply(this, arguments);
        onRouteChange();
        return result;
      };

      window.addEventListener('popstate', onRouteChange, true);
      window.addEventListener('resize', makeTabRowsScrollable, true);
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
      setTimeout(onRouteChange, 50);
      setTimeout(onRouteChange, 500);
      setTimeout(onRouteChange, 1200);
    })();

    window.dispatchEvent(new Event('chravel:native-ready'));
    true;
  `;
}

/**
 * Parse a raw postMessage string into a typed BridgeMessage.
 * Returns null for malformed payloads.
 */
export function parseBridgeMessage(raw: string): BridgeMessage | null {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || typeof data.type !== "string") {
      return null;
    }

    switch (data.type) {
      case "haptic":
        if (
          typeof data.style === "string" &&
          ["light", "medium", "heavy", "success", "warning", "error"].includes(
            data.style,
          )
        ) {
          return data as BridgeMessage;
        }
        return null;

      case "browser:open":
        if (typeof data.url === "string") {
          return data as BridgeMessage;
        }
        return null;

      case "push:register":
      case "push:unregister":
      case "revenuecat:restore":
      case "revenuecat:getCustomerInfo":
      case "ready":
      case "voice:request-permission":
      case "voice:start-capture":
      case "voice:stop-capture":
      case "voice:flush-playback":
        return data as BridgeMessage;

      case "revenuecat:purchase":
        if (typeof data.packageId === "string") {
          return data as BridgeMessage;
        }
        return null;

      case "revenuecat:identify":
        if (typeof data.userId === "string") {
          return data as BridgeMessage;
        }
        return null;

      case "share":
        if (
          (data.text === undefined || typeof data.text === "string") &&
          (data.url === undefined || typeof data.url === "string") &&
          (data.title === undefined || typeof data.title === "string")
        ) {
          return data as BridgeMessage;
        }
        return null;

      case "voice:play-audio":
        if (
          typeof data.audio === "string" &&
          (data.sampleRate === undefined || typeof data.sampleRate === "number")
        ) {
          return data as BridgeMessage;
        }
        return null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}
