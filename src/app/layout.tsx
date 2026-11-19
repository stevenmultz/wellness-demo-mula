import type { Metadata, Viewport } from "next";
import { Urbanist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuraBackground } from "@/components/ui/AuraBackground";
import { ServiceWorkerRegister } from "@/components/providers/ServiceWorkerRegister";
import { PwaSplashDismiss } from "@/components/providers/PwaSplashDismiss";
import { ZeraSplashWordmark } from "@/components/common/ZeraSplashWordmark";
import { BRAND } from "@/wellness/brand";
import { APPLE_SPLASH_LINKS } from "@/wellness/pwa/appleSplash";
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
        {/* Static first-byte PWA & Apple splash tags (bypassing Next.js 16 streaming metadata) */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="only light" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={BRAND.name} />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json?v=5" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v2.png?v=5" />
        {APPLE_SPLASH_LINKS.map((item) => (
          <link
            key={item.key}
            rel="apple-touch-startup-image"
            href={item.href}
            media={item.media}
          />
        ))}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                color-scheme: only light;
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
                background-color: #ffffff !important;
                color: #09090b !important;
                user-select: none;
                overflow: hidden;
                transition: opacity 0.24s ease-out;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.classList.remove("dark");localStorage.setItem("wellness-theme","light");var metas=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<metas.length;i++){metas[i].setAttribute("content","#ffffff")}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${urbanist.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-[#f6f6f4] relative overflow-x-clip antialiased`}
      >
        <div id="zera-pwa-splash" aria-hidden="true">
          <ZeraSplashWordmark />
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
