"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ChevronRight, Clock, Info, Lock } from "lucide-react";
import { InfoPopupModal } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import {
  deriveDayActivities,
  deriveDayChecks,
  deriveDayDone,
  formatDayDate,
  formatDayPillDate,
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

  const [selectedDayId, setSelectedDayId] = useState<string>(day.id);
  useEffect(() => {
    setSelectedDayId(day.id);
  }, [day.id]);

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
  const stripRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  const currentDayIndex = programDays.findIndex((d) => d.id === selectedDay.id);
  const safeDayIndex = currentDayIndex >= 0 ? currentDayIndex : 0;

  // Center the active/selected day in the number strip if present
  useEffect(() => {
    const container = stripRef.current;
    const btn = buttonRefs.current[selectedDay.id];
    if (!container || !btn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const currentScroll = container.scrollLeft;
    const targetScroll =
      currentScroll +
      (btnRect.left - containerRect.left) -
      container.clientWidth / 2 +
      btnRect.width / 2;
    container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
  }, [selectedDay.id, programDays.length]);

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
  const allDone = selectedDone.every(Boolean);

  const handleFinishTask = () => {
    if (!selectedLocked && isSelectedToday) {
      markDone(step);
    }
    setDetailOpen(false);
  };

  const showStatusFooter =
    isSelectedFuture ||
    isSelectedPast ||
    !!selectedDay.userProgress?.isCompleted ||
    allDone;

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
            logging, and daily reflection.
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
            Select any day chip below to review past submissions or preview upcoming
            unlocked dates.
          </li>
        </ul>
      </InfoPopupModal>

      <div className="w-full flex items-center gap-2">
        <button
          type="button"
          disabled={safeDayIndex <= 0}
          onClick={() => {
            if (safeDayIndex > 0) {
              setSelectedDayId(programDays[safeDayIndex - 1].id);
            }
          }}
          aria-label="Previous day"
          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-25 active:scale-95 transition shadow-2xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={stripRef}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="inline-flex items-center gap-1.5 min-w-full">
            {programDays.map((d) => {
              const isActiveSelected = d.id === selectedDay.id;
              const isTodayItem = d.id === day.id;
              const isDoneItem = !!d.userProgress?.isCompleted;
              const isPastItem =
                !isAnytime && !isTodayItem && (d.isPast2359 || d.dayNumber < day.dayNumber);
              const dayTypeWord =
                d.dayType === "TRAINING_DAY"
                  ? "Training"
                  : d.dayType === "REST_DAY"
                    ? "Rest"
                    : "Connect";
              const dateStr = formatDayPillDate(d.unlockDate, d.dayNumber);

              return (
                <button
                  key={d.id}
                  ref={(el) => {
                    buttonRefs.current[d.id] = el;
                  }}
                  type="button"
                  onClick={() => setSelectedDayId(d.id)}
                  className={`shrink-0 w-[84px] py-1.5 px-2 rounded-xl text-center transition active:scale-95 select-none flex flex-col items-center justify-center ${
                    isActiveSelected
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                      : isTodayItem
                        ? "bg-white dark:bg-[#141414] text-zinc-950 dark:text-white border border-zinc-950 dark:border-white"
                        : isDoneItem
                          ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/20"
                          : isPastItem || isAnytime
                            ? "bg-white dark:bg-[#141414] text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10"
                            : "bg-zinc-100/60 dark:bg-white/[0.03] text-zinc-400 dark:text-zinc-500 border border-transparent opacity-60"
                  }`}
                >
                  <span className="text-[11px] font-semibold leading-tight inline-flex items-center justify-center gap-1">
                    <span>{dateStr}</span>
                    {isDoneItem && <Check className="w-2.5 h-2.5 shrink-0" />}
                  </span>
                  <span className="text-[10px] opacity-75 leading-tight mt-0.5 font-medium">
                    {dayTypeWord}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={safeDayIndex >= programDays.length - 1}
          onClick={() => {
            if (safeDayIndex < programDays.length - 1) {
              setSelectedDayId(programDays[safeDayIndex + 1].id);
            }
          }}
          aria-label="Next day"
          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-25 active:scale-95 transition shadow-2xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
        </button>
      </div>

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
                <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${
                      isDone
                        ? "from-[#e5e5e2] via-[#e5e5e2]/85 to-transparent dark:from-[#1f1f1f] dark:via-[#1f1f1f]/85"
                        : "from-[#ececea] via-[#ececea]/85 to-transparent dark:from-[#161616] dark:via-[#161616]/85"
                    }`}
                  />
                </div>

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
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                        {t.title}
                      </p>
                      {isSelectedPast && !isDone && (
                        <span className="shrink-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          · Skipped
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {t.description}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 shrink-0 flex justify-end">
                  {isSelectedFuture ? (
                    <span className="py-1 text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  ) : isSelectedPast ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(index);
                      }}
                      className="py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white active:scale-95 transition inline-flex items-center gap-1"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : isDone ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(index);
                      }}
                      className="py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white active:scale-95 transition inline-flex items-center gap-1"
                    >
                      <span>{selectedLocked ? "View" : "Edit"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={selectedLocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(index);
                      }}
                      className="py-1 text-xs font-semibold text-zinc-950 dark:text-white hover:opacity-75 disabled:opacity-40 inline-flex items-center gap-1 active:scale-95 transition"
                    >
                      <span>Do Task</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
          onSubmitted={(customTaskId, submission) =>
            props.onCustomTaskSubmitted?.(selectedDay.id, customTaskId, submission)
          }
        />
      )}

      {showStatusFooter && (
        <div className="w-full">
          {isSelectedFuture ? (
            <div className="w-full py-2.5 px-4 rounded-2xl bg-[#ececea] dark:bg-white/[0.04] flex items-center justify-between gap-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Unlocks on {formatDayDate(selectedDay.unlockDate, selectedDay.dayNumber)} at
                  00:00 WIB
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className="text-[11px] font-semibold text-zinc-900 dark:text-white underline shrink-0"
              >
                Back to Today
              </button>
            </div>
          ) : isSelectedPast ? (
            <div className="w-full py-2.5 px-4 rounded-2xl bg-[#ececea] dark:bg-white/[0.04] flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="inline-flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span>Viewing Day {selectedDay.dayNumber} History (Read-Only)</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className="text-[11px] font-semibold text-zinc-900 dark:text-white underline shrink-0"
              >
                Back to Today
              </button>
            </div>
          ) : selectedDay.userProgress?.isCompleted ? (
            <div className="w-full py-2.5 px-4 rounded-2xl bg-[#ececea] dark:bg-white/[0.04] flex items-center justify-between text-xs font-medium text-zinc-900 dark:text-white">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-zinc-950 dark:text-white" />
                <span>
                  {isAnytime
                    ? `Day ${selectedDay.dayNumber} Completed`
                    : "Today's Routine Completed"}
                </span>
              </span>
              {!isAnytime && (
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
          ) : allDone ? (
            <div className="w-full py-2.5 px-4 rounded-2xl bg-[#ececea] dark:bg-white/[0.04] flex items-center justify-between text-xs font-medium text-zinc-900 dark:text-white">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-zinc-950 dark:text-white" />
                <span>All daily tasks submitted for today</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                Done
              </span>
            </div>
          ) : null}
        </div>
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
