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
    expect(result).toContain('window.ChravelNative');
    expect(result).toContain('platform: "ios"');
    expect(result).toContain("isNative: true");
  });

  it("includes safe area CSS injection", () => {
    const result = buildInjectedJS("ios");
    expect(result).toContain("safe-area-inset-bottom");
  });

  it("dispatches chravel:native-ready event", () => {
    const result = buildInjectedJS("android");
    expect(result).toContain("chravel:native-ready");
  });

  it("uses the provided platform string", () => {
    const result = buildInjectedJS("android");
    expect(result).toContain('platform: "android"');
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
