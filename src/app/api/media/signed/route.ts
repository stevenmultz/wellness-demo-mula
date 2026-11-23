import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { buildProgramScopeWhere } from "@/wellness/security/guards";
import { getWellnessSession, isAdminRole } from "@/wellness/security/session";
import {
  createSignedStorageUrl,
  parseStorageUri,
  STORAGE_BUCKETS,
} from "@/wellness/integrations/supabase-storage";

export const dynamic = "force-dynamic";

const ALLOWED_BUCKETS = new Set<string>([
  STORAGE_BUCKETS.AVATARS,
  STORAGE_BUCKETS.WORKOUT_MEDIA,
]);

/**
 * Authenticated short-lived Signed URL redirector for private Supabase Storage objects.
 * Verifies ownership (`<bucket>/<userId>/...`), scoped admin enrollment access
 * (COACH / PARTNER_ADMIN cannot read files of users outside their cohort/org),
 * or public program cover / organization logo references.
 */
export async function GET(request: NextRequest) {
  const rawPath = new URL(request.url).searchParams.get("path") || "";
  const parsed = parseStorageUri(rawPath);
  if (!parsed || !ALLOWED_BUCKETS.has(parsed.bucket)) {
    return NextResponse.json({ message: "Invalid storage path" }, { status: 400 });
  }

  const session = await getWellnessSession();
  if (!session) {
    // Allow unauthenticated public access strictly for published Program covers and Organization logos.
    const [publicCoverMatch, orgLogoMatch] = await Promise.all([
      prisma.program.findFirst({
        where: { coverImagePath: rawPath, status: "PUBLISHED", deletedAt: null },
        select: { id: true },
      }),
      prisma.masterOrganization.findFirst({
        where: { logoPath: rawPath },
        select: { id: true },
      }),
    ]);
    if (!publicCoverMatch && !orgLogoMatch) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  } else {
    const ownerPrefix = `${session.userId.replace(/[^A-Za-z0-9_-]/g, "")}/`;
    const isOwner = parsed.objectPath.startsWith(ownerPrefix);

    if (!isOwner && session.role !== "SUPERADMIN") {
      let authorized = false;

      if (isAdminRole(session.role)) {
        const targetUserId = parsed.objectPath.split("/")[0]?.trim() || "";
        if (targetUserId) {
          const scopedEnrollmentCount = await prisma.programEnrollment.count({
            where: {
              userId: targetUserId,
              status: { in: ["ACTIVE", "EXPIRED"] },
              program: buildProgramScopeWhere(session),
            },
          });
          if (scopedEnrollmentCount > 0) {
            authorized = true;
          }
        }
      }

      if (!authorized) {
        const targetUserId = parsed.objectPath.split("/")[0]?.trim() || "";
        const shareModel = (prisma as unknown as {
          userProgressShare?: { findFirst?: typeof prisma.userProgressShare.findFirst };
        }).userProgressShare;
        if (targetUserId && typeof shareModel?.findFirst === "function") {
          const shareMatch = await shareModel.findFirst({
            where: {
              ownerUserId: targetUserId,
              status: "ACTIVE",
              OR: [
                { viewerUserId: session.userId },
                { viewerEmail: { equals: session.email, mode: "insensitive" } },
              ],
            },
            select: { id: true },
          });
          if (shareMatch) {
            authorized = true;
          }
        }
      }

      if (!authorized) {
        const [publicCoverMatch, orgLogoMatch] = await Promise.all([
          prisma.program.findFirst({
            where: {
              coverImagePath: rawPath,
              deletedAt: null,
              ...(isAdminRole(session.role)
                ? buildProgramScopeWhere(session)
                : { status: "PUBLISHED" }),
            },
            select: { id: true },
          }),
          prisma.masterOrganization.findFirst({
            where: { logoPath: rawPath },
            select: { id: true },
          }),
        ]);
        authorized = Boolean(publicCoverMatch || orgLogoMatch);
      }

      if (!authorized) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }
  }

  const signedUrl = await createSignedStorageUrl(rawPath, 3600);
  if (!signedUrl) {
    return NextResponse.json({ message: "Media unavailable" }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl, {
    status: 302,
    headers: { "Cache-Control": session ? "private, max-age=300" : "public, max-age=300" },
  });
}
