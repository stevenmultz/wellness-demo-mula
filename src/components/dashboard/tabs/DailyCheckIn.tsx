"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Check, Lock } from "lucide-react";
import { InfoPopupModal } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import {
  deriveDayActivities,
  deriveDayChecks,
  deriveDayDone,
  getTasksForDay,
  getWibResetCountdown,
  type DailyCheckInProps,
} from "./checkin/checkInUtils";
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
        </ol>

        {selectedDay.customTasks && selectedDay.customTasks.length > 0 && (
          <CustomTaskSection
            programDayId={selectedDay.id}
            customTasks={selectedDay.customTasks}
            locked={selectedLocked}
            isFuture={isSelectedFuture}
            onSubmitted={(customTaskId, submission) =>
              props.onCustomTaskSubmitted?.(selectedDay.id, customTaskId, submission)
            }
          />
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
