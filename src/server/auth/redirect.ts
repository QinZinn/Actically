/** Only same-origin relative paths; blocks `//evil.com`, `/\evil.com` and absolute URLs. */
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
