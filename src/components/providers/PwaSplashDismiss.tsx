"use client";

import { useEffect } from "react";

const MIN_SPLASH_VISIBLE_MS = 200;

export function PwaSplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("zera-pwa-splash");
    if (!splash) return;

    const mountedAt = Date.now();
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let removeTimer: ReturnType<typeof setTimeout> | null = null;

    const fadeOutNow = () => {
      splash.classList.add("splash-dismissed");
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
      removeTimer = setTimeout(() => {
        splash.remove();
      }, 320);
    };

    const scheduleFadeOut = () => {
      const elapsed = Date.now() - mountedAt;
      const remaining = Math.max(0, MIN_SPLASH_VISIBLE_MS - elapsed);
      if (remaining === 0) {
        fadeOutNow();
      } else {
        delayTimer = setTimeout(fadeOutNow, remaining);
      }
    };

    scheduleFadeOut();

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, []);

  return null;
}
