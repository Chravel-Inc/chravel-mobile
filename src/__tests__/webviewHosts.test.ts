import { isAllowedAuxiliaryHost } from "../webviewHosts";

const ALLOWED = [
  "supabase.co",
  "js.stripe.com",
  "checkout.stripe.com",
  "api.stripe.com",
  "maps.googleapis.com",
  "maps.google.com",
] as const;

describe("isAllowedAuxiliaryHost", () => {
  it("allows exact host matches", () => {
    expect(isAllowedAuxiliaryHost("js.stripe.com", ALLOWED)).toBe(true);
    expect(isAllowedAuxiliaryHost("checkout.stripe.com", ALLOWED)).toBe(true);
  });

  it("allows one subdomain level (Supabase project host)", () => {
    expect(isAllowedAuxiliaryHost("abcdefgh.supabase.co", ALLOWED)).toBe(true);
  });

  it("rejects public suffix homoglyphs that end with the same string", () => {
    expect(isAllowedAuxiliaryHost("notsupabase.co", ALLOWED)).toBe(false);
    expect(isAllowedAuxiliaryHost("eviljs.stripe.com", ALLOWED)).toBe(false);
  });

  it("rejects unrelated hosts", () => {
    expect(isAllowedAuxiliaryHost("evil.com", ALLOWED)).toBe(false);
  });
});
