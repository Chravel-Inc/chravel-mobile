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
  | { type: "push:register" }
  | { type: "push:unregister" }
  | { type: "revenuecat:purchase"; packageId: string }
  | { type: "revenuecat:restore" }
  | { type: "revenuecat:getCustomerInfo" }
  | { type: "share"; text?: string; url?: string; title?: string }
  | { type: "ready" }; // web app signals it has loaded

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
export function buildInjectedJS(platform: string): string {
  return `
    window.ChravelNative = {
      platform: "${platform}",
      isNative: true,
      version: "1.0.0",
    };
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
    if (data && typeof data.type === "string") {
      return data as BridgeMessage;
    }
    return null;
  } catch {
    return null;
  }
}
