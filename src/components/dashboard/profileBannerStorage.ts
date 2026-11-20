export const DEFAULT_PROFILE_BANNER = "/image.webp";

export const PROFILE_BANNER_PRESETS = [
  { id: "sanctuary", label: "Sanctuary", src: "/image.webp" },
  { id: "movement", label: "Movement", src: "/test.webp" },
  { id: "cohort", label: "Cohort", src: "/pic.webp" },
] as const;

const BANNER_STORAGE_PREFIX = "zera_profile_banner_v1:";
export const PROFILE_BANNER_EVENT = "zera:profile-banner-changed";

export function getProfileBannerStorageKey(userId: string): string {
  return `${BANNER_STORAGE_PREFIX}${userId}`;
}

export function loadSavedProfileBanner(userId?: string | null): string {
  if (!userId || typeof window === "undefined") return DEFAULT_PROFILE_BANNER;
  try {
    const saved = window.localStorage.getItem(getProfileBannerStorageKey(userId));
    if (saved && (saved.startsWith("/") || saved.startsWith("data:image/"))) {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }
  return DEFAULT_PROFILE_BANNER;
}

export function saveProfileBanner(userId: string, bannerSrc: string | null): string {
  const next = bannerSrc && bannerSrc.trim() ? bannerSrc.trim() : DEFAULT_PROFILE_BANNER;
  if (typeof window !== "undefined") {
    try {
      const key = getProfileBannerStorageKey(userId);
      if (!bannerSrc || next === DEFAULT_PROFILE_BANNER) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, next);
      }
      window.dispatchEvent(
        new CustomEvent(PROFILE_BANNER_EVENT, { detail: { userId, banner: next } })
      );
    } catch {
      // Ignore quota / storage errors
    }
  }
  return next;
}

export function resizeBannerImage(
  file: File,
  targetWidth = 1080,
  targetHeight = 450
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        const targetRatio = targetWidth / targetHeight;
        const imgRatio = img.width / img.height;

        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;

        if (imgRatio > targetRatio) {
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas is not supported."));
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
