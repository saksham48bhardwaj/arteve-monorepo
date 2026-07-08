'use client';

import * as React from 'react';
import { cn } from './cn';

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeClass: Record<Size, string> = {
  sm:  'avatar-sm',
  md:  'avatar-md',
  lg:  'avatar-lg',
  xl:  'avatar-xl',
  '2xl': 'avatar-2xl',
};

export interface AvatarProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'size' | 'src'> {
  src?: string | null;
  alt?: string;
  size?: Size;
  fallback?: string; // e.g. initials
}

/** "Rooftop Sessions" → "RS", "sunny" → "S" */
function initialsFrom(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '·';
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function Avatar({ src, alt = '', size = 'md', fallback, className, ...rest }: AvatarProps) {
  const resolved = src && src.trim().length > 0 ? src : '/default-avatar.png';
  // 0 = try src, 1 = try default avatar, 2 = initials
  const [errorStep, setErrorStep] = React.useState(0);

  // A new src gets a fresh chance (e.g. avatar re-uploaded).
  React.useEffect(() => setErrorStep(0), [resolved]);

  if (errorStep >= 2 || (errorStep === 1 && resolved === '/default-avatar.png')) {
    return (
      <span
        role="img"
        aria-label={alt || fallback || 'avatar'}
        className={cn(
          'avatar inline-flex items-center justify-center bg-surface-sunken text-ink-muted font-semibold select-none',
          sizeClass[size],
          className,
        )}
      >
        <span className="text-[0.8em] leading-none">{initialsFrom(fallback || alt)}</span>
      </span>
    );
  }

  return (
    <img
      src={errorStep === 0 ? resolved : '/default-avatar.png'}
      alt={alt || fallback || 'avatar'}
      className={cn('avatar', sizeClass[size], className)}
      onError={() => setErrorStep((s) => s + 1)}
      {...rest}
    />
  );
}
