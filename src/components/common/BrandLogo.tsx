import type { CSSProperties } from "react";
import { BRAND } from "@/wellness/brand";

export interface BrandLogoProps {
  /** Visual size preset */
  size?: "sm" | "md" | "lg";
  /** Color tone: "auto" adapts to light/dark theme; "light" forces white text for dark/image overlays */
  tone?: "auto" | "light";
  /** Optional additional classes */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps["size"]>, { text: string; accent: string; gap: string }> = {
  sm: {
    text: "font-semibold text-xs tracking-[0.24em]",
    accent: "font-light text-base leading-none",
    gap: "gap-1",
  },
  md: {
    text: "font-semibold text-sm tracking-[0.22em]",
    accent: "font-mono font-light text-lg leading-none",
    gap: "gap-1.5",
  },
  lg: {
    text: "font-semibold text-base tracking-[0.28em]",
    accent: "font-mono font-light text-xl leading-none",
    gap: "gap-2",
  },
};

/**
 * Single unified brand logo component used across Public Navbar, Dashboard, Admin, Modals, and Loading states.
 */
export function BrandLogo({
  size = "md",
  tone = "auto",
  className = "",
  style,
}: BrandLogoProps) {
  const preset = SIZE_CLASSES[size];
  const toneClass =
    tone === "light"
      ? "text-white"
      : "text-zinc-950 dark:text-white";

  return (
    <span
      className={`select-none inline-flex items-center font-geometric uppercase ${preset.gap} ${toneClass} ${className}`}
      style={style}
    >
      <span className={preset.text}>{BRAND.wordmarkPrimary}</span>
      <span className={preset.accent} aria-hidden="true">
        {BRAND.wordmarkAccent}
      </span>
    </span>
  );
}

export default BrandLogo;
