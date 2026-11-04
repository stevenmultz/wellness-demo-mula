"use client";

export function AuraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#f4f4f6] dark:bg-[#070709]">
      {/* Base Radial Metallic Monochrome Gradient - 0% GPU convolution overhead */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.98)_0%,_rgba(230,230,234,0.65)_45%,_rgba(244,244,246,0.95)_100%)] dark:bg-[radial-gradient(ellipse_at_top_left,_rgba(35,35,42,0.45)_0%,_rgba(7,7,9,0.98)_70%)]" />

      {/* Static Ambient Luxury Reflections (Pure radial gradients, zero heavy blur filters) */}
      <div className="absolute -top-[15%] right-[5%] w-[45vw] h-[40vh] rounded-full opacity-35 dark:opacity-15 bg-[radial-gradient(circle,_rgba(228,228,231,0.5)_0%,_transparent_70%)]" />
      <div className="absolute top-[15%] -left-[10%] w-[45vw] h-[45vh] rounded-full opacity-25 dark:opacity-10 bg-[radial-gradient(circle,_rgba(212,212,216,0.4)_0%,_transparent_70%)]" />
      <div className="absolute -bottom-[10%] right-[10%] w-[40vw] h-[35vh] rounded-full opacity-30 dark:opacity-10 bg-[radial-gradient(circle,_rgba(212,212,216,0.35)_0%,_transparent_70%)]" />
    </div>
  );
}
