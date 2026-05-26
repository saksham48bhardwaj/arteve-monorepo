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

export function Avatar({ src, alt = '', size = 'md', fallback, className, ...rest }: AvatarProps) {
  const resolved = src && src.trim().length > 0 ? src : '/default-avatar.png';
  return (
    <img
      src={resolved}
      alt={alt || fallback || 'avatar'}
      className={cn('avatar', sizeClass[size], className)}
      {...rest}
    />
  );
}
