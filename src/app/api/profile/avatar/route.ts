import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession } from "@/wellness/security/session";
import { checkRateLimit } from "@/wellness/security/rate-limit";
import { detectImageMime, processAndOptimizeImage } from "@/wellness/utils/image-processor";
import {
  MAX_AVATAR_BODY_BYTES,
  MAX_AVATAR_BYTES,
  RATE_LIMITS,
} from "@/wellness/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/profile/avatar  { dataUrl }
 * The target user is always the session user. The file type is verified from magic bytes,
 * decoded & re-encoded via Sharp (stripping EXIF/GPS metadata, resizing to 384x384 WebP),
 * and stored as a compact normalized data URL in users.avatar_url.
 */
export async function POST(req: NextRequest) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`avatar:${session.userId}`, RATE_LIMITS.avatar);
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

    const avatarUrl = `data:${optimized.mime};base64,${optimized.buffer.toString("base64")}`;
    await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl } });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error("[Avatar Upload Error]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save profile picture." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl: null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Avatar Delete Error]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove profile picture." },
      { status: 500 }
    );
  }
}
