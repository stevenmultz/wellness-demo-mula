import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession } from "@/wellness/security/session";

export const dynamic = "force-dynamic";

const MAX_AVATAR_BYTES = 400 * 1024; // client resizes to 384px JPEG, so real files are far smaller

function detectImageMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

/**
 * POST /api/profile/avatar  { dataUrl }
 * The target user is always the session user. The file type is verified from its magic bytes
 * (the client-declared MIME type is never trusted), size is capped, and the image is stored
 * as a normalized data URL in users.avatar_url (no filesystem write, no user-controlled path).
 */
export async function POST(req: NextRequest) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
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

    const mime = detectImageMime(buffer);
    if (!mime) {
      return NextResponse.json(
        { success: false, message: "File content is not a valid JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    const avatarUrl = `data:${mime};base64,${buffer.toString("base64")}`;
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
