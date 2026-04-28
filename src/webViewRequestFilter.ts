const ALLOWED_WEB_HOSTS = new Set(["chravel.app", "www.chravel.app"]);

const ALLOWED_HOSTS = [
  "supabase.co",
  "js.stripe.com",
  "checkout.stripe.com",
  "api.stripe.com",
  "maps.googleapis.com",
  "maps.google.com",
];

export interface RequestPolicyInput {
  url: string;
  isTopFrame?: boolean;
  platformOS: string;
}

export interface RequestPolicyResult {
  allowInWebView: boolean;
  externalUrlToOpen?: string;
  openInAppBrowser?: boolean;
}

function isAllowedChravelWebOrigin(url: string): boolean {
  if (url.startsWith("about:") || url.startsWith("data:")) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_WEB_HOSTS.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function evaluateWebViewRequestPolicy({
  url,
  isTopFrame,
  platformOS,
}: RequestPolicyInput): RequestPolicyResult {
  if (isTopFrame === false) {
    return { allowInWebView: true };
  }

  if (isAllowedChravelWebOrigin(url)) {
    return { allowInWebView: true };
  }

  const isOAuthURL =
    url.includes("accounts.google.com") ||
    url.includes("appleid.apple.com") ||
    (url.includes("supabase.co") &&
      (url.includes("provider=google") || url.includes("provider=apple")));

  if (isOAuthURL) {
    return {
      allowInWebView: false,
      externalUrlToOpen: url,
      openInAppBrowser: platformOS === "ios" || platformOS === "android",
    };
  }

  try {
    const host = new URL(url).hostname;
    if (ALLOWED_HOSTS.some((h) => host.endsWith(h))) {
      return { allowInWebView: true };
    }
  } catch {
    return { allowInWebView: false };
  }

  return {
    allowInWebView: false,
    externalUrlToOpen: url,
  };
}
