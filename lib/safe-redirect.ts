/**
 * Returns `path` only when it is a same-site relative path such as "/products?x=1".
 * Absolute URLs, "//host", "/\host" and paths containing control characters (which browsers strip,
 * turning "/\t/evil.com" into "//evil.com") all return `fallback`.
 * Used for every redirect destination that comes from a URL parameter.
 */
export function safeInternalPath(path: string | null | undefined, fallback: string | null = null): string | null {
  if (!path || path.length > 2000) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;
  return path;
}
