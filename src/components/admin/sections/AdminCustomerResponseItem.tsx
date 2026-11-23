"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Moon,
  Smile,
  Sparkles,
  Star,
  Users,
  Utensils,
  Video,
} from "lucide-react";
import { safeJsonParse } from "@/wellness/utils/json";
import { safeMediaUrl } from "@/wellness/utils/url-safety";
import type { AdminUserItem } from "../adminTypes";

type CustomerDayProgressItem = NonNullable<AdminUserItem["dayProgress"]>[number];

interface AdminCustomerResponseItemProps {
  sub: CustomerDayProgressItem;
  expandedResponseIds: Record<string, boolean>;
  setExpandedResponseIds: Dispatch<SetStateAction<Record<string, boolean>>>;
}

export function AdminCustomerResponseItem({
  sub,
  expandedResponseIds,
  setExpandedResponseIds,
}: AdminCustomerResponseItemProps) {
const isExpanded = Boolean(expandedResponseIds[sub.id]);
const dateFormatted = sub.completedAt
  ? new Date(sub.completedAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  : "Date not recorded";

const checklistItems = safeJsonParse<string[]>(sub.checklistCompleted, []);

return (
  <div
    key={sub.id}
    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-white/10 overflow-hidden transition shadow-2xs hover:border-zinc-300 dark:hover:border-white/20"
  >
    {/* Compact Summary Header Bar */}
    <div
      onClick={() =>
        setExpandedResponseIds((prev) => ({
          ...prev,
          [sub.id]: !prev[sub.id],
        }))
      }
      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none bg-zinc-50/40 dark:bg-white/[0.02] hover:bg-zinc-100/60 dark:hover:bg-white/[0.04] transition"
    >
      {/* Left: Day & Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="px-2.5 py-1 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-mono font-bold text-xs shrink-0">
          Day {sub.programDay?.dayNumber}
        </span>
        <div className="min-w-0">
          <span className="text-xs font-bold text-zinc-900 dark:text-white truncate block">
            {sub.programDay?.title}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono block">
            {dateFormatted}
          </span>
        </div>
      </div>

      {/* Right: Quick Telemetry Pills & Expand Button */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-between sm:justify-end">
        <div className="flex items-center gap-1.5 flex-wrap">
          {sub.selectedWorkout && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-zinc-500" />
              <span className="max-w-[100px] truncate">{sub.selectedWorkout}</span>
            </span>
          )}

          {sub.mealCompliance && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                sub.mealCompliance === "FULL"
                  ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                  : sub.mealCompliance === "PARTIAL"
                  ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              <Utensils className="w-3 h-3" />
              <span>{sub.mealCompliance === "FULL" ? "100% Meal" : sub.mealCompliance}</span>
            </span>
          )}

          {sub.happinessRate !== null && sub.happinessRate !== undefined && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
              <Star className="w-3 h-3 fill-zinc-950 text-zinc-950 dark:fill-white dark:text-white" />
              <span>{sub.happinessRate}/5</span>
            </span>
          )}

          {sub.isCompleted ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              Completed
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500">
              In Progress
            </span>
          )}
        </div>

        <button
          type="button"
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>

    {/* Expanded Details */}
    {isExpanded && (
      <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-white/5 space-y-4 bg-white dark:bg-zinc-900">
        {/* Video Status */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-zinc-400 font-mono">Video Session:</span>
          {sub.videoWatched ? (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
              <Video className="w-3 h-3" />
              Watched
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-white/5 text-zinc-400 flex items-center gap-1">
              <Video className="w-3 h-3" />
              Skipped
            </span>
          )}
        </div>

        {/* Workout Routine & Completed Exercises */}
        {(sub.selectedWorkout || checklistItems.length > 0) && (
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                <span>Routine Exercises</span>
              </span>
              {sub.selectedWorkout && (
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-white px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-white/10 font-mono">
                  {sub.selectedWorkout}
                </span>
              )}
            </div>

            {checklistItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {checklistItems.map((item, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 text-xs font-medium flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reflections & Notes Grid */}
        {(sub.dailyReflection || sub.workoutNotes || sub.mealNotes || sub.eventFeedback || sub.assessmentResponse) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {sub.dailyReflection && (
              <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-zinc-500" />
                  <span>Dear Diary Reflection</span>
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 italic leading-relaxed">
                  &ldquo;{sub.dailyReflection}&rdquo;
                </p>
              </div>
            )}

            {sub.workoutNotes && (
              <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono">
                  <Dumbbell className="w-3 h-3 text-zinc-500" />
                  <span>Workout Notes</span>
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {sub.workoutNotes}
                </p>
              </div>
            )}

            {sub.mealNotes && (
              <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono">
                  <Utensils className="w-3 h-3 text-zinc-500" />
                  <span>Meal Notes ({sub.mealCompliance || "Logged"})</span>
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {sub.mealNotes}
                </p>
              </div>
            )}

            {sub.assessmentResponse && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                  <span>Self Assessment</span>
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {sub.assessmentResponse}
                </p>
              </div>
            )}

            {sub.eventFeedback && (
              <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono">
                  <Users className="w-3 h-3 text-zinc-500" />
                  <span>Meetup Feedback</span>
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {sub.eventFeedback}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Custom Tasks Submissions */}
        {sub.customSubmissions && sub.customSubmissions.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
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
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 text-[11px] font-mono text-zinc-700 dark:text-zinc-200"
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

        {/* Telemetry Footer */}
        <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center gap-2 text-xs">
          {sub.happinessRate !== null && sub.happinessRate !== undefined && (
            <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
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

          {(sub.bedtime || sub.wakeTime || sub.sleepDurationMinutes) && (
            <div className="px-2.5 py-1 rounded-lg bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-mono text-[11px]">
              <Moon className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                {sub.bedtime && sub.wakeTime ? `${sub.bedtime} – ${sub.wakeTime}` : "Sleep Logged"}
                {sub.sleepDurationMinutes ? ` (${Math.floor(sub.sleepDurationMinutes / 60)}h ${sub.sleepDurationMinutes % 60}m)` : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
  );
}
