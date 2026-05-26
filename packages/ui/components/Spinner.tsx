import * as React from 'react';
import { cn } from './cn';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  label?: string;
}

export function Spinner({ size = 16, label, className, ...rest }: SpinnerProps) {
  return (
    <span
      className={cn('inline-block rounded-full border-2 border-current border-r-transparent animate-spin', className)}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label}
      {...rest}
    />
  );
}
