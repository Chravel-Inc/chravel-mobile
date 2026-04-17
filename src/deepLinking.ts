import * as Linking from "expo-linking";
import { WEB_APP_URL } from "./constants";
import { isAuthScreenUrl } from "./authUrl";

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

/** Single source of truth for native shell auth bootstrap route. */
export const AUTH_LAUNCH_PATH = "/auth";

/**
 * Build a web URL for the in-app WebView.
 * Always appends app_context=native while preserving path/query/hash.
 */
export function buildWebViewLaunchUrl(path: string): string {
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : AUTH_LAUNCH_PATH;
  const target = new URL(normalizedPath, WEB_APP_URL);
  target.searchParams.set("app_context", "native");
  return target.toString();
}

/** Native shell launch target contract: /auth?app_context=native. */
export function buildNativeAuthLaunchUrl(): string {
  return buildWebViewLaunchUrl(AUTH_LAUNCH_PATH);
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

export { isAuthScreenUrl };
