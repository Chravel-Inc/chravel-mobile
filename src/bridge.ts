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
      var TAB_KEYWORDS = ['messages', 'broadcast', 'pinned', 'search', 'channel', 'chat', 'concierge', 'media', 'calendar'];

      function textIncludesAny(value, keywords) {
        var text = String(value || '').toLowerCase();
        for (var i = 0; i < keywords.length; i++) {
          if (text.indexOf(keywords[i]) !== -1) return true;
        }
        return false;
      }

      function looksLikeChatTabRow(el) {
        if (!el || !el.children || el.children.length < 3) return false;
        var text = String(el.textContent || '').toLowerCase();
        return textIncludesAny(text, TAB_KEYWORDS);
      }

      function patchScrollableRow(el) {
        if (!el || el.getAttribute('data-chravel-scroll-patched') === '1') return;

        el.style.overflowX = 'auto';
        el.style.overflowY = 'hidden';
        el.style.webkitOverflowScrolling = 'touch';
        el.style.scrollbarWidth = 'none';
        el.style.msOverflowStyle = 'none';
        el.style.touchAction = 'pan-x';
        el.style.flexWrap = 'nowrap';
        if (!el.style.paddingBottom) el.style.paddingBottom = '2px';

        for (var c = 0; c < el.children.length; c++) {
          var child = el.children[c];
          if (!child || !child.style) continue;
          child.style.flexShrink = '0';
        }

        el.setAttribute('data-chravel-scroll-patched', '1');
      }

      function makeTabRowsScrollable() {
        try {
          var nodes = document.querySelectorAll('nav, [role="tablist"], [data-testid*="tab"], [class*="tab"], [class*="segment"]');
          for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (!el || !el.children || el.children.length < 3) continue;
            var isOverflowing = el.scrollWidth > el.clientWidth + 4;
            if (!isOverflowing && !looksLikeChatTabRow(el)) continue;
            patchScrollableRow(el);
          }
        } catch (error) {
          console.log('ChravelNative tab overflow patch error', error);
        }
      }

      function nudgePinnedHydration(source) {
        try {
          window.dispatchEvent(new Event('focus'));
          window.dispatchEvent(new Event('visibilitychange'));
          window.dispatchEvent(new Event('pageshow'));
          window.dispatchEvent(new Event('resize'));
          window.dispatchEvent(new CustomEvent('chravel:pinned-updated', { detail: { source: source || 'native-bridge' } }));
        } catch (error) {
          console.log('ChravelNative pinned hydration nudge error', error);
        }
      }

      function schedulePinnedHydration(source) {
        nudgePinnedHydration(source);
        setTimeout(function() { nudgePinnedHydration(source); }, 60);
        setTimeout(function() { nudgePinnedHydration(source); }, 220);
      }

      function maybePinnedMutation(url, body) {
        var lowerUrl = String(url || '').toLowerCase();
        var lowerBody = String(body || '').toLowerCase();
        return lowerUrl.indexOf('pin') !== -1 || lowerBody.indexOf('pin') !== -1 || lowerBody.indexOf('pinned') !== -1;
      }

      function wireNetworkPinnedSignals() {
        try {
          var nativeFetch = window.fetch;
          if (typeof nativeFetch === 'function' && !nativeFetch.__chravelPinnedPatched) {
            var wrappedFetch = function() {
              var url = arguments[0];
              var options = arguments[1] || {};
              var body = options && options.body ? options.body : '';
              return nativeFetch.apply(this, arguments).then(function(response) {
                if (response && response.ok && maybePinnedMutation(url, body)) {
                  schedulePinnedHydration('fetch');
                }
                return response;
              });
            };
            wrappedFetch.__chravelPinnedPatched = true;
            window.fetch = wrappedFetch;
          }

          var xhrOpen = XMLHttpRequest.prototype.open;
          var xhrSend = XMLHttpRequest.prototype.send;
          if (!xhrOpen.__chravelPinnedPatched) {
            XMLHttpRequest.prototype.open = function(method, url) {
              this.__chravelUrl = url;
              return xhrOpen.apply(this, arguments);
            };
            XMLHttpRequest.prototype.open.__chravelPinnedPatched = true;
          }
          if (!xhrSend.__chravelPinnedPatched) {
            XMLHttpRequest.prototype.send = function(body) {
              this.__chravelBody = body;
              this.addEventListener('load', function() {
                if (this.status >= 200 && this.status < 300 && maybePinnedMutation(this.__chravelUrl, this.__chravelBody)) {
                  schedulePinnedHydration('xhr');
                }
              });
              return xhrSend.apply(this, arguments);
            };
            XMLHttpRequest.prototype.send.__chravelPinnedPatched = true;
          }
        } catch (error) {
          console.log('ChravelNative pinned network patch error', error);
        }
      }

      function wirePinnedTabSignals() {
        document.addEventListener('click', function(event) {
          var target = event && event.target;
          if (!target) return;
          var text = '';
          var node = target;
          for (var i = 0; i < 4 && node; i++) {
            text += ' ' + String(node.textContent || '');
            node = node.parentElement;
          }
          var lower = text.toLowerCase();
          if (lower.indexOf('pinned') !== -1 || lower.indexOf('pin message') !== -1 || lower.indexOf('unpin') !== -1) {
            schedulePinnedHydration('click');
          }
        }, true);
      }

      function onRouteChange() {
        makeTabRowsScrollable();
        var href = String(window.location && window.location.href ? window.location.href : '').toLowerCase();
        if (href.indexOf('pinned') !== -1) {
          schedulePinnedHydration('route');
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
              schedulePinnedHydration('toast');
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

      wireNetworkPinnedSignals();
      wirePinnedTabSignals();
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
