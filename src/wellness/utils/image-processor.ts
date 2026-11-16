import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

const MAX_INPUT_PIXELS = 25_000_000; // 25 MP cap prevents decompression-bomb memory DoS

export function detectImageMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export interface ImageOptimizeOptions {
  maxWidth: number;
  maxHeight: number;
  fit: "inside" | "cover";
  quality?: number;
}

/**
 * Decodes, auto-orients, strips all EXIF/GPS/IPTC metadata, resizes, and re-encodes
 * untrusted image bytes to compact WebP via Sharp. Rejects malformed or polyglot payloads.
 */
export async function processAndOptimizeImage(
  inputBuffer: Buffer,
  options: ImageOptimizeOptions
): Promise<{ buffer: Buffer; mime: "image/webp"; ext: "webp" }> {
  const mime = detectImageMime(inputBuffer);
  if (!mime) {
    throw new Error("File content is not a valid JPEG, PNG, or WebP image.");
  }

  const output = await sharp(inputBuffer, {
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: "truncated",
  })
    .rotate() // Applies EXIF orientation then strips all EXIF/GPS/metadata by default
    .resize({
      width: options.maxWidth,
      height: options.maxHeight,
      fit: options.fit,
      withoutEnlargement: options.fit === "inside",
    })
    .webp({ quality: options.quality ?? 78, effort: 4 })
    .toBuffer();

  return {
    buffer: output,
    mime: "image/webp",
    ext: "webp",
  };
}

export function getPrivateWorkoutUploadDir(): string {
  return path.join(process.cwd(), "storage", "uploads", "workouts");
}

export function getLegacyPublicWorkoutUploadDir(): string {
  return path.join(process.cwd(), "public", "uploads", "workouts");
}

/**
 * Best-effort cleanup of local uploaded workout/progress images owned by a user
 * (called on account deletion so orphaned storage objects do not accumulate).
 */
export async function cleanupUserUploadedFiles(userId: string): Promise<number> {
  if (!userId || !/^[A-Za-z0-9_-]+$/.test(userId)) return 0;
  let removed = 0;
  const dirs = [getPrivateWorkoutUploadDir(), getLegacyPublicWorkoutUploadDir()];
  const prefix = `${userId}-`;

  for (const dir of dirs) {
    try {
      const entries = await fs.readdir(dir);
      for (const entry of entries) {
        if (entry.startsWith(prefix)) {
          await fs.unlink(path.join(dir, entry)).catch(() => undefined);
          removed++;
        }
      }
    } catch {
      // Directory may not exist in serverless or clean environments
    }
  }
  return removed;
}
