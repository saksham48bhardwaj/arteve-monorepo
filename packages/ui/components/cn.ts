/**
 * Tiny className merger — joins truthy strings with spaces.
 * Avoids pulling in clsx/tailwind-merge as runtime deps.
 */
export function cn(...parts: unknown[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}
