import * as React from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClass: Record<Tone, string> = {
  neutral: '',
  brand:   'badge-brand',
  accent:  'badge-accent',
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  outline: 'badge-outline',
};

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn('badge', toneClass[tone], className)} {...rest}>
      {children}
    </span>
  );
}
