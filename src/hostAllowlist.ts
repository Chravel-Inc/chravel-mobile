/**
 * Returns true when `host` is exactly `suffix` or a subdomain of it
 * (e.g. project.supabase.co for suffix supabase.co).
 *
 * Plain `host.endsWith(suffix)` is unsafe: "evil-supabase.co".endsWith("supabase.co")
 * is true, which would incorrectly allow arbitrary origins through the WebView gate.
 */
export function matchesTrustedHostSuffix(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}
