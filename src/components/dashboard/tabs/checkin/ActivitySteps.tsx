"use client";

import { useState } from "react";
import {
  Check,
  ExternalLink,
  MapPin,
  Minus,
  Play,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { extractVideoThumbnail } from "@/wellness/integrations/video-provider";
import type { WorkoutOptionGroup } from "@/wellness/utils/json";
import type { PlanDay } from "../MyPlanTab";
import { safeHttpUrl } from "../shared";
import { REST_FEELINGS, TRAINING_FEELINGS, type SubStepId } from "./checkInUtils";
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
                className={`relative w-full h-32 rounded-2xl overflow-hidden text-left transition active:scale-[0.99] group ${
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

  if (currentSubStep === "training_video") {
    const safeVideoUrl = activeVideo ? safeHttpUrl(activeVideo.url) : null;
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="Watch the guided session" />
        {activeVideo && (
          <div className="space-y-3">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 shadow-sm border border-zinc-200 dark:border-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={extractVideoThumbnail(activeVideo.url, "/coach.webp")}
                alt=""
                className="w-full h-full object-cover"
              />
              {safeVideoUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-center justify-center">
                  <a
                    href={safeVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onOpenVideo}
                    className="w-14 h-14 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  >
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </a>
                </div>
              )}
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <p className="text-sm font-semibold truncate">{activeVideo.title}</p>
                <p className="text-xs text-white/80">Guided training movement cues</p>
              </div>
            </div>

            {safeVideoUrl && (
              <a
                href={safeVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onOpenVideo}
                className="w-full h-12 px-4 rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-xs font-semibold text-zinc-950 dark:text-white flex items-center justify-center gap-2 transition hover:border-zinc-300 dark:hover:border-white/25"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open Video Guide</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  if (currentSubStep === "training_movements") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="Log completed movements" />

        {movements.length > 0 ? (
          <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
            {movements.map((name) => {
              const checked = isChecked(name);
              const moveObj = selectedGroup?.movements.find((m) => m.name === name);
              const targetLabel = moveObj?.target;
              const targetReps = parseTargetReps(targetLabel);
              const currentReps = getMovementReps(name, targetReps);
              const isEditing = editingRep?.name === name;

              return (
                <div key={name} className="py-4 px-1">
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
                        className="w-8 h-8 rounded-lg bg-white dark:bg-[#141414] hover:bg-zinc-100 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 active:scale-95 border border-zinc-200 dark:border-white/15"
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
                        className="w-8 h-8 rounded-lg bg-white dark:bg-[#141414] hover:bg-zinc-100 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 active:scale-95 border border-zinc-200 dark:border-white/15"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            No individual movements configured for this session. Proceed to the next step.
          </p>
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
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title={`Will you attend ${day.eventTitle || "this session"}?`} />

        {(safeHttpUrl(day.meetupLink) || day.onsiteVenue) && (
          <div className="py-4 border-t border-b border-zinc-200/90 dark:border-white/10 space-y-2.5 text-xs">
            {day.onsiteVenue && (
              <div className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500 dark:text-zinc-400" />
                <span>{day.onsiteVenue}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {safeHttpUrl(day.meetupLink) && (
                <a
                  href={safeHttpUrl(day.meetupLink)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Join Zoom Meeting</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {safeHttpUrl(day.mapLink) && (
                <a
                  href={safeHttpUrl(day.mapLink)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-4 rounded-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-xs font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1.5 hover:border-zinc-300 dark:hover:border-white/25 transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Open Maps</span>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectAttendance("attend")}
            className={`h-14 px-5 rounded-2xl border text-sm font-semibold transition flex items-center justify-between ${
              connectAttendance === "attend"
                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            <span>I Will Attend</span>
            <Check className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectAttendance("cannot_attend")}
            className={`h-14 px-5 rounded-2xl border text-sm font-semibold transition flex items-center justify-between ${
              connectAttendance === "cannot_attend"
                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            <span>Cannot Attend</span>
          </button>
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
              className={`min-w-0 py-3.5 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
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
