/**
 * VIDEO STREAMING & EMBED PROVIDER TEMPLATE (SOW 5.7)
 * ---------------------------------------------------
 * Normalizes YouTube, Vimeo, and custom HLS/Cloudflare Stream links into safe embed URLs.
 * Ready for future third-party signed-token video providers (Cloudflare Stream, Bunny Stream, Vimeo Pro).
 */

export type VideoProviderType = "YOUTUBE" | "VIMEO" | "CLOUDFLARE_STREAM" | "DIRECT" | "UNKNOWN";

export interface NormalizedVideoEmbed {
  provider: VideoProviderType;
  embedUrl: string | null;
  videoId: string | null;
}

/**
 * Extracts a clean YouTube 11-character video ID from any YouTube URL format:
 * - https://www.youtube.com/watch?v=sTANio_2E0Q&t=10s
 * - https://youtu.be/sTANio_2E0Q?si=xxxx
 * - https://www.youtube.com/embed/sTANio_2E0Q
 * - https://www.youtube.com/shorts/sTANio_2E0Q
 */
export function extractYouTubeId(rawUrl: string): string | null {
  try {
    let trimmed = rawUrl.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (typeof first === "string") trimmed = first.trim();
          else if (first && typeof first.url === "string") trimmed = first.url.trim();
        }
      } catch {
        // Ignore JSON parse fallback
      }
    }
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be" || host === "www.youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    if (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "www.youtube-nocookie.com"
    ) {
      const vParam = url.searchParams.get("v");
      if (vParam) return vParam;

      const segments = url.pathname.split("/").filter(Boolean);
      const embedIdx = segments.findIndex((s) => s === "embed" || s === "shorts" || s === "v");
      if (embedIdx !== -1 && segments[embedIdx + 1]) {
        return segments[embedIdx + 1];
      }
    }
  } catch {
    // Fallback regex if URL constructor fails
    const match = rawUrl.match(
      /(?:^|\/\/|(?:www\.|m\.)?)(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
    );
    return match ? match[1] : null;
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

/**
 * Converts any supported video URL into a safe, privacy-enhanced iframe embed URL.
 */
export function normalizeVideoEmbed(rawUrl?: string | null): NormalizedVideoEmbed {
  if (!rawUrl || !rawUrl.trim()) {
    return { provider: "UNKNOWN", embedUrl: null, videoId: null };
  }

  const ytId = extractYouTubeId(rawUrl);
  if (ytId) {
    return {
      provider: "YOUTUBE",
      videoId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0&playsinline=1`,
    };
  }

  const safeDirectUrl = normalizeHttpVideoUrl(rawUrl);
  if (!safeDirectUrl) {
    return { provider: "UNKNOWN", embedUrl: null, videoId: null };
  }

  const parsedUrl = new URL(safeDirectUrl);
  const host = parsedUrl.hostname.toLowerCase();

  // Vimeo support template
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

  // Future Cloudflare Stream / Bunny Stream signed URL support
  if (
    host === "cloudflarestream.com" ||
    host.endsWith(".cloudflarestream.com") ||
    host === "videodelivery.net" ||
    host.endsWith(".videodelivery.net")
  ) {
    return {
      provider: "CLOUDFLARE_STREAM",
      videoId: null,
      embedUrl: safeDirectUrl,
    };
  }

  return {
    provider: "DIRECT",
    videoId: null,
    embedUrl: safeDirectUrl,
  };
}

/**
 * Extracts a high-res video thumbnail image URL for YouTube / Vimeo / fallback.
 */
export function extractVideoThumbnail(rawUrl?: string | null, fallbackImg = "/test.webp"): string {
  if (!rawUrl || !rawUrl.trim()) return fallbackImg;

  const ytId = extractYouTubeId(rawUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  return fallbackImg;
}
