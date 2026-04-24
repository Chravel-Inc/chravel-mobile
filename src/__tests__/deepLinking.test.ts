jest.mock("expo-linking", () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock("../constants", () => ({
  WEB_APP_URL: "https://chravel.app",
}));

import {
  buildWebViewLaunchUrl,
  parseDeepLinkUrl,
  isAuthScreenUrl,
  AUTH_LAUNCH_PATH,
  buildNativeAuthLaunchUrl,
} from "../deepLinking";

describe("isAuthScreenUrl", () => {
  it("is true for /auth on chravel.app", () => {
    expect(isAuthScreenUrl("https://chravel.app/auth")).toBe(true);
  });

  it("is true for /auth/ subpaths", () => {
    expect(isAuthScreenUrl("https://chravel.app/auth/callback")).toBe(true);
  });

  it("is false for /terms (substring false positive)", () => {
    expect(isAuthScreenUrl("https://chravel.app/terms")).toBe(false);
  });

  it("is false for /author", () => {
    expect(isAuthScreenUrl("https://chravel.app/author/foo")).toBe(false);
  });

  it("is false for other hosts", () => {
    expect(isAuthScreenUrl("https://evil.com/auth")).toBe(false);
  });
});

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
    it("returns null for https URLs that are not Chravel hosts (no open redirect)", () => {
      expect(parseDeepLinkUrl("https://google.com/search")).toBeNull();
      expect(parseDeepLinkUrl("https://evil.com/trip/fake")).toBeNull();
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


describe("native auth launch contract", () => {
  it("keeps auth path constant as /auth", () => {
    expect(AUTH_LAUNCH_PATH).toBe("/auth");
  });

  it("builds /auth?app_context=native from shared helper", () => {
    expect(buildNativeAuthLaunchUrl()).toBe(
      "https://chravel.app/auth?app_context=native",
    );
  });
});

describe("buildWebViewLaunchUrl", () => {
  it("adds app_context=native to auth launch URL", () => {
    expect(buildWebViewLaunchUrl("/auth")).toBe(
      "https://chravel.app/auth?app_context=native",
    );
  });

  it("preserves deep-link path/query while appending app_context", () => {
    expect(buildWebViewLaunchUrl("/trip/abc?tab=chat&thread=t1")).toBe(
      "https://chravel.app/trip/abc?tab=chat&thread=t1&app_context=native",
    );
  });

  it("preserves hash fragments", () => {
    expect(buildWebViewLaunchUrl("/auth#access_token=xyz")).toBe(
      "https://chravel.app/auth?app_context=native#access_token=xyz",
    );
  });

  it("does not rewrite deep links to root", () => {
    expect(buildWebViewLaunchUrl("/join/invite123")).toBe(
      "https://chravel.app/join/invite123?app_context=native",
    );
  });

  it("forces app_context=native when param already exists", () => {
    expect(
      buildWebViewLaunchUrl("/trip/abc?app_context=web&tab=plan"),
    ).toBe("https://chravel.app/trip/abc?app_context=native&tab=plan");
  });
});
