"use client";

import { useEffect } from "react";

export function PwaSplashDismiss() {
  useEffect(() => {
    const splash = document.getElementById("bms-pwa-splash");
    if (splash) {
      // Keep splash visible for 750ms so user actually sees the +BMS logo clearly, then smoothly fade out
      const timer = setTimeout(() => {
        splash.style.opacity = "0";
        splash.style.pointerEvents = "none";
        setTimeout(() => {
          splash.remove();
        }, 400);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
