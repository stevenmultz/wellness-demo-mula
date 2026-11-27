"use client";

import {
  Check,
  CheckCircle2,
  Droplets,
  Dumbbell,
  Footprints,
  Info,
  Moon,
  Smile,
  Sparkles,
  Star,
  Users,
  Utensils,
  Video,
} from "lucide-react";
import type { ProgramSubmissionItem } from "@/wellness/actions/program";
import { safeMediaUrl } from "@/wellness/utils/url-safety";

interface AdminSubmissionCardProps {
  sub: ProgramSubmissionItem;
}

export function AdminSubmissionCard({
  sub,
}: AdminSubmissionCardProps) {
  const dateFormatted = sub.completedAt
    ? new Date(sub.completedAt).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(sub.updatedAt).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return (
    <div
      key={sub.id}
      className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4 transition hover:border-zinc-300 dark:hover:border-white/20"
    >
      {/* Card Top: Member & Day Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs flex items-center justify-center shrink-0">
            {sub.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                {sub.userName}
              </h4>
              <span className="text-[11px] text-zinc-400 font-normal">
                ({sub.userEmail})
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Submitted: {dateFormatted}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 font-mono">
            <span>Day {sub.dayNumber}</span>
            <span className="text-zinc-400">•</span>
            <span className="font-sans font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]">
              {sub.dayTitle}
            </span>
          </span>

          {sub.isCompleted ? (
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-900/50 flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Completed</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-900/50">
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* Daily Reflection & Notes */}
      {(sub.dailyReflection || sub.workoutNotes || sub.eventFeedback || sub.assessmentResponse) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sub.dailyReflection && (
            <div className="p-3.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-zinc-500" />
                <span>Daily Reflection</span>
              </span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 italic leading-relaxed">
                &ldquo;{sub.dailyReflection}&rdquo;
              </p>
            </div>
          )}

          {sub.workoutNotes && (
            <div className="p-3.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Dumbbell className="w-3 h-3 text-zinc-500" />
                <span>Workout Notes</span>
              </span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {sub.workoutNotes}
              </p>
            </div>
          )}

          {sub.assessmentResponse && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                <span>Self Assessment</span>
              </span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {sub.assessmentResponse}
              </p>
            </div>
          )}

          {sub.eventFeedback && (
            <div className="p-3.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-zinc-500" />
                <span>Event Feedback</span>
              </span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {sub.eventFeedback}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Telemetry & Habit Footer Pills */}
      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
        {/* Mood / Happiness */}
        {sub.happinessRate !== null && sub.happinessRate !== undefined && (
          <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
            <Smile className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-medium">Mood:</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, idx) => (
                <Star
                  key={idx}
                  className={`w-3 h-3 ${
                    idx < sub.happinessRate!
                      ? "fill-zinc-950 text-zinc-950 dark:fill-white dark:text-white"
                      : "text-zinc-300 dark:text-zinc-600"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sleep Telemetry */}
        {(sub.sleepDurationMinutes || sub.bedtime) && (
          <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <Moon className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-medium">Sleep:</span>
            <span className="font-mono text-[11px]">
              {sub.sleepDurationMinutes
                ? `${Math.floor(sub.sleepDurationMinutes / 60)}h ${sub.sleepDurationMinutes % 60}m`
                : `${sub.bedtime || ""} - ${sub.wakeTime || ""}`}
            </span>
          </div>
        )}

        {/* Meal Compliance */}
        {sub.mealCompliance && (
          <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <Utensils className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-medium">Meal:</span>
            <span className="text-[11px] font-semibold">
              {sub.mealCompliance}
              {sub.caloriesKcal && sub.caloriesKcal > 0 ? ` (${sub.caloriesKcal} kcal)` : ""}
            </span>
          </div>
        )}

        {/* Water Telemetry */}
        {typeof sub.waterMl === "number" && sub.waterMl > 0 && (
          <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <Droplets className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-medium">Water:</span>
            <span className="font-mono text-[11px]">{sub.waterMl.toLocaleString()} ml</span>
          </div>
        )}

        {/* Steps Telemetry */}
        {typeof sub.stepsCount === "number" && sub.stepsCount > 0 && (
          <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <Footprints className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-medium">Steps:</span>
            <span className="font-mono text-[11px]">{sub.stepsCount.toLocaleString()}</span>
          </div>
        )}

        {/* Video Watched */}
        <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
          <Video className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px]">
            {sub.videoWatched ? "Video Completed" : "Video Pending"}
          </span>
        </div>

        {/* Selected Workout */}
        {sub.selectedWorkout && (
          <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-medium">{sub.selectedWorkout}</span>
          </div>
        )}

        {/* Checklist Items Count */}
        {sub.checklistCompleted && sub.checklistCompleted.length > 0 && (
          <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px]">
              {sub.checklistCompleted.length} Checklist Tasks Done
            </span>
          </div>
        )}
      </div>

      {/* Custom Tasks & Body Measurements Submissions */}
      {sub.customSubmissions && sub.customSubmissions.length > 0 && (
        <div className="pt-2 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Custom Tasks &amp; Measurements ({sub.customSubmissions.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {sub.customSubmissions.map((cs) => (
              <div
                key={cs.customTaskId}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {cs.title}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 shrink-0">
                    {cs.taskType}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(cs.values || {}).map(([k, v]) => {
                    const photoSrc =
                      typeof v === "string" &&
                      (v.startsWith("data:image/") ||
                        v.startsWith("/uploads/") ||
                        v.startsWith("/api/media/"))
                        ? safeMediaUrl(v)
                        : null;
                    if (photoSrc) {
                      return (
                        <a
                          key={k}
                          href={photoSrc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 text-[11px] font-mono text-zinc-700 dark:text-zinc-200 hover:opacity-90"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoSrc}
                            alt={k}
                            loading="lazy"
                            decoding="async"
                            className="w-7 h-7 rounded object-cover"
                          />
                          <span>{k}</span>
                        </a>
                      );
                    }
                    return (
                      <span
                        key={k}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 text-[11px] font-mono text-zinc-700 dark:text-zinc-200"
                      >
                        {k}:{" "}
                        {Array.isArray(v)
                          ? v.join(", ")
                          : typeof v === "boolean"
                          ? v
                            ? "Yes"
                            : "No"
                          : String(v ?? "—")}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
