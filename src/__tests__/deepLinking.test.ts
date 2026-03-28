jest.mock("expo-linking", () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

import { parseDeepLinkUrl, mapDeepLinkPathForWebView } from "../deepLinking";

describe("parseDeepLinkUrl", () => {
  describe("custom scheme (chravel://)", () => {
    it("parses chravel://trip/abc123", () => {
      expect(parseDeepLinkUrl("chravel://trip/abc123")).toBe("/trip/abc123");
    });

    it("parses chravel://auth-callback/12345", () => {
      expect(parseDeepLinkUrl("chravel://auth-callback/12345")).toBe("/auth-callback/12345");
    });

    it("preserves query strings", () => {
      expect(parseDeepLinkUrl("chravel://trip/abc?tab=chat")).toBe("/trip/abc?tab=chat");
    });

    it("preserves hash fragments", () => {
      expect(parseDeepLinkUrl("chravel://auth#access_token=xyz")).toBe("/auth#access_token=xyz");
    });

    it("handles path-only after scheme", () => {
      const result = parseDeepLinkUrl("chravel://join/invite123");
      expect(result).toBe("/join/invite123");
    });
  });

  describe("universal links (https://chravel.app)", () => {
    it("parses https://chravel.app/trip/abc", () => {
      expect(parseDeepLinkUrl("https://chravel.app/trip/abc")).toBe("/trip/abc");
    });

    it("parses www subdomain", () => {
      expect(parseDeepLinkUrl("https://www.chravel.app/trip/abc")).toBe("/trip/abc");
    });

    it("preserves query strings", () => {
      expect(parseDeepLinkUrl("https://chravel.app/trip/abc?tab=chat&thread=t1")).toBe(
        "/trip/abc?tab=chat&thread=t1"
      );
    });

    it("returns root path for domain only", () => {
      expect(parseDeepLinkUrl("https://chravel.app/")).toBe("/");
    });
  });

  describe("edge cases", () => {
    it("returns path for non-chravel URLs (fallback behavior)", () => {
      // parseDeepLinkUrl returns the pathname for any URL with a leading slash
      expect(parseDeepLinkUrl("https://google.com/search")).toBe("/search");
    });

    it("returns null for empty string", () => {
      expect(parseDeepLinkUrl("")).toBeNull();
    });

    it("handles malformed chravel:// URLs via fallback", () => {
      // The fallback regex in parseDeepLinkUrl handles this
      const result = parseDeepLinkUrl("chravel://");
      expect(result).not.toBeNull();
    });
  });
});

describe("mapDeepLinkPathForWebView", () => {
  it("maps OAuth callback hash to /auth target", () => {
    const result = mapDeepLinkPathForWebView(
      "/auth-callback/123#access_token=abc&refresh_token=def"
    );
    expect(result).toEqual({
      targetPath: "/auth#access_token=abc&refresh_token=def",
      isAuthRedirect: true,
    });
  });

  it("maps OAuth callback without hash to /auth", () => {
    const result = mapDeepLinkPathForWebView("/auth-callback/123");
    expect(result).toEqual({
      targetPath: "/auth",
      isAuthRedirect: true,
    });
  });

  it("passes through normal deep-link path unchanged", () => {
    const result = mapDeepLinkPathForWebView("/trip/t1?tab=chat");
    expect(result).toEqual({
      targetPath: "/trip/t1?tab=chat",
      isAuthRedirect: false,
    });
  });
});
