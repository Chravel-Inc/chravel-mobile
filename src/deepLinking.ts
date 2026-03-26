import * as Linking from "expo-linking";
import { WEB_APP_URL } from "./constants";

/**
 * Parse an incoming URL (universal link or custom scheme) into a
 * path the WebView should navigate to.
 *
 * Supported formats:
 *   chravel://trip/abc123          → /trip/abc123
 *   https://chravel.app/trip/abc   → /trip/abc
 */
export function parseDeepLinkUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === "chravel:") {
      // For custom schemes, URL parser treats the part after :// as
      // the hostname (e.g. chravel://auth-callback/123 → host="auth-callback").
      // Reconstruct the full path from hostname + pathname.
      const host = parsed.hostname || "";
      const pathname = parsed.pathname || "";
      const fullPath = host ? `/${host}${pathname}` : pathname;
      return fullPath + parsed.search + parsed.hash;
    }

    if (
      parsed.hostname === "chravel.app" ||
      parsed.hostname === "www.chravel.app"
    ) {
      return parsed.pathname + parsed.search + parsed.hash;
    }

    if (parsed.pathname.startsWith("/")) {
      return parsed.pathname + parsed.search;
    }

    return null;
  } catch {
    if (url.startsWith("chravel://")) {
      const path = url.replace("chravel://", "");
      return path.startsWith("/") ? path : `/${path}`;
    }
    return null;
  }
}

/**
 * Get the URL the app was cold-started with, if any.
 */
export async function getInitialURL(): Promise<string | null> {
  const url = await Linking.getInitialURL();
  if (!url) return null;
  return parseDeepLinkUrl(url);
}

/**
 * Subscribe to incoming deep links while the app is running.
 * Returns an unsubscribe function.
 */
export function onDeepLink(
  callback: (path: string) => void
): () => void {
  const subscription = Linking.addEventListener("url", (event) => {
    const path = parseDeepLinkUrl(event.url);
    if (path) callback(path);
  });
  return () => subscription.remove();
}
