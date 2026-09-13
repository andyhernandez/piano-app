import type { Metadata, Viewport } from "next";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/shared/app-providers";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"] });

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "KeyCadence",
  description: "A gamified daily practice companion for young piano beginners.",
  manifest: `${base}/manifest.webmanifest`,
  icons: { icon: `${base}/icon.svg`, apple: `${base}/apple-touch-icon.png` },
  appleWebApp: { capable: true, title: "KeyCadence", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fbf7ef",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${fredoka.variable} h-full antialiased`}>
      <head>
        {/* Apply the saved theme before first paint so dark mode never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('kc.theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
