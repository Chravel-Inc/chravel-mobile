/** True only for the sign-in route, not paths like /terms or /author that contain the substring "auth". */
export function isAuthScreenUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host !== "chravel.app" && host !== "www.chravel.app") {
      return false;
    }
    return parsed.pathname === "/auth" || parsed.pathname.startsWith("/auth/");
  } catch {
    return false;
  }
}
