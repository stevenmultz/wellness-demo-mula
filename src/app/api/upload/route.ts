import { NextRequest, NextResponse } from "next/server";
import { getWellnessSession } from "@/wellness/security/session";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Clean local and cloud-ready photo upload endpoint.
 * Saves compressed workout check-in photos to public/uploads/workouts/
 * and returns the static asset URL instead of bloating database rows with Base64.
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

    const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
    if (!match) {
      return NextResponse.json({ success: false, message: "Invalid image format" }, { status: 400 });
    }

    const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Limit upload payload to 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "File exceeds 5MB size limit" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "workouts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueId = crypto.randomBytes(12).toString("hex");
    const allowedTypes = ["before", "after", "front", "side", "back", "profile"];
    const safeType = allowedTypes.includes(type || "") ? type : "photo";
    const filename = `${session.userId}-${safeType}-${Date.now()}-${uniqueId}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/workouts/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error("[Upload API Error]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process photo upload" },
      { status: 500 }
    );
  }
}
