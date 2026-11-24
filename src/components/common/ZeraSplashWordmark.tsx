import { BrandLogo, type BrandLogoProps } from "./BrandLogo";

/**
 * Unified Urbanist "zera.id" wordmark for splash and loading screens.
 * Delegates directly to <BrandLogo /> so header, navbar, modals, splash, and loading
 * screens all render the exact same Urbanist typography without inconsistency.
 */
export function ZeraSplashWordmark({
  size = "xl",
  tone = "dark",
  className = "",
  style,
}: Partial<BrandLogoProps>) {
  return <BrandLogo size={size} tone={tone} className={className} style={style} />;
}

export default ZeraSplashWordmark;
