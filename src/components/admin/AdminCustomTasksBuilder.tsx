"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Ruler,
  Activity,
  ClipboardCheck,
  Camera,
  Sparkles,
  ArrowUp,
  ArrowDown,
  PlayCircle,
} from "lucide-react";
import {
  CUSTOM_TASK_PRESETS,
  type CustomTaskField,
  type CustomTaskFieldType,
  type CustomTaskType,
  type ProgramDayCustomTaskDTO,
} from "@/wellness/utils/custom-tasks";

export interface AdminCustomTaskDraft {
  id?: string;
  sortOrder: number;
  taskType: CustomTaskType;
  title: string;
  instructions: string;
  isRequired: boolean;
  fields: CustomTaskField[];
  translations?: string | null;
}

export function normalizeCustomTaskDrafts(
  tasks?: ProgramDayCustomTaskDTO[] | null
): AdminCustomTaskDraft[] {
  if (!tasks || !Array.isArray(tasks)) return [];
  return tasks.map((t, idx) => ({
    id: t.id,
    sortOrder: t.sortOrder ?? idx,
    taskType: t.taskType,
    title: t.title,
    instructions: t.instructions || "",
    isRequired: t.isRequired ?? true,
    fields: Array.isArray(t.fields) ? t.fields : [],
    translations:
      typeof t.translations === "string"
        ? t.translations
        : t.translations
        ? JSON.stringify(t.translations)
        : null,
  }));
}

function getIcon(type: CustomTaskType) {
  switch (type) {
    case "MEASUREMENT":
      return Ruler;
    case "BENCHMARK":
      return Activity;
    case "CHECKLIST":
      return ClipboardCheck;
    case "MEDIA_UPLOAD":
      return Camera;
    default:
      return Sparkles;
  }
}

export function AdminCustomTasksBuilder({
  tasks,
  onChange,
}: {
  tasks: AdminCustomTaskDraft[];
  onChange: (next: AdminCustomTaskDraft[]) => void;
}) {
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  const addPreset = (presetId: string) => {
    const preset = CUSTOM_TASK_PRESETS.find((p) => p.presetId === presetId);
    if (!preset) return;
    const nextTask: AdminCustomTaskDraft = {
      sortOrder: tasks.length,
      taskType: preset.taskType,
      title: preset.title,
      instructions: preset.instructions,
      isRequired: true,
      fields: preset.fields.map((f) => ({ ...f })),
      translations: JSON.stringify({
        id: { title: preset.titleId, instructions: preset.instructionsId },
        en: { title: preset.title, instructions: preset.instructions },
      }),
    };
    onChange([...tasks, nextTask]);
    setShowPresetMenu(false);
  };

  const addBlankTask = () => {
    onChange([
      ...tasks,
      {
        sortOrder: tasks.length,
        taskType: "FORM",
        title: "Custom Coach Checkpoint",
        instructions: "",
        isRequired: true,
        fields: [
          {
            key: `field_${Date.now()}`,
            label: "Member Response",
            type: "text",
            required: true,
          },
        ],
      },
    ]);
    setShowPresetMenu(false);
  };

  const updateTask = (idx: number, patch: Partial<AdminCustomTaskDraft>) => {
    onChange(
      tasks.map((t, i) => {
        if (i !== idx) return t;
        const next = { ...t, ...patch, isRequired: true };
        // Clear stale preset translations when admin edits title or instructions so the new text displays in all locales
        if (patch.title !== undefined || patch.instructions !== undefined) {
          next.translations = null;
        }
        return next;
      })
    );
  };

  const moveTask = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= tasks.length) return;
    const copy = [...tasks];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    onChange(copy.map((t, i) => ({ ...t, sortOrder: i })));
  };

  const removeTask = (idx: number) => {
    onChange(tasks.filter((_, i) => i !== idx).map((t, i) => ({ ...t, sortOrder: i })));
  };

  const addField = (taskIdx: number) => {
    const target = tasks[taskIdx];
    const nextFields: CustomTaskField[] = [
      ...target.fields,
      {
        key: `metric_${target.fields.length + 1}_${Date.now().toString().slice(-4)}`,
        label: "New Input Field",
        type: "number",
        unit: "",
        required: true,
      },
    ];
    updateTask(taskIdx, { fields: nextFields });
  };

  const updateField = (taskIdx: number, fieldIdx: number, patch: Partial<CustomTaskField>) => {
    const target = tasks[taskIdx];
    const nextFields = target.fields.map((f, j) => (j === fieldIdx ? { ...f, ...patch } : f));
    updateTask(taskIdx, { fields: nextFields });
  };

  const removeField = (taskIdx: number, fieldIdx: number) => {
    const target = tasks[taskIdx];
    if (target.fields.length <= 1) return;
    updateTask(taskIdx, { fields: target.fields.filter((_, j) => j !== fieldIdx) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Custom Tasks &amp; Measurements (Day-Specific)
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Attach body measurements (Day 1 / Mid / Final), benchmarks, or custom checklists to this specific day.
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresetMenu((v) => !v)}
            className="h-9 px-3.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Task</span>
          </button>

          {showPresetMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-white/15 shadow-xl z-30 p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Choose Template
              </div>
              {CUSTOM_TASK_PRESETS.map((preset) => {
                const Icon = getIcon(preset.taskType);
                return (
                  <button
                    key={preset.presetId}
                    type="button"
                    onClick={() => addPreset(preset.presetId)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 flex items-start gap-2.5 transition"
                  >
                    <Icon className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                        {preset.title}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {preset.taskType} &bull; {preset.fields.length} fields
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="border-t border-zinc-200/70 dark:border-white/10 pt-1">
                <button
                  type="button"
                  onClick={addBlankTask}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Blank Custom Task</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/15 p-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
          No custom tasks attached to this day. Click &ldquo;Add Custom Task&rdquo; to add body measurements, benchmarks, or checklists.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, idx) => {
            const Icon = getIcon(task.taskType);
            return (
              <div
                key={task.id || `draft-${idx}`}
                className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-zinc-500" />
                    <select
                      value={task.taskType}
                      onChange={(e) =>
                        updateTask(idx, { taskType: e.target.value as CustomTaskType })
                      }
                      className="text-xs font-mono uppercase bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1 text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="MEASUREMENT">MEASUREMENT</option>
                      <option value="BENCHMARK">BENCHMARK</option>
                      <option value="FORM">FORM</option>
                      <option value="CHECKLIST">CHECKLIST</option>
                      <option value="MEDIA_UPLOAD">MEDIA_UPLOAD</option>
                    </select>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Mandatory
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveTask(idx, -1)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/10 disabled:opacity-30 transition"
                      title="Move task up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === tasks.length - 1}
                      onClick={() => moveTask(idx, 1)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/10 disabled:opacity-30 transition"
                      title="Move task down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTask(idx)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-500/10 transition"
                      title="Remove custom task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTask(idx, { title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                      placeholder="e.g. Body Weight Check-In"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                      Instructions for Member
                    </label>
                    <input
                      type="text"
                      value={task.instructions}
                      onChange={(e) => updateTask(idx, { instructions: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                      placeholder="Optional coach guidance..."
                    />
                  </div>
                </div>

                {/* Dedicated Coach Video URL editor for Introduction / Final Video Tasks */}
                {(() => {
                  const videoFieldIdx = task.fields.findIndex((f) => f.key === "videoUrl");
                  if (videoFieldIdx < 0) return null;
                  const vf = task.fields[videoFieldIdx];
                  return (
                    <div className="p-3 rounded-lg bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/10 space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                        <PlayCircle className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Coach Video URL (YouTube / Embed Link)</span>
                      </label>
                      <input
                        type="url"
                        value={vf.placeholder || ""}
                        onChange={(e) =>
                          updateField(idx, videoFieldIdx, { placeholder: e.target.value })
                        }
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white"
                      />
                    </div>
                  );
                })()}

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Input Fields ({task.fields.filter((f) => f.key !== "videoUrl").length})
                    </span>
                    <button
                      type="button"
                      onClick={() => addField(idx)}
                      className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Field
                    </button>
                  </div>

                  <div className="space-y-2">
                    {task.fields.map((field, fIdx) => {
                      if (field.key === "videoUrl") return null;
                      return (
                        <div
                          key={field.key}
                          className="space-y-2 bg-white dark:bg-[#141414] p-2.5 rounded-lg border border-zinc-200/70 dark:border-white/10"
                        >
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) =>
                                updateField(idx, fIdx, {
                                  label: e.target.value,
                                  labelId: undefined,
                                })
                              }
                              placeholder="Label"
                              className="col-span-5 px-2 py-1.5 rounded bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 text-xs"
                            />
                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateField(idx, fIdx, {
                                  type: e.target.value as CustomTaskFieldType,
                                })
                              }
                              className="col-span-3 px-2 py-1.5 rounded bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 text-xs"
                            >
                              <option value="number">Number</option>
                              <option value="text">Short Text</option>
                              <option value="textarea">Notes</option>
                              <option value="boolean">Checkbox</option>
                              <option value="select">Select Options</option>
                              <option value="rating">Rating Scale</option>
                              <option value="photo">Photo</option>
                            </select>
                            <input
                              type="text"
                              value={field.unit || ""}
                              onChange={(e) => updateField(idx, fIdx, { unit: e.target.value })}
                              placeholder="Unit (kg/cm)"
                              className="col-span-3 px-2 py-1.5 rounded bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 text-xs"
                            />
                            <button
                              type="button"
                              disabled={
                                task.fields.filter((f) => f.key !== "videoUrl").length <= 1
                              }
                              onClick={() => removeField(idx, fIdx)}
                              className="col-span-1 flex items-center justify-center text-zinc-400 hover:text-red-500 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {field.type === "select" && (
                            <input
                              type="text"
                              value={(field.options || []).join(", ")}
                              onChange={(e) =>
                                updateField(idx, fIdx, {
                                  options: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="Options separated by comma (e.g. Low, Medium, High)"
                              className="w-full px-2 py-1.5 rounded bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 text-xs"
                            />
                          )}

                          {(field.type === "number" || field.type === "rating") && (
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                value={field.min ?? ""}
                                onChange={(e) =>
                                  updateField(idx, fIdx, {
                                    min: e.target.value === "" ? undefined : Number(e.target.value),
                                  })
                                }
                                placeholder="Min"
                                className="px-2 py-1 rounded bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 text-[11px] font-mono"
                              />
                              <input
                                type="number"
                                value={field.max ?? ""}
                                onChange={(e) =>
                                  updateField(idx, fIdx, {
                                    max: e.target.value === "" ? undefined : Number(e.target.value),
                                  })
                                }
                                placeholder="Max"
                                className="px-2 py-1 rounded bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 text-[11px] font-mono"
                              />
                              <input
                                type="number"
                                step="any"
                                value={field.step ?? ""}
                                onChange={(e) =>
                                  updateField(idx, fIdx, {
                                    step:
                                      e.target.value === "" || Number(e.target.value) <= 0
                                        ? undefined
                                        : Number(e.target.value),
                                  })
                                }
                                placeholder="Step (e.g. 0.1)"
                                className="px-2 py-1 rounded bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 text-[11px] font-mono"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
