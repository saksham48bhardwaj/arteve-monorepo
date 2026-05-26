import * as React from 'react';
import { cn } from './cn';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className,
  ...rest
}: PageHeaderProps) {
  return (
    <header className={cn('page-header flex items-start justify-between gap-4 flex-wrap', className)} {...rest}>
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export interface PageProps extends React.HTMLAttributes<HTMLElement> {
  width?: 'narrow' | 'default' | 'wide';
  as?: 'main' | 'div' | 'section';
}

export function Page({ width = 'default', as: Tag = 'main', className, children, ...rest }: PageProps) {
  return (
    <Tag
      className={cn(
        'page',
        width === 'narrow' && 'page-narrow',
        width === 'wide' && 'page-wide',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
