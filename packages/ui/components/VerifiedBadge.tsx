import * as React from 'react';

export interface VerifiedBadgeProps {
  /** Glyph size in px. Defaults to 16. */
  size?: number;
  className?: string;
  /** Accessible label / tooltip. Defaults to "Verified". */
  title?: string;
}

/**
 * Brand-blue verified seal with a white check. Render only for profiles whose
 * `verified` flag is true (set by an admin — users cannot self-verify).
 */
export function VerifiedBadge({ size = 16, className = '', title = 'Verified' }: VerifiedBadgeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={`inline-block shrink-0 text-brand ${className}`}
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M12 2l2.39 1.74 2.95-.01.91 2.8 2.39 1.75-.92 2.8.92 2.8-2.39 1.75-.91 2.8-2.95-.01L12 22l-2.39-1.73-2.95.01-.91-2.8L3.36 15.7l.92-2.8-.92-2.8 2.39-1.75.91-2.8 2.95.01L12 2z"
      />
      <path fill="#fff" d="M10.7 14.3l-2-2-1.4 1.4 3.4 3.4 6.1-6.1-1.4-1.4z" />
    </svg>
  );
}
