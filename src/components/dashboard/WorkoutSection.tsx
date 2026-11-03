"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";

interface WorkoutSectionProps {
  dayNumber: number;
  availableOptions: string[];
  selectedWorkout?: string | null;
  photoBeforeUrl?: string | null;
  photoAfterUrl?: string | null;
  workoutNotes?: string | null;
  checklist: string[];
  completedChecklist: string[];
  isPast2359: boolean;
  onSelectWorkout: (workout: string) => Promise<void>;
  onUploadPhoto: (type: "before" | "after", base64OrUrl: string) => Promise<void>;
  onToggleChecklistItem: (task: string) => Promise<void>;
  onSaveWorkoutNotes?: (notes: string) => Promise<void>;
  onUpdateChecklistRep?: (itemKey: string, reps: string) => Promise<void>;
}

export function WorkoutSection({
  dayNumber,
  availableOptions = [],
  selectedWorkout,
  photoBeforeUrl,
  photoAfterUrl,
  workoutNotes = "",
  checklist = [],
  completedChecklist = [],
  isPast2359,
  onSelectWorkout,
  onUploadPhoto,
  onToggleChecklistItem,
  onSaveWorkoutNotes,
  onUpdateChecklistRep,
}: WorkoutSectionProps) {
  const workoutGroups = parseWorkoutOptionGroups(availableOptions, checklist);
  const optionNames = workoutGroups.map((g) => g.optionName);

  const [activeWorkout, setActiveWorkout] = useState<string>(
    selectedWorkout || optionNames[0] || "Workout"
  );

  // Sync activeWorkout when dayNumber or selectedWorkout prop changes
  useEffect(() => {
    if (selectedWorkout) {
      setActiveWorkout(selectedWorkout);
    } else if (optionNames.length > 0 && !optionNames.includes(activeWorkout)) {
      setActiveWorkout(optionNames[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayNumber, selectedWorkout, availableOptions.join("|")]);

  // Workout Notes State
  const [trainingNotes, setTrainingNotes] = useState(workoutNotes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Local rep input state keyed by "[OptionName] MovementName"
  const [repInputs, setRepInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (workoutNotes !== undefined && workoutNotes !== null) {
      setTrainingNotes(workoutNotes);
    }
  }, [workoutNotes]);

  // Prepopulate repInputs from completedChecklist
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const item of completedChecklist) {
      if (item.includes("=")) {
        const [k, v] = item.split("=").map((s) => s.trim());
        if (k && v) {
          map[k] = v;
        }
      }
    }
    setRepInputs(map);
  }, [completedChecklist, dayNumber]);

  const handleWorkoutClick = async (option: string) => {
    if (isPast2359) return;
    setActiveWorkout(option);
    await onSelectWorkout(option);
  };

  const compressImageFile = (file: File, maxDim = 960, quality = 0.72): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        if (!rawDataUrl) return reject(new Error("Empty image data"));
        const img = new window.Image();
        img.onerror = () => resolve(rawDataUrl);
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(rawDataUrl);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (type: "before" | "after", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImageFile(file);
      if (compressedDataUrl) {
        // Post to upload API to store as an asset URL instead of bloating database rows with Base64
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: compressedDataUrl, type }),
          });
          const data = await res.json();
          if (data.success && data.url) {
            await onUploadPhoto(type, data.url);
            return;
          }
        } catch {
          // Fallback to direct URL if upload route is unavailable
        }
        await onUploadPhoto(type, compressedDataUrl);
      }
    } catch {
      // Ignore invalid image selection
    }
  };

  const handleSaveNotes = async () => {
    if (!onSaveWorkoutNotes || isPast2359) return;
    setIsSavingNotes(true);
    setNotesSaved(false);
    try {
      await onSaveWorkoutNotes(trainingNotes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const currentGroup =
    workoutGroups.find(
      (g) => g.optionName.trim().toLowerCase() === activeWorkout.trim().toLowerCase()
    ) || workoutGroups[0];

  const getItemKey = (optionName: string, movName: string) =>
    `[${optionName.trim()}] ${movName.trim()}`;

  const getCanonicalTask = (optionName: string, movName: string, targetReps: string) => {
    const key = getItemKey(optionName, movName);
    return targetReps.trim() ? `${key} = ${targetReps.trim()}` : key;
  };

  const findCompletedEntry = (optionName: string, movName: string): string | undefined => {
    const keyLower = getItemKey(optionName, movName).toLowerCase();
    const plainLower = movName.trim().toLowerCase();
    return completedChecklist.find((c) => {
      const cLeft = (c.includes("=") ? c.split("=")[0] : c).trim().toLowerCase();
      return cLeft === keyLower || cLeft === plainLower;
    });
  };

  const isMovementChecked = (optionName: string, movName: string): boolean => {
    return Boolean(findCompletedEntry(optionName, movName));
  };

  const handleRepChange = (itemKey: string, val: string) => {
    setRepInputs((prev) => ({ ...prev, [itemKey]: val }));
  };

  const handleRepCommit = async (
    optionName: string,
    movName: string,
    targetReps: string
  ) => {
    if (isPast2359) return;
    const itemKey = getItemKey(optionName, movName);
    const canonicalTask = getCanonicalTask(optionName, movName, targetReps);
    const rawVal = (repInputs[itemKey] ?? "").trim();
    if (!rawVal) return;

    if (onUpdateChecklistRep) {
      await onUpdateChecklistRep(canonicalTask, rawVal);
    } else {
      await onToggleChecklistItem(`${itemKey} = ${rawVal}`);
    }
  };

  const handleToggleMovement = async (
    optionName: string,
    movName: string,
    targetReps: string
  ) => {
    if (isPast2359) return;
    const itemKey = getItemKey(optionName, movName);
    const canonicalTask = getCanonicalTask(optionName, movName, targetReps);
    const existingEntry = findCompletedEntry(optionName, movName);

    if (existingEntry) {
      // Uncheck movement
      await onToggleChecklistItem(existingEntry);
    } else {
      // Check movement: use typed actual reps if provided, otherwise auto-fill recommended targetReps
      const achievedReps =
        (repInputs[itemKey] ?? "").trim() || targetReps.trim() || "Completed";
      setRepInputs((prev) => ({ ...prev, [itemKey]: achievedReps }));
      if (onUpdateChecklistRep) {
        await onUpdateChecklistRep(canonicalTask, achievedReps);
      } else {
        await onToggleChecklistItem(`${itemKey} = ${achievedReps}`);
      }
    }
  };

  const completedInCurrentGroup = currentGroup
    ? currentGroup.movements.filter((m) =>
        isMovementChecked(currentGroup.optionName, m.name)
      ).length
    : 0;

  return (
    <div className="space-y-6">
      {/* 1. SELEKSI JENIS TRAINING & SYNCHRONIZED MOVEMENT CHECKLIST */}
      <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 border border-zinc-200/70 dark:border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-900/[0.06] dark:border-white/10 pb-5">
          <div className="space-y-1.5">
            <span className="text-micro text-zinc-500 dark:text-zinc-400 block tracking-[0.24em] uppercase font-mono">
              Workout Option &amp; Checklist
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
              Today&apos;s Workout Selection &amp; Checklist
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-lg leading-relaxed font-mono">
              Select your preferred workout option for Day {dayNumber}. If your reps match the recommendation, simply tap the checklist button—or enter your actual reps achieved.
            </p>
          </div>

          {currentGroup && (
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs px-4 py-1.5 rounded-full font-mono font-medium glass-panel-subtle border border-zinc-200/70 dark:border-white/15 text-zinc-900 dark:text-white">
                {completedInCurrentGroup} of {currentGroup.movements.length} Completed
              </span>
            </div>
          )}
        </div>

        {/* Workout Options Pill Selector */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Choose Workout Option:
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {workoutGroups.map((group) => {
              const isSelected =
                currentGroup?.optionName.toLowerCase() ===
                group.optionName.toLowerCase();
              return (
                <button
                  key={group.optionName}
                  type="button"
                  disabled={isPast2359}
                  onClick={() => handleWorkoutClick(group.optionName)}
                  className={`px-4 py-2.5 rounded-full text-xs font-mono font-medium tracking-wide transition-all duration-200 flex items-center gap-2 ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-md scale-[1.02]"
                      : "glass-panel-subtle text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-zinc-200/60 dark:border-white/10"
                  }`}
                >
                  <span>{group.optionName}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isSelected
                        ? "bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900"
                        : "bg-zinc-200/70 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {group.movements.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Synchronized Movement Checklist for Selected Workout Option */}
        {currentGroup && currentGroup.movements.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-zinc-900/[0.06] dark:border-white/10 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                {currentGroup.optionName} • Movement Checklist
              </span>
              <span className="text-[11px] text-zinc-400 font-light">
                Tap check if matching recommendation, or type actual reps
              </span>
            </div>

            <div className="space-y-2.5">
              {currentGroup.movements.map((mov, idx) => {
                const itemKey = getItemKey(currentGroup.optionName, mov.name);
                const plainKey = mov.name.trim();
                const isChecked = isMovementChecked(
                  currentGroup.optionName,
                  mov.name
                );
                const currentVal =
                  repInputs[itemKey] !== undefined
                    ? repInputs[itemKey]
                    : repInputs[plainKey] !== undefined
                    ? repInputs[plainKey]
                    : isChecked
                    ? mov.target
                    : "";

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border text-xs sm:text-sm font-light transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isChecked
                        ? "glass-panel-subtle border-zinc-400/50 dark:border-white/25 bg-zinc-900/[0.03] dark:bg-white/[0.06]"
                        : "glass-panel-subtle border-zinc-200/60 dark:border-white/10 text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {/* Left: Checkbox & Movement Name + Recommended Target */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <button
                        type="button"
                        disabled={isPast2359}
                        onClick={() =>
                          handleToggleMovement(
                            currentGroup.optionName,
                            mov.name,
                            mov.target
                          )
                        }
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition ${
                          isChecked
                            ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white shadow-xs"
                            : "border-zinc-400 dark:border-zinc-600 hover:border-zinc-900 dark:hover:border-white"
                        }`}
                        title={
                          isChecked
                            ? "Uncheck movement"
                            : `Check off with recommended target (${mov.target})`
                        }
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <span
                          className={`block font-medium truncate ${
                            isChecked
                              ? "line-through text-zinc-500 dark:text-zinc-400"
                              : "text-zinc-900 dark:text-white"
                          }`}
                        >
                          {mov.name}
                        </span>
                        {mov.target && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-light">
                            Recommended: <strong className="font-medium text-zinc-700 dark:text-zinc-300">{mov.target}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actual Reps Input Field */}
                    <div className="flex items-center gap-2 pl-9 sm:pl-0 shrink-0">
                      <span className="text-micro text-zinc-400 uppercase tracking-wider">
                        Actual Reps:
                      </span>
                      <input
                        type="text"
                        disabled={isPast2359}
                        value={currentVal}
                        onChange={(e) => handleRepChange(itemKey, e.target.value)}
                        onBlur={() =>
                          handleRepCommit(
                            currentGroup.optionName,
                            mov.name,
                            mov.target
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleRepCommit(
                              currentGroup.optionName,
                              mov.name,
                              mov.target
                            );
                          }
                        }}
                        placeholder={
                          mov.target
                            ? `Enter actual (${mov.target})...`
                            : "Enter actual reps..."
                        }
                        className="w-40 sm:w-44 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. DUAL UPLOAD FOTO BEFORE & AFTER */}
      <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 border border-zinc-200/70 dark:border-white/10 shadow-xl">
        <div className="space-y-1.5 border-b border-zinc-900/[0.06] dark:border-white/10 pb-5">
          <span className="text-micro text-zinc-400 dark:text-zinc-400 block tracking-[0.24em] uppercase font-mono">
            Visual Accountability
          </span>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
            Before &amp; After Photo Reflection
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-lg leading-relaxed font-mono">
            Document physical readiness before session and post-workout vitality.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Slot 1: Foto Before */}
          <div className="rounded-3xl border border-zinc-200/70 dark:border-white/10 p-5 glass-panel-subtle space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-white/10 pb-3 font-mono">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider block">
                  01 • Before Session
                </span>
                <span className="text-[11px] text-zinc-400 font-light">Mat &amp; gear preparation</span>
              </div>
              {photoBeforeUrl && (
                <span className="text-[11px] text-zinc-900 dark:text-zinc-200 font-medium flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" /> Uploaded
                </span>
              )}
            </div>

            {/* Preview or Upload Placeholder */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-zinc-950/5 dark:bg-black/30 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center group/photo">
              {photoBeforeUrl ? (
                <>
                  <Image
                    src={photoBeforeUrl}
                    alt="Before Workout"
                    fill
                    className="object-cover"
                  />
                  {!isPast2359 && (
                    <label className="absolute inset-0 bg-black/55 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-medium gap-2 backdrop-blur-sm font-mono">
                      <Camera className="w-5 h-5 text-zinc-300" />
                      <span>Replace Before Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange("before", e)}
                      />
                    </label>
                  )}
                </>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 text-center cursor-pointer space-y-2.5 w-full h-full hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-200/50 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 font-mono">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                      Upload Before Photo
                    </span>
                    <span className="text-[11px] text-zinc-400 font-light block">
                      Tap to capture or choose from library
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isPast2359}
                    className="hidden"
                    onChange={(e) => handleFileChange("before", e)}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Slot 2: Foto After */}
          <div className="rounded-3xl border border-zinc-200/70 dark:border-white/10 p-5 glass-panel-subtle space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-white/10 pb-3 font-mono">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider block">
                  02 • Post Workout
                </span>
                <span className="text-[11px] text-zinc-400 font-light">Sweat check &amp; vitality</span>
              </div>
              {photoAfterUrl && (
                <span className="text-[11px] text-zinc-900 dark:text-zinc-200 font-medium flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" /> Uploaded
                </span>
              )}
            </div>

            {/* Preview or Upload Placeholder */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-zinc-950/5 dark:bg-black/30 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center group/photo">
              {photoAfterUrl ? (
                <>
                  <Image
                    src={photoAfterUrl}
                    alt="After Workout"
                    fill
                    className="object-cover"
                  />
                  {!isPast2359 && (
                    <label className="absolute inset-0 bg-black/55 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-medium gap-2 backdrop-blur-sm font-mono">
                      <Camera className="w-5 h-5 text-zinc-300" />
                      <span>Replace After Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange("after", e)}
                      />
                    </label>
                  )}
                </>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 text-center cursor-pointer space-y-2.5 w-full h-full hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-200/50 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 font-mono">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                      Upload After Photo
                    </span>
                    <span className="text-[11px] text-zinc-400 font-light block">
                      Capture post-session feeling
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isPast2359}
                    className="hidden"
                    onChange={(e) => handleFileChange("after", e)}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. TODAY'S TRAINING NOTES & SENSATION */}
      <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-5 border border-zinc-200/70 dark:border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-900/[0.06] dark:border-white/10 pb-5">
          <div className="space-y-1.5">
            <span className="text-micro text-zinc-500 dark:text-zinc-400 block tracking-[0.24em] uppercase font-mono">
              Session Feedback
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
              Today&apos;s Training Notes
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-md leading-relaxed font-mono">
              Record how your body felt, personal bests, form adjustments, or recovery observations.
            </p>
          </div>
        </div>

        <div className="space-y-3 font-mono">
          <textarea
            rows={3}
            value={trainingNotes}
            disabled={isPast2359}
            onChange={(e) => setTrainingNotes(e.target.value)}
            placeholder="Enter your workout notes or movement observations..."
            className="w-full p-4 rounded-2xl glass-input text-xs sm:text-sm font-light text-zinc-900 dark:text-white leading-relaxed resize-none transition focus:ring-1 focus:ring-white/40 font-mono"
          />

          {!isPast2359 && onSaveWorkoutNotes && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide flex items-center gap-2 transition duration-200 shadow-md font-mono"
              >
                {isSavingNotes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : notesSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-950" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save Training Notes</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
