export interface AppleSplashSpec {
  href: string;
  deviceWidth: number;
  deviceHeight: number;
  dpr: number;
}

const SPLASH_VERSION = "v5";

const APPLE_SPLASH_DEVICES: AppleSplashSpec[] = [
  // iPhone SE 2/3, 8, 7, 6s
  { href: `/splash/splash-750x1334.png?${SPLASH_VERSION}`, deviceWidth: 375, deviceHeight: 667, dpr: 2 },
  // iPhone XR, 11
  { href: `/splash/splash-828x1792.png?${SPLASH_VERSION}`, deviceWidth: 414, deviceHeight: 896, dpr: 2 },
  // iPhone X, XS, 11 Pro, 12 mini, 13 mini
  { href: `/splash/splash-1125x2436.png?${SPLASH_VERSION}`, deviceWidth: 375, deviceHeight: 812, dpr: 3 },
  // iPhone 12, 12 Pro, 13, 13 Pro, 14, 16e
  { href: `/splash/splash-1170x2532.png?${SPLASH_VERSION}`, deviceWidth: 390, deviceHeight: 844, dpr: 3 },
  // iPhone 14 Pro, 15, 15 Pro, 16
  { href: `/splash/splash-1179x2556.png?${SPLASH_VERSION}`, deviceWidth: 393, deviceHeight: 852, dpr: 3 },
  // iPhone 16 Pro, 17
  { href: `/splash/splash-1206x2622.png?${SPLASH_VERSION}`, deviceWidth: 402, deviceHeight: 874, dpr: 3 },
  // iPhone 8 Plus, 7 Plus, 6s Plus
  { href: `/splash/splash-1242x2208.png?${SPLASH_VERSION}`, deviceWidth: 414, deviceHeight: 736, dpr: 3 },
  // iPhone XS Max, 11 Pro Max
  { href: `/splash/splash-1242x2688.png?${SPLASH_VERSION}`, deviceWidth: 414, deviceHeight: 896, dpr: 3 },
  // iPhone Air / 17 Air
  { href: `/splash/splash-1260x2736.png?${SPLASH_VERSION}`, deviceWidth: 420, deviceHeight: 912, dpr: 3 },
  // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
  { href: `/splash/splash-1284x2778.png?${SPLASH_VERSION}`, deviceWidth: 428, deviceHeight: 926, dpr: 3 },
  // iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { href: `/splash/splash-1290x2796.png?${SPLASH_VERSION}`, deviceWidth: 430, deviceHeight: 932, dpr: 3 },
  // iPhone 16 Pro Max, 17 Pro Max
  { href: `/splash/splash-1320x2868.png?${SPLASH_VERSION}`, deviceWidth: 440, deviceHeight: 956, dpr: 3 },
  // iPad mini 6/7
  { href: `/splash/splash-1488x2266.png?${SPLASH_VERSION}`, deviceWidth: 744, deviceHeight: 1133, dpr: 2 },
  // iPad 9.7" / mini
  { href: `/splash/splash-1536x2048.png?${SPLASH_VERSION}`, deviceWidth: 768, deviceHeight: 1024, dpr: 2 },
  // iPad Air 10.9" / iPad 10
  { href: `/splash/splash-1640x2360.png?${SPLASH_VERSION}`, deviceWidth: 820, deviceHeight: 1180, dpr: 2 },
  // iPad Air 10.5"
  { href: `/splash/splash-1668x2224.png?${SPLASH_VERSION}`, deviceWidth: 834, deviceHeight: 1112, dpr: 2 },
  // iPad Pro 11"
  { href: `/splash/splash-1668x2388.png?${SPLASH_VERSION}`, deviceWidth: 834, deviceHeight: 1194, dpr: 2 },
  // iPad Pro 12.9"
  { href: `/splash/splash-2048x2732.png?${SPLASH_VERSION}`, deviceWidth: 1024, deviceHeight: 1366, dpr: 2 },
];

/**
 * Generates exact iOS WebKit apple-touch-startup-image link entries for BOTH
 * light and dark system appearance, both pointing to the pure-white zera.id splash PNGs
 * so iPhones in Dark Mode never fall back to a black launch window.
 * Includes a universal fallback startup image without media query to cover any unlisted screen ratios.
 */
export const APPLE_SPLASH_LINKS: Array<{ key: string; href: string; media?: string }> = [
  {
    key: "apple-splash-universal-fallback",
    href: `/splash/splash-1179x2556.png?${SPLASH_VERSION}`,
  },
  ...APPLE_SPLASH_DEVICES.flatMap((d) => {
    const base = `screen and (device-width: ${d.deviceWidth}px) and (device-height: ${d.deviceHeight}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)`;
    return [
      {
        key: `${d.deviceWidth}x${d.deviceHeight}@${d.dpr}-light`,
        href: d.href,
        media: `${base} and (prefers-color-scheme: light)`,
      },
      {
        key: `${d.deviceWidth}x${d.deviceHeight}@${d.dpr}-dark`,
        href: d.href,
        media: `${base} and (prefers-color-scheme: dark)`,
      },
    ];
  }),
];
