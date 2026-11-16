"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  countActive,
  EMPTY,
  FORMAT_OPTIONS,
  matches,
  PRICE_BANDS,
  priceBand,
  type ExploreProgram,
  type Filters,
  type SupportedFilterOptions,
} from "./exploreFilters";

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="space-y-2 rounded-[2px] border border-zinc-200 dark:border-white/10 p-3">
      <legend className="px-1 text-[11px] font-semibold text-zinc-950 dark:text-white">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition active:scale-95 ${
                on
                  ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950"
                  : "border-zinc-300 dark:border-white/15 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface ExploreFilterDialogProps {
  open: boolean;
  onClose: () => void;
  catalog: ExploreProgram[];
  supported: SupportedFilterOptions;
  draft: Filters;
  setDraft: React.Dispatch<React.SetStateAction<Filters>>;
  applied: Filters;
  onReset: () => void;
  onApply: () => void;
  onToggle: (key: keyof Filters, value: string) => void;
}

export function ExploreFilterDialog({
  open,
  onClose,
  catalog,
  supported,
  draft,
  applied,
  onReset,
  onApply,
  onToggle,
}: ExploreFilterDialogProps) {
  if (!open || typeof document === "undefined") return null;

  const previewMatchesCount = catalog.filter((p) => matches(p, draft)).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
    >
      <style>{`
        @keyframes fx-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fx-sheet { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
        .fx-fade { animation: fx-fade .2s ease-out both }
        .fx-sheet { animation: fx-sheet .26s cubic-bezier(.2,.8,.2,1) both }
        @media (prefers-reduced-motion: reduce) { .fx-fade, .fx-sheet { animation: none } }
      `}</style>
      <button
        type="button"
        aria-label="Close filters"
        className="fx-fade absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fx-sheet relative w-full md:max-w-lg max-h-[88vh] flex flex-col rounded-t-3xl md:rounded-[2px] bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/15 shadow-2xl font-sans">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-sm font-semibold text-zinc-950 dark:text-white">Filters</p>
            <p className="text-[11px] text-zinc-500">
              {countActive(draft) > 0
                ? `${countActive(draft)} selected`
                : "Choose what you want to see"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-[2px] hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          {catalog.length === 0 && (
            <p className="text-xs text-zinc-500">
              No plans loaded yet, so there are no options to filter.
            </p>
          )}
          <ChipGroup
            label="Plan format"
            options={supported.format.map((o) => o.label)}
            selected={draft.format.map(
              (id) => FORMAT_OPTIONS.find((o) => o.id === id)?.label || id
            )}
            onToggle={(label) => {
              const id = FORMAT_OPTIONS.find((o) => o.label === label)?.id;
              if (id) onToggle("format", id);
            }}
          />
          <ChipGroup
            label="Intensity level"
            options={supported.intensity}
            selected={draft.intensity}
            onToggle={(v) => onToggle("intensity", v)}
          />
          <ChipGroup
            label="Plan category"
            options={supported.category}
            selected={draft.category}
            onToggle={(v) => onToggle("category", v)}
          />
          <ChipGroup
            label="Plan duration"
            options={supported.duration}
            selected={draft.duration}
            onToggle={(v) => onToggle("duration", v)}
          />
          {supported.price && (
            <ChipGroup
              label="Price"
              options={PRICE_BANDS.filter((b) =>
                catalog.some((p) => priceBand(p.price) === b.id)
              ).map((b) => b.label)}
              selected={draft.price.map(
                (id) => PRICE_BANDS.find((b) => b.id === id)?.label || id
              )}
              onToggle={(label) => {
                const id = PRICE_BANDS.find((b) => b.label === label)?.id;
                if (id) onToggle("price", id);
              }}
            />
          )}
          <ChipGroup
            label="Experience level"
            options={supported.experience}
            selected={draft.experience}
            onToggle={(v) => onToggle("experience", v)}
          />
          <ChipGroup
            label="Schedule"
            options={supported.schedule}
            selected={draft.schedule}
            onToggle={(v) => onToggle("schedule", v)}
          />
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-100 dark:border-white/10">
          <button
            type="button"
            disabled={countActive(draft) === 0 && countActive(applied) === 0}
            onClick={onReset}
            className="px-4 py-2.5 rounded-[2px] border border-zinc-300 dark:border-white/20 text-xs font-semibold disabled:opacity-40 active:scale-95 transition"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 px-4 py-2.5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider active:scale-95 transition"
          >
            Apply · {previewMatchesCount} result{previewMatchesCount === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export { EMPTY };
