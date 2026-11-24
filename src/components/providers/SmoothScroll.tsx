"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type LenisInstance = {
  scrollTo: (target: number, opts?: { immediate?: boolean }) => void;
  raf: (time: number) => void;
  destroy: () => void;
};

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisInstance | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Reset scroll position to top when navigating to a new route
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  useEffect(() => {
    // Bypass Lenis on touch/mobile devices, when reduced motion is requested,
    // or inside app/admin workspaces (/dashboard, /admin) where native scrolling is instant and zero-overhead.
    if (typeof window === "undefined") return;

    const isAppWorkspace =
      pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isTouchDevice =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 768;

    if (isAppWorkspace || prefersReducedMotion || isTouchDevice) {
      return;
    }

    let cancelled = false;
    let frameId: number | null = null;
    let lenis: LenisInstance | null = null;

    // Dynamically import Lenis only on desktop public pages so mobile & dashboard skip parsing it
    import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled) return;
        lenis = new Lenis({
          duration: 1.0,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: "vertical",
          gestureOrientation: "vertical",
          smoothWheel: true,
          wheelMultiplier: 0.95,
          infinite: false,
        });

        lenisRef.current = lenis;

        function raf(time: number) {
          if (cancelled || !lenis) return;
          lenis.raf(time);
          frameId = requestAnimationFrame(raf);
        }
        frameId = requestAnimationFrame(raf);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, [pathname]);

  return <>{children}</>;
}
