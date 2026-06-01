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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://arteve.in';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Arteve — where artists and venues find each other',
    template: '%s · Arteve',
  },
  description:
    'Arteve connects independent musicians with venues, organizers, and fans. Showcase your craft, get discovered, get booked.',
  applicationName: 'Arteve',
  keywords: ['music', 'live music', 'gigs', 'musicians', 'venues', 'booking', 'arteve'],
  authors: [{ name: 'Arteve' }],
  creator: 'Arteve',
  publisher: 'Arteve',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    siteName: 'Arteve',
    title: 'Arteve — where artists and venues find each other',
    description:
      'Showcase your craft. Get discovered. Get booked. Arteve is the platform for independent live music.',
    url: SITE_URL,
    images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: 'Arteve' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arteve — where artists and venues find each other',
    description: 'Showcase your craft. Get discovered. Get booked.',
    images: ['/images/og-default.png'],
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Arteve' },
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
