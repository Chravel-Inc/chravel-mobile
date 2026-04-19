import { evaluateWebViewRequestPolicy } from "../webViewRequestFilter";

describe("evaluateWebViewRequestPolicy", () => {
  it("routes OAuth to in-app browser for native in-app contexts", () => {
    const oauthUrl =
      "https://abc.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fchravel.app%2Fauth-callback";

    const result = evaluateWebViewRequestPolicy({
      url: oauthUrl,
      platformOS: "ios",
      isTopFrame: true,
    });

    expect(result.allowInWebView).toBe(false);
    expect(result.externalUrlToOpen).toBe(oauthUrl);
    expect(result.openInAppBrowser).toBe(true);
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
    expect(result.externalUrlToOpen).toBe(oauthUrl);
    expect(result.openInAppBrowser).toBe(false);
  });
});
