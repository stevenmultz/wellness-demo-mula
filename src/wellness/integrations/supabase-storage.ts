import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../config";
import { safeMediaUrl } from "../utils/url-safety";

export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  WORKOUT_MEDIA: "workout-media",
} as const;

export type StorageBucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

const SB_URI_PREFIX = "sb://";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

let cachedAdminClient: SupabaseClient | null = null;
let cachedKeySignature = "";

export function isSupabaseStorageConfigured(): boolean {
  const { url, serviceRoleKey } = getSupabaseConfig();
  return Boolean(url && serviceRoleKey);
}

function getSupabaseAdminClient(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env."
    );
  }
  const sig = `${url}|${serviceRoleKey.slice(0, 8)}`;
  if (!cachedAdminClient || cachedKeySignature !== sig) {
    cachedAdminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal ?? AbortSignal.timeout(10_000),
          }),
      },
    });
    cachedKeySignature = sig;
  }
  return cachedAdminClient;
}

export function formatStorageUri(bucket: StorageBucketName, objectPath: string): string {
  const clean = objectPath.replace(/^\/+/, "");
  return `${SB_URI_PREFIX}${bucket}/${clean}`;
}

export function parseStorageUri(
  value: string | null | undefined
): { bucket: string; objectPath: string } | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith(SB_URI_PREFIX)) return null;
  const rest = trimmed.slice(SB_URI_PREFIX.length);
  const slashIdx = rest.indexOf("/");
  if (slashIdx <= 0 || slashIdx >= rest.length - 1) return null;
  const bucket = rest.slice(0, slashIdx);
  const objectPath = rest.slice(slashIdx + 1);
  if (objectPath.includes("..")) return null;
  return { bucket, objectPath };
}

export async function uploadPrivateStorageObject(params: {
  bucket: StorageBucketName;
  objectPath: string;
  buffer: Buffer;
  contentType: string;
  upsert?: boolean;
}): Promise<{ storageUri: string; signedUrl: string | null }> {
  const client = getSupabaseAdminClient();
  const cleanPath = params.objectPath.replace(/^\/+/, "");

  const { error } = await client.storage.from(params.bucket).upload(cleanPath, params.buffer, {
    contentType: params.contentType,
    upsert: Boolean(params.upsert),
  });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const storageUri = formatStorageUri(params.bucket, cleanPath);
  const signedUrl = await createSignedStorageUrl(storageUri).catch(() => null);
  return { storageUri, signedUrl };
}

export async function createSignedStorageUrl(
  storageUri: string,
  expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const parsed = parseStorageUri(storageUri);
  if (!parsed || !isSupabaseStorageConfigured()) return null;

  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

export async function deleteStorageObjects(storageUris: Array<string | null | undefined>): Promise<void> {
  if (!isSupabaseStorageConfigured()) return;

  const byBucket = new Map<string, string[]>();
  for (const raw of storageUris) {
    const parsed = parseStorageUri(raw);
    if (!parsed) continue;
    const list = byBucket.get(parsed.bucket) ?? [];
    list.push(parsed.objectPath);
    byBucket.set(parsed.bucket, list);
  }

  if (byBucket.size === 0) return;

  const client = getSupabaseAdminClient();
  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, paths]) => {
      try {
        await client.storage.from(bucket).remove(paths);
      } catch {
        // Non-blocking cleanup
      }
    })
  );
}

/**
 * Resolves a stored media reference (`sb://bucket/path`, `/pic.webp`, or `https://...`)
 * into a safe browser-renderable URL (generating a short-lived signed URL for private buckets).
 */
export async function resolveMediaUrlForClient(
  rawPath: string | null | undefined,
  expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(SB_URI_PREFIX)) {
    return await createSignedStorageUrl(trimmed, expiresInSeconds);
  }
  return safeMediaUrl(trimmed);
}
