import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getWellnessSession, isAdminRole } from "@/wellness/security/session";
import { buildProgramScopeWhere } from "@/wellness/security/guards";
import { prisma } from "@/wellness/db";
import {
  getLegacyPublicWorkoutUploadDir,
  getPrivateWorkoutUploadDir,
} from "@/wellness/utils/image-processor";

export const dynamic = "force-dynamic";

const SAFE_FILENAME_RE =
  /^([A-Za-z0-9_-]+)-(?:before|after|front|side|back|profile|custom|photo)-\d+-[a-f0-9]+\.(webp|jpg|jpeg|png)$/i;

const MIME_BY_EXT: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/**
 * Authenticated, authorization-scoped private media delivery endpoint.
 * Serves user progress/workout photos with ETag conditional caching and immutable private Cache-Control.
 */
export async function GET(
  req: NextRequest,
  context: { params: { filename: string } }
) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const filename = context.params?.filename || "";
  const match = SAFE_FILENAME_RE.exec(filename);
  if (!match) {
    return NextResponse.json({ success: false, message: "Invalid media filename." }, { status: 400 });
  }

  const ownerUserId = match[1];
  const ext = match[2].toLowerCase();

  // Ownership / scoped admin authorization check
  if (ownerUserId !== session.userId) {
    if (!isAdminRole(session.role)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    if (session.role !== "SUPERADMIN") {
      const hasScopedAccess = await prisma.programEnrollment.count({
        where: {
          userId: ownerUserId,
          program: buildProgramScopeWhere(session),
        },
      });
      if (hasScopedAccess === 0) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
    }
  }

  const candidates = [
    path.join(getPrivateWorkoutUploadDir(), filename),
    path.join(getLegacyPublicWorkoutUploadDir(), filename),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (!stat.isFile()) continue;

      const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
      const ifNoneMatch = req.headers.get("if-none-match");
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: etag,
            "Cache-Control": "private, max-age=31536000, immutable",
          },
        });
      }

      const fileBuffer = await fs.readFile(candidate);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": MIME_BY_EXT[ext] || "application/octet-stream",
          "Content-Length": String(fileBuffer.length),
          ETag: etag,
          "Last-Modified": stat.mtime.toUTCString(),
          "Cache-Control": "private, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'",
        },
      });
    } catch {
      // Try next candidate
    }
  }

  return NextResponse.json({ success: false, message: "Media not found." }, { status: 404 });
}
