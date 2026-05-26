import * as React from 'react';
import { cn } from './cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: 'rect' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ shape = 'rect', width, height, className, style, ...rest }: SkeletonProps) {
  const resolvedStyle: React.CSSProperties = {
    width,
    height: height ?? (shape === 'text' ? '0.85em' : undefined),
    borderRadius: shape === 'circle' ? '9999px' : undefined,
    ...style,
  };
  return <div className={cn('skeleton', className)} style={resolvedStyle} {...rest} />;
}
