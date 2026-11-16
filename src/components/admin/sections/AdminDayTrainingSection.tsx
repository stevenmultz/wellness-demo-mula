"use client";

import type { Dispatch, SetStateAction } from "react";
import { Dumbbell, Plus, Trash2, Video, X } from "lucide-react";
import type { AdminDayFormState } from "../adminTypes";

interface AdminDayTrainingSectionProps {
  dayForm: AdminDayFormState;
  setDayForm: Dispatch<SetStateAction<AdminDayFormState>>;
}

export function AdminDayTrainingSection({
  dayForm,
  setDayForm,
}: AdminDayTrainingSectionProps) {
  return (
  <div className="space-y-6 pt-4">
    {/* SUB-BLOCK 2A: MULTI-VIDEO LINKS BUILDER */}
    <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/10 pb-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span>YouTube Coaching Video Links ({dayForm.videoLinks.length})</span>
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Add 1 or more YouTube videos for today&apos;s training session (e.g. main workout, warm-up, or alternative modality video)
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setDayForm((p) => ({
              ...p,
              videoLinks: [
                ...p.videoLinks,
                {
                  title: `Video Session ${p.videoLinks.length + 1}`,
                  url: "",
                },
              ],
            }))
          }
          className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 w-fit shrink-0 hover:opacity-90 transition shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Add Video Link</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {dayForm.videoLinks.map((vid, vIdx) => {
          const isEvenRow = (vIdx + 1) % 2 === 0;
          return (
            <div
              key={vIdx}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${
                isEvenRow
                  ? "bg-zinc-200/85 dark:bg-zinc-800/85 border-zinc-300 dark:border-zinc-700"
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isEvenRow
                    ? "bg-white text-zinc-950 border border-zinc-400 dark:bg-zinc-950 dark:text-white dark:border-zinc-500"
                    : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                }`}
              >
                {vIdx + 1}
              </span>

              <div className="sm:w-1/3">
                <input
                  type="text"
                  placeholder="Enter video session title"
                  value={vid.title}
                  onChange={(e) => {
                    const next = [...dayForm.videoLinks];
                    next[vIdx] = { ...next[vIdx], title: e.target.value };
                    setDayForm((p) => ({ ...p, videoLinks: next }));
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                />
              </div>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Enter YouTube video URL (https://www.youtube.com/watch?v=...)..."
                  value={vid.url}
                  onChange={(e) => {
                    const next = [...dayForm.videoLinks];
                    next[vIdx] = { ...next[vIdx], url: e.target.value };
                    setDayForm((p) => ({ ...p, videoLinks: next }));
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                />

                {dayForm.videoLinks.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDayForm((p) => ({
                        ...p,
                        videoLinks: p.videoLinks.filter(
                          (_, i) => i !== vIdx
                        ),
                      }))
                    }
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0"
                    title="Remove video link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* SUB-BLOCK 2B: SYNCHRONIZED WORKOUT OPTIONS & MOVEMENT CHECKLISTS */}
    <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/10 pb-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span>
              Synchronized Workout Options &amp; Movement Checklists (
              {dayForm.workoutGroups.length} Options)
            </span>
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Each Workout Option has its own aligned movement checklist &amp; recommended reps. Members select an option in their dashboard and check off the recommended reps or enter their actual reps achieved.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setDayForm((p) => ({
              ...p,
              workoutGroups: [
                ...p.workoutGroups,
                {
                  optionName: "",
                  movements: [{ name: "", target: "" }],
                },
              ],
            }))
          }
          className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 w-fit shrink-0 hover:opacity-90 transition shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Add Workout Option</span>
        </button>
      </div>

      {/* Quick Preset Option Templates */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-zinc-400 font-medium">
          Quick add option template:
        </span>
        {[
          {
            optionName: "Workout",
            movements: [
              { name: "Push-up", target: "30 reps" },
              { name: "Sit-up", target: "50 reps" },
              { name: "Pull-up", target: "10 reps" },
            ],
          },
          {
            optionName: "Pilates",
            movements: [
              { name: "Move A (Hundred)", target: "100 beats" },
              { name: "Move B (Roll Up)", target: "15 reps" },
              { name: "Move C (Leg Circles)", target: "20 reps" },
            ],
          },
          {
            optionName: "Yoga",
            movements: [
              { name: "Form A (Sun Salutation)", target: "5 rounds" },
              { name: "Form B (Warrior Flow)", target: "60 secs" },
              { name: "Form C (Seated Forward Fold)", target: "90 secs" },
            ],
          },
          {
            optionName: "Cardio / HIIT",
            movements: [
              { name: "Burpees", target: "20 reps" },
              { name: "Mountain Climbers", target: "45 secs" },
              { name: "Jump Squats", target: "25 reps" },
            ],
          },
        ].map((preset, pIdx) => {
          const alreadyExists = dayForm.workoutGroups.some(
            (g) =>
              g.optionName.trim().toLowerCase() ===
              preset.optionName.toLowerCase()
          );
          if (alreadyExists) return null;
          return (
            <button
              key={pIdx}
              type="button"
              onClick={() =>
                setDayForm((p) => ({
                  ...p,
                  workoutGroups: [
                    ...p.workoutGroups,
                    {
                      optionName: preset.optionName,
                      movements: preset.movements.map((m) => ({
                        ...m,
                      })),
                    },
                  ],
                }))
              }
              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition"
            >
              + {preset.optionName}
            </button>
          );
        })}
      </div>

      {/* Workout Option Groups List */}
      <div className="space-y-4">
        {dayForm.workoutGroups.map((group, gIdx) => {
          const isEvenGroup = (gIdx + 1) % 2 === 0;
          return (
            <div
              key={gIdx}
              className={`rounded-xl p-4 space-y-3.5 border ${
                isEvenGroup
                  ? "bg-zinc-200/85 dark:bg-zinc-800/85 border-zinc-300 dark:border-zinc-700"
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {/* Option Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-200/80 dark:border-white/10">
                <div className="flex items-center gap-2.5 flex-1">
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      isEvenGroup
                        ? "bg-white text-zinc-950 border border-zinc-400 dark:bg-zinc-950 dark:text-white dark:border-zinc-500"
                        : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                    }`}
                  >
                    Option {gIdx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder="Enter workout option name"
                    value={group.optionName}
                    onChange={(e) => {
                      const next = [...dayForm.workoutGroups];
                      next[gIdx] = {
                        ...next[gIdx],
                        optionName: e.target.value,
                      };
                      setDayForm((p) => ({
                        ...p,
                        workoutGroups: next,
                      }));
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 placeholder:font-normal"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...dayForm.workoutGroups];
                      next[gIdx] = {
                        ...next[gIdx],
                        movements: [
                          ...next[gIdx].movements,
                          { name: "", target: "" },
                        ],
                      };
                      setDayForm((p) => ({
                        ...p,
                        workoutGroups: next,
                      }));
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3 shrink-0" />
                    <span>Add Movement</span>
                  </button>

                  {dayForm.workoutGroups.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDayForm((p) => ({
                          ...p,
                          workoutGroups: p.workoutGroups.filter(
                            (_, i) => i !== gIdx
                          ),
                        }))
                      }
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Remove workout option"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Movements Checklist inside this Option */}
              <div className="space-y-2">
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <div className="col-span-7">
                    Movement / Exercise / Form Name *
                  </div>
                  <div className="col-span-5">
                    Recommended Target Reps / Duration *
                  </div>
                </div>

                {group.movements.map((mov, mIdx) => (
                  <div
                    key={mIdx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-7 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-zinc-400 w-5 text-right shrink-0">
                        {mIdx + 1}.
                      </span>
                      <input
                        type="text"
                        placeholder="Enter movement or form name"
                        value={mov.name}
                        onChange={(e) => {
                          const next = [...dayForm.workoutGroups];
                          const nextMovs = [...next[gIdx].movements];
                          nextMovs[mIdx] = {
                            ...nextMovs[mIdx],
                            name: e.target.value,
                          };
                          next[gIdx] = {
                            ...next[gIdx],
                            movements: nextMovs,
                          };
                          setDayForm((p) => ({
                            ...p,
                            workoutGroups: next,
                          }));
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                      />
                    </div>

                    <div className="sm:col-span-5 flex items-center gap-2 pl-7 sm:pl-0">
                      <input
                        type="text"
                        placeholder="Enter recommended target"
                        value={mov.target}
                        onChange={(e) => {
                          const next = [...dayForm.workoutGroups];
                          const nextMovs = [...next[gIdx].movements];
                          nextMovs[mIdx] = {
                            ...nextMovs[mIdx],
                            target: e.target.value,
                          };
                          next[gIdx] = {
                            ...next[gIdx],
                            movements: nextMovs,
                          };
                          setDayForm((p) => ({
                            ...p,
                            workoutGroups: next,
                          }));
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 placeholder:font-sans"
                      />

                      {group.movements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...dayForm.workoutGroups];
                            next[gIdx] = {
                              ...next[gIdx],
                              movements: next[gIdx].movements.filter(
                                (_, i) => i !== mIdx
                              ),
                            };
                            setDayForm((p) => ({
                              ...p,
                              workoutGroups: next,
                            }));
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 transition shrink-0"
                          title="Remove movement"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
}
