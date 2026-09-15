import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono, Noto_Music } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "@/components/screens/app-providers";

const sans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], weight: ["400", "500", "600"] });
const music = Noto_Music({ variable: "--font-noto-music", subsets: ["latin"], weight: "400" });
// Chrome icons ship as a ligature font; next/font/google does not carry Material Symbols, so it is self-hosted.
const icons = localFont({ src: "./fonts/material-symbols-rounded.woff2", variable: "--font-material-symbols", display: "block", weight: "300" });

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "KeyCadence",
  description: "A practice tool for piano students and adult returners sharing one instrument.",
  manifest: `${base}/manifest.webmanifest`,
  icons: { icon: `${base}/icon.svg`, apple: `${base}/apple-touch-icon.png` },
  appleWebApp: { capable: true, title: "KeyCadence", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#101326",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${music.variable} ${icons.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
