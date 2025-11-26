import type { Metadata } from "next";
import "./globals.css";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { PresenceProvider } from '@arteve/shared/presence/provider';

export const metadata: Metadata = { title: "Arteve — Organizer" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-screen bg-white text-gray-900">
        <TopNav />
        <main className="mx-auto max-w-5xl px-4 pb-20 pt-4">
          <PresenceProvider>
            {children}
          </PresenceProvider>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
