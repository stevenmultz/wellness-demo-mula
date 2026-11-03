"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Sparkles, Star } from "lucide-react";

interface DailyReflectionCardProps {
  dayNumber: number;
  initialReflection?: string | null;
  initialHappinessRate?: number | null;
  isPast2359: boolean;
  onSaveReflection: (reflection: string, happinessRate: number) => Promise<void>;
}

const HAPPINESS_LEVELS = [
  { rate: 1, label: "Restorative Needed", desc: "Body requires deep rest & recovery" },
  { rate: 2, label: "Steady", desc: "Stable energy & balanced pace" },
  { rate: 3, label: "Centered", desc: "Calm, focused & mentally grounded" },
  { rate: 4, label: "Grounded & Fulfilled", desc: "Strong positive momentum & mood" },
  { rate: 5, label: "Peak Vitality", desc: "Optimal physical & mental clarity" },
];

export function DailyReflectionCard({
  dayNumber,
  initialReflection = "",
  initialHappinessRate = 5,
  isPast2359,
  onSaveReflection,
}: DailyReflectionCardProps) {
  const [reflection, setReflection] = useState(initialReflection || "");
  const [rate, setRate] = useState<number>(initialHappinessRate || 5);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (initialReflection) setReflection(initialReflection);
    if (initialHappinessRate) setRate(initialHappinessRate);
  }, [initialReflection, initialHappinessRate]);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveReflection(reflection, rate);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const currentLevel = HAPPINESS_LEVELS.find((h) => h.rate === rate) || HAPPINESS_LEVELS[4];

  return (
    <div className="rounded-2xl p-4 sm:p-5 space-y-4 bg-zinc-900/60 border border-white/10 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold font-mono">
            Phase 03 &bull; Recovery
          </span>
          <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
            Daily Reflection
          </h3>
        </div>

        <span className="text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-semibold bg-white/10 border border-white/15 text-white font-mono">
          Day {dayNumber}
        </span>
      </div>

      {/* Fulfillment Index Selector (1 to 5) */}
      <div className="space-y-2 font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Vitality Index
          </span>
          <span className="text-zinc-300 font-medium">
            {currentLevel.rate}/5 &bull; {currentLevel.label}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {HAPPINESS_LEVELS.map((item) => {
            const isSelected = rate === item.rate;
            return (
              <button
                key={item.rate}
                type="button"
                disabled={isPast2359}
                onClick={() => setRate(item.rate)}
                className={`py-2 sm:py-2.5 rounded-xl border text-center transition-all duration-150 flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? "bg-white text-zinc-950 border-white shadow-md font-bold"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20 font-medium"
                }`}
              >
                <span className="text-xs">{item.rate}</span>
                <span className="text-[9px] hidden sm:block opacity-75 uppercase font-light">
                  {item.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reflection Note */}
      <div className="space-y-1.5 font-mono">
        <label className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
          Daily Log &amp; Notes
        </label>
        <textarea
          rows={3}
          value={reflection}
          disabled={isPast2359}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Log recovery sensations, mental state, or milestones..."
          className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-light text-white leading-relaxed resize-none focus:outline-none focus:border-white/40 font-mono placeholder:text-zinc-600"
        />
      </div>

      {/* Save Action */}
      {!isPast2359 && (
        <div className="flex justify-end pt-1 font-mono">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-full chrome-button text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 shadow-sm font-mono"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save Reflection</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
