"use client";

import { useEffect } from "react";

export function PwaSplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("bms-pwa-splash");
    if (!splash) return;

    let dismissed = false;
    const startedAt = Date.now();
    const minVisibleMs = 450;

    const fadeOut = () => {
      if (dismissed) return;
      dismissed = true;
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minVisibleMs - elapsed);
      setTimeout(() => {
        splash.style.opacity = "0";
        splash.style.pointerEvents = "none";
        setTimeout(() => {
          splash.remove();
        }, 350);
      }, remaining);
    };

    const checkReady = () => {
      const stillLoading = document.querySelector('[data-bms-loading="true"]');
      if (!stillLoading) {
        fadeOut();
        return true;
      }
      return false;
    };

    if (checkReady()) return;

    const observer = new MutationObserver(() => {
      if (checkReady()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Safety fallback so splash never stays stuck indefinitely
    const maxTimer = setTimeout(() => {
      observer.disconnect();
      fadeOut();
    }, 6000);

    return () => {
      observer.disconnect();
      clearTimeout(maxTimer);
    };
  }, []);

  return null;
}

