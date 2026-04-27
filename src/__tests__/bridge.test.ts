import { parseBridgeMessage, buildWebEvent, buildInjectedJS } from "../bridge";

describe("parseBridgeMessage", () => {
  it("parses a valid haptic message", () => {
    const result = parseBridgeMessage(JSON.stringify({ type: "haptic", style: "light" }));
    expect(result).toEqual({ type: "haptic", style: "light" });
  });

  it("parses a valid ready message", () => {
    const result = parseBridgeMessage(JSON.stringify({ type: "ready" }));
    expect(result).toEqual({ type: "ready" });
  });

  it("parses a valid share message", () => {
    const result = parseBridgeMessage(
      JSON.stringify({ type: "share", url: "https://chravel.app/trip/123", title: "Trip" })
    );
    expect(result).toEqual({ type: "share", url: "https://chravel.app/trip/123", title: "Trip" });
  });

  it("parses a valid browser:open message", () => {
    const result = parseBridgeMessage(
      JSON.stringify({ type: "browser:open", url: "https://example.com", presentationStyle: "popover" })
    );
    expect(result).toEqual({ type: "browser:open", url: "https://example.com", presentationStyle: "popover" });
  });

  it("parses a valid revenuecat:identify message", () => {
    const result = parseBridgeMessage(JSON.stringify({ type: "revenuecat:identify", userId: "user-123" }));
    expect(result).toEqual({ type: "revenuecat:identify", userId: "user-123" });
  });

  it("returns null for invalid JSON", () => {
    expect(parseBridgeMessage("not json")).toBeNull();
  });

  it("returns null for missing type field", () => {
    expect(parseBridgeMessage(JSON.stringify({ style: "light" }))).toBeNull();
  });

  it("returns null for non-string type", () => {
    expect(parseBridgeMessage(JSON.stringify({ type: 123 }))).toBeNull();
  });

  it("returns null for non-object payload", () => {
    expect(parseBridgeMessage(JSON.stringify("hello"))).toBeNull();
  });

  it("returns null for null payload", () => {
    expect(parseBridgeMessage("null")).toBeNull();
  });

  it("returns null for invalid haptic style", () => {
    expect(
      parseBridgeMessage(JSON.stringify({ type: "haptic", style: "ultra-heavy" }))
    ).toBeNull();
  });

  it("returns null for missing revenuecat:purchase packageId", () => {
    expect(
      parseBridgeMessage(JSON.stringify({ type: "revenuecat:purchase" }))
    ).toBeNull();
  });

  it("returns null for invalid revenuecat:purchase packageId type", () => {
    expect(
      parseBridgeMessage(JSON.stringify({ type: "revenuecat:purchase", packageId: 123 }))
    ).toBeNull();
  });

  it("returns null for missing revenuecat:identify userId", () => {
    expect(
      parseBridgeMessage(JSON.stringify({ type: "revenuecat:identify" }))
    ).toBeNull();
  });

  it("returns null for invalid share field type", () => {
    expect(
      parseBridgeMessage(JSON.stringify({ type: "share", url: 123 }))
    ).toBeNull();
  });

  it("returns null for missing voice:play-audio audio data", () => {
    expect(
      parseBridgeMessage(JSON.stringify({ type: "voice:play-audio" }))
    ).toBeNull();
  });

  it("returns null for invalid voice:play-audio sampleRate type", () => {
    expect(
      parseBridgeMessage(
        JSON.stringify({ type: "voice:play-audio", audio: "...", sampleRate: "24000" })
      )
    ).toBeNull();
  });

  it("returns null for unknown message type", () => {
    expect(
      parseBridgeMessage(JSON.stringify({ type: "unknown:action" }))
    ).toBeNull();
  });
});

describe("buildWebEvent", () => {
  it("builds a CustomEvent dispatch string", () => {
    const result = buildWebEvent("chravel:push-token", { token: "abc123" });
    expect(result).toContain("window.dispatchEvent");
    expect(result).toContain("chravel:push-token");
    expect(result).toContain('"token":"abc123"');
    expect(result).toEndWith("true;");
  });

  it("handles null values in detail", () => {
    const result = buildWebEvent("chravel:push-token", { token: null as unknown as string, error: "denied" });
    expect(result).toContain('"token":null');
    expect(result).toContain('"error":"denied"');
  });
});

describe("buildInjectedJS", () => {
  it("includes ChravelNative object with platform", () => {
    const result = buildInjectedJS("ios");
    expect(result).toContain("window.Capacitor.Plugins.Browser");
    expect(result).toContain('window.ChravelNative');
    expect(result).toContain('platform: "ios"');
    expect(result).toContain("isNative: true");
  });

  it("includes safe area CSS injection", () => {
    const result = buildInjectedJS("ios");
    expect(result).toContain("bottomPadding + 'px !important; }'");
  });


  it("includes chat tab scroll patch keywords", () => {
    const result = buildInjectedJS("android");
    expect(result).toContain("TAB_KEYWORDS");
    expect(result).toContain("patchScrollableRow");
    expect(result).toContain("data-chravel-scroll-patched");
    expect(result).toContain("child.style.flexShrink = '0'");
  });

  it("includes pinned hydration network hooks", () => {
    const result = buildInjectedJS("android");
    expect(result).toContain("wireNetworkPinnedSignals");
    expect(result).toContain("maybePinnedMutation");
    expect(result).toContain("schedulePinnedHydration('fetch')");
    expect(result).toContain("schedulePinnedHydration('xhr')");
  });

  it("dispatches chravel:native-ready event", () => {
    const result = buildInjectedJS("android");
    expect(result).toContain("chravel:native-ready");
  });

  it("uses the provided platform string", () => {
    const result = buildInjectedJS("android");
    expect(result).toContain('platform: "android"');
  });

  it("includes isTablet: true when third arg is true", () => {
    const result = buildInjectedJS("ios", 0, true);
    expect(result).toContain("isTablet: true");
  });

  it("includes isTablet: false when third arg is false", () => {
    const result = buildInjectedJS("ios", 0, false);
    expect(result).toContain("isTablet: false");
  });

  it("defaults isTablet to false when omitted", () => {
    const result = buildInjectedJS("ios");
    expect(result).toContain("isTablet: false");
  });

  it("uses 20px safe area fallback for iPad on iOS", () => {
    const result = buildInjectedJS("ios", 0, true);
    expect(result).toContain("true ? 20 : 34");
  });

  it("uses 34px safe area fallback for iPhone on iOS", () => {
    const result = buildInjectedJS("ios", 0, false);
    expect(result).toContain("false ? 20 : 34");
  });
});

expect.extend({
  toEndWith(received: string, suffix: string) {
    const pass = received.endsWith(suffix);
    return {
      pass,
      message: () => `expected "${received}" to end with "${suffix}"`,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toEndWith(suffix: string): R;
    }
  }
}
