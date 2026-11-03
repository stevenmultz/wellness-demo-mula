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
    <div className="rounded-2xl p-4 sm:p-6 space-y-4 relative overflow-hidden group bg-zinc-900/60 border border-white/10 shadow-xl">
      {/* Background Soft Metallic Aura */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold font-mono">
            Phase 03 &bull; Recovery
          </span>
          <h3 className="text-base sm:text-xl font-light tracking-tight text-white uppercase font-geometric">
            Daily Reflection &amp; Vitality
          </h3>
          <p className="text-xs text-zinc-400 font-light max-w-md leading-relaxed font-mono">
            Evening decompression and daily vitality rate.
          </p>
        </div>

        <div className="shrink-0 flex items-center font-mono">
          <span className="text-micro px-4 py-1.5 rounded-full font-medium tracking-wider uppercase bg-white/10 border border-white/20 text-white backdrop-blur-md flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            <span>Day {dayNumber} Sanctuary</span>
          </span>
        </div>
      </div>

      {/* Happiness & Vitality Rate Selector (1 to 5) */}
      <div className="space-y-3 pt-1 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-micro uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Today&apos;s Fulfillment Index
          </span>
          <span className="text-xs font-medium text-zinc-300">
            {currentLevel.rate}/5 • {currentLevel.label} ({currentLevel.desc})
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {HAPPINESS_LEVELS.map((item) => {
            const isSelected = rate === item.rate;
            return (
              <button
                key={item.rate}
                type="button"
                disabled={isPast2359}
                onClick={() => setRate(item.rate)}
                className={`py-3.5 px-2 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-lg scale-[1.02]"
                    : "glass-panel-subtle border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <Star className={`w-3.5 h-3.5 ${isSelected ? "fill-white text-white dark:fill-zinc-950 dark:text-zinc-950" : "text-zinc-400"}`} />
                </div>
                <span className="text-xs font-semibold">{item.rate}</span>
                <span className="text-[10px] hidden md:block opacity-75 font-light truncate max-w-full">
                  {item.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dear Diary Text Area */}
      <div className="space-y-2 pt-2 font-mono">
        <label className="text-micro uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 block">
          Dear Diary • Evening Reflection
        </label>
        <textarea
          rows={4}
          value={reflection}
          disabled={isPast2359}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Enter your daily reflection and observations..."
          className="w-full p-4 sm:p-5 rounded-2xl glass-input text-xs sm:text-sm font-light text-zinc-900 dark:text-white leading-relaxed resize-none transition focus:ring-1 focus:ring-white/40 font-mono"
        />
      </div>

      {/* Save Action */}
      {!isPast2359 && (
        <div className="pt-2 flex justify-end font-mono">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide flex items-center gap-2 transition duration-200 shadow-md font-mono"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Reflection...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-zinc-950" />
                <span>Reflection Saved</span>
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
