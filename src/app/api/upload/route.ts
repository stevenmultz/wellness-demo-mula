import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getWellnessSession, isAdminRole, isPlatformAdminRole } from "@/wellness/security/session";
import { verifySameOriginRequest } from "@/wellness/security/csrf";
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
import { reportServerError } from "@/wellness/observability";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["profile", "custom", "org-logo", "program-cover"]);
const ADMIN_ONLY_TYPES = new Set(["org-logo", "program-cover"]);

const IMAGE_PROFILES: Record<
  string,
  { maxWidth: number; maxHeight: number; fit: "inside" | "cover"; quality: number }
> = {
  "org-logo": { maxWidth: 256, maxHeight: 256, fit: "inside", quality: 84 },
  "program-cover": { maxWidth: 1280, maxHeight: 720, fit: "inside", quality: 80 },
  default: { maxWidth: 1280, maxHeight: 1280, fit: "inside", quality: 78 },
};

/**
 * Authenticated photo upload endpoint backed by private Supabase Storage (with Sharp WebP fallback).
 * Validates magic bytes, decodes & re-encodes via Sharp (stripping EXIF/GPS metadata and
 * compressing to WebP), and returns a signed-proxy path or inline data URI when storage is unconfigured.
 */
export async function POST(request: NextRequest) {
  if (!verifySameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Cross-origin request rejected." }, { status: 403 });
  }
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
    const safeType = type && ALLOWED_TYPES.has(type) ? type : "custom";

    if (safeType === "program-cover" && !isPlatformAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Only ZERA Admin or Superadmin can upload program covers." },
        { status: 403 }
      );
    }
    if (ADMIN_ONLY_TYPES.has(safeType) && !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin privileges required for branding assets." },
        { status: 403 }
      );
    }

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

    const profile = IMAGE_PROFILES[safeType] ?? IMAGE_PROFILES.default;
    let optimized: { buffer: Buffer; mime: "image/webp"; ext: "webp" };
    try {
      optimized = await processAndOptimizeImage(rawBuffer, profile);
    } catch {
      return NextResponse.json(
        { success: false, message: "Uploaded file could not be decoded as a valid image." },
        { status: 400 }
      );
    }

    if (!isSupabaseStorageConfigured()) {
      const inlineDataUrl = `data:${optimized.mime};base64,${optimized.buffer.toString("base64")}`;
      return NextResponse.json({
        success: true,
        storagePath: inlineDataUrl,
        previewUrl: inlineDataUrl,
        url: inlineDataUrl,
      });
    }

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
    reportServerError("media", "upload_asset", error, { userId: session.userId });
    return NextResponse.json(
      { success: false, message: "Failed to process photo upload" },
      { status: 500 }
    );
  }
}
