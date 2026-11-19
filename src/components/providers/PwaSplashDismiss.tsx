"use client";

import { useEffect } from "react";

const MIN_SPLASH_VISIBLE_MS = 180;

export function PwaSplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("zera-pwa-splash");
    if (!splash) return;

    const mountedAt = Date.now();
    let dismissed = false;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    const fadeOutNow = () => {
      if (dismissed) return;
      dismissed = true;
      requestAnimationFrame(() => {
        splash.style.opacity = "0";
        splash.style.pointerEvents = "none";
        setTimeout(() => {
          splash.remove();
        }, 280);
      });
    };

    const scheduleFadeOut = () => {
      if (dismissed) return;
      const elapsed = Date.now() - mountedAt;
      const remaining = Math.max(0, MIN_SPLASH_VISIBLE_MS - elapsed);
      if (remaining === 0) {
        fadeOutNow();
      } else if (!delayTimer) {
        delayTimer = setTimeout(() => {
          delayTimer = null;
          // Re-check right before fading in case a route Suspense loader appeared
          if (!document.querySelector('[data-zera-loading="true"]')) {
            fadeOutNow();
          }
        }, remaining);
      }
    };

    const checkReady = () => {
      const stillLoading = document.querySelector('[data-zera-loading="true"]');
      if (!stillLoading) {
        scheduleFadeOut();
        return true;
      }
      return false;
    };

    if (checkReady()) {
      return () => {
        if (delayTimer) clearTimeout(delayTimer);
      };
    }

    const observer = new MutationObserver(() => {
      if (checkReady()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const maxTimer = setTimeout(() => {
      observer.disconnect();
      fadeOutNow();
    }, 6000);

    return () => {
      observer.disconnect();
      clearTimeout(maxTimer);
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, []);

  return null;
}
