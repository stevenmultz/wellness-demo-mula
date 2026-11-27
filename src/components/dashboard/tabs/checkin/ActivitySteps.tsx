"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  ListChecks,
  MapPin,
  Minus,
  Plus,
  Star,
  User,
  Users,
  Video,
} from "lucide-react";
import {
  extractVideoThumbnail,
  normalizeVideoEmbed,
} from "@/wellness/integrations/video-provider";
import type { WorkoutOptionGroup } from "@/wellness/utils/json";
import type { PlanDay } from "../MyPlanTab";
import { safeHttpUrl } from "../shared";
import { parseLines, REST_FEELINGS, TRAINING_FEELINGS, type SubStepId } from "./checkInUtils";
import { FeelingSelector, StepHeader } from "./SleepMealSteps";

interface ActivityStepProps {
  currentSubStep: SubStepId;
  day: PlanDay;
  groups: WorkoutOptionGroup[];
  videos: Array<{ title: string; url: string }>;
  activeWorkout: string;
  activeVideo: { title: string; url: string } | null;
  movements: string[];
  selectedGroup: WorkoutOptionGroup | undefined;
  checkedCount: number;
  isChecked: (name: string) => boolean;
  parseTargetReps: (target?: string | null) => number;
  getMovementReps: (name: string, defaultTarget: number) => number;
  onUpdateMovementReps: (name: string, reps: number) => void;
  onToggleMovement: (name: string, defaultReps?: number) => void;
  onClickWorkoutOption: (optionName: string) => void;
  onOpenVideo: () => void;
  trainingFeeling: string;
  onSelectTrainingFeeling: (label: string) => void;
  restLines: string[];
  connectAttendance: "attend" | "cannot_attend" | null;
  connectRating: number;
  onSelectAttendance: (value: "attend" | "cannot_attend") => void;
  onSelectConnectRating: (rating: number) => void;
}

export function ActivityStepView({
  currentSubStep,
  day,
  groups,
  videos,
  activeWorkout,
  activeVideo,
  movements,
  selectedGroup,
  checkedCount,
  isChecked,
  parseTargetReps,
  getMovementReps,
  onUpdateMovementReps,
  onToggleMovement,
  onClickWorkoutOption,
  onOpenVideo,
  trainingFeeling,
  onSelectTrainingFeeling,
  restLines,
  connectAttendance,
  connectRating,
  onSelectAttendance,
  onSelectConnectRating,
}: ActivityStepProps) {
  const [editingRep, setEditingRep] = useState<{ name: string; value: string } | null>(null);
  const [rundownOpen, setRundownOpen] = useState<boolean>(true);
  void checkedCount;

  if (currentSubStep === "training_option") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="Choose today's training option" />
        <div className="grid grid-cols-1 gap-3">
          {groups.map((g, idx) => {
            const isSelected = activeWorkout === g.optionName;
            const matchVideo =
              videos.find(
                (v) => v.title.trim().toLowerCase() === g.optionName.trim().toLowerCase()
              ) ||
              videos[idx] ||
              videos[0];
            const thumbUrl = extractVideoThumbnail(
              matchVideo?.url || day.videoUrl,
              "/coach.webp"
            );

            return (
              <button
                key={g.optionName}
                type="button"
                onClick={() => onClickWorkoutOption(g.optionName)}
                className={`relative w-full h-32 rounded-2xl overflow-hidden text-left transition active:scale-[0.99] group cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-zinc-950 dark:ring-white shadow-md"
                    : "ring-1 ring-zinc-900/10 dark:ring-white/15 hover:ring-zinc-400"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl}
                  alt={g.optionName}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

                <div className="relative z-10 h-full p-4 flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-white tracking-tight leading-snug truncate">
                      {g.optionName}
                    </p>
                    <p className="text-xs font-medium text-white/80 mt-1">
                      {g.movements.length}{" "}
                      {g.movements.length === 1 ? "Movement" : "Movements"}
                    </p>
                  </div>
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="shrink-0 w-7 h-7 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-sm"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Unified Online Training Page: Video + Movement Checklist Together
  if (currentSubStep === "training_movements" || currentSubStep === "training_video") {
    const embed = activeVideo ? normalizeVideoEmbed(activeVideo.url) : null;
    const isIframeProvider =
      embed?.provider === "BUNNY_STREAM" ||
      embed?.provider === "CLOUDFLARE_STREAM" ||
      embed?.provider === "VIMEO" ||
      embed?.provider === "YOUTUBE";

    return (
      <div className="space-y-6 min-w-0">
        <StepHeader
          title={activeVideo ? "Guided video & movement checklist" : "Log completed movements"}
          subtitle={
            activeVideo && movements.length > 0
              ? "Watch the guided session and check off each movement as you complete it."
              : null
          }
        />

        {activeVideo && embed?.embedUrl && (
          <div className="space-y-2">
            {isIframeProvider ? (
              <div
                onContextMenu={(e) => e.preventDefault()}
                className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 shadow-sm border border-zinc-200 dark:border-white/15 select-none"
              >
                <iframe
                  src={embed.embedUrl}
                  title={activeVideo.title}
                  onLoad={onOpenVideo}
                  className="w-full h-full border-0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div
                onContextMenu={(e) => e.preventDefault()}
                className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 shadow-sm border border-zinc-200 dark:border-white/15 select-none"
              >
                <video
                  src={embed.embedUrl}
                  poster={extractVideoThumbnail(activeVideo.url, "/coach.webp")}
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  playsInline
                  onPlay={onOpenVideo}
                  className="w-full h-full object-contain bg-black"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate">
                {activeVideo.title}
              </span>
            </div>
          </div>
        )}

        {movements.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Exercise Checklist
              </span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                {movements.filter(isChecked).length} / {movements.length} done
              </span>
            </div>

            <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
              {movements.map((name) => {
                const checked = isChecked(name);
                const moveObj = selectedGroup?.movements.find((m) => m.name === name);
                const targetLabel = moveObj?.target;
                const targetReps = parseTargetReps(targetLabel);
                const currentReps = getMovementReps(name, targetReps);
                const isEditing = editingRep?.name === name;

                return (
                  <div key={name} className="py-3.5 px-1">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-start gap-3 min-w-0 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleMovement(name, currentReps)}
                          className="w-4 h-4 mt-0.5 rounded border-zinc-300 dark:border-white/20 text-zinc-950 focus:ring-zinc-950 shrink-0 accent-zinc-950 dark:accent-white"
                        />
                        <div className="min-w-0">
                          <span
                            className={`text-sm leading-relaxed block transition ${
                              checked
                                ? "line-through text-zinc-400 dark:text-zinc-500"
                                : "font-medium text-zinc-900 dark:text-white"
                            }`}
                          >
                            {name}
                          </span>
                          {targetLabel && (
                            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block mt-0.5">
                              Target: {targetLabel}
                            </span>
                          )}
                        </div>
                      </label>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={currentReps <= 1}
                          onClick={() => {
                            setEditingRep(null);
                            onUpdateMovementReps(name, Math.max(1, currentReps - 1));
                          }}
                          aria-label={`Decrease reps for ${name}`}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-[#141414] hover:bg-zinc-100 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 active:scale-95 border border-zinc-200 dark:border-white/15 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          inputMode="numeric"
                          aria-label={`Reps for ${name}`}
                          value={isEditing ? editingRep.value : String(currentReps)}
                          onFocus={() => setEditingRep({ name, value: String(currentReps) })}
                          onChange={(e) => setEditingRep({ name, value: e.target.value })}
                          onBlur={() => {
                            const parsed = parseInt(editingRep?.value || "", 10);
                            setEditingRep(null);
                            if (!isNaN(parsed) && parsed >= 1) {
                              onUpdateMovementReps(name, parsed);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.currentTarget as HTMLInputElement).blur();
                            }
                          }}
                          className="w-12 h-8 text-center text-xs font-mono font-semibold text-zinc-950 dark:text-white bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 rounded-lg outline-none focus:border-zinc-950 dark:focus:border-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          disabled={currentReps >= 999}
                          onClick={() => {
                            setEditingRep(null);
                            onUpdateMovementReps(name, Math.min(999, currentReps + 1));
                          }}
                          aria-label={`Increase reps for ${name}`}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-[#141414] hover:bg-zinc-100 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 active:scale-95 border border-zinc-200 dark:border-white/15 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !activeVideo && (
            <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              No individual movements configured for this session. Proceed to the next step.
            </p>
          )
        )}
      </div>
    );
  }

  if (currentSubStep === "training_mood") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="How do you feel after training?" />
        <FeelingSelector
          items={TRAINING_FEELINGS}
          selected={trainingFeeling}
          onSelect={onSelectTrainingFeeling}
        />
      </div>
    );
  }

  if (currentSubStep === "rest_checklist") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="Complete your recovery protocol" />
        <ul className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
          {restLines.map((line, idx) => {
            const checked = isChecked(line);
            return (
              <li key={idx}>
                <label className="flex items-start gap-3.5 py-4 px-1 cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleMovement(line)}
                    className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0 accent-zinc-950 dark:accent-white"
                  />
                  <span
                    className={`text-sm leading-relaxed ${
                      checked
                        ? "line-through text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {line}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (currentSubStep === "rest_mood") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="How does your body feel today?" />
        <FeelingSelector
          items={REST_FEELINGS}
          selected={trainingFeeling}
          onSelect={onSelectTrainingFeeling}
        />
      </div>
    );
  }

  if (currentSubStep === "connect_attendance") {
    const safeMeetup = safeHttpUrl(day.meetupLink);
    const safeMap = safeHttpUrl(day.mapLink);
    const rundownLines = parseLines(day.eventDetails);
    const hasRundown =
      rundownLines.length > 0 || Boolean(day.eventDetails?.trim()) || Boolean(day.onsiteSchedule);
    const isZoomOrVirtual =
      safeMeetup &&
      (safeMeetup.toLowerCase().includes("zoom") ||
        safeMeetup.toLowerCase().includes("meet.google") ||
        safeMeetup.toLowerCase().includes("teams"));

    return (
      <div className="space-y-5 min-w-0">
        <StepHeader
          title={day.eventTitle || "Community Connect Session"}
          subtitle="Access the live Zoom / Meetup link, check today's rundown, and confirm your attendance."
        />

        {/* 1. Direct Session Access Card (Zoom / Meetup Link + Venue / Schedule) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 space-y-3.5">
          {(day.onsiteSchedule || day.eventHost || day.onsiteVenue) && (
            <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
              {day.onsiteSchedule && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <span className="font-semibold text-zinc-950 dark:text-white">
                    {day.onsiteSchedule}
                  </span>
                </div>
              )}
              {day.eventHost && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <span>Host: {day.eventHost}</span>
                </div>
              )}
              {day.onsiteVenue && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500 dark:text-zinc-400" />
                  <span>{day.onsiteVenue}</span>
                </div>
              )}
            </div>
          )}

          {(safeMeetup || safeMap) ? (
            <div className="space-y-2 pt-1">
              {safeMeetup && (
                <a
                  href={safeMeetup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 px-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 hover:opacity-90 active:scale-[0.99] transition"
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <Video className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {isZoomOrVirtual ? "Join Zoom / Live Meeting" : "Open Meetup Link"}
                    </span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                </a>
              )}

              {safeMeetup && (
                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate px-0.5">
                  {safeMeetup}
                </p>
              )}

              {safeMap && (
                <a
                  href={safeMap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 px-4 rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between gap-2 hover:border-zinc-300 dark:hover:border-white/25 transition"
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>Open Venue in Google Maps</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Meeting link will be shared by your coach prior to session start.</span>
            </div>
          )}
        </div>

        {/* 2. Check Rundown Section */}
        {hasRundown && (
          <div className="rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 overflow-hidden">
            <button
              type="button"
              onClick={() => setRundownOpen((prev) => !prev)}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white">
                <ListChecks className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                <span>Session Rundown</span>
              </span>
              {rundownOpen ? (
                <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
            </button>

            {rundownOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-zinc-100 dark:border-white/10 space-y-2">
                {rundownLines.length > 1 ? (
                  <ol className="space-y-2 pt-1">
                    {rundownLines.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">{line}</span>
                      </li>
                    ))}
                  </ol>
                ) : day.eventDetails?.trim() ? (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line pt-1">
                    {day.eventDetails.trim()}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
                    Scheduled time: {day.onsiteSchedule}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Attendance Selection */}
        <div className="space-y-2 pt-1">
          <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Will you attend this session?
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => onSelectAttendance("attend")}
              className={`h-13 px-5 rounded-2xl border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                connectAttendance === "attend"
                  ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                  : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
              }`}
            >
              <span>I Will Attend</span>
              {connectAttendance === "attend" && <Check className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => onSelectAttendance("cannot_attend")}
              className={`h-13 px-5 rounded-2xl border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                connectAttendance === "cannot_attend"
                  ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                  : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
              }`}
            >
              <span>Cannot Attend</span>
              {connectAttendance === "cannot_attend" && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <StepHeader
        eyebrow="Session Feedback"
        title="How would you rate today's session?"
        subtitle="Rate your overall takeaway and experience from 1 to 5 stars."
      />
      <div className="grid grid-cols-5 gap-2 sm:gap-2.5 pt-1 min-w-0">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= connectRating;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onSelectConnectRating(star)}
              className={`min-w-0 py-3.5 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                filled
                  ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-white/[0.08]"
                  : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] hover:border-zinc-300 dark:hover:border-white/25"
              }`}
              aria-label={`${star} Stars`}
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  filled
                    ? "fill-zinc-950 text-zinc-950 dark:fill-white dark:text-white"
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              />
              <span
                className={`text-[11px] font-medium tabular-nums ${
                  filled
                    ? "text-zinc-950 dark:text-white font-semibold"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {star}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
