import { evaluateWebViewRequestPolicy } from "../webViewRequestFilter";
import { evaluateReadyDecision, resolveAuthSurface } from "../authRouting";

describe("platform smoke scenarios", () => {
  it("native/app path routes OAuth to in-app browser and uses auth modal", () => {
    const oauthDecision = evaluateWebViewRequestPolicy({
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      platformOS: "android",
      isTopFrame: true,
    });
    const surface = resolveAuthSurface("native");

    expect(oauthDecision.allowInWebView).toBe(false);
    expect(oauthDecision.openInAppBrowser).toBe(true);
    expect(surface).toBe("auth-modal");
  });

  it("pwa path resolves to auth modal", () => {
    expect(resolveAuthSurface("pwa")).toBe("auth-modal");
  });

  it("browser path routes to marketing and resolves deferred route after auth", () => {
    const surface = resolveAuthSurface("browser");
    const readyDecision = evaluateReadyDecision({
      isAuthRedirect: true,
      currentUrl: "https://chravel.app/home",
      pendingPath: "/trip/xyz",
    });

    expect(surface).toBe("marketing");
    expect(readyDecision.applyPathNow).toBe("/trip/xyz");
    expect(readyDecision.keepLoadingOverlay).toBe(false);
  });
});
