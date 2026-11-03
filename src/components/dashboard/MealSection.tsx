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
    <div className="rounded-2xl p-4 sm:p-5 space-y-4 bg-zinc-900/60 border border-white/10 shadow-lg font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
            Nourishment Protocol
          </span>
          <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
            Fuel &amp; Nutrition
          </h3>
        </div>

        <span className="text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-semibold bg-white/10 border border-white/15 text-white">
          Whole Food
        </span>
      </div>

      {/* Coach Meal Recommendation Text */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
          Daily Recommendation
        </span>
        {mealRecommendation ? (
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-300 font-light leading-relaxed whitespace-pre-line">
            {mealRecommendation}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic p-3 rounded-xl bg-black/40 border border-white/5">
            Maintain clean hydration and balanced whole foods.
          </p>
        )}
      </div>

      {/* Compliance Status Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Compliance
          </span>
          <span className="text-zinc-300 font-medium">
            {compliance === "FULL"
              ? "100% Compliant"
              : compliance === "PARTIAL"
              ? "Modified"
              : "Off-Track"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {[
            { key: "FULL", label: "Compliant" },
            { key: "PARTIAL", label: "Modified" },
            { key: "OFF_TRACK", label: "Off-Track" },
          ].map((item) => {
            const isSelected = compliance === item.key;
            return (
              <button
                key={item.key}
                type="button"
                disabled={isPast2359}
                onClick={() => setCompliance(item.key)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold tracking-wider uppercase border transition-all text-center ${
                  isSelected
                    ? "bg-white text-zinc-950 border-white shadow-md"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes Textarea */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
          Meal Notes
        </label>
        <textarea
          rows={2}
          value={notes}
          disabled={isPast2359}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Log meals, supplements, or dietary notes..."
          className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-light text-white leading-relaxed resize-none focus:outline-none focus:border-white/40 placeholder:text-zinc-600"
        />
      </div>

      {/* Save Button */}
      {!isPast2359 && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-full chrome-button text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 shadow-sm"
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
              <span>Save Meal</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
