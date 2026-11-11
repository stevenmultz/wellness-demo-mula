import type { Metadata, Viewport } from "next";
import { Urbanist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuraBackground } from "@/components/ui/AuraBackground";
import { ServiceWorkerRegister } from "@/components/providers/ServiceWorkerRegister";
import { PwaSplashDismiss } from "@/components/providers/PwaSplashDismiss";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-geometric",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "+ BMS — Minimalist Longevity & Movement Sanctuary",
  description: "Curated daily physical vitality protocols, anti-inflammatory nutrition, and mindful habit tracking.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "+ BMS",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="+ BMS" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #ffffff;
              }
              @keyframes bmsPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.45; }
              }
              #bms-pwa-splash {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #ffffff !important;
                color: #09090b !important;
                user-select: none;
                transition: opacity 0.35s ease-out;
              }
              #bms-pwa-splash .bms-pulse-logo {
                display: flex;
                align-items: center;
                gap: 4px;
                font-family: var(--font-geometric), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                animation: bmsPulse 1.4s ease-in-out infinite;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("wellness-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${urbanist.variable} ${jetbrainsMono.variable} font-sans min-h-screen relative overflow-x-hidden antialiased`}
      >
        <div id="bms-pwa-splash" aria-hidden="true">
          <div className="bms-pulse-logo">
            <span className="font-light text-lg leading-none">+</span>
            <span className="font-geometric font-semibold text-sm tracking-[0.22em] uppercase">BMS</span>
          </div>
        </div>
        <ThemeProvider>
          <PwaSplashDismiss />
          <ServiceWorkerRegister />
          <SmoothScroll>
            <AuraBackground />
            <div className="relative z-10">{children}</div>
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
