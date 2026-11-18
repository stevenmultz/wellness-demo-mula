"use client";

import { useState } from "react";
import { ExternalLink, Play, Video } from "lucide-react";
import {
  extractVideoThumbnail,
  normalizeVideoEmbed,
} from "@/wellness/integrations/video-provider";
import { safeHttpUrl } from "./shared";

interface ProgramIntroVideoPlayerProps {
  videoUrl?: string | null;
  fallbackImage?: string | null;
  coachName?: string | null;
  programTitle?: string;
}

/**
 * Click-to-play Coach Video Introduction block shared by Plan Detail and Guide views.
 */
export function ProgramIntroVideoPlayer({
  videoUrl,
  fallbackImage,
  coachName,
  programTitle,
}: ProgramIntroVideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const safeUrl = safeHttpUrl(videoUrl);
  if (!safeUrl) return null;

  const embed = normalizeVideoEmbed(safeUrl);
  const thumb = extractVideoThumbnail(safeUrl, fallbackImage || "/image.webp");
  const isEmbeddable =
    embed.provider === "YOUTUBE" ||
    embed.provider === "VIMEO" ||
    embed.provider === "CLOUDFLARE_STREAM";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.03] overflow-hidden">
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Video className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            Program Introduction
            {coachName ? ` · Coach ${coachName}` : ""}
          </span>
        </div>
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white inline-flex items-center gap-1 shrink-0 transition"
        >
          <span>Open</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="relative aspect-video w-full bg-zinc-950">
        {playing && embed.embedUrl ? (
          isEmbeddable ? (
            <iframe
              src={
                embed.provider === "YOUTUBE" && !embed.embedUrl.includes("autoplay=1")
                  ? `${embed.embedUrl}&autoplay=1`
                  : embed.embedUrl
              }
              title={
                programTitle
                  ? `${programTitle} introduction video`
                  : "Program introduction video"
              }
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <video
              src={embed.embedUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          )
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play program introduction video"
            className="group relative w-full h-full text-left focus:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt={
                programTitle
                  ? `${programTitle} introduction thumbnail`
                  : "Program introduction thumbnail"
              }
              className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10 flex flex-col items-center justify-center p-4">
              <span className="w-12 h-12 rounded-full bg-white text-zinc-950 shadow-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </span>
              <span className="mt-2.5 text-xs font-medium text-white drop-shadow">
                Watch Coach Walkthrough
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
