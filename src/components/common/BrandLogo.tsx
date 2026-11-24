import type { CSSProperties } from "react";
import { BRAND } from "@/wellness/brand";

export interface BrandLogoProps {
  /** Visual size preset */
  size?: "sm" | "md" | "lg" | "xl";
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
    text: "font-semibold text-xs tracking-[-0.02em] leading-none",
    accent: "font-normal text-xs tracking-[-0.02em] leading-none",
    gap: "gap-0",
  },
  md: {
    text: "font-semibold text-sm tracking-[-0.02em] leading-none",
    accent: "font-normal text-sm tracking-[-0.02em] leading-none",
    gap: "gap-0",
  },
  lg: {
    text: "font-semibold text-base tracking-[-0.02em] leading-none",
    accent: "font-normal text-base tracking-[-0.02em] leading-none",
    gap: "gap-0",
  },
  xl: {
    text: "font-semibold text-[1.75rem] tracking-[-0.02em] leading-none",
    accent: "font-normal text-[1.75rem] tracking-[-0.02em] leading-none",
    gap: "gap-0",
  },
};

/**
 * Single unified brand logo component used across Public Navbar, Dashboard, Admin, Modals, Splash, and Loading states.
 * Uses Urbanist (--font-geometric) uniformly: SemiBold (600) primary + Regular (400) accent for "zera.id".
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
  const accentToneClass =
    tone === "light"
      ? "text-white/75"
      : tone === "dark"
        ? "text-zinc-500"
        : "text-zinc-500 dark:text-zinc-400";

  return (
    <span
      className={`select-none inline-flex items-baseline font-geometric lowercase ${preset.gap} ${toneClass} ${className}`}
      style={style}
    >
      <span className={preset.text}>{BRAND.wordmarkPrimary}</span>
      <span className={`${preset.accent} ${accentToneClass}`}>
        {BRAND.wordmarkAccent}
      </span>
    </span>
  );
}

export default BrandLogo;
