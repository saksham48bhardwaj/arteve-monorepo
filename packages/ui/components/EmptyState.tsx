import * as React from 'react';
import { cn } from './cn';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)} {...rest}>
      {icon && <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">{icon}</div>}
      <p className="empty-title">{title}</p>
      {description && <p className="empty-body">{description}</p>}
      {action && <div className="mt-5 flex items-center justify-center">{action}</div>}
    </div>
  );
}
