import { NextRequest, NextResponse } from "next/server";
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
 * Verifies ownership (`<bucket>/<userId>/...`) unless caller is Admin/Partner/Coach.
 */
export async function GET(request: NextRequest) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rawPath = new URL(request.url).searchParams.get("path") || "";
  const parsed = parseStorageUri(rawPath);
  if (!parsed || !ALLOWED_BUCKETS.has(parsed.bucket)) {
    return NextResponse.json({ message: "Invalid storage path" }, { status: 400 });
  }

  const ownerPrefix = `${session.userId.replace(/[^A-Za-z0-9_-]/g, "")}/`;
  const isOwner = parsed.objectPath.startsWith(ownerPrefix);
  if (!isOwner && !isAdminRole(session.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const signedUrl = await createSignedStorageUrl(rawPath, 3600);
  if (!signedUrl) {
    return NextResponse.json({ message: "Media unavailable" }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
