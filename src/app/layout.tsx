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
  themeColor: "#000000",
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
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="+ BMS" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #000000;
              }
              @keyframes bmsPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.55; }
              }
              #bms-pwa-splash {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #000000 !important;
                color: #ffffff !important;
                user-select: none;
                overflow: hidden;
                transition: opacity 0.35s ease-out;
              }
              #bms-pwa-splash .bms-splash-bg {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                opacity: 0.35;
                transform: scale(1.05);
                pointer-events: none;
              }
              #bms-pwa-splash .bms-splash-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4), rgba(0,0,0,0.75));
                pointer-events: none;
              }
              #bms-pwa-splash .bms-splash-pill {
                position: relative;
                z-index: 10;
                padding: 0.625rem 1.25rem;
                border-radius: 9999px;
                background-color: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                animation: bmsPulse 1.6s ease-in-out infinite;
                font-family: var(--font-geometric), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/image.webp"
            alt=""
            className="bms-splash-bg"
          />
          <div className="bms-splash-overlay" />
          <div className="bms-splash-pill">
            <span style={{ fontWeight: 300, fontSize: "1.125rem", lineHeight: 1, color: "#ffffff" }}>+</span>
            <span style={{ fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#ffffff" }}>
              BMS
            </span>
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
