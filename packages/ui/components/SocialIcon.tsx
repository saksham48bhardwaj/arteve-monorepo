import * as React from 'react';

/** Brand background color for each known social platform. */
export function socialColor(key: string): string {
  const k = key.toLowerCase();
  if (k.includes('instagram')) return '#E1306C';
  if (k.includes('facebook')) return '#1877F2';
  if (k.includes('twitter') || k === 'x') return '#0F1419';
  if (k.includes('youtube')) return '#FF0000';
  if (k.includes('spotify')) return '#1DB954';
  if (k.includes('soundcloud')) return '#FF5500';
  if (k.includes('apple')) return '#000000';
  if (k.includes('linkedin')) return '#0A66C2';
  if (k.includes('tiktok')) return '#010101';
  if (k.includes('bandcamp')) return '#629AA9';
  if (k.includes('website') || k.includes('site') || k.includes('url')) return '#4E7FA2';
  return '#4E7FA2';
}

export interface SocialIconProps {
  /** Platform key — looked up case-insensitive. */
  name: string;
  /** Size in px, defaults to 20. */
  size?: number;
}

/** Renders a brand-correct SVG glyph for the given platform name. */
export function SocialIcon({ name, size = 20 }: SocialIconProps) {
  const k = name.toLowerCase();
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;

  if (k.includes('instagram')) {
    return (
      <svg {...common}>
        <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.25.07 1.62.07 4.8s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.06-1.62.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.6c-3.15 0-3.5 0-4.74.07-1.08.05-1.66.23-2.05.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.05C2.66 8.5 2.66 8.85 2.66 12s0 3.5.07 4.74c.05 1.08.23 1.66.38 2.05.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.05.38 1.24.07 1.59.07 4.74.07s3.5 0 4.74-.07c1.08-.05 1.66-.23 2.05-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.05.07-1.24.07-1.59.07-4.74s0-3.5-.07-4.74c-.05-1.08-.23-1.66-.38-2.05-.2-.51-.44-.88-.83-1.27-.39-.39-.76-.63-1.27-.83-.39-.15-.97-.33-2.05-.38C15.5 3.86 15.15 3.86 12 3.86zm0 2.7a5.44 5.44 0 110 10.88 5.44 5.44 0 010-10.88zm0 1.7a3.74 3.74 0 100 7.48 3.74 3.74 0 000-7.48zm5.66-1.95a1.27 1.27 0 110 2.54 1.27 1.27 0 010-2.54z" />
      </svg>
    );
  }
  if (k.includes('facebook')) {
    return (
      <svg {...common}>
        <path d="M13.4 22v-8.3h2.8l.4-3.2h-3.2V8.4c0-.93.26-1.56 1.6-1.56h1.7V3.96c-.3-.04-1.32-.13-2.5-.13-2.48 0-4.18 1.51-4.18 4.3v2.4H7.2v3.18h2.82V22h3.38z" />
      </svg>
    );
  }
  if (k.includes('twitter') || k === 'x') {
    return (
      <svg {...common}>
        <path d="M18.2 3H21l-6.5 7.4L22 21h-5.9l-4.6-6-5.3 6H3.4l7-7.9L2.6 3h6L13 8.5 18.2 3zm-1 16h1.6L7.8 4.7H6L17.2 19z" />
      </svg>
    );
  }
  if (k.includes('youtube')) {
    return (
      <svg {...common}>
        <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 00.5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 002.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 002.1-2.1C24 16 24 12 24 12s0-4-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
      </svg>
    );
  }
  if (k.includes('spotify')) {
    return (
      <svg {...common}>
        <path d="M12 0a12 12 0 100 24 12 12 0 000-24zm5.5 17.3c-.2.4-.7.5-1.1.3-3-1.8-6.8-2.2-11.3-1.2-.5.1-.9-.2-1-.7-.1-.5.2-.9.7-1 4.9-1.1 9.1-.6 12.4 1.4.5.2.6.7.3 1.2zm1.5-3.3c-.3.4-.9.6-1.4.3-3.5-2.1-8.8-2.7-12.9-1.5-.6.2-1.2-.2-1.4-.8-.2-.6.2-1.2.8-1.4 4.7-1.4 10.5-.7 14.6 1.8.5.3.6.9.3 1.6zm.1-3.5C15.1 8.1 8.6 7.8 4.8 9c-.7.2-1.5-.2-1.7-.9-.2-.7.2-1.5.9-1.7 4.4-1.4 11.5-1.1 16 1.6.7.4.9 1.3.5 1.9-.4.7-1.3.9-2 .5z" />
      </svg>
    );
  }
  if (k.includes('soundcloud')) {
    return (
      <svg {...common}>
        <path d="M22 14.5a3.5 3.5 0 01-3.5 3.5h-7.7V8.6c2-.7 4.2.1 5.6 1.7.7-.3 1.6-.5 2.4-.4a3.5 3.5 0 013.2 3.5c0 .4-.1.7 0 1.1zM9.4 18H8.7V10c.2 0 .5.1.7.2V18zm-1.7 0H7V11.2c.2-.1.4-.2.7-.3V18zm-1.7 0h-.7v-6.4c.2.2.4.4.7.5V18zm-1.7 0h-.7v-5.9l.7-1.1V18zm-1.7 0H1.6V14l.4-1.5.6 1.6V18z" />
      </svg>
    );
  }
  if (k.includes('linkedin')) {
    return (
      <svg {...common}>
        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5V9h3v10zM6.5 7.7a1.7 1.7 0 110-3.4 1.7 1.7 0 010 3.4zM19 19h-3v-5.4c0-1.3-.5-2.1-1.6-2.1-1.2 0-1.9.8-1.9 2.1V19h-3V9h3v1.3c.5-.8 1.5-1.5 3-1.5 2.2 0 3.5 1.5 3.5 4V19z" />
      </svg>
    );
  }
  if (k.includes('tiktok')) {
    return (
      <svg {...common}>
        <path d="M19.5 9.5a6.7 6.7 0 01-3.9-1.3v6c0 3.3-2.6 6-5.9 6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c.3 0 .6 0 .9.1v3.1c-.3-.1-.6-.2-.9-.2a3 3 0 100 5.9c1.7 0 3-1.3 3-3V2.5h2.9c0 .3 0 .6.1.8a4 4 0 003.8 3.2v3z" />
      </svg>
    );
  }
  if (k.includes('apple')) {
    return (
      <svg {...common}>
        <path d="M18.6 17c-.4 1-.9 1.9-1.7 2.8-.9 1.2-1.8 1.9-3 1.9-1.1 0-1.6-.4-3-.4-1.4 0-1.9.4-3 .4-1.2 0-2.2-.7-3-1.9-2-2.6-2.6-7.4.5-10.3.9-1 2.1-1.6 3.4-1.6 1.2 0 2.4.5 3 .5.6 0 2.1-.7 3.5-.5 1.4.1 2.5.7 3.2 1.6-2.8 1.7-2.3 5.5.5 7.1zm-3.8-13c-.6.7-1.5 1.2-2.4 1.1-.1-1 .3-2 .9-2.6.6-.7 1.6-1.2 2.4-1.2 0 1 .3 2-.9 2.7z" />
      </svg>
    );
  }
  if (k.includes('bandcamp')) {
    return (
      <svg {...common}>
        <path d="M0 18.75L8.25 5.25H24l-8.25 13.5H0z" />
      </svg>
    );
  }
  // Generic link
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
    </svg>
  );
}

export interface SocialLinkProps {
  name: string;
  href: string;
  size?: number;
  className?: string;
}

/** Pre-styled colored circular link button for a social profile. */
export function SocialLink({ name, href, size = 40, className = '' }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={name}
      title={name}
      className={`inline-flex items-center justify-center rounded-full text-white shadow-sm hover:scale-105 transition ${className}`}
      style={{ backgroundColor: socialColor(name), width: size, height: size }}
    >
      <SocialIcon name={name} size={Math.round(size * 0.5)} />
    </a>
  );
}
