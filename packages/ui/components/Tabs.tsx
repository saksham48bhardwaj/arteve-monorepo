'use client';

import * as React from 'react';
import { cn } from './cn';

export interface TabItem<T extends string = string> {
  value: T;
  label: React.ReactNode;
  count?: number | null;
}

export interface TabsProps<T extends string = string> {
  value: T;
  onChange: (next: T) => void;
  items: TabItem<T>[];
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string = string>({
  value,
  onChange,
  items,
  className,
  size = 'md',
}: TabsProps<T>) {
  return (
    <div className={cn('tabs', className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => onChange(item.value)}
            className={cn('tab', size === 'sm' && 'text-xs pb-2')}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-sunken px-1.5 text-[10px] font-semibold text-ink-muted">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
