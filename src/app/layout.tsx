import type { Metadata, Viewport } from "next";
import { Urbanist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuraBackground } from "@/components/ui/AuraBackground";
import { ServiceWorkerRegister } from "@/components/providers/ServiceWorkerRegister";
import { PwaSplashDismiss } from "@/components/providers/PwaSplashDismiss";
import { BRAND } from "@/wellness/brand";
import { LocaleProvider } from "@/wellness/i18n/LocaleContext";
import { getServerLocale } from "@/wellness/i18n/server";

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
  title: BRAND.title,
  description: "Curated daily physical vitality protocols, anti-inflammatory nutrition, and mindful habit tracking.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND.name,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                background-color: #f6f6f4;
              }
              html.dark, html.dark body {
                background-color: #0e0e0e;
              }
              #zera-pwa-splash {
                position: fixed;
                inset: 0;
                width: 100%;
                height: 100%;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #ffffff;
                color: #09090b;
                user-select: none;
                overflow: hidden;
                transition: opacity 0.25s ease-out;
              }
              #zera-pwa-splash .zera-splash-brand {
                position: relative;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: var(--font-geometric), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              #zera-pwa-splash .zera-splash-title {
                display: flex;
                align-items: baseline;
                gap: 0px;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const isDash=window.location.pathname.startsWith("/dashboard");const t=localStorage.getItem("wellness-theme");const d=!isDash&&(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches));if(d){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}const m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute("content",d?"#0e0e0e":"#f6f6f4")}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${urbanist.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-[#f6f6f4] dark:bg-[#0e0e0e] relative overflow-x-clip antialiased`}
      >
        <div id="zera-pwa-splash" aria-hidden="true">
          <div className="zera-splash-brand">
            <div className="zera-splash-title">
              <span style={{ fontWeight: 600, fontSize: "0.95rem", letterSpacing: "0.16em", textTransform: "lowercase", lineHeight: 1, color: "#09090b" }}>
                {BRAND.wordmarkPrimary}
              </span>
              <span style={{ fontWeight: 300, fontSize: "0.95rem", letterSpacing: "0.08em", textTransform: "lowercase", lineHeight: 1, opacity: 0.72, color: "#09090b" }}>
                {BRAND.wordmarkAccent}
              </span>
            </div>
          </div>
        </div>
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>
            <PwaSplashDismiss />
            <ServiceWorkerRegister />
            <SmoothScroll>
              <AuraBackground />
              <div className="relative z-10">{children}</div>
            </SmoothScroll>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
