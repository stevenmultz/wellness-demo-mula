"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Angry,
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  Frown,
  Laugh,
  Loader2,
  Meh,
  Smile,
} from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { wellnessUserSubmitCustomTask } from "@/wellness/actions/custom-tasks";
import type {
  CustomTaskField,
  CustomTaskType,
  ProgramDayCustomTaskDTO,
} from "@/wellness/utils/custom-tasks";
import { HeaderBackButton } from "./shared";
import { StepHeader } from "./checkin/SleepMealSteps";
import {
  FillCameraIcon,
  FillChecklistIcon,
  FillLockIcon,
  FillPlayIcon,
  FillScaleIcon,
  FillSparkleIcon,
  FillTargetIcon,
} from "./sharedFillIcons";

export interface CustomTaskSectionProps {
  programDayId: string;
  customTasks: ProgramDayCustomTaskDTO[];
  locked: boolean;
  isFuture?: boolean;
  startStageNumber?: number;
  highlightFirstIncomplete?: boolean;
  onSubmitted?: (
    customTaskId: string,
    submission: NonNullable<ProgramDayCustomTaskDTO["submission"]>,
    dayCompleted?: boolean
  ) => void;
}

const CONFIDENCE_MOODS = [
  {
    score: 1,
    Icon: Angry,
    label: "Not Confident",
    desc: "Feeling uncomfortable or disconnected from my body today.",
  },
  {
    score: 2,
    Icon: Frown,
    label: "Low Confidence",
    desc: "Self-conscious today, focusing on trusting the daily process.",
  },
  {
    score: 3,
    Icon: Meh,
    label: "Neutral & Steady",
    desc: "Feeling balanced and accepting of where I am right now.",
  },
  {
    score: 4,
    Icon: Smile,
    label: "Confident & Strong",
    desc: "Feeling good, capable, and noticing positive momentum.",
  },
  {
    score: 5,
    Icon: Laugh,
    label: "Very Confident",
    desc: "Feeling proud, energized, and fully comfortable in my body!",
  },
] as const;

function getTaskIcon(task: ProgramDayCustomTaskDTO) {
  const titleLower = task.title.toLowerCase();
  if (
    titleLower.includes("intro") ||
    titleLower.includes("final") ||
    titleLower.includes("sambutan") ||
    titleLower.includes("penutup") ||
    task.fields.some((f) => f.key === "videoUrl" || f.key === "videoWatched")
  ) {
    return FillPlayIcon;
  }
  switch (task.taskType) {
    case "MEASUREMENT":
      return FillScaleIcon;
    case "BENCHMARK":
      return FillTargetIcon;
    case "CHECKLIST":
      return FillChecklistIcon;
    case "MEDIA_UPLOAD":
      return FillCameraIcon;
    default:
      return FillSparkleIcon;
  }
}

function toEmbedVideoUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return trimmed;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return trimmed;
  } catch {
    return null;
  }
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
    if (f.key === "videoUrl") continue;
    const val = values[f.key];
    if (val === undefined || val === null || val === "") continue;
    if (f.type === "boolean") {
      if (val === true) parts.push(f.label);
    } else if (f.type === "photo") {
      parts.push("Photo uploaded");
    } else if (f.key === "confidenceMood" || f.type === "rating") {
      parts.push(`Mood: ${val}/${f.max ?? 5}`);
    } else if (f.type !== "textarea") {
      parts.push(`${f.label}: ${val}${f.unit ? ` ${f.unit}` : ""}`);
    }
    if (parts.length >= 3) break;
  }
  return parts.join(" • ");
}

function getStepQuestionTitle(field: CustomTaskField, task: ProgramDayCustomTaskDTO, locale: "id" | "en"): string {
  if (field.key === "weightKg") {
    return locale === "id"
      ? "Berat badan Anda sekarang berapa?"
      : "What is your current body weight?";
  }
  if (field.key === "weeklyGoalKg") {
    return locale === "id"
      ? "Goal berat badan minggu ini mau berapa?"
      : "What is your goal weight for this week?";
  }
  if (field.key === "photoUrl") {
    return locale === "id"
      ? "Upload foto fullbody Anda hari ini"
      : "Upload your fullbody progress photo";
  }
  if (field.key === "confidenceMood") {
    return locale === "id"
      ? "Bagaimana perasaan pede Anda hari ini?"
      : "How confident do you feel in your body today?";
  }
  if (field.key === "videoWatched") {
    const isFinal = task.title.toLowerCase().includes("final") || task.title.toLowerCase().includes("penutup");
    return isFinal
      ? locale === "id"
        ? "Tonton video penutup program dari Coach"
        : "Watch your coach's closing celebration video"
      : locale === "id"
        ? "Tonton video sambutan program dari Coach"
        : "Watch your coach's welcome briefing video";
  }
  if (field.key === "readinessRating") {
    return locale === "id"
      ? "Seberapa siap & semangat Anda memulai program ini?"
      : "How ready & committed do you feel starting this program?";
  }
  if (field.key === "programRating") {
    return locale === "id"
      ? "Bagaimana perasaan Anda setelah menyelesaikan program ini?"
      : "How do you feel after completing this program?";
  }
  return locale === "id" && field.labelId ? field.labelId : field.label;
}

export function CustomTaskSection({
  programDayId,
  customTasks,
  locked,
  isFuture = false,
  startStageNumber = 5,
  highlightFirstIncomplete = false,
  onSubmitted,
}: CustomTaskSectionProps) {
  const { locale, t } = useLocale();
  const [activeTask, setActiveTask] = useState<ProgramDayCustomTaskDTO | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhotoKey, setUploadingPhotoKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!customTasks || customTasks.length === 0) return null;

  const openTaskModal = (task: ProgramDayCustomTaskDTO) => {
    if (isFuture) return;
    setErrorMsg(null);
    const initialVals: Record<string, unknown> = { ...(task.submission?.values || {}) };
    for (const f of task.fields) {
      if (f.key === "videoUrl" && !initialVals.videoUrl && f.placeholder) {
        initialVals.videoUrl = f.placeholder;
      }
    }
    setFormValues(initialVals);
    setStepIdx(0);
    setActiveTask(task);
  };

  const handleFieldChange = (key: string, value: unknown) => {
    setErrorMsg(null);
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // Interactive steps filter out the static `videoUrl` configuration field (rendered on the `videoWatched` step),
  // falling back to all fields if `videoUrl` is the only field (prevents blank modal NPE).
  const interactiveFields = activeTask
    ? (() => {
        const filtered = activeTask.fields.filter((f) => f.key !== "videoUrl");
        return filtered.length > 0 ? filtered : activeTask.fields;
      })()
    : [];
  const currentField = interactiveFields[stepIdx] || interactiveFields[0];
  const isLastStep = stepIdx >= interactiveFields.length - 1;

  const resolveVideoUrlForTask = (task: ProgramDayCustomTaskDTO): string | null => {
    const valUrl = typeof formValues.videoUrl === "string" ? formValues.videoUrl : "";
    if (valUrl) return valUrl;
    const urlField = task.fields.find((f) => f.key === "videoUrl");
    if (urlField?.placeholder) return urlField.placeholder;
    const match = (task.instructions || "").match(/https?:\/\/[^\s]+/);
    if (match) return match[0];
    return "https://www.youtube.com/watch?v=sTANio_2E0Q";
  };

  const validateCurrentField = (field: CustomTaskField | undefined): string | null => {
    if (!field) return null;
    const rawVal = formValues[field.key];
    if (field.required) {
      if (field.type === "boolean") {
        if (rawVal !== true) {
          return locale === "id"
            ? `Mohon centang "${field.labelId || field.label}" terlebih dahulu.`
            : `Please confirm "${field.label}" to continue.`;
        }
      } else if (
        rawVal === undefined ||
        rawVal === null ||
        (typeof rawVal === "string" && rawVal.trim() === "")
      ) {
        return locale === "id"
          ? `Mohon isi "${field.labelId || field.label}" terlebih dahulu.`
          : `Please complete "${field.label}" to continue.`;
      }
    }
    if (
      (field.type === "number" || field.type === "rating") &&
      rawVal !== undefined &&
      rawVal !== null &&
      rawVal !== ""
    ) {
      const n = Number(rawVal);
      if (!Number.isFinite(n)) {
        return "Please enter a valid number.";
      }
      if (field.min !== undefined && n < field.min) {
        return `Minimum value is ${field.min}${field.unit ? ` ${field.unit}` : ""}.`;
      }
      if (field.max !== undefined && n > field.max) {
        return `Maximum value is ${field.max}${field.unit ? ` ${field.unit}` : ""}.`;
      }
    }
    return null;
  };

  const handleNextOrSubmit = async () => {
    if (!activeTask || locked) return;
    const validationErr = validateCurrentField(currentField);
    if (validationErr) {
      setErrorMsg(validationErr);
      return;
    }

    if (!isLastStep) {
      setErrorMsg(null);
      setStepIdx((prev) => prev + 1);
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await wellnessUserSubmitCustomTask({
        programDayId,
        customTaskId: activeTask.id,
        values: formValues,
      });
      if (!res.success) {
        setErrorMsg(res.message || "Failed to save task.");
        return;
      }
      if (res.data && onSubmitted) {
        const payload = res.data as {
          id: string;
          values: Record<string, unknown>;
          submittedAt: string;
          updatedAt: string;
          dayCompleted?: boolean;
        };
        onSubmitted(activeTask.id, payload, payload.dayCompleted);
      }
      setActiveTask(null);
    } catch {
      setErrorMsg("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const firstIncompleteCustomIdx = highlightFirstIncomplete
    ? customTasks.findIndex((ct) => !ct.submission)
    : -1;

  return (
    <ol className="w-full">
      {customTasks.map((ct, idx) => {
        const Icon = getTaskIcon(ct);
        const isDone = !!ct.submission;
        const isNextUp = firstIncompleteCustomIdx === idx;
        const hasMoreBelow = idx < customTasks.length - 1;
        const stageNum = String(startStageNumber + idx).padStart(2, "0");
        const summary = summarizeValues(ct.fields, ct.submission?.values);

        return (
          <li key={ct.id} className="w-full flex items-stretch gap-3">
            {/* Left Vertical Game Trail Node + Connector */}
            <div className="w-9 shrink-0 flex flex-col items-center">
              <button
                type="button"
                disabled={isFuture || (locked && !isDone)}
                onClick={() => openTaskModal(ct)}
                aria-label={`Stage ${stageNum}: ${ct.title}`}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition mt-3 cursor-pointer disabled:cursor-default ${
                  isDone
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : isNextUp
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 ring-2 ring-zinc-950 dark:ring-white ring-offset-2 ring-offset-[#f6f6f4] dark:ring-offset-[#0e0e0e] shadow-sm"
                      : isFuture
                        ? "bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 text-zinc-400 dark:text-zinc-500"
                        : "bg-[#ececea] dark:bg-white/[0.06] border border-zinc-300/90 dark:border-white/15 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : isFuture ? (
                  <FillLockIcon className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </button>

              {hasMoreBelow && (
                <div
                  aria-hidden="true"
                  className={`flex-1 min-h-4 my-1 transition-colors ${
                    isDone
                      ? "w-[2px] rounded-full bg-zinc-950 dark:bg-white"
                      : "w-0 border-l-2 border-dashed border-zinc-300 dark:border-white/20"
                  }`}
                />
              )}
            </div>

            {/* Right Stage Card (Metrics-Matched Surface) */}
            <div className={`flex-1 min-w-0 ${hasMoreBelow ? "pb-3" : ""}`}>
              <div
                onClick={() => {
                  if (!isFuture && (!locked || isDone)) {
                    openTaskModal(ct);
                  }
                }}
                className={`group w-full rounded-2xl p-3.5 sm:p-4 border transition ${
                  isDone
                    ? "bg-[#e5e5e2] dark:bg-white/[0.07] border-zinc-300/60 dark:border-white/10"
                    : isNextUp
                      ? "bg-[#ececea] dark:bg-white/[0.06] border-zinc-950/30 dark:border-white/30 shadow-xs"
                      : "bg-[#ececea] dark:bg-white/[0.04] border-zinc-200/50 dark:border-white/5 hover:bg-[#e7e7e4] dark:hover:bg-white/[0.06]"
                } ${isFuture ? "opacity-70" : "cursor-pointer active:scale-[0.99]"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Stage {stageNum}
                  </span>

                  {isFuture ? (
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 inline-flex items-center gap-1 leading-normal">
                      <FillLockIcon className="w-2.5 h-2.5" />
                      <span>Locked</span>
                    </span>
                  ) : isDone ? (
                    <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-md border border-[#2A7B60] bg-[#1F6E54] dark:border-[#4D9E7B] dark:bg-[#1F6E54] text-[10px] font-mono font-semibold text-white leading-[1.25]">
                      <Check className="w-2.5 h-2.5 stroke-[2.75]" />
                      <span>Done</span>
                    </span>
                  ) : isNextUp ? (
                    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-mono font-semibold leading-[1.25]">
                      <span>Next</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-lg bg-zinc-200/60 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white inline-flex items-center justify-center transition">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate leading-normal">
                  {ct.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate leading-normal mt-0.5">
                  {summary || ct.instructions || "Complete coach checkpoint"}
                </p>
              </div>
            </div>
          </li>
        );
      })}

      {activeTask &&
        currentField &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[120] h-[100dvh] w-full bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto"
          >
            {/* Header matching TaskFormModal */}
            <header
              style={{ paddingTop: "env(safe-area-inset-top)" }}
              className="sticky top-0 z-10 w-full bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
                <HeaderBackButton
                  onClick={() => {
                    if (stepIdx > 0) {
                      setErrorMsg(null);
                      setStepIdx((prev) => prev - 1);
                    } else {
                      setActiveTask(null);
                    }
                  }}
                />
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  {activeTask.title} • {stepIdx + 1}/{interactiveFields.length}
                </span>
              </div>
              <div className="w-full h-1 bg-zinc-200/80 dark:bg-white/10">
                <div
                  className="h-full bg-zinc-950 dark:bg-white transition-all duration-300"
                  style={{
                    width: `${Math.round(((stepIdx + 1) / Math.max(1, interactiveFields.length)) * 100)}%`,
                  }}
                />
              </div>
            </header>

            <div
              className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-between px-4 sm:px-6 pt-6 sm:pt-10"
              style={{ paddingBottom: "max(2.25rem, env(safe-area-inset-bottom))" }}
            >
              <div className="space-y-6 min-w-0">
                <StepHeader
                  title={getStepQuestionTitle(currentField, activeTask, locale)}
                  subtitle={stepIdx === 0 ? activeTask.instructions : null}
                />

                {/* Video Player when on videoWatched step (Introduction Task / Final Task) */}
                {currentField.key === "videoWatched" && (() => {
                  const rawVideoUrl = resolveVideoUrlForTask(activeTask);
                  const embedUrl = rawVideoUrl ? toEmbedVideoUrl(rawVideoUrl) : null;
                  const checked = formValues[currentField.key] === true;
                  return (
                    <div className="space-y-4">
                      {embedUrl && (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-200/80 dark:border-white/10 shadow-sm">
                          <iframe
                            src={embedUrl}
                            title={activeTask.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => handleFieldChange(currentField.key, !checked)}
                        className={`w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-left transition ${
                          checked
                            ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                            : "bg-white dark:bg-[#141414] border-zinc-200 dark:border-white/15 text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {locale === "id" && currentField.labelId
                              ? currentField.labelId
                              : currentField.label}
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${
                              checked
                                ? "text-white/80 dark:text-zinc-950/80"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {locale === "id"
                              ? "Ketuk untuk konfirmasi Anda telah menonton video ini."
                              : "Tap to confirm you have watched this video."}
                          </p>
                        </div>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
                            checked
                              ? "bg-white text-zinc-950 border-white dark:bg-zinc-950 dark:text-white dark:border-zinc-950"
                              : "border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    </div>
                  );
                })()}

                {/* Standard Boolean step */}
                {currentField.type === "boolean" && currentField.key !== "videoWatched" && (() => {
                  const checked = formValues[currentField.key] === true;
                  return (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => handleFieldChange(currentField.key, !checked)}
                      className={`w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-left transition ${
                        checked
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "bg-white dark:bg-[#141414] border-zinc-200 dark:border-white/15 text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {locale === "id" && currentField.labelId
                          ? currentField.labelId
                          : currentField.label}
                      </span>
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                          checked
                            ? "bg-white text-zinc-950 border-white dark:bg-zinc-950 dark:text-white dark:border-zinc-950"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  );
                })()}

                {/* 5-Mood Selector when rating is 1..5 (e.g. confidenceMood, readinessRating, programRating) */}
                {currentField.type === "rating" &&
                  (currentField.max ?? 5) === 5 && (() => {
                    const currentScore = Number(formValues[currentField.key] || 0);
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-5 gap-2">
                          {CONFIDENCE_MOODS.map((m) => {
                            const FaceIcon = m.Icon;
                            const active = currentScore === m.score;
                            return (
                              <button
                                key={m.score}
                                type="button"
                                disabled={locked}
                                onClick={() => handleFieldChange(currentField.key, m.score)}
                                className={`py-3.5 px-1.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                                  active
                                    ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                                    : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                                }`}
                              >
                                <FaceIcon className="w-6 h-6" strokeWidth={1.8} />
                                <span className="text-[10px] font-mono font-semibold">
                                  {m.score}/5
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {CONFIDENCE_MOODS.map((m) => {
                            const active = currentScore === m.score;
                            return (
                              <button
                                key={m.score}
                                type="button"
                                disabled={locked}
                                onClick={() => handleFieldChange(currentField.key, m.score)}
                                className={`w-full p-3.5 rounded-2xl border text-left transition ${
                                  active
                                    ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                    : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100"
                                }`}
                              >
                                <p className="text-xs font-semibold">{m.label}</p>
                                <p
                                  className={`text-[11px] mt-0.5 ${
                                    active
                                      ? "text-white/80 dark:text-zinc-950/80"
                                      : "text-zinc-500 dark:text-zinc-400"
                                  }`}
                                >
                                  {m.desc}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                {/* 1..10 Rating fallback */}
                {currentField.type === "rating" &&
                  (currentField.max ?? 5) !== 5 && (() => {
                    const min = currentField.min ?? 1;
                    const max = currentField.max ?? 10;
                    const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                    const current = Number(formValues[currentField.key] || 0);
                    return (
                      <div className="grid grid-cols-5 gap-2">
                        {scores.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={locked}
                            onClick={() => handleFieldChange(currentField.key, s)}
                            className={`h-12 rounded-2xl text-sm font-mono font-semibold border transition ${
                              current === s
                                ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white"
                                : "bg-white dark:bg-[#141414] border-zinc-200 dark:border-white/15 text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                {/* Fullbody Photo Upload step */}
                {currentField.type === "photo" && (() => {
                  const photoStr =
                    typeof formValues[currentField.key] === "string"
                      ? String(formValues[currentField.key])
                      : "";
                  return (
                    <div className="space-y-3">
                      <label className="block w-full rounded-2xl border border-dashed border-zinc-300 dark:border-white/20 bg-white dark:bg-[#141414] p-6 text-center cursor-pointer hover:border-zinc-400 dark:hover:border-white/35 transition">
                        {photoStr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoStr}
                            alt={currentField.label}
                            className="mx-auto max-h-64 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="py-8 space-y-2 text-zinc-500 dark:text-zinc-400">
                            <Camera className="w-7 h-7 mx-auto text-zinc-700 dark:text-zinc-300" />
                            <span className="text-sm font-medium block text-zinc-900 dark:text-white">
                              {locale === "id"
                                ? "Ketuk untuk ambil atau unggah foto fullbody"
                                : "Tap to take or upload fullbody photo"}
                            </span>
                            <span className="text-xs block">
                              JPEG, PNG, WebP (Max 5 MB)
                            </span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={locked || uploadingPhotoKey === currentField.key}
                          className="sr-only"
                          onChange={async (ev) => {
                            const file = ev.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              setErrorMsg("Photo exceeds maximum allowed size of 5 MB.");
                              return;
                            }
                            setUploadingPhotoKey(currentField.key);
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
                              handleFieldChange(currentField.key, uploadJson.url);
                            } catch (err) {
                              setErrorMsg(
                                err instanceof Error
                                  ? err.message
                                  : "Could not process selected photo."
                              );
                            } finally {
                              setUploadingPhotoKey(null);
                            }
                          }}
                        />
                      </label>
                    </div>
                  );
                })()}

                {/* Textarea step */}
                {currentField.type === "textarea" && (
                  <textarea
                    rows={4}
                    disabled={locked}
                    value={
                      typeof formValues[currentField.key] === "string"
                        ? String(formValues[currentField.key])
                        : ""
                    }
                    onChange={(ev) => handleFieldChange(currentField.key, ev.target.value)}
                    placeholder={currentField.placeholder || "Write your response..."}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white resize-none"
                  />
                )}

                {/* Select step */}
                {currentField.type === "select" &&
                  currentField.options &&
                  currentField.options.length > 0 && (
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentField.options.map((opt) => {
                        const active = formValues[currentField.key] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={locked}
                            onClick={() => handleFieldChange(currentField.key, opt)}
                            className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition ${
                              active
                                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                {/* Number / Text step (e.g., weightKg, weeklyGoalKg) */}
                {(currentField.type === "number" || currentField.type === "text") && (
                  <div className="relative">
                    <input
                      type={currentField.type === "number" ? "number" : "text"}
                      inputMode={currentField.type === "number" ? "decimal" : "text"}
                      step={currentField.step ?? (currentField.type === "number" ? "0.1" : undefined)}
                      min={currentField.min}
                      max={currentField.max}
                      disabled={locked}
                      value={
                        formValues[currentField.key] !== undefined &&
                        formValues[currentField.key] !== null
                          ? String(formValues[currentField.key])
                          : ""
                      }
                      onChange={(ev) => handleFieldChange(currentField.key, ev.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleNextOrSubmit();
                        }
                      }}
                      placeholder={currentField.placeholder || ""}
                      className="w-full px-4 py-4 pr-14 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-lg font-mono text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white transition"
                    />
                    {currentField.unit && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-zinc-400">
                        {currentField.unit}
                      </span>
                    )}
                  </div>
                )}

                {errorMsg && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errorMsg}</p>
                )}
              </div>

              {!locked && (
                <div className="pt-6">
                  <button
                    type="button"
                    disabled={saving || uploadingPhotoKey !== null}
                    onClick={() => void handleNextOrSubmit()}
                    className="w-full py-3.5 px-6 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold inline-flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {(saving || uploadingPhotoKey !== null) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <span>
                      {uploadingPhotoKey !== null
                        ? locale === "id"
                          ? "Mengunggah foto..."
                          : "Uploading photo..."
                        : saving
                          ? t.common.saving
                          : isLastStep
                            ? t.dashboard.submitCustomTask
                            : locale === "id"
                              ? "Lanjut"
                              : "Continue"}
                    </span>
                    {!isLastStep && !saving && uploadingPhotoKey === null && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </ol>
  );
}
