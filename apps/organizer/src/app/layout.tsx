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

export const metadata: Metadata = {
  title: "Arteve Organizer",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#ffffff" />
      </head>

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
