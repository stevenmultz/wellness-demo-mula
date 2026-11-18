import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession } from "@/wellness/security/session";
import { verifySameOriginRequest } from "@/wellness/security/csrf";
import { checkDistributedRateLimit } from "@/wellness/security/rate-limit";
import { detectImageMime, processAndOptimizeImage } from "@/wellness/utils/image-processor";
import {
  deleteStorageObjects,
  isSupabaseStorageConfigured,
  STORAGE_BUCKETS,
  uploadPrivateStorageObject,
} from "@/wellness/integrations/supabase-storage";
import {
  MAX_AVATAR_BODY_BYTES,
  MAX_AVATAR_BYTES,
  RATE_LIMITS,
} from "@/wellness/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/profile/avatar  { dataUrl }
 * Verifies magic bytes, resizes to 384x384 WebP (stripping EXIF/GPS), uploads to
 * private Supabase Storage `avatars` bucket, and stores the object path in users.avatar_path.
 */
export async function POST(req: NextRequest) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ success: false, message: "Cross-origin request rejected." }, { status: 403 });
  }
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkDistributedRateLimit(`avatar:${session.userId}`, RATE_LIMITS.avatar);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const declaredLength = Number(req.headers.get("content-length"));
  if (!Number.isFinite(declaredLength) || declaredLength <= 0 || declaredLength > MAX_AVATAR_BODY_BYTES) {
    return NextResponse.json({ success: false, message: "Image is too large." }, { status: 413 });
  }

  try {
    const body = (await req.json()) as { dataUrl?: unknown };
    if (typeof body.dataUrl !== "string") {
      return NextResponse.json({ success: false, message: "Missing image data." }, { status: 400 });
    }

    const match = body.dataUrl.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return NextResponse.json(
        { success: false, message: "Only JPEG, PNG, or WebP images are allowed." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(match[1], "base64");
    if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { success: false, message: "Image is too large. Maximum size is 400 KB after compression." },
        { status: 400 }
      );
    }

    if (!detectImageMime(buffer)) {
      return NextResponse.json(
        { success: false, message: "File content is not a valid JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    let optimized: { buffer: Buffer; mime: "image/webp"; ext: "webp" };
    try {
      optimized = await processAndOptimizeImage(buffer, {
        maxWidth: 384,
        maxHeight: 384,
        fit: "cover",
        quality: 80,
      });
    } catch {
      return NextResponse.json(
        { success: false, message: "File content could not be decoded as a valid image." },
        { status: 400 }
      );
    }

    const oldAvatarPath = session.avatarPath;
    let storedPath = "";
    let clientAvatarUrl = "";

    if (isSupabaseStorageConfigured()) {
      try {
        const safeUserId = session.userId.replace(/[^A-Za-z0-9_-]/g, "");
        const objectPath = `${safeUserId}/avatar-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${optimized.ext}`;
        const { storageUri, signedUrl } = await uploadPrivateStorageObject({
          bucket: STORAGE_BUCKETS.AVATARS,
          objectPath,
          buffer: optimized.buffer,
          contentType: optimized.mime,
        });
        storedPath = storageUri;
        clientAvatarUrl = signedUrl || `/api/media/signed?path=${encodeURIComponent(storageUri)}`;
      } catch {
        const fallbackDataUrl = `data:${optimized.mime};base64,${optimized.buffer.toString("base64")}`;
        storedPath = fallbackDataUrl;
        clientAvatarUrl = fallbackDataUrl;
      }
    } else {
      const fallbackDataUrl = `data:${optimized.mime};base64,${optimized.buffer.toString("base64")}`;
      storedPath = fallbackDataUrl;
      clientAvatarUrl = fallbackDataUrl;
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarPath: storedPath },
    });

    if (oldAvatarPath && oldAvatarPath.startsWith("sb://")) {
      await deleteStorageObjects([oldAvatarPath]);
    }

    return NextResponse.json({
      success: true,
      avatarPath: storedPath,
      avatarUrl: clientAvatarUrl,
    });
  } catch (error) {
    console.error("[Avatar Upload Error]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save profile picture." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ success: false, message: "Cross-origin request rejected." }, { status: 403 });
  }
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const oldAvatarPath = session.avatarPath;
    await prisma.user.update({ where: { id: session.userId }, data: { avatarPath: null } });
    if (oldAvatarPath) {
      await deleteStorageObjects([oldAvatarPath]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Avatar Delete Error]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove profile picture." },
      { status: 500 }
    );
  }
}
