import { createHash, createSign } from "crypto";
import { extractBunnyStreamIds } from "./video-provider";

/**
 * SERVER-ONLY PROTECTED VIDEO SIGNING (Bunny.net Stream & Cloudflare Stream)
 * --------------------------------------------------------------------------
 * Generates short-lived expiring embed tokens on the server for authorized members
 * so paid workout video URLs cannot be shared, hotlinked, or downloaded after expiry.
 *
 * Supported `.env` configuration (optional — degrades gracefully when unset):
 * - Bunny.net Stream Embed View Token Auth:
 *     `BUNNY_STREAM_TOKEN_KEY` (or per-library `BUNNY_STREAM_TOKEN_KEY_<libraryId>`)
 *     Formula: SHA256_HEX(tokenSecurityKey + videoId + expiresUnixSec)
 * - Cloudflare Stream Signed URLs (RS256):
 *     `CLOUDFLARE_STREAM_SIGNING_KEY_ID` + `CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY` (PEM or base64 PEM)
 */

const DEFAULT_VIDEO_TOKEN_TTL_SECONDS = 2 * 60 * 60; // 2 hours

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodePrivateKeyPem(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.includes("BEGIN")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  try {
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    return trimmed;
  }
}

function signCloudflareStreamJwt(
  videoId: string,
  keyId: string,
  privateKeyRaw: string,
  expiresSec: number
): string | null {
  try {
    const header = toBase64Url(JSON.stringify({ alg: "RS256", kid: keyId }));
    const payload = toBase64Url(
      JSON.stringify({
        sub: videoId,
        kid: keyId,
        exp: expiresSec,
        downloadable: false,
      })
    );
    const signingInput = `${header}.${payload}`;
    const pem = decodePrivateKeyPem(privateKeyRaw);
    const signer = createSign("RSA-SHA256");
    signer.update(signingInput);
    signer.end();
    const signature = toBase64Url(signer.sign(pem));
    return `${signingInput}.${signature}`;
  } catch {
    return null;
  }
}

export function signSingleVideoUrl(
  rawUrl: string,
  options?: {
    ttlSeconds?: number;
    nowSec?: number;
    bunnyTokenKeyOverride?: string;
  }
): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;

  const ttlSeconds = Math.max(60, options?.ttlSeconds ?? DEFAULT_VIDEO_TOKEN_TTL_SECONDS);
  const nowSec = options?.nowSec ?? Math.floor(Date.now() / 1000);
  const expires = nowSec + ttlSeconds;

  // 1. Bunny.net Stream Embed View Token Authentication
  const bunny = extractBunnyStreamIds(trimmed);
  if (bunny) {
    const envByLib = process.env[`BUNNY_STREAM_TOKEN_KEY_${bunny.libraryId}`]?.trim();
    const secret =
      options?.bunnyTokenKeyOverride?.trim() ||
      envByLib ||
      process.env.BUNNY_STREAM_TOKEN_KEY?.trim() ||
      "";

    const params = new URLSearchParams();
    if (secret) {
      const token = createHash("sha256")
        .update(`${secret}${bunny.videoId}${expires}`)
        .digest("hex");
      params.set("token", token);
      params.set("expires", String(expires));
    } else if (bunny.token && bunny.expires) {
      params.set("token", bunny.token);
      params.set("expires", bunny.expires);
    }
    params.set("autoplay", "false");
    params.set("preload", "true");
    params.set("responsive", "true");

    return `https://iframe.mediadelivery.net/embed/${bunny.libraryId}/${bunny.videoId}?${params.toString()}`;
  }

  // 2. Cloudflare Stream Signed Token URL
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "cloudflarestream.com" ||
      host.endsWith(".cloudflarestream.com") ||
      host === "videodelivery.net" ||
      host.endsWith(".videodelivery.net")
    ) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const rawId = segments[0];
      const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID?.trim();
      const privKey = process.env.CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY?.trim();

      // Sign 32-hex Cloudflare video IDs when signing credentials are configured (skip if already a JWT)
      if (rawId && /^[a-f0-9]{32}$/i.test(rawId) && keyId && privKey) {
        const signedJwt = signCloudflareStreamJwt(rawId, keyId, privKey, expires);
        if (signedJwt) {
          const embedHost =
            host === "watch.cloudflarestream.com" || host === "videodelivery.net"
              ? "iframe.videodelivery.net"
              : host;
          return `https://${embedHost}/${signedJwt}/iframe?preload=metadata`;
        }
      }
    }
  } catch {
    // Non-URL string; return unchanged
  }

  return trimmed;
}

/**
 * Signs `ProgramDay.videoUrl` whether it is a single URL string or a JSON array
 * of `[{ title, url }, ...]` workout option videos.
 */
export function signProgramDayVideoField(
  rawField: string | null | undefined,
  ttlSeconds = DEFAULT_VIDEO_TOKEN_TTL_SECONDS
): string | null {
  if (!rawField || !rawField.trim()) return null;
  const trimmed = rawField.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const signedList = parsed.map((entry) => {
          if (typeof entry === "string") {
            return signSingleVideoUrl(entry, { ttlSeconds });
          }
          if (entry && typeof entry === "object" && typeof entry.url === "string") {
            return {
              ...entry,
              url: signSingleVideoUrl(entry.url, { ttlSeconds }),
            };
          }
          return entry;
        });
        return JSON.stringify(signedList);
      }
    } catch {
      // Fall through to single URL signing
    }
  }

  return signSingleVideoUrl(trimmed, { ttlSeconds });
}
