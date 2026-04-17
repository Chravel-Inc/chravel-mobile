import { evaluateReadyDecision, resolveAuthSurface } from "../authRouting";

describe("evaluateReadyDecision", () => {
  it("keeps overlay and defers non-auth pending path during OAuth callback", () => {
    const result = evaluateReadyDecision({
      isAuthRedirect: true,
      currentUrl: "https://chravel.app/auth?app_context=native",
      pendingPath: "/trip/abc?tab=chat",
    });

    expect(result.keepLoadingOverlay).toBe(true);
    expect(result.deferPendingPath).toBe(true);
    expect(result.applyPathNow).toBeNull();
  });

  it("applies deferred route once auth screen is exited", () => {
    const result = evaluateReadyDecision({
      isAuthRedirect: true,
      currentUrl: "https://chravel.app/trip/abc?app_context=native",
      pendingPath: "/trip/abc?tab=chat",
    });

    expect(result.keepLoadingOverlay).toBe(false);
    expect(result.deferPendingPath).toBe(false);
    expect(result.applyPathNow).toBe("/trip/abc?tab=chat");
  });

  it("does not defer auth-callback paths", () => {
    const result = evaluateReadyDecision({
      isAuthRedirect: true,
      currentUrl: "https://chravel.app/auth?app_context=native",
      pendingPath: "/auth-callback/123#access_token=x",
    });

    expect(result.deferPendingPath).toBe(false);
    expect(result.applyPathNow).toBe("/auth-callback/123#access_token=x");
  });
});

describe("resolveAuthSurface", () => {
  it("returns auth modal for native/app context", () => {
    expect(resolveAuthSurface("native")).toBe("auth-modal");
    expect(resolveAuthSurface("app")).toBe("auth-modal");
  });

  it("returns auth modal for pwa", () => {
    expect(resolveAuthSurface("pwa")).toBe("auth-modal");
  });

  it("returns marketing for browser context", () => {
    expect(resolveAuthSurface("browser")).toBe("marketing");
    expect(resolveAuthSurface(null)).toBe("marketing");
  });
});
