"use client";

import { useState } from "react";
import { BookmarkPlus, Check, FolderOpen, Trash2 } from "lucide-react";
import type { ProgramTemplateDTO } from "@/wellness/actions/templates";

interface ProgramTemplateBarProps {
  templateType: "PROGRAM_HEADER" | "DAY_ROUTINE";
  templates: ProgramTemplateDTO[];
  disabled?: boolean;
  onApply: (template: ProgramTemplateDTO) => void;
  onSaveAsTemplate: (name: string) => Promise<boolean>;
  onDeleteTemplate?: (id: string) => Promise<void>;
}

/**
 * Reusable bar to load, save, or delete custom Header or Day Routine templates
 * scoped to the active Community (or global defaults for Superadmin).
 */
export function ProgramTemplateBar({
  templateType,
  templates,
  disabled = false,
  onApply,
  onSaveAsTemplate,
  onDeleteTemplate,
}: ProgramTemplateBarProps) {
  const filtered = templates.filter((t) => t.templateType === templateType);
  const [selectedId, setSelectedId] = useState("");
  const [savingOpen, setSavingOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);

  const label =
    templateType === "PROGRAM_HEADER"
      ? "Header Blueprint Template"
      : "Day / Module Routine Template";

  const selectedTemplate = filtered.find((t) => t.id === selectedId) || null;

  const handleSave = async () => {
    const clean = templateName.trim();
    if (!clean) return;
    setSaving(true);
    try {
      const ok = await onSaveAsTemplate(clean);
      if (ok) {
        setTemplateName("");
        setSavingOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
          <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
          <span>{label}</span>
        </span>
        <select
          disabled={disabled || filtered.length === 0}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/15 text-xs text-zinc-900 dark:text-white disabled:opacity-50 max-w-xs"
        >
          <option value="">
            {filtered.length === 0
              ? "No saved templates yet"
              : `Choose template (${filtered.length})...`}
          </option>
          {filtered.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
              {tpl.organizationId ? "" : " (Platform)"}
            </option>
          ))}
        </select>
        {selectedTemplate && !disabled && (
          <>
            <button
              type="button"
              onClick={() => onApply(selectedTemplate)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition"
            >
              Apply Template
            </button>
            {onDeleteTemplate && selectedTemplate.organizationId && (
              <button
                type="button"
                onClick={() => {
                  void onDeleteTemplate(selectedTemplate.id);
                  setSelectedId("");
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                title="Delete selected template"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          {savingOpen ? (
            <>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name (e.g. Voli Standard)..."
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/15 text-xs text-zinc-900 dark:text-white w-52"
              />
              <button
                type="button"
                disabled={saving || !templateName.trim()}
                onClick={() => void handleSave()}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSavingOpen(false);
                  setTemplateName("");
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSavingOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-950 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 inline-flex items-center gap-1.5 transition"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save Current as Template</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
