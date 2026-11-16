import { NextRequest, NextResponse } from "next/server";
import { getWellnessSession } from "@/wellness/security/session";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { checkRateLimit } from "@/wellness/security/rate-limit";
import {
  detectImageMime,
  getPrivateWorkoutUploadDir,
  processAndOptimizeImage,
} from "@/wellness/utils/image-processor";
import {
  MAX_UPLOAD_BODY_BYTES,
  MAX_UPLOAD_BYTES,
  RATE_LIMITS,
} from "@/wellness/config";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["before", "after", "front", "side", "back", "profile", "custom"]);

/**
 * Authenticated photo upload endpoint.
 * Validates magic bytes, decodes & re-encodes via Sharp (stripping EXIF/GPS metadata and
 * compressing to WebP <= 1280px), and stores outside public/ behind /api/media/workouts/.
 */
export async function POST(request: NextRequest) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`upload:${session.userId}`, RATE_LIMITS.upload);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many uploads. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  // Reject oversized bodies before buffering/parsing them.
  const declaredLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declaredLength) || declaredLength <= 0 || declaredLength > MAX_UPLOAD_BODY_BYTES) {
    return NextResponse.json(
      { success: false, message: "Upload is too large or has no declared size." },
      { status: 413 }
    );
  }

  try {
    const body = await request.json();
    const { dataUrl, type } = body as { dataUrl?: string; type?: string };

    if (!dataUrl || typeof dataUrl !== "string") {
      return NextResponse.json({ success: false, message: "Missing image data" }, { status: 400 });
    }

    const match = dataUrl.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
    if (!match) {
      return NextResponse.json(
        { success: false, message: "Invalid image format. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    const base64Data = match[1];
    const rawBuffer = Buffer.from(base64Data, "base64");

    // Limit upload payload to 5MB
    if (rawBuffer.length === 0 || rawBuffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, message: "File exceeds 5MB size limit or is empty" },
        { status: 400 }
      );
    }

    // Verify true magic byte image signature (never trust client-declared MIME)
    if (!detectImageMime(rawBuffer)) {
      return NextResponse.json(
        { success: false, message: "Uploaded file content is not a valid JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Full decode, EXIF/GPS metadata strip, resize & WebP compression
    let optimized: { buffer: Buffer; mime: "image/webp"; ext: "webp" };
    try {
      optimized = await processAndOptimizeImage(rawBuffer, {
        maxWidth: 1280,
        maxHeight: 1280,
        fit: "inside",
        quality: 78,
      });
    } catch {
      return NextResponse.json(
        { success: false, message: "Uploaded file could not be decoded as a valid image." },
        { status: 400 }
      );
    }

    const uploadDir = getPrivateWorkoutUploadDir();
    const uniqueId = crypto.randomBytes(12).toString("hex");
    const safeType = type && ALLOWED_TYPES.has(type) ? type : "photo";
    const safeUserId = session.userId.replace(/[^A-Za-z0-9_-]/g, "");
    const filename = `${safeUserId}-${safeType}-${Date.now()}-${uniqueId}.${optimized.ext}`;
    const filePath = path.join(uploadDir, filename);

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(filePath, optimized.buffer);
      return NextResponse.json({
        success: true,
        url: `/api/media/workouts/${filename}`,
      });
    } catch {
      // In serverless / read-only filesystem environments (e.g. Vercel Lambda),
      // return the compact, EXIF-stripped WebP data URL so uploads remain functional
      const fallbackDataUrl = `data:${optimized.mime};base64,${optimized.buffer.toString("base64")}`;
      return NextResponse.json({
        success: true,
        url: fallbackDataUrl,
      });
    }
  } catch (error) {
    console.error("[Upload API Error]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process photo upload" },
      { status: 500 }
    );
  }
}
