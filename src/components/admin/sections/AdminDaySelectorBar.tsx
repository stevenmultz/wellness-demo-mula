"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { formatDate, isDayFilled } from "../adminUtils";
import type { AdminDayFormState, AdminProgram } from "../adminTypes";

interface AdminDaySelectorBarProps {
  selectedProgram: AdminProgram;
  selectedDayNum: number;
  dayForm: AdminDayFormState;
  handleSelectDay: (prog: AdminProgram, dayNum: number) => void;
}

export function AdminDaySelectorBar({
  selectedProgram,
  selectedDayNum,
  dayForm,
  handleSelectDay,
}: AdminDaySelectorBarProps) {
  const [scheduleWeekView, setScheduleWeekView] = useState<number | "ALL">("ALL");

  const isOnline = (selectedProgram.locationType || "ONLINE") === "ONLINE";
  const maxSavedDay = selectedProgram.days.reduce((m, d) => Math.max(m, d.dayNumber), 0);
  const targetDays = isOnline
    ? Math.max(selectedDayNum, maxSavedDay, 1)
    : selectedProgram.durationDays || 21;
  const allDays = Array.from({ length: targetDays }, (_, i) => i + 1);
  const totalWeeks = Math.ceil(targetDays / 7);
  const unitLabel = isOnline ? "Module" : "Day";

  let filledCount = 0;
  for (let d = 1; d <= targetDays; d++) {
    if (isDayFilled(selectedProgram.days.find((x) => x.dayNumber === d))) {
      filledCount++;
    }
  }

  const getDayDateLabel = (dayNum: number): string => {
    if (isOnline) return "Self-Paced";
    if (!selectedProgram.startDate) return "TBA";
    const base = new Date(selectedProgram.startDate);
    if (isNaN(base.getTime())) return "TBA";
    const target = new Date(base);
    target.setDate(base.getDate() + (dayNum - 1));
    return formatDate(target);
  };

  const visibleDays =
    scheduleWeekView === "ALL" || totalWeeks <= 1
      ? allDays
      : allDays.filter((d) => Math.ceil(d / 7) === scheduleWeekView);

  const percentFilled = Math.round((filledCount / Math.max(1, targetDays)) * 100);

  return (
    <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
      {/* Top Bar: Title, Completion Progress & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              {isOnline ? "Module Curriculum" : "Daily Schedule"}
            </h3>
            <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
              {filledCount}/{targetDays} {isOnline ? "Modules" : "Days"} Complete ({percentFilled}%)
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {isOnline
              ? "Select a module to edit or click + Add Module to grow your anytime curriculum."
              : "Select any day card to edit its daily protocol or use previous/next navigation below."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOnline && targetDays < 90 && (
            <button
              type="button"
              onClick={() => handleSelectDay(selectedProgram, maxSavedDay + 1 === selectedDayNum ? selectedDayNum + 1 : Math.max(maxSavedDay, selectedDayNum) + 1)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Module {Math.max(maxSavedDay, selectedDayNum) + 1}</span>
            </button>
          )}
          {/* Week Filter Pills (if program has more than 1 week) */}
          {totalWeeks > 1 && (
            <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 gap-1 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setScheduleWeekView("ALL")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  scheduleWeekView === "ALL"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                All Days
              </button>
              {Array.from({ length: totalWeeks }, (_, wIdx) => {
                const wNum = wIdx + 1;
                const isSelectedWeek = scheduleWeekView === wNum;
                return (
                  <button
                    key={wNum}
                    type="button"
                    onClick={() => setScheduleWeekView(wNum)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      isSelectedWeek
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                    }`}
                  >
                    Week {wNum}
                  </button>
                );
              })}
            </div>
          )}

          {/* Direct Jump to Any Day */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10">
            <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Jump to:
            </label>
            <select
              value={selectedDayNum}
              onChange={(e) => {
                const d = Number(e.target.value);
                handleSelectDay(selectedProgram, d);
                if (totalWeeks > 1 && scheduleWeekView !== "ALL") {
                  setScheduleWeekView(Math.ceil(d / 7));
                }
              }}
              className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none cursor-pointer pr-1"
              title="Jump directly to any day"
            >
              {allDays.map((d) => {
                const isFilled = isDayFilled(
                  selectedProgram.days.find((x) => x.dayNumber === d)
                );
                return (
                  <option
                    key={d}
                    value={d}
                    className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                  >
                    {unitLabel} {d} {isFilled ? "✓" : "—"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full bg-zinc-500 transition-all duration-300 rounded-full"
          style={{ width: `${percentFilled}%` }}
        />
      </div>

      {/* Responsive Day Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {visibleDays.map((dayNum) => {
          const existing = selectedProgram.days.find(
            (d) => d.dayNumber === dayNum
          );
          const filled = isDayFilled(existing);
          const isSelected = selectedDayNum === dayNum;
          const effectiveType = isSelected
            ? dayForm.dayType
            : existing?.dayType;

          const typeLabel =
            effectiveType === "REST_DAY"
              ? "Rest"
              : effectiveType === "CONNECTION_DAY" ||
                effectiveType === "MEETUP_DAY"
              ? "Connect"
              : effectiveType === "TRAINING_DAY"
              ? "Training"
              : "Unset";

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => {
                handleSelectDay(selectedProgram, dayNum);
                if (totalWeeks > 1 && scheduleWeekView !== "ALL") {
                  setScheduleWeekView(Math.ceil(dayNum / 7));
                }
              }}
              className={`p-3 rounded-xl text-left transition flex flex-col justify-between gap-2 border ${
                isSelected
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-md border-transparent ring-2 ring-zinc-900/10 dark:ring-white/20 scale-[1.02]"
                  : filled
                  ? "bg-zinc-50/90 dark:bg-white/5 border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 shadow-2xs"
                  : "bg-white/50 dark:bg-white/[0.02] border-zinc-200/60 dark:border-white/5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-xs font-bold whitespace-nowrap">
                  {unitLabel} {dayNum}
                </span>
                {filled ? (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-400"
                    }`}
                    title="Completed"
                  >
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
                )}
              </div>

              <div className="space-y-0.5">
                <span
                  className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md inline-block ${
                    isSelected
                      ? "bg-white/15 text-white dark:bg-zinc-900/10 dark:text-zinc-900"
                      : effectiveType === "TRAINING_DAY"
                      ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                      : effectiveType === "REST_DAY"
                      ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                      : effectiveType === "CONNECTION_DAY" ||
                        effectiveType === "MEETUP_DAY"
                      ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                      : "bg-zinc-100 dark:bg-white/5 text-zinc-400"
                  }`}
                >
                  {typeLabel}
                </span>
                <p className="text-[10px] font-mono opacity-70 truncate block">
                  {getDayDateLabel(dayNum)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Day Navigation Stepper Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-white/5">
        <button
          type="button"
          onClick={() => {
            const prevDay = Math.max(1, selectedDayNum - 1);
            handleSelectDay(selectedProgram, prevDay);
            if (totalWeeks > 1 && scheduleWeekView !== "ALL") {
              setScheduleWeekView(Math.ceil(prevDay / 7));
            }
          }}
          disabled={selectedDayNum <= 1}
          className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 w-fit"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous Day (Day {selectedDayNum - 1})</span>
        </button>

        <div className="flex items-center gap-2.5 self-center text-center">
          <span className="text-xs font-semibold text-zinc-900 dark:text-white">
            Editing {unitLabel} {selectedDayNum} of {targetDays}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
          <span className="text-xs text-zinc-500 font-mono">
            {getDayDateLabel(selectedDayNum)}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
              dayForm.dayType === "TRAINING_DAY"
                ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                : dayForm.dayType === "REST_DAY"
                ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
            }`}
          >
            {dayForm.dayType === "REST_DAY"
              ? "Rest"
              : dayForm.dayType === "TRAINING_DAY"
              ? "Training"
              : "Connect"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            const nextDay = Math.min(targetDays, selectedDayNum + 1);
            handleSelectDay(selectedProgram, nextDay);
            if (totalWeeks > 1 && scheduleWeekView !== "ALL") {
              setScheduleWeekView(Math.ceil(nextDay / 7));
            }
          }}
          disabled={selectedDayNum >= targetDays}
          className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 w-fit ml-auto sm:ml-0"
        >
          <span>Next Day (Day {selectedDayNum + 1})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
