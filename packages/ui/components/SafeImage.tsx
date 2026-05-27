'use client';

import * as React from 'react';
import { useState } from 'react';
import Image, { ImageProps } from 'next/image';

// --------------------------------------------------------------
// <SafeImage /> — wraps next/image with an onError fallback so broken
// or deleted source URLs degrade to a tinted placeholder block instead
// of the browser's default broken-image icon. Same API as next/image.
// --------------------------------------------------------------

export type SafeImageProps = Omit<ImageProps, 'onError'>;

export function SafeImage(props: SafeImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    // Match the consumer's sizing without the broken icon
    const style: React.CSSProperties = {
      width: typeof props.width === 'number' ? props.width : undefined,
      height: typeof props.height === 'number' ? props.height : undefined,
    };
    return (
      <div
        aria-label={props.alt || 'Image unavailable'}
        role="img"
        className={
          'flex items-center justify-center bg-surface-sunken text-ink-disabled ' +
          (props.className ?? '')
        }
        style={{
          ...style,
          // When using `fill`, the parent already constrains size.
          ...(props.fill ? { position: 'absolute', inset: 0 } : {}),
        }}
      >
        <svg viewBox="0 0 24 24" className="h-1/3 w-1/3 max-h-8 max-w-8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return <Image {...props} onError={() => setErrored(true)} />;
}
