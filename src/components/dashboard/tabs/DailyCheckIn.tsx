"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Check, Lock, Scale } from "lucide-react";
import { HeaderBackButton, InfoPopupModal } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import {
  deriveDayActivities,
  deriveDayChecks,
  deriveDayDone,
  getTasksForDay,
  getWibResetCountdown,
  type DailyCheckInProps,
} from "./checkin/checkInUtils";
import { StepHeader } from "./checkin/SleepMealSteps";
import { TaskForm } from "./checkin/TaskFormModal";

export type { DailyCheckInProps };

export function DailyCheckIn(props: DailyCheckInProps) {
  const { day, locked, activities, checks, initialDone } = props;
  const [done, setDone] = useState<boolean[]>([...initialDone]);
  const initialKey = initialDone.join(",");
  useEffect(() => {
    setDone((prev) => [
      prev[0] || initialDone[0],
      prev[1] || initialDone[1],
      prev[2] || initialDone[2],
      prev[3] || initialDone[3],
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const [internalSelectedDayId, setInternalSelectedDayId] = useState<string>(day.id);
  useEffect(() => {
    setInternalSelectedDayId(day.id);
  }, [day.id]);

  const selectedDayId = props.selectedDayId || internalSelectedDayId;

  const [resetCountdown, setResetCountdown] = useState<string>(() =>
    getWibResetCountdown()
  );
  const [showDailyTasksInfo, setShowDailyTasksInfo] = useState(false);

  // Battery-efficient reset timer: pauses while backgrounded, syncs on visibilitychange, skips redundant re-renders.
  useEffect(() => {
    const syncCountdown = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const next = getWibResetCountdown();
      setResetCountdown((prev) => (prev === next ? prev : next));
    };
    syncCountdown();
    const interval = setInterval(syncCountdown, 60000);
    document.addEventListener("visibilitychange", syncCountdown);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", syncCountdown);
    };
  }, []);

  const [detailOpen, setDetailOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [loggedWeightsByDay, setLoggedWeightsByDay] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zera_weight_by_day_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setLoggedWeightsByDay(parsed);
        }
      }
    } catch {
      // ignore storage error
    }
  }, []);

  const programDays = useMemo(() => {
    const list =
      props.allProgramDays && props.allProgramDays.length > 0
        ? props.allProgramDays
        : props.pastDays && props.pastDays.length > 0
          ? props.pastDays
          : [day];
    return [...list].sort((a, b) => a.dayNumber - b.dayNumber);
  }, [props.allProgramDays, props.pastDays, day]);

  const selectedDay = useMemo(
    () => programDays.find((d) => d.id === selectedDayId) || day,
    [programDays, selectedDayId, day]
  );

  const isAnytime = Boolean(props.isAnytime);
  const isSelectedToday = selectedDay.id === day.id;
  const isSelectedPast =
    !isAnytime &&
    !isSelectedToday &&
    (selectedDay.isPast2359 || selectedDay.dayNumber < day.dayNumber);
  const isSelectedFuture = !isAnytime && !isSelectedToday && !isSelectedPast;

  const todayDateStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date());
  }, []);

  const selectedActivities = useMemo(
    () => (isSelectedToday ? activities : deriveDayActivities(selectedDay)),
    [isSelectedToday, activities, selectedDay]
  );

  const selectedChecks = useMemo(
    () => (isSelectedToday ? checks : deriveDayChecks(selectedDay)),
    [isSelectedToday, checks, selectedDay]
  );

  const selectedDone = useMemo(
    () =>
      isSelectedToday
        ? done
        : deriveDayDone(selectedDay, selectedActivities, selectedChecks),
    [isSelectedToday, done, selectedDay, selectedActivities, selectedChecks]
  );

  const selectedLocked = isAnytime ? false : isSelectedToday ? locked : true;
  const tasks = useMemo(() => getTasksForDay(selectedDay.dayType), [selectedDay.dayType]);

  const openDetail = (index: number) => {
    if (isSelectedFuture) return;
    setStep(index);
    setDetailOpen(true);
  };

  const markDone = (index: number) => {
    if (isSelectedToday) {
      setDone((prev) => prev.map((item, i) => (i === index ? true : item)));
    }
  };

  const currentTask = tasks[step] || tasks[0];

  const handleFinishTask = () => {
    if (!selectedLocked && isSelectedToday) {
      markDone(step);
    }
    setDetailOpen(false);
  };

  // Resolve logged weight for selectedDay (from customTasks or localStorage)
  const selectedDayWeight = useMemo(() => {
    if (loggedWeightsByDay[selectedDay.id]) {
      return loggedWeightsByDay[selectedDay.id];
    }
    for (const ct of selectedDay.customTasks || []) {
      const vals = ct.submission?.values;
      if (vals && typeof vals === "object") {
        const rawW =
          (vals as Record<string, unknown>).weightKg ??
          (vals as Record<string, unknown>).weight;
        const numW = Number(rawW);
        if (Number.isFinite(numW) && numW > 20 && numW < 300) {
          return Number(numW.toFixed(1));
        }
      }
    }
    return null;
  }, [loggedWeightsByDay, selectedDay]);

  const openWeightModal = () => {
    if (isSelectedFuture) return;
    setWeightInput(selectedDayWeight ? String(selectedDayWeight) : "");
    setWeightModalOpen(true);
  };

  const handleSaveWeightTask = () => {
    const val = Number(weightInput);
    if (!Number.isFinite(val) || val < 20 || val > 300) return;
    const rounded = Number(val.toFixed(1));

    const nextByDay = { ...loggedWeightsByDay, [selectedDay.id]: rounded };
    setLoggedWeightsByDay(nextByDay);
    try {
      localStorage.setItem("zera_weight_by_day_v1", JSON.stringify(nextByDay));
    } catch {
      // ignore storage error
    }

    const nowIso = new Date().toISOString();
    props.onCustomTaskSubmitted?.(selectedDay.id, `weight-${selectedDay.id}`, {
      id: `weight-sub-${selectedDay.id}`,
      values: { weightKg: rounded },
      submittedAt: nowIso,
      updatedAt: nowIso,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zera:weight-updated"));
    }
    setWeightModalOpen(false);
  };

  return (
    <section className="w-full space-y-4">
      <InfoPopupModal
        open={showDailyTasksInfo}
        title="Daily Tasks & Schedule"
        subtitle={
          isAnytime
            ? "Flexible · Anytime Access"
            : `${todayDateStr} • ${resetCountdown}`
        }
        onClose={() => setShowDailyTasksInfo(false)}
      >
        <p className="font-semibold text-zinc-950 dark:text-white">
          About Daily Tasks &amp; Reset Schedule:
        </p>
        <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
          <li>
            <strong className="text-zinc-900 dark:text-white">Task Cadence:</strong>{" "}
            Complete each day&apos;s routine: sleep tracking, training workout, nutrition
            logging, daily reflection, and body weight check-in.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-white">Daily Reset:</strong> Active
            tasks reset every night at 00:00 WIB (UTC+7). Complete submissions before the
            23:59 WIB cutoff.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-white">
              Automatic Skip Status:
            </strong>{" "}
            Any task left incomplete at the end of the day automatically becomes Skipped
            after 23:59 WIB.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-white">Day Navigation:</strong>{" "}
            Tap the date on the program banner to open the calendar and select any day.
          </li>
        </ul>
      </InfoPopupModal>

      <ol className="w-full space-y-3">
        {tasks.map((t, index) => {
          const isDone = selectedDone[index];
          const TaskIcon = t.Icon;
          return (
            <li key={t.title} className="w-full">
              <div
                onClick={() => {
                  if (!isSelectedFuture && (!selectedLocked || isSelectedPast || isDone)) {
                    openDetail(index);
                  }
                }}
                className={`group w-full relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 transition ${
                  isDone
                    ? "bg-[#e5e5e2] dark:bg-white/[0.08]"
                    : "bg-[#ececea] dark:bg-white/[0.04] hover:bg-[#e7e7e4] dark:hover:bg-white/[0.06]"
                } ${isSelectedFuture ? "opacity-75" : "cursor-pointer active:scale-[0.99]"}`}
              >
                <div className="relative z-10 flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isDone
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                        : "bg-white/80 dark:bg-white/10 text-zinc-900 dark:text-white"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <TaskIcon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                        {t.title}
                      </p>
                      {!isDone && !isSelectedFuture && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#9E2A3A] dark:bg-[#E06C7C] shrink-0"
                          aria-label="Incomplete task"
                        />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {t.description}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 shrink-0 flex items-center justify-end">
                  {isSelectedFuture ? (
                    <span className="py-1 text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={selectedLocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(index);
                      }}
                      aria-label="Open task detail"
                      className="w-7 h-7 rounded-lg bg-zinc-200/50 dark:bg-white/[0.06] hover:bg-zinc-300/70 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}

        {/* Built-in Custom Task: Body Weight Measurement */}
        <li className="w-full">
          <div
            onClick={() => {
              if (!isSelectedFuture && (!selectedLocked || isSelectedPast || selectedDayWeight !== null)) {
                openWeightModal();
              }
            }}
            className={`group w-full relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 transition ${
              selectedDayWeight !== null
                ? "bg-[#e5e5e2] dark:bg-white/[0.08]"
                : "bg-[#ececea] dark:bg-white/[0.04] hover:bg-[#e7e7e4] dark:hover:bg-white/[0.06]"
            } ${isSelectedFuture ? "opacity-75" : "cursor-pointer active:scale-[0.99]"}`}
          >
            <div className="relative z-10 flex items-center gap-3.5 min-w-0 flex-1">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                  selectedDayWeight !== null
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "bg-white/80 dark:bg-white/10 text-zinc-900 dark:text-white"
                }`}
              >
                {selectedDayWeight !== null ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Scale className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Body Weight
                  </p>
                  {selectedDayWeight === null && !isSelectedFuture && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#9E2A3A] dark:bg-[#E06C7C] shrink-0"
                      aria-label="Incomplete task"
                    />
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {selectedDayWeight !== null
                    ? `Logged: ${selectedDayWeight.toFixed(1)} kg`
                    : "Daily body weight measurement"}
                </p>
              </div>
            </div>

            <div className="relative z-10 shrink-0 flex items-center justify-end">
              {isSelectedFuture ? (
                <span className="py-1 text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={selectedLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    openWeightModal();
                  }}
                  aria-label="Open body weight task"
                  className="w-7 h-7 rounded-lg bg-zinc-200/50 dark:bg-white/[0.06] hover:bg-zinc-300/70 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </li>
      </ol>

      {selectedDay.customTasks && selectedDay.customTasks.length > 0 && (
        <CustomTaskSection
          programDayId={selectedDay.id}
          customTasks={selectedDay.customTasks}
          locked={selectedLocked}
          onSubmitted={(customTaskId, submission) =>
            props.onCustomTaskSubmitted?.(selectedDay.id, customTaskId, submission)
          }
        />
      )}

      {/* Full-Screen Body Weight Check-In Modal */}
      {weightModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[80] h-[100dvh] w-full bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto"
          >
            <header
              style={{ paddingTop: "env(safe-area-inset-top)" }}
              className="sticky top-0 z-10 w-full bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
                <HeaderBackButton onClick={() => setWeightModalOpen(false)} />
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  Body Weight
                </span>
              </div>
            </header>

            <div
              className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-between px-4 sm:px-6 pt-6 sm:pt-10"
              style={{ paddingBottom: "max(2.25rem, env(safe-area-inset-bottom))" }}
            >
              <div className="space-y-6">
                <StepHeader title="What is your weight today?" />

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="20"
                      max="300"
                      disabled={selectedLocked}
                      placeholder="e.g. 68.0"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveWeightTask();
                        }
                      }}
                      className="w-full px-4 py-4 pr-14 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-lg font-mono text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white transition"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-zinc-400">
                      kg
                    </span>
                  </div>
                </div>
              </div>

              {!selectedLocked && (
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={handleSaveWeightTask}
                    disabled={!weightInput || Number(weightInput) < 20 || Number(weightInput) > 300}
                    className="w-full py-3.5 px-6 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                  >
                    Save Weight
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {detailOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[80] h-[100dvh] w-full bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 overflow-hidden"
          >
            <TaskForm
              key={`${selectedDay.id}-${step}`}
              day={selectedDay}
              locked={selectedLocked}
              isPast={isSelectedPast}
              taskTitle={currentTask.title}
              isTaskDone={selectedDone[step]}
              activities={selectedActivities}
              checks={selectedChecks}
              step={step}
              onFinish={handleFinishTask}
              onClose={() => setDetailOpen(false)}
              props={props}
            />
          </div>,
          document.body
        )}
    </section>
  );
}
