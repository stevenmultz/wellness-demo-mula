"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2 } from "lucide-react";

interface MealSectionProps {
  mealRecommendation: string | null;
  initialCompliance?: string | null;
  initialNotes?: string | null;
  isPast2359: boolean;
  onSaveMeal: (compliance: string, notes: string) => Promise<void>;
}

export function MealSection({
  mealRecommendation,
  initialCompliance = "FULL",
  initialNotes = "",
  isPast2359,
  onSaveMeal,
}: MealSectionProps) {
  const [compliance, setCompliance] = useState<string>(initialCompliance || "FULL");
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (initialCompliance) setCompliance(initialCompliance);
    if (initialNotes) setNotes(initialNotes);
  }, [initialCompliance, initialNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveMeal(compliance, notes);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 relative overflow-hidden group border border-zinc-200/70 dark:border-white/10 shadow-xl">
      {/* Header with High Negative Space */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-900/[0.06] dark:border-white/10 pb-5">
        <div className="space-y-1.5">
          <span className="text-micro text-zinc-500 dark:text-zinc-400 block tracking-[0.24em] uppercase font-mono">
            Clean Nourishment
          </span>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
            Nutrition &amp; Dietary Protocol
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-md leading-relaxed font-mono">
            Anti-inflammatory whole food protocol for steady cellular energy.
          </p>
        </div>

        <div className="shrink-0 font-mono">
          <span className="text-micro px-3.5 py-1.5 rounded-full font-medium tracking-wider uppercase bg-white/10 border border-white/20 text-white backdrop-blur-md">
            Whole Food Protocol
          </span>
        </div>
      </div>

      {/* Visual Culinary Banner */}
      <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/60 dark:border-white/10 shadow-lg">
        <Image
          src="/image.jpg"
          alt="Clean Nourishment"
          fill
          className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl glass-image-overlay flex items-center justify-between text-white">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold block">Anti-Inflammatory Curation</span>
            <span className="text-[11px] text-zinc-300 font-light font-mono">
              Focus on mineral hydration, leafy greens, and healthy fats.
            </span>
          </div>
        </div>
      </div>

      {/* Coach Meal Recommendation Text */}
      <div className="space-y-2">
        <span className="text-micro uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 block font-mono">
          Today&apos;s Curated Nutrition
        </span>
        {mealRecommendation ? (
          <div className="p-5 rounded-2xl glass-panel-subtle text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-light leading-relaxed whitespace-pre-line border border-zinc-200/60 dark:border-white/10 font-mono">
            {mealRecommendation}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic p-4 rounded-2xl glass-panel-subtle font-mono">
            Whole-food protocol, minimal seed oils, and maintain at least 2.5L cellular hydration.
          </p>
        )}
      </div>

      {/* Compliance Status Selector */}
      <div className="space-y-3 pt-2 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-micro uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Protocol Compliance
          </span>
          <span className="text-xs font-medium text-zinc-300">
            {compliance === "FULL"
              ? "100% Compliant"
              : compliance === "PARTIAL"
              ? "Modified"
              : "Off-Track"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            disabled={isPast2359}
            onClick={() => setCompliance("FULL")}
            className={`py-3 px-2 rounded-2xl text-xs font-medium tracking-wide border transition-all text-center font-mono ${
              compliance === "FULL"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-md"
                : "glass-panel-subtle border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            100% Compliant
          </button>

          <button
            type="button"
            disabled={isPast2359}
            onClick={() => setCompliance("PARTIAL")}
            className={`py-3 px-2 rounded-2xl text-xs font-medium tracking-wide border transition-all text-center font-mono ${
              compliance === "PARTIAL"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-md"
                : "glass-panel-subtle border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            Modified
          </button>

          <button
            type="button"
            disabled={isPast2359}
            onClick={() => setCompliance("OFF_TRACK")}
            className={`py-3 px-2 rounded-2xl text-xs font-medium tracking-wide border transition-all text-center font-mono ${
              compliance === "OFF_TRACK"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-md"
                : "glass-panel-subtle border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            Off-Track
          </button>
        </div>
      </div>

      {/* Notes Textarea */}
      <div className="space-y-2 font-mono">
        <label className="text-micro uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 block">
          What You Ate Today (Food Feedback Note)
        </label>
        <textarea
          rows={3}
          value={notes}
          disabled={isPast2359}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter your meals and nutrition logs for today..."
          className="w-full p-4 rounded-2xl glass-input text-xs sm:text-sm font-light text-zinc-900 dark:text-white leading-relaxed resize-none transition focus:ring-1 focus:ring-white/40 font-mono"
        />
      </div>

      {/* Save Button */}
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
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-950" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save Food Feedback</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
