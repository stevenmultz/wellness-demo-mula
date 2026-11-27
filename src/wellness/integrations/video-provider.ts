/**
 * VIDEO STREAMING & EMBED PROVIDER NORMALIZER (SOW 5.7)
 * -----------------------------------------------------
 * Client-safe normalizer for Bunny.net Stream, Cloudflare Stream, Vimeo, and YouTube.
 * Server-side token signing lives in `video-signing.ts` so `node:crypto` never enters client bundles.
 */

export type VideoProviderType =
  | "BUNNY_STREAM"
  | "CLOUDFLARE_STREAM"
  | "VIMEO"
  | "YOUTUBE"
  | "DIRECT"
  | "UNKNOWN";

export interface NormalizedVideoEmbed {
  provider: VideoProviderType;
  embedUrl: string | null;
  videoId: string | null;
  libraryId?: string | null;
}

const SAFE_YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,16}$/;
const SAFE_BUNNY_LIB_RE = /^[0-9]{1,16}$/;
const SAFE_BUNNY_VIDEO_RE = /^[A-Za-z0-9-]{8,64}$/;
const SAFE_CF_STREAM_ID_RE = /^[A-Za-z0-9._-]{16,512}$/;

function sanitizeYouTubeId(candidate?: string | null): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  return SAFE_YOUTUBE_ID_RE.test(trimmed) ? trimmed : null;
}

function unwrapFirstJsonVideoUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("[")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      if (typeof first === "string") return first.trim();
      if (first && typeof first.url === "string") return first.url.trim();
    }
  } catch {
    // Ignore JSON parse fallback
  }
  return trimmed;
}

/**
 * Extracts `{ libraryId, videoId }` from Bunny.net Stream URLs:
 * - https://iframe.mediadelivery.net/embed/<libraryId>/<videoId>
 * - https://iframe.mediadelivery.net/play/<libraryId>/<videoId>
 * - https://video.bunnycdn.com/play/<libraryId>/<videoId>
 * - bunny://<libraryId>/<videoId>
 */
export function extractBunnyStreamIds(
  rawUrl?: string | null
): { libraryId: string; videoId: string; token?: string | null; expires?: string | null } | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const unwrapped = unwrapFirstJsonVideoUrl(rawUrl);

  if (unwrapped.toLowerCase().startsWith("bunny://")) {
    const rest = unwrapped.slice("bunny://".length).split("?")[0];
    const [lib, vid] = rest.split("/").filter(Boolean);
    if (lib && vid && SAFE_BUNNY_LIB_RE.test(lib) && SAFE_BUNNY_VIDEO_RE.test(vid)) {
      return { libraryId: lib, videoId: vid };
    }
    return null;
  }

  try {
    const url = new URL(unwrapped);
    const host = url.hostname.toLowerCase();
    if (
      host === "iframe.mediadelivery.net" ||
      host === "video.bunnycdn.com" ||
      host.endsWith(".mediadelivery.net")
    ) {
      const parts = url.pathname.split("/").filter(Boolean);
      // Expected: ["embed" | "play", "<libraryId>", "<videoId>"]
      if (
        parts.length >= 3 &&
        (parts[0] === "embed" || parts[0] === "play") &&
        SAFE_BUNNY_LIB_RE.test(parts[1]) &&
        SAFE_BUNNY_VIDEO_RE.test(parts[2])
      ) {
        return {
          libraryId: parts[1],
          videoId: parts[2],
          token: url.searchParams.get("token"),
          expires: url.searchParams.get("expires"),
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function extractYouTubeId(rawUrl: string): string | null {
  try {
    const trimmed = unwrapFirstJsonVideoUrl(rawUrl);
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be" || host === "www.youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return sanitizeYouTubeId(id);
    }

    if (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "www.youtube-nocookie.com"
    ) {
      const vParam = url.searchParams.get("v");
      if (vParam) return sanitizeYouTubeId(vParam);

      const segments = url.pathname.split("/").filter(Boolean);
      const embedIdx = segments.findIndex((s) => s === "embed" || s === "shorts" || s === "v");
      if (embedIdx !== -1 && segments[embedIdx + 1]) {
        return sanitizeYouTubeId(segments[embedIdx + 1]);
      }
    }
  } catch {
    const match = rawUrl.match(
      /(?:^|\/\/|(?:www\.|m\.)?)(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
    );
    return sanitizeYouTubeId(match ? match[1] : null);
  }
  return null;
}

function normalizeHttpVideoUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function isProtectedStreamProvider(provider: VideoProviderType): boolean {
  return provider === "BUNNY_STREAM" || provider === "CLOUDFLARE_STREAM";
}

/**
 * Converts any supported video URL into a safe, privacy-enhanced iframe embed URL.
 */
export function normalizeVideoEmbed(rawUrl?: string | null): NormalizedVideoEmbed {
  if (!rawUrl || !rawUrl.trim()) {
    return { provider: "UNKNOWN", embedUrl: null, videoId: null };
  }

  const bunny = extractBunnyStreamIds(rawUrl);
  if (bunny) {
    const params = new URLSearchParams();
    if (bunny.token) params.set("token", bunny.token);
    if (bunny.expires) params.set("expires", bunny.expires);
    params.set("autoplay", "false");
    params.set("preload", "true");
    params.set("responsive", "true");
    return {
      provider: "BUNNY_STREAM",
      libraryId: bunny.libraryId,
      videoId: bunny.videoId,
      embedUrl: `https://iframe.mediadelivery.net/embed/${bunny.libraryId}/${bunny.videoId}?${params.toString()}`,
    };
  }

  const ytId = extractYouTubeId(rawUrl);
  if (ytId) {
    return {
      provider: "YOUTUBE",
      videoId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0&playsinline=1`,
    };
  }

  const unwrapped = unwrapFirstJsonVideoUrl(rawUrl);
  const safeDirectUrl = normalizeHttpVideoUrl(unwrapped);
  if (!safeDirectUrl) {
    return { provider: "UNKNOWN", embedUrl: null, videoId: null };
  }

  const parsedUrl = new URL(safeDirectUrl);
  const host = parsedUrl.hostname.toLowerCase();

  if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
    const vimeoMatch = safeDirectUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch?.[1]) {
      return {
        provider: "VIMEO",
        videoId: vimeoMatch[1],
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?byline=0&portrait=0&dnt=1`,
      };
    }
  }

  if (
    host === "cloudflarestream.com" ||
    host.endsWith(".cloudflarestream.com") ||
    host === "videodelivery.net" ||
    host.endsWith(".videodelivery.net")
  ) {
    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    const idOrToken = segments[0] && SAFE_CF_STREAM_ID_RE.test(segments[0]) ? segments[0] : null;
    let cfEmbedUrl = safeDirectUrl;
    if (idOrToken && !parsedUrl.pathname.includes("/iframe") && !parsedUrl.pathname.endsWith(".m3u8")) {
      const embedHost =
        host === "watch.cloudflarestream.com" || host === "videodelivery.net"
          ? "iframe.videodelivery.net"
          : host;
      cfEmbedUrl = `https://${embedHost}/${idOrToken}/iframe${parsedUrl.search}`;
    }
    return {
      provider: "CLOUDFLARE_STREAM",
      videoId: idOrToken,
      embedUrl: cfEmbedUrl,
    };
  }

  return {
    provider: "DIRECT",
    videoId: null,
    embedUrl: safeDirectUrl,
  };
}

/**
 * Extracts a high-res video thumbnail image URL for YouTube / Cloudflare / fallback.
 * Note: Private Bunny Stream thumbnails require a CDN token or custom cover image, so fallbackImg is used cleanly.
 */
export function extractVideoThumbnail(rawUrl?: string | null, fallbackImg = "/test.webp"): string {
  if (!rawUrl || !rawUrl.trim()) return fallbackImg;

  const ytId = extractYouTubeId(rawUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  return fallbackImg;
}
