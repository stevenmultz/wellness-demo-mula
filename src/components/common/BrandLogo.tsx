import type { CSSProperties } from "react";
import { BRAND } from "@/wellness/brand";

export interface BrandLogoProps {
  /** Visual size preset */
  size?: "sm" | "md" | "lg";
  /** Color tone: "auto" adapts to light/dark theme; "light" forces white text; "dark" forces black text */
  tone?: "auto" | "light" | "dark";
  /** Optional additional classes */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

const SIZE_CLASSES: Record<
  NonNullable<BrandLogoProps["size"]>,
  { text: string; accent: string; gap: string }
> = {
  sm: {
    text: "font-semibold text-xs tracking-[0.14em] leading-none",
    accent: "font-light text-xs tracking-[0.08em] leading-none opacity-75",
    gap: "gap-0",
  },
  md: {
    text: "font-semibold text-sm tracking-[0.16em] leading-none",
    accent: "font-light text-sm tracking-[0.08em] leading-none opacity-75",
    gap: "gap-0",
  },
  lg: {
    text: "font-semibold text-base tracking-[0.18em] leading-none",
    accent: "font-light text-base tracking-[0.08em] leading-none opacity-75",
    gap: "gap-0",
  },
};

/**
 * Single unified brand logo component used across Public Navbar, Dashboard, Admin, Modals, and Loading states.
 * Uses Urbanist (--font-geometric) uniformly for the clean "zera.id" wordmark.
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
      : tone === "dark"
        ? "text-zinc-950"
        : "text-zinc-950 dark:text-white";

  return (
    <span
      className={`select-none inline-flex items-baseline font-geometric lowercase ${preset.gap} ${toneClass} ${className}`}
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
