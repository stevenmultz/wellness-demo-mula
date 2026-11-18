"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Ruler,
  Sparkles,
  X,
} from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { wellnessUserSubmitCustomTask } from "@/wellness/actions/custom-tasks";
import type {
  CustomTaskField,
  CustomTaskType,
  ProgramDayCustomTaskDTO,
} from "@/wellness/utils/custom-tasks";

export interface CustomTaskSectionProps {
  programDayId: string;
  customTasks: ProgramDayCustomTaskDTO[];
  locked: boolean;
  onSubmitted?: (
    customTaskId: string,
    submission: NonNullable<ProgramDayCustomTaskDTO["submission"]>
  ) => void;
}

function getTaskIcon(type: CustomTaskType) {
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

function getTaskBadgeLabel(type: CustomTaskType, locale: "id" | "en") {
  const map: Record<CustomTaskType, { en: string; id: string }> = {
    MEASUREMENT: { en: "Measurement", id: "Pengukuran" },
    BENCHMARK: { en: "Benchmark", id: "Tes Performa" },
    FORM: { en: "Coach Check-In", id: "Cek Coach" },
    CHECKLIST: { en: "Protocol", id: "Protokol" },
    MEDIA_UPLOAD: { en: "Photo Check", id: "Foto Cek" },
  };
  return map[type]?.[locale] ?? type;
}

async function compressPhoto(file: File, maxDim = 960, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function summarizeValues(
  fields: CustomTaskField[],
  values: Record<string, unknown> | undefined
): string {
  if (!values) return "";
  const parts: string[] = [];
  for (const f of fields) {
    const val = values[f.key];
    if (val === undefined || val === null || val === "") continue;
    if (f.type === "boolean") {
      if (val === true) parts.push(f.label);
    } else if (f.type === "photo") {
      parts.push("Photo uploaded");
    } else if (f.type !== "textarea") {
      parts.push(`${f.label}: ${val}${f.unit ? ` ${f.unit}` : ""}`);
    }
    if (parts.length >= 3) break;
  }
  return parts.join(" • ");
}

export function CustomTaskSection({
  programDayId,
  customTasks,
  locked,
  onSubmitted,
}: CustomTaskSectionProps) {
  const { locale, t } = useLocale();
  const [activeTask, setActiveTask] = useState<ProgramDayCustomTaskDTO | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhotoKey, setUploadingPhotoKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!customTasks || customTasks.length === 0) return null;

  const openTaskModal = (task: ProgramDayCustomTaskDTO) => {
    if (locked) return;
    setErrorMsg(null);
    setFormValues({ ...(task.submission?.values || {}) });
    setActiveTask(task);
  };

  const handleFieldChange = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || locked) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await wellnessUserSubmitCustomTask({
        programDayId,
        customTaskId: activeTask.id,
        values: formValues,
      });
      if (!res.success) {
        setErrorMsg(res.message || "Failed to save checkpoint.");
        return;
      }
      if (res.data && onSubmitted) {
        onSubmitted(
          activeTask.id,
          res.data as {
            id: string;
            values: Record<string, unknown>;
            submittedAt: string;
            updatedAt: string;
          }
        );
      }
      setActiveTask(null);
    } catch {
      setErrorMsg("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
          {t.dashboard.customTasksTitle}
        </span>
        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
          {customTasks.filter((ct) => !!ct.submission).length}/{customTasks.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {customTasks.map((ct) => {
          const Icon = getTaskIcon(ct.taskType);
          const isDone = !!ct.submission;
          const summary = summarizeValues(ct.fields, ct.submission?.values);

          return (
            <button
              key={ct.id}
              type="button"
              disabled={locked}
              onClick={() => openTaskModal(ct)}
              className={`w-full text-left rounded-2xl p-4 border transition flex items-start justify-between gap-3 active:scale-[0.99] disabled:opacity-60 ${
                isDone
                  ? "bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08] border-emerald-500/25"
                  : "bg-white dark:bg-[#141414] border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/25"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isDone
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {getTaskBadgeLabel(ct.taskType, locale)}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300">
                      {ct.isRequired ? t.common.required : t.common.optional}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-950 dark:text-white leading-snug">
                    {ct.title}
                  </p>
                  {summary ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono truncate">
                      {summary}
                    </p>
                  ) : (
                    ct.instructions && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {ct.instructions}
                      </p>
                    )
                  )}
                </div>
              </div>

              <div className="shrink-0 mt-1">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : locked ? (
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-400">
                    {locale === "id" ? "Terkunci" : "Locked"}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                    {locale === "id" ? "Isi" : "Log"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {activeTask &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#f6f6f4] dark:bg-[#141414] border border-zinc-200 dark:border-white/10 max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl">
              <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
                    {getTaskBadgeLabel(activeTask.taskType, locale)}
                  </span>
                  <h3 className="text-base font-geometric font-semibold text-zinc-950 dark:text-white truncate">
                    {activeTask.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="w-8 h-8 rounded-full bg-zinc-200/70 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                {activeTask.instructions && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {activeTask.instructions}
                  </p>
                )}

                {activeTask.fields.map((field) => {
                  const labelText =
                    locale === "id" && field.labelId ? field.labelId : field.label;
                  const val = formValues[field.key];

                  if (field.type === "boolean") {
                    const checked = val === true;
                    return (
                      <button
                        key={field.key}
                        type="button"
                        onClick={() => handleFieldChange(field.key, !checked)}
                        className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition ${
                          checked
                            ? "bg-emerald-500/10 border-emerald-500/40 text-zinc-950 dark:text-white"
                            : "bg-white dark:bg-[#1c1c1c] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        <span className="text-xs font-medium">
                          {labelText}
                          {field.required ? " *" : ""}
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            checked
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  }

                  if (field.type === "rating") {
                    const min = field.min ?? 1;
                    const max = field.max ?? 5;
                    const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                    const current = typeof val === "number" ? val : Number(val || 0);

                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200 block">
                          {labelText}
                          {field.required ? " *" : ""}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {scores.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleFieldChange(field.key, s)}
                              className={`w-9 h-9 rounded-xl text-xs font-mono font-semibold border transition ${
                                current === s
                                  ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white"
                                  : "bg-white dark:bg-[#1c1c1c] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (field.type === "photo") {
                    const photoStr = typeof val === "string" ? val : "";
                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200 block">
                          {labelText}
                          {field.required ? " *" : ""}
                        </label>
                        <label className="block w-full rounded-2xl border border-dashed border-zinc-300 dark:border-white/20 p-4 text-center cursor-pointer hover:bg-white/50 dark:hover:bg-white/[0.03] transition">
                          {photoStr ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoStr}
                              alt={labelText}
                              className="mx-auto max-h-48 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="py-4 space-y-1 text-zinc-500 dark:text-zinc-400">
                              <Camera className="w-5 h-5 mx-auto" />
                              <span className="text-xs block">
                                {locale === "id" ? "Pilih atau ambil foto" : "Tap to upload photo"}
                              </span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={uploadingPhotoKey === field.key}
                            className="sr-only"
                            onChange={async (ev) => {
                              const file = ev.target.files?.[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) {
                                setErrorMsg("Photo exceeds maximum allowed size of 5 MB.");
                                return;
                              }
                              setUploadingPhotoKey(field.key);
                              setErrorMsg(null);
                              try {
                                const compressed = await compressPhoto(file);
                                const uploadRes = await fetch("/api/upload", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ dataUrl: compressed, type: "custom" }),
                                });
                                const uploadJson = await uploadRes.json().catch(() => null);
                                if (!uploadRes.ok || !uploadJson?.success || !uploadJson.url) {
                                  throw new Error(uploadJson?.message || "Failed to upload photo.");
                                }
                                handleFieldChange(field.key, uploadJson.url);
                              } catch (err) {
                                setErrorMsg(
                                  err instanceof Error ? err.message : "Could not process selected photo."
                                );
                              } finally {
                                setUploadingPhotoKey(null);
                              }
                            }}
                          />
                        </label>
                      </div>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200 block">
                          {labelText}
                          {field.required ? " *" : ""}
                        </label>
                        <textarea
                          rows={3}
                          value={typeof val === "string" ? val : ""}
                          onChange={(ev) => handleFieldChange(field.key, ev.target.value)}
                          placeholder={field.placeholder || ""}
                          className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1c1c1c] border border-zinc-200 dark:border-white/10 text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white"
                        />
                      </div>
                    );
                  }

                  if (field.type === "select" && field.options && field.options.length > 0) {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200 block">
                          {labelText}
                          {field.required ? " *" : ""}
                        </label>
                        <select
                          value={typeof val === "string" ? val : ""}
                          onChange={(ev) => handleFieldChange(field.key, ev.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1c1c1c] border border-zinc-200 dark:border-white/10 text-sm text-zinc-950 dark:text-white outline-none"
                        >
                          <option value="">-- Select --</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200 block">
                        {labelText}
                        {field.unit ? ` (${field.unit})` : ""}
                        {field.required ? " *" : ""}
                      </label>
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        step={field.step ?? (field.type === "number" ? "any" : undefined)}
                        min={field.min}
                        max={field.max}
                        value={val !== undefined && val !== null ? String(val) : ""}
                        onChange={(ev) => handleFieldChange(field.key, ev.target.value)}
                        placeholder={field.placeholder || ""}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1c1c1c] border border-zinc-200 dark:border-white/10 text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white"
                      />
                    </div>
                  );
                })}

                {errorMsg && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errorMsg}</p>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTask(null)}
                    className="h-10 px-4 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-white/10 transition"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingPhotoKey !== null}
                    className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition"
                  >
                    {(saving || uploadingPhotoKey !== null) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {uploadingPhotoKey !== null
                        ? locale === "id"
                          ? "Mengunggah foto..."
                          : "Uploading photo..."
                        : saving
                          ? t.common.saving
                          : t.dashboard.submitCustomTask}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
