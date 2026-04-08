import { matchesTrustedHostSuffix } from "../hostAllowlist";

describe("matchesTrustedHostSuffix", () => {
  it("allows exact host match", () => {
    expect(matchesTrustedHostSuffix("supabase.co", "supabase.co")).toBe(true);
  });

  it("allows one-level subdomain", () => {
    expect(matchesTrustedHostSuffix("abc.supabase.co", "supabase.co")).toBe(true);
  });

  it("allows nested subdomain", () => {
    expect(
      matchesTrustedHostSuffix("project.ref.supabase.co", "supabase.co"),
    ).toBe(true);
  });

  it("rejects suffix-stripping lookalike domains", () => {
    expect(matchesTrustedHostSuffix("evil-supabase.co", "supabase.co")).toBe(
      false,
    );
    expect(matchesTrustedHostSuffix("notjs.stripe.com", "js.stripe.com")).toBe(
      false,
    );
  });

  it("rejects unrelated hosts", () => {
    expect(matchesTrustedHostSuffix("example.com", "supabase.co")).toBe(false);
  });
});
