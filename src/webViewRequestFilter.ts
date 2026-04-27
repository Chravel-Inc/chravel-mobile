const ALLOWED_ORIGINS = [
  "https://chravel.app",
  "https://www.chravel.app",
  "about:",
  "data:",
];

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

export function evaluateWebViewRequestPolicy({
  url,
  isTopFrame,
  platformOS,
}: RequestPolicyInput): RequestPolicyResult {
  if (isTopFrame === false) {
    return { allowInWebView: true };
  }

  if (ALLOWED_ORIGINS_REGEX.test(url)) {
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
