import { evaluateWebViewRequestPolicy } from "../webViewRequestFilter";

describe("evaluateWebViewRequestPolicy", () => {
  it("keeps OAuth in WebView for native in-app contexts", () => {
    const oauthUrl =
      "https://abc.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fchravel.app%2Fauth-callback";

    const result = evaluateWebViewRequestPolicy({
      url: oauthUrl,
      platformOS: "ios",
      isTopFrame: true,
    });

    expect(result.allowInWebView).toBe(true);
    expect(result.externalUrlToOpen).toBeUndefined();
  });

  it("uses external open for non-native OAuth path", () => {
    const oauthUrl =
      "https://abc.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fchravel.app%2Fauth-callback";

    const result = evaluateWebViewRequestPolicy({
      url: oauthUrl,
      platformOS: "web",
      isTopFrame: true,
    });

    expect(result.allowInWebView).toBe(false);
    expect(result.externalUrlToOpen).toContain("chravel%3A%2F%2Fauth-callback%2F");
  });
});
