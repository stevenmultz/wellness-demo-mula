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
    startupImage: [
      { url: "/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1242x2208.png", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1488x2266.png", media: "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-1536x2048.png", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-1640x2360.png", media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-1668x2224.png", media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-1668x2388.png", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
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
        <link rel="apple-touch-icon" href="/apple-touch-icon-v2.png" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                color-scheme: light;
              }
              html.dark, html.dark body {
                background-color: #0e0e0e;
                color-scheme: dark;
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
                transition: opacity 0.28s ease-out;
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
                display: inline-flex;
                align-items: baseline;
                gap: 0px;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const p=window.location.pathname;const isLightOnly=p.startsWith("/dashboard")||p.startsWith("/onboarding");const t=localStorage.getItem("wellness-theme");const d=!isLightOnly&&t==="dark";if(d){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}const m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute("content",d?"#0e0e0e":"#ffffff")}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${urbanist.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-[#f6f6f4] dark:bg-[#0e0e0e] relative overflow-x-clip antialiased`}
      >
        <div id="zera-pwa-splash" aria-hidden="true">
          <div className="zera-splash-brand">
            <div className="zera-splash-title">
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "1.75rem",
                  letterSpacing: "0.16em",
                  textTransform: "lowercase",
                  lineHeight: 1,
                  color: "#09090b",
                }}
              >
                {BRAND.wordmarkPrimary}
              </span>
              <span
                style={{
                  fontWeight: 300,
                  fontSize: "1.75rem",
                  letterSpacing: "0.08em",
                  textTransform: "lowercase",
                  lineHeight: 1,
                  opacity: 0.7,
                  color: "#09090b",
                }}
              >
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
