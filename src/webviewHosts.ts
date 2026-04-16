/**
 * Host allowlist for WebView subresource / OAuth-adjacent loads.
 * Uses exact match or one subdomain label boundary (e.g. *.supabase.co)
 * so suffix domains like "notsupabase.co" are not accepted.
 */
export function isAllowedAuxiliaryHost(
  hostname: string,
  allowedDomains: readonly string[],
): boolean {
  return allowedDomains.some(
    (domain) =>
      hostname === domain || hostname.endsWith(`.${domain}`),
  );
}
