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

const SIZE_HEIGHT_PX: Record<NonNullable<BrandLogoProps["size"]>, number> = {
  sm: 14,
  md: 16,
  lg: 19,
  xl: 28,
};

/**
 * Exact Thin Urbanist vector paths for "zera" and ".id" (viewBox 0 0 296 80).
 * Using inline vector outlines guarantees zero webfont wait (0ms FOUT) and 100%
 * identical Thin Urbanist geometry across iOS splash images, PWA launch shell,
 * Suspense loading screens, and all app headers/navbars.
 */
export const ZERA_THIN_PRIMARY_PATH =
  "M44.7 31.9L8.85 72.1L44.7 72.1L44.7 77L2 77L2 72.1L37.85 31.9L2 31.9L2 27L44.7 27ZM78.2 78.3Q71.3 78.3 65.63 74.75Q59.95 71.2 56.58 65.22Q53.2 59.25 53.2 52Q53.2 44.7 56.58 38.7Q59.95 32.7 65.63 29.15Q71.3 25.6 78.2 25.6Q85.5 25.6 91.15 29.25Q96.8 32.9 99.98 39.32Q103.15 45.75 103.05 54.05L58.3 54.05Q58.85 59.6 61.6 63.95Q64.35 68.3 68.68 70.83Q73 73.35 78.2 73.4Q83.9 73.4 88.5 70.38Q93.1 67.35 95.85 62.05L100.8 63.2Q97.8 69.85 91.75 74.08Q85.7 78.3 78.2 78.3ZM58.2 49.8L98.1 49.8Q97.8 44.5 95.08 40.05Q92.35 35.6 87.93 32.9Q83.5 30.2 78.2 30.2Q72.85 30.2 68.5 32.82Q64.15 35.45 61.4 39.9Q58.65 44.35 58.2 49.8ZM113.55 77L113.55 27L118.45 27L118.45 34.85Q121.2 30.65 125.7 28.13Q130.2 25.6 135.55 25.6Q138.5 25.6 141.15 26.35L139.15 31.15Q137.1 30.55 134.9 30.55Q130.35 30.55 126.63 32.77Q122.9 35 120.68 38.73Q118.45 42.45 118.45 47L118.45 77ZM192.1 27L197.05 27L197.05 77L192.1 77L192 66.45Q189.4 71.8 184.58 75.05Q179.75 78.3 173.05 78.3Q167.6 78.3 162.8 76.25Q158 74.2 154.38 70.55Q150.75 66.9 148.7 62.13Q146.65 57.35 146.65 51.9Q146.65 44.6 150.18 38.65Q153.7 32.7 159.65 29.15Q165.6 25.6 172.85 25.6Q179.65 25.6 184.58 28.9Q189.5 32.2 192.2 37.5ZM173 73.5Q178.9 73.5 183.1 70.58Q187.3 67.65 189.53 62.77Q191.75 57.9 191.75 52Q191.75 45.95 189.5 41.07Q187.25 36.2 183.03 33.32Q178.8 30.45 173 30.45Q167.05 30.45 162.22 33.35Q157.4 36.25 154.53 41.15Q151.65 46.05 151.65 52Q151.65 58.05 154.6 62.9Q157.55 67.75 162.4 70.63Q167.25 73.5 173 73.5Z";

export const ZERA_THIN_ACCENT_PATH =
  "M211.55 78.3Q210.3 78.3 209.4 77.4Q208.5 76.5 208.5 75.15Q208.5 73.9 209.4 73Q210.3 72.1 211.55 72.1Q212.85 72.1 213.78 73Q214.7 73.9 214.7 75.15Q214.7 76.5 213.78 77.4Q212.85 78.3 211.55 78.3ZM228.2 27L233.1 27L233.1 77L228.2 77ZM230.7 17.35Q229.35 17.35 228.45 16.5Q227.55 15.65 227.55 14.3Q227.55 13 228.45 12.13Q229.35 11.25 230.7 11.25Q231.95 11.25 232.85 12.13Q233.75 13 233.75 14.3Q233.75 15.65 232.85 16.5Q231.95 17.35 230.7 17.35ZM289.05 2L294 2L294 77L289.05 77L289.05 66.45Q286.4 71.75 281.52 75.03Q276.65 78.3 269.9 78.3Q264.45 78.3 259.7 76.25Q254.95 74.2 251.32 70.58Q247.7 66.95 245.65 62.2Q243.6 57.45 243.6 52Q243.6 46.55 245.65 41.75Q247.7 36.95 251.32 33.32Q254.95 29.7 259.7 27.65Q264.45 25.6 269.9 25.6Q276.65 25.6 281.52 28.88Q286.4 32.15 289.05 37.5ZM269.95 73.5Q275.85 73.5 280.05 70.58Q284.25 67.65 286.48 62.77Q288.7 57.9 288.7 52Q288.7 45.95 286.45 41.07Q284.2 36.2 279.98 33.32Q275.75 30.45 269.95 30.45Q264.05 30.45 259.2 33.35Q254.35 36.25 251.47 41.15Q248.6 46.05 248.6 52Q248.6 58.05 251.55 62.9Q254.5 67.75 259.35 70.63Q264.2 73.5 269.95 73.5Z";

export function BrandLogo({
  size = "md",
  tone = "auto",
  className = "",
  style,
}: BrandLogoProps) {
  const heightPx = SIZE_HEIGHT_PX[size];
  const widthPx = Math.round((heightPx * 296) / 80 * 100) / 100;

  const toneClass =
    tone === "light"
      ? "text-white"
      : tone === "dark"
        ? "text-zinc-950"
        : "text-zinc-950 dark:text-white";

  const accentClass =
    tone === "light"
      ? "fill-white/75"
      : tone === "dark"
        ? "fill-zinc-500"
        : "fill-zinc-500 dark:fill-zinc-400";

  const inlinePrimaryFill =
    tone === "light" ? "#ffffff" : tone === "dark" ? "#09090b" : "currentColor";
  const inlineAccentFill =
    tone === "light" ? "rgba(255,255,255,0.75)" : tone === "dark" ? "#71717a" : undefined;

  return (
    <span
      className={`select-none inline-flex items-center leading-none ${toneClass} ${className}`}
      style={style}
    >
      <span className="sr-only">{BRAND.name}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 296 80"
        width={widthPx}
        height={heightPx}
        aria-hidden="true"
        focusable="false"
        className="block shrink-0"
        style={{ height: `${heightPx}px`, width: "auto", display: "block" }}
      >
        <path d={ZERA_THIN_PRIMARY_PATH} className="fill-current" fill={inlinePrimaryFill} />
        <path d={ZERA_THIN_ACCENT_PATH} className={accentClass} fill={inlineAccentFill} />
      </svg>
    </span>
  );
}

export default BrandLogo;
