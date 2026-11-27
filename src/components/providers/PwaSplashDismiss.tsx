"use client";

import { useEffect } from "react";

const MAX_SPLASH_WAIT_MS = 12000;

/**
 * Keeps the first-byte #zera-pwa-splash visible until any React Suspense loading
 * boundary ([data-zera-loading="true"]) has finished and the real page content
 * has painted underneath, preventing the blank white pause after logo fade-out.
 */
export function PwaSplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("zera-pwa-splash");
    if (!splash) return;

    let dismissed = false;
    let raf1: number | null = null;
    let removeTimer: ReturnType<typeof setTimeout> | null = null;

    const fadeOutNow = () => {
      if (dismissed) return;
      dismissed = true;
      observer.disconnect();
      clearTimeout(failsafeTimer);

      // Wait one animation frame so the newly mounted page is painted underneath before cross-fading.
      raf1 = requestAnimationFrame(() => {
        splash.classList.add("splash-dismissed");
        splash.style.opacity = "0";
        splash.style.pointerEvents = "none";
        removeTimer = setTimeout(() => {
          splash.remove();
        }, 150);
      });
    };

    const isStillLoading = () =>
      Boolean(document.querySelector('[data-zera-loading="true"]'));

    const checkReady = () => {
      if (!isStillLoading()) {
        fadeOutNow();
      }
    };

    const observer = new MutationObserver(checkReady);
    observer.observe(document.body, { childList: true, subtree: true });

    const failsafeTimer = setTimeout(fadeOutNow, MAX_SPLASH_WAIT_MS);

    // Check immediately (handles instant client/static pages with no Suspense fallback)
    checkReady();

    return () => {
      observer.disconnect();
      clearTimeout(failsafeTimer);
      if (raf1 !== null) cancelAnimationFrame(raf1);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, []);

  return null;
}
