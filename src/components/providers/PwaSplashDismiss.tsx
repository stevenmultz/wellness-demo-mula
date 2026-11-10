"use client";

import { useEffect } from "react";

export function PwaSplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("bms-pwa-splash");
    if (splash) {
      // Fade out splash as soon as React client application has mounted
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
      const timer = setTimeout(() => {
        splash.remove();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
