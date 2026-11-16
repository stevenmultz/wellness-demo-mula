"use client";

import { Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  DEFAULT_PROGRAM_TERMS,
  DEFAULT_PROGRAM_TERMS_CHAPTERS,
  type ProgramReferenceItem,
  type ProgramTermChapter,
} from "@/wellness/utils/json";
import { DynamicItemListBuilder } from "./AdminFormPickers";

interface ScientificReferencesBuilderProps {
  references: ProgramReferenceItem[];
  onChange: (nextRefs: ProgramReferenceItem[]) => void;
  disabled?: boolean;
}

export function ScientificReferencesBuilder({
  references,
  onChange,
  disabled = false,
}: ScientificReferencesBuilderProps) {
  const safeRefs =
    references && references.length > 0 ? references : [{ title: "", url: "" }];

  const handleUpdate = (index: number, field: "title" | "url", value: string) => {
    onChange(safeRefs.map((r, idx) => (idx === index ? { ...r, [field]: value } : r)));
  };

  const handleAdd = () => {
    onChange([...safeRefs, { title: "", url: "" }]);
  };

  const handleRemove = (index: number) => {
    if (safeRefs.length <= 1) {
      onChange([{ title: "", url: "" }]);
      return;
    }
    onChange(safeRefs.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Scientific References &amp; Clinical Journals *
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Peer-reviewed studies, clinical journals, or scientific literature supporting the
            program benefits
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium flex items-center gap-1.5 hover:opacity-90 transition self-start sm:self-center shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Reference</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {safeRefs.map((refItem, idx) => {
          const isEvenRow = idx % 2 === 1;
          return (
            <div
              key={idx}
              className={`flex flex-col sm:flex-row sm:items-center gap-2.5 p-2 rounded-xl border transition ${
                isEvenRow
                  ? "bg-zinc-300/65 dark:bg-zinc-700/70 border-zinc-400/70 dark:border-zinc-600"
                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span
                  className={`w-6 h-6 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                    isEvenRow
                      ? "bg-white text-zinc-950 border border-zinc-500 dark:bg-zinc-950 dark:text-white dark:border-zinc-400"
                      : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                  }`}
                >
                  {idx + 1}
                </span>

                <input
                  type="text"
                  disabled={disabled}
                  value={refItem.title}
                  onChange={(e) => handleUpdate(idx, "title", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!disabled) handleAdd();
                    }
                  }}
                  placeholder="Enter scientific reference or journal title..."
                  className={`flex-1 px-3.5 py-2 rounded-lg border text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed ${
                    isEvenRow
                      ? "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-600"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10"
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pl-8 sm:pl-0 sm:w-72 shrink-0">
                <input
                  type="url"
                  disabled={disabled}
                  value={refItem.url || ""}
                  onChange={(e) => handleUpdate(idx, "url", e.target.value)}
                  placeholder="Enter reference URL..."
                  className={`flex-1 px-3.5 py-2 rounded-lg border text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed ${
                    isEvenRow
                      ? "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-600"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10"
                  }`}
                />

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition shrink-0"
                    title="Remove reference"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProgramBlueprintSectionContentProps {
  targetState: string;
  onChangeTargetState: (val: string) => void;
  methodology: string;
  onChangeMethodology: (val: string) => void;
  expectedBenefits: string[];
  onChangeBenefits: (next: string[]) => void;
  scientificReferences: ProgramReferenceItem[];
  onChangeReferences: (next: ProgramReferenceItem[]) => void;
  programGuidelines: string[];
  onChangeGuidelines: (next: string[]) => void;
  disabled?: boolean;
}

export function ProgramBlueprintSectionContent({
  targetState,
  onChangeTargetState,
  methodology,
  onChangeMethodology,
  expectedBenefits,
  onChangeBenefits,
  scientificReferences,
  onChangeReferences,
  programGuidelines,
  onChangeGuidelines,
  disabled = false,
}: ProgramBlueprintSectionContentProps) {
  return (
    <div className="space-y-6 pt-3">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Target Physical, Mental &amp; Mind Condition *
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Physical condition, mental state, and mind patterns this program is designed to
            address
          </p>
          <textarea
            rows={4}
            required
            disabled={disabled}
            value={targetState}
            onChange={(e) => onChangeTargetState(e.target.value)}
            placeholder="Enter target physical, mental, and mind condition..."
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-zinc-300/70 dark:border-zinc-700">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Program Objectives &amp; Methodology *
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Core goals and how the movement, nutrition, and recovery methodology works
          </p>
          <textarea
            rows={4}
            required
            disabled={disabled}
            value={methodology}
            onChange={(e) => onChangeMethodology(e.target.value)}
            placeholder="Enter program objectives and methodology..."
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-300/70 dark:border-zinc-700/70">
        <DynamicItemListBuilder
          label="Expected Benefits & Tangible Outcomes *"
          subLabel="Specific physical, mental, and daily life improvements participants will experience"
          addButtonLabel="Add Benefit"
          placeholderPrefix="Enter expected benefit"
          items={expectedBenefits}
          onChange={onChangeBenefits}
          disabled={disabled}
        />
      </div>

      <div className="pt-4 border-t border-zinc-300/70 dark:border-zinc-700/70">
        <ScientificReferencesBuilder
          references={scientificReferences}
          onChange={onChangeReferences}
          disabled={disabled}
        />
      </div>

      <div className="pt-4 border-t border-zinc-300/70 dark:border-zinc-700/70">
        <DynamicItemListBuilder
          label="Program Guidelines & Daily Principles *"
          subLabel="Practical preparation habits, daily discipline rules, and participation standards"
          addButtonLabel="Add Guideline"
          placeholderPrefix="Enter program guideline"
          items={programGuidelines}
          onChange={onChangeGuidelines}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

interface ProgramTermsChapterBuilderProps {
  chapters: ProgramTermChapter[];
  onChange: (nextChapters: ProgramTermChapter[]) => void;
  disabled?: boolean;
}

export function ProgramTermsChapterBuilder({
  chapters,
  onChange,
  disabled = false,
}: ProgramTermsChapterBuilderProps) {
  const currentChapters =
    chapters && chapters.length > 0
      ? chapters
      : DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
          chapter: c.chapter,
          clauses: [...c.clauses],
        }));

  const handleUpdateChapterTitle = (chapterIdx: number, val: string) => {
    onChange(
      currentChapters.map((ch, idx) =>
        idx === chapterIdx ? { ...ch, chapter: val } : ch
      )
    );
  };

  const handleAddChapter = () => {
    const nextChapterNumber = currentChapters.length + 1;
    onChange([
      ...currentChapters,
      {
        chapter: `Chapter ${nextChapterNumber}: Terms & Policies`,
        clauses: ["Enter enforceable clause details here..."],
      },
    ]);
  };

  const handleRemoveChapter = (chapterIdx: number) => {
    if (currentChapters.length <= 1) {
      onChange([{ chapter: "", clauses: [""] }]);
      return;
    }
    onChange(currentChapters.filter((_, idx) => idx !== chapterIdx));
  };

  const handleUpdateClause = (chapterIdx: number, clauseIdx: number, val: string) => {
    onChange(
      currentChapters.map((ch, idx) => {
        if (idx !== chapterIdx) return ch;
        const nextClauses = [...ch.clauses];
        nextClauses[clauseIdx] = val;
        return { ...ch, clauses: nextClauses };
      })
    );
  };

  const handleAddClause = (chapterIdx: number) => {
    onChange(
      currentChapters.map((ch, idx) =>
        idx === chapterIdx ? { ...ch, clauses: [...ch.clauses, ""] } : ch
      )
    );
  };

  const handleRemoveClause = (chapterIdx: number, clauseIdx: number) => {
    onChange(
      currentChapters.map((ch, idx) => {
        if (idx !== chapterIdx) return ch;
        if (ch.clauses.length <= 1) return { ...ch, clauses: [""] };
        return { ...ch, clauses: ch.clauses.filter((_, cIdx) => cIdx !== clauseIdx) };
      })
    );
  };

  const handleLoadDefaultPreset = () => {
    onChange(
      DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
        chapter: c.chapter,
        clauses: [...c.clauses],
      }))
    );
  };

  return (
    <div className="space-y-4 pt-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-200 dark:border-white/10">
        <div>
          <label className="block text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
            Terms &amp; Conditions Chapters (Bab &amp; Sub-bab) *
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Organize program rules into structured chapters (e.g. Refund Policy, Medical
            Clearance) with specific numbered clauses.
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleLoadDefaultPreset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 transition shrink-0"
            title="Reset to default legal & medical waiver chapters"
          >
            <RefreshCw className="w-3 h-3 text-zinc-400" />
            <span>Load Standard Preset</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {currentChapters.map((ch, cIdx) => (
          <div
            key={cIdx}
            className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.02] space-y-3.5 transition"
          >
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-200/90 dark:bg-zinc-800 text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider shrink-0 select-none">
                Bab {cIdx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  disabled={disabled}
                  value={ch.chapter}
                  onChange={(e) => handleUpdateChapterTitle(cIdx, e.target.value)}
                  placeholder="Enter chapter title"
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveChapter(cIdx)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition shrink-0"
                  title="Remove this chapter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-zinc-200 dark:border-white/10 ml-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block pb-1">
                Sub-bab Clauses for Bab {cIdx + 1}
              </span>
              {ch.clauses.map((clause, clIdx) => (
                <div key={clIdx} className="flex items-center gap-2">
                  <span className="w-9 px-1.5 py-1 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400 text-center shrink-0 select-none">
                    {cIdx + 1}.{clIdx + 1}
                  </span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={clause}
                    onChange={(e) => handleUpdateClause(cIdx, clIdx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!disabled) handleAddClause(cIdx);
                      }
                    }}
                    placeholder={`Enter clause ${cIdx + 1}.${clIdx + 1}...`}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700/80 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveClause(cIdx, clIdx)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition shrink-0"
                      title="Remove clause"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {!disabled && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddClause(cIdx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-500 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>
                      Add Clause {cIdx + 1}.{ch.clauses.length + 1}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddChapter}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Chapter (Bab {currentChapters.length + 1})</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function TermsAndConditionsBuilder({
  terms,
  onChange,
  disabled = false,
}: {
  terms: string[];
  onChange: (nextTerms: string[]) => void;
  disabled?: boolean;
}) {
  const safeTerms = terms && terms.length > 0 ? terms : [...DEFAULT_PROGRAM_TERMS];
  return (
    <div className="pt-3">
      <DynamicItemListBuilder
        label="Terms & Conditions Clauses *"
        subLabel="Legal, medical disclaimer, and non-refundable enrollment terms agreed upon at checkout"
        addButtonLabel="Add Term"
        placeholderPrefix="Enter term and condition"
        items={safeTerms}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
