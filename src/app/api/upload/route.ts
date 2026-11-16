import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getWellnessSession } from "@/wellness/security/session";
import { checkDistributedRateLimit } from "@/wellness/security/rate-limit";
import { detectImageMime, processAndOptimizeImage } from "@/wellness/utils/image-processor";
import {
  isSupabaseStorageConfigured,
  STORAGE_BUCKETS,
  uploadPrivateStorageObject,
} from "@/wellness/integrations/supabase-storage";
import {
  MAX_UPLOAD_BODY_BYTES,
  MAX_UPLOAD_BYTES,
  RATE_LIMITS,
} from "@/wellness/config";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["profile", "custom"]);

/**
 * Authenticated photo upload endpoint backed by private Supabase Storage.
 * Validates magic bytes, decodes & re-encodes via Sharp (stripping EXIF/GPS metadata and
 * compressing to WebP <= 1280px), and returns a signed-proxy path.
 */
export async function POST(request: NextRequest) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkDistributedRateLimit(`upload:${session.userId}`, RATE_LIMITS.upload);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many uploads. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: "Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 }
    );
  }

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

    if (rawBuffer.length === 0 || rawBuffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, message: "File exceeds 5MB size limit or is empty" },
        { status: 400 }
      );
    }

    if (!detectImageMime(rawBuffer)) {
      return NextResponse.json(
        { success: false, message: "Uploaded file content is not a valid JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

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

    const safeType = type && ALLOWED_TYPES.has(type) ? type : "custom";
    const safeUserId = session.userId.replace(/[^A-Za-z0-9_-]/g, "");
    const uniqueId = crypto.randomBytes(12).toString("hex");
    const objectPath = `${safeUserId}/${safeType}-${Date.now()}-${uniqueId}.${optimized.ext}`;

    const { storageUri, signedUrl } = await uploadPrivateStorageObject({
      bucket: STORAGE_BUCKETS.WORKOUT_MEDIA,
      objectPath,
      buffer: optimized.buffer,
      contentType: optimized.mime,
    });

    return NextResponse.json({
      success: true,
      storagePath: storageUri,
      previewUrl: signedUrl,
      url: `/api/media/signed?path=${encodeURIComponent(storageUri)}`,
    });
  } catch (error) {
    console.error("[Upload API Error]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process photo upload" },
      { status: 500 }
    );
  }
}
