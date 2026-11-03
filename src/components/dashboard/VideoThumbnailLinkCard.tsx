"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Play, Youtube, Check, Video } from "lucide-react";
import { extractVideoThumbnail } from "@/wellness/integrations/video-provider";
import { parseDayVideoLinks } from "@/wellness/utils/json";

interface VideoThumbnailLinkCardProps {
  title: string;
  videoUrl: string | null;
  videoWatched: boolean;
  isPast2359: boolean;
  onToggleWatched: () => Promise<void>;
}

export function VideoThumbnailLinkCard({
  title,
  videoUrl,
  videoWatched,
  isPast2359,
  onToggleWatched,
}: VideoThumbnailLinkCardProps) {
  const videoLinks = parseDayVideoLinks(videoUrl);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);

  const safeIdx = activeVideoIdx < videoLinks.length ? activeVideoIdx : 0;
  const currentVideo = videoLinks[safeIdx] || {
    title: title,
    url: videoUrl || "https://youtube.com",
  };

  const thumbnail = extractVideoThumbnail(currentVideo.url, "/test.jpg");
  const targetLink = currentVideo.url || "https://youtube.com";
  const displayTitle =
    videoLinks.length > 1 && currentVideo.title ? currentVideo.title : title;

  return (
    <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 relative overflow-hidden group border border-zinc-200/70 dark:border-white/10 shadow-xl">
      {/* Header with High Negative Space */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-900/[0.06] dark:border-white/10 pb-5">
        <div className="space-y-1.5">
          <span className="text-micro text-zinc-500 dark:text-zinc-400 block tracking-[0.24em] uppercase font-mono">
            Phase 02 • Movement Sequence
          </span>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
            Curated Movement Video{videoLinks.length > 1 ? `s (${videoLinks.length})` : ""}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-md leading-relaxed font-mono">
            Private YouTube Channel access for movement guidance led by your coach.
          </p>
        </div>

        <div className="shrink-0 flex items-center">
          <span className="text-micro px-3.5 py-1.5 rounded-full font-mono tracking-wider uppercase glass-panel-subtle border border-zinc-200/60 dark:border-white/10 text-zinc-700 dark:text-zinc-300 backdrop-blur-md flex items-center gap-1.5">
            <Youtube className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              {videoLinks.length > 1
                ? `${videoLinks.length} Video Sessions`
                : "Exclusive Access"}
            </span>
          </span>
        </div>
      </div>

      {/* Multi-Video Selector Tabs (When > 1 video link is configured) */}
      {videoLinks.length > 1 && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Select Video Session:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {videoLinks.map((vid, idx) => {
              const isSelected = safeIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveVideoIdx(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                      : "glass-panel-subtle text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-zinc-200/60 dark:border-white/10"
                  }`}
                >
                  <Video className="w-3.5 h-3.5 shrink-0" />
                  <span>{vid.title || `Video ${idx + 1}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Luxury Cinematic Video Poster with External Watch Action */}
      <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/60 dark:border-white/10 group/thumb shadow-xl">
        <Image
          src={thumbnail}
          alt={displayTitle}
          fill
          className="object-cover scale-100 group-hover/thumb:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Filmic Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25 pointer-events-none" />

        {/* Center YouTube Play Button */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
          <a
            href={targetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-16 h-16 rounded-full bg-white/95 hover:bg-white text-zinc-950 flex items-center justify-center shadow-2xl backdrop-blur-md transform transition duration-300 group-hover/thumb:scale-110"
            title="Watch on YouTube"
          >
            <Play className="w-6 h-6 ml-0.5 fill-current text-zinc-950" />
          </a>

          <div className="space-y-1 max-w-md">
            <p className="text-base sm:text-lg font-light tracking-tight text-white drop-shadow-sm font-geometric">
              {displayTitle}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300 font-light font-mono">
              <span>Open session on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-300" />
            </span>
          </div>
        </div>

        {/* Top-Right Badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 rounded-full text-micro font-mono tracking-wider uppercase bg-black/60 text-white backdrop-blur-md border border-white/20">
            {videoLinks.length > 1
              ? `Video ${safeIdx + 1} of ${videoLinks.length}`
              : "25 Min Sequence"}
          </span>
        </div>
      </div>

      {/* Additional Video Direct Links List (when > 1 video) */}
      {videoLinks.length > 1 && (
        <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
          {videoLinks.map((vid, idx) => (
            <a
              key={idx}
              href={vid.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl glass-panel-subtle border border-zinc-200/60 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30 flex items-center justify-between gap-3 transition group/link"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white truncate">
                  {vid.title || `Video Session ${idx + 1}`}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover/link:text-zinc-900 dark:group-hover/link:text-white shrink-0 transition" />
            </a>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-900/[0.06] dark:border-white/10 font-mono">
        <a
          href={targetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide transition duration-200 shadow-md font-mono"
        >
          <span>Watch Video</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {!isPast2359 && (
          <button
            type="button"
            onClick={onToggleWatched}
            className={`px-5 py-2.5 rounded-full text-xs font-medium tracking-wide transition flex items-center gap-2 font-mono ${
              videoWatched
                ? "bg-white/15 border border-white/30 text-white"
                : "glass-panel-subtle hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-white/10"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                videoWatched
                  ? "bg-white text-zinc-950 border-white"
                  : "border-zinc-400 dark:border-zinc-600"
              }`}
            >
              {videoWatched && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
            <span>{videoWatched ? "Completed" : "Mark as Completed"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
