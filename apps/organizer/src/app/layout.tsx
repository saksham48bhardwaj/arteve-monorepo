import type { Metadata } from "next";
import "./globals.css";
import { PresenceProvider } from '@arteve/shared/presence/provider';
import ClientShell from "../components/ClientShell";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://organizer.arteve.in';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Arteve Organizer — book the right artist for every night',
    template: '%s · Arteve Organizer',
  },
  description:
    'Discover artists, build lineups, and run your events from one clean dashboard. Arteve Organizer is the booking platform for venues, festivals and agencies.',
  applicationName: 'Arteve Organizer',
  keywords: ['music', 'live music', 'gigs', 'booking', 'venues', 'organizers', 'arteve'],
  authors: [{ name: 'Arteve' }],
  creator: 'Arteve',
  publisher: 'Arteve',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    siteName: 'Arteve Organizer',
    title: 'Arteve Organizer — book the right artist for every night',
    description:
      'Discover artists, build lineups, and run your events from one clean dashboard.',
    url: SITE_URL,
    images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: 'Arteve Organizer' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arteve Organizer — book the right artist for every night',
    description: 'Discover artists, build lineups, run your events from one clean dashboard.',
    images: ['/images/og-default.png'],
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Arteve Organizer' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1a17' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <body className="h-full min-h-screen bg-surface-muted text-ink antialiased">
        <PresenceProvider>
          <ClientShell>
            {children}
          </ClientShell>
        </PresenceProvider>
      </body>
    </html>
  );
}
