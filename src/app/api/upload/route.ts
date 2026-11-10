import { NextRequest, NextResponse } from "next/server";
import { getWellnessSession } from "@/wellness/security/session";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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
 * Clean local and cloud-ready photo upload endpoint.
 * Validates magic bytes, checks file size, and saves workout check-in photos.
 */
export async function POST(request: NextRequest) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dataUrl, type } = body as { dataUrl?: string; type?: string };

    if (!dataUrl || typeof dataUrl !== "string") {
      return NextResponse.json({ success: false, message: "Missing image data" }, { status: 400 });
    }

    const match = dataUrl.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,(.+)$/i);
    if (!match) {
      return NextResponse.json({ success: false, message: "Invalid image format. Only JPEG, PNG, and WebP are allowed." }, { status: 400 });
    }

    const base64Data = match[1];
    const buffer = Buffer.from(base64Data, "base64");

    // Limit upload payload to 5MB
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "File exceeds 5MB size limit or is empty" }, { status: 400 });
    }

    // Verify true magic byte image signature (never trust client-declared MIME)
    const verifiedMime = detectImageMime(buffer);
    if (!verifiedMime) {
      return NextResponse.json({ success: false, message: "Uploaded file content is not a valid JPEG, PNG, or WebP image." }, { status: 400 });
    }

    const ext = verifiedMime === "image/jpeg" ? "jpg" : verifiedMime === "image/png" ? "png" : "webp";

    const uploadDir = path.join(process.cwd(), "public", "uploads", "workouts");
    const uniqueId = crypto.randomBytes(12).toString("hex");
    const allowedTypes = ["before", "after", "front", "side", "back", "profile"];
    const safeType = allowedTypes.includes(type || "") ? type : "photo";
    const filename = `${session.userId}-${safeType}-${Date.now()}-${uniqueId}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);
      return NextResponse.json({
        success: true,
        url: `/uploads/workouts/${filename}`,
      });
    } catch {
      // In serverless / read-only filesystem environments (e.g. Vercel Lambda),
      // return a normalized data URL so uploads remain functional without crashing
      const fallbackDataUrl = `data:${verifiedMime};base64,${buffer.toString("base64")}`;
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
