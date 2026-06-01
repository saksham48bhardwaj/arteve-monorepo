/**
 * Sanitize a user-supplied URL before it is rendered into an `href`.
 *
 * Returns a safe, navigable URL string, or `null` if the value cannot be
 * trusted. This is the single source of truth for link safety across the apps
 * and exists to neutralise stored-XSS vectors (`javascript:`, `data:`,
 * `vbscript:`, …) that may already live in `profiles.links`.
 *
 * Behaviour:
 *  - `https://…` / `http://…`            → returned as-is
 *  - any other explicit scheme           → rejected (null)  e.g. `javascript:alert(1)`
 *  - a bare domain like `instagram.com/x` → normalised to `https://instagram.com/x`
 *  - bare handles, empty, or junk         → rejected (null)  e.g. `@me`
 */
export function safeHref(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  // Already an explicit http(s) URL — trust it.
  if (/^https?:\/\//i.test(v)) return v;

  // Any other explicit scheme (javascript:, data:, vbscript:, file:, mailto:…)
  // is rejected. We deliberately only allow http(s) for outbound profile links.
  if (/^[a-z][a-z0-9+.\-]*:/i.test(v)) return null;

  // Looks like a bare domain (has at least one dot, no spaces) — assume https.
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;

  return null;
}
