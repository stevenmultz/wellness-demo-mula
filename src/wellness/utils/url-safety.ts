/**
 * Shared URL validation and sanitization helpers to block javascript:, data:text/html,
 * and other unsafe URI schemes in validated payloads and UI href/src attributes.
 */

const SAFE_UPLOAD_PATH_RE = /^\/uploads\/(?!.*\.\.)[A-Za-z0-9._\-\/]+$/;
const SAFE_DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Returns a normalized http(s) URL string or null if invalid / unsafe scheme.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Validates and normalizes user-submitted photo URLs (internal /uploads/, raster image
 * data URIs produced by serverless fallback, or external http(s) image URLs).
 */
export function safeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (SAFE_UPLOAD_PATH_RE.test(trimmed)) return trimmed;
  if (SAFE_DATA_IMAGE_RE.test(trimmed)) return trimmed;
  return safeHttpUrl(trimmed);
}

/**
 * Boolean check for Zod schema refinements on optional/nullable photo fields.
 */
export function isSafePhotoUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  return safeMediaUrl(url) !== null;
}
