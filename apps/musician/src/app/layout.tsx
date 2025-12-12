import type { Metadata } from "next";
import "./globals.css";
import { PresenceProvider } from '@arteve/shared/presence/provider';
import ClientShell from "../components/ClientShell";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Arteve",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#000000" />
      </head>

      <body className="h-full min-h-screen bg-white text-neutral-900 dark:bg-[#0A0A0A] dark:text-neutral-200 transition-colors duration-300">
        <PresenceProvider>
          <ClientShell>
            {children}
          </ClientShell>
        </PresenceProvider>
      </body>
    </html>
  );
}
