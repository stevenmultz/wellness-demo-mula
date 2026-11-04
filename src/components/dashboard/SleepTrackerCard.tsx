"use client";

import { useState, useEffect } from "react";
import { Moon, Sunrise, Clock, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { calculateSleepDuration } from "@/wellness/utils/timezone";

interface SleepTrackerCardProps {
  dayNumber: number;
  sleepRecommendation: string | null;
  initialBedtime?: string | null;
  initialWakeTime?: string | null;
  initialSleepMinutes?: number | null;
  isPast2359: boolean;
  onSaveSleep: (bedtime: string, wakeTime: string, sleepDurationMinutes: number) => Promise<void>;
}

export function SleepTrackerCard({
  dayNumber,
  sleepRecommendation,
  initialBedtime = "",
  initialWakeTime = "",
  initialSleepMinutes,
  isPast2359,
  onSaveSleep,
}: SleepTrackerCardProps) {
  const [bedtime, setBedtime] = useState(initialBedtime || "22:30");
  const [wakeTime, setWakeTime] = useState(initialWakeTime || "06:30");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (initialBedtime) setBedtime(initialBedtime);
    if (initialWakeTime) setWakeTime(initialWakeTime);
  }, [initialBedtime, initialWakeTime]);

  const sleepCalc = calculateSleepDuration(bedtime, wakeTime);

  const handleSave = async () => {
    if (!sleepCalc) return;
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveSleep(bedtime, wakeTime, sleepCalc.totalMinutes);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const isOptimal = sleepCalc ? sleepCalc.totalMinutes >= 420 : false;

  return (
    <div className="rounded-2xl p-4 sm:p-5 space-y-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm font-mono transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
            Phase 01 &bull; Awakening
          </span>
          <h3 className="text-sm sm:text-base font-light tracking-tight text-zinc-950 dark:text-white uppercase font-geometric">
            Sleep &amp; Rest Log
          </h3>
        </div>

        {sleepCalc && (
          <span className="text-[10px] px-3 py-1 rounded-full font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-zinc-500 dark:text-zinc-300" />
            <span>{sleepCalc.formatted}</span>
          </span>
        )}
      </div>

      {/* Coach Sleep Recommendation */}
      {sleepRecommendation && (
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
          <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
          <span className="font-light leading-relaxed">{sleepRecommendation}</span>
        </div>
      )}

      {/* Input Hours Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
            <Moon className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> Bedtime
          </label>
          <input
            type="time"
            value={bedtime}
            disabled={isPast2359}
            onChange={(e) => setBedtime(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs font-mono font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white/40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
            <Sunrise className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> Wake Time
          </label>
          <input
            type="time"
            value={wakeTime}
            disabled={isPast2359}
            onChange={(e) => setWakeTime(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs font-mono font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white/40"
          />
        </div>
      </div>

      {/* Save Action */}
      {!isPast2359 && (
        <div className="pt-1 flex items-center justify-between border-t border-zinc-200 dark:border-white/10">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-light truncate max-w-[200px]">
            {sleepCalc ? (isOptimal ? "Optimal rest" : "Below 7h target") : "Set sleep duration"}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 shadow-sm hover:opacity-90 transition active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save Rest</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
