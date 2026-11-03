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
    <div className="space-y-4 sm:space-y-6">
      {/* 1. SELEKSI JENIS TRAINING & SYNCHRONIZED MOVEMENT CHECKLIST */}
      <div className="rounded-2xl p-4 sm:p-5 space-y-4 bg-zinc-900/60 border border-white/10 shadow-lg font-mono">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
              Movement Protocol
            </span>
            <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
              Workouts &amp; Reps
            </h3>
          </div>

          {currentGroup && (
            <span className="text-[10px] px-3 py-1 rounded-full font-semibold bg-white/10 border border-white/15 text-white">
              {completedInCurrentGroup}/{currentGroup.movements.length} Done
            </span>
          )}
        </div>

        {/* Workout Options Pill Selector */}
        {workoutGroups.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-white text-zinc-950 shadow-md font-bold"
                      : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span>{group.optionName}</span>
                  <span className="text-[10px] opacity-75">({group.movements.length})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Synchronized Movement Checklist for Selected Workout Option */}
        {currentGroup && currentGroup.movements.length > 0 && (
          <div className="space-y-2 pt-1">
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
                  className={`p-3 rounded-xl border text-xs font-light transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isChecked
                      ? "border-white/20 bg-white/[0.04]"
                      : "border-white/10 bg-black/40 text-zinc-200"
                  }`}
                >
                  {/* Left: Checkbox & Movement Name + Target */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
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
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isChecked
                          ? "bg-white text-zinc-950 border-white shadow-xs"
                          : "border-white/30 hover:border-white"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <span
                        className={`block text-xs font-medium truncate ${
                          isChecked
                            ? "line-through text-zinc-500"
                            : "text-white"
                        }`}
                      >
                        {mov.name}
                      </span>
                      {mov.target && (
                        <span className="text-[10px] text-zinc-400 block font-light">
                          Target: {mov.target}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actual Reps Input Field */}
                  <div className="flex items-center gap-1.5 pl-7 sm:pl-0 shrink-0">
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
                      placeholder={mov.target ? `Actual (${mov.target})` : "Actual reps"}
                      className="w-32 sm:w-36 px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 text-[11px] font-mono text-white focus:outline-none focus:border-white/40 placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. DUAL UPLOAD FOTO BEFORE & AFTER */}
      <div className="rounded-2xl p-4 sm:p-5 space-y-4 bg-zinc-900/60 border border-white/10 shadow-lg font-mono">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
              Visual Check
            </span>
            <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
              Photo Verification
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Slot 1: Foto Before */}
          <div className="rounded-xl border border-white/10 p-3 bg-black/40 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              <span>01 &bull; Before</span>
              {photoBeforeUrl && (
                <span className="text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-zinc-300" /> Done
                </span>
              )}
            </div>

            <div className="relative rounded-lg overflow-hidden aspect-[4/3] bg-zinc-950 border border-white/10 flex items-center justify-center group/photo">
              {photoBeforeUrl ? (
                <>
                  <Image
                    src={photoBeforeUrl}
                    alt="Before Workout"
                    fill
                    className="object-cover"
                  />
                  {!isPast2359 && (
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-semibold gap-1 backdrop-blur-xs">
                      <Camera className="w-4 h-4 text-zinc-300" />
                      <span>Replace</span>
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
                <label className="flex flex-col items-center justify-center p-3 text-center cursor-pointer space-y-1 w-full h-full hover:bg-white/5 transition">
                  <Camera className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Upload</span>
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
          <div className="rounded-xl border border-white/10 p-3 bg-black/40 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              <span>02 &bull; After</span>
              {photoAfterUrl && (
                <span className="text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-zinc-300" /> Done
                </span>
              )}
            </div>

            <div className="relative rounded-lg overflow-hidden aspect-[4/3] bg-zinc-950 border border-white/10 flex items-center justify-center group/photo">
              {photoAfterUrl ? (
                <>
                  <Image
                    src={photoAfterUrl}
                    alt="After Workout"
                    fill
                    className="object-cover"
                  />
                  {!isPast2359 && (
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-semibold gap-1 backdrop-blur-xs">
                      <Camera className="w-4 h-4 text-zinc-300" />
                      <span>Replace</span>
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
                <label className="flex flex-col items-center justify-center p-3 text-center cursor-pointer space-y-1 w-full h-full hover:bg-white/5 transition">
                  <Sparkles className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Upload</span>
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

      {/* 3. TODAY'S TRAINING NOTES & SENSATION */}
      <div className="rounded-2xl p-4 sm:p-5 space-y-3 bg-zinc-900/60 border border-white/10 shadow-lg font-mono">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
              Session Feedback
            </span>
            <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
              Training Notes
            </h3>
          </div>
        </div>

        <div className="space-y-2 font-mono">
          <textarea
            rows={2}
            value={trainingNotes}
            disabled={isPast2359}
            onChange={(e) => setTrainingNotes(e.target.value)}
            placeholder="Log session sensations, PRs, or form notes..."
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-light text-white leading-relaxed resize-none focus:outline-none focus:border-white/40 font-mono placeholder:text-zinc-600"
          />

          {!isPast2359 && onSaveWorkoutNotes && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-5 py-2 rounded-full chrome-button text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 shadow-sm font-mono"
              >
                {isSavingNotes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : notesSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save Notes</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
