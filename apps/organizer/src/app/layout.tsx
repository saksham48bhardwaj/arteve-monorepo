import type { Metadata } from "next";
import "./globals.css";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { PresenceProvider } from '@arteve/shared/presence/provider';

export const metadata: Metadata = {
  title: "Arteve",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#000000" />
      </head>

      <body className="h-full min-h-screen bg-white text-neutral-900 dark:bg-[#0A0A0A] dark:text-neutral-200 transition-colors duration-300">
        {/* top navigation */}
        <div className="relative z-50">
          <TopNav />
        </div>

        {/* main content container */}
        <main className="relative z-10 mx-auto w-full max-w-xl px-4 pb-24 pt-4">
          <PresenceProvider>
            {children}
          </PresenceProvider>
        </main>

        {/* bottom navigation */}
        <div className="fixed bottom-0 left-0 w-full z-50">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
