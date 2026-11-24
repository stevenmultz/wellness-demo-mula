"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Check } from "lucide-react";
import { InfoPopupModal } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import { FiftyBarMeter } from "./my-plan/CohortPerformanceCard";
import {
  FillDropletIcon,
  FillDumbbellIcon,
  FillFlagIcon,
  FillHeartIcon,
  FillLockIcon,
  FillMoonIcon,
  FillUsersIcon,
  FillUtensilsIcon,
} from "./sharedFillIcons";
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
    setDone([...initialDone]);
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
  const isSelectedFuture =
    !isAnytime &&
    ((!isSelectedToday && !isSelectedPast) || !selectedDay.isCalendarUnlocked);

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

  const customTasksList = selectedDay.customTasks || [];
  const coreDoneCount = tasks.filter((_, i) => selectedDone[i]).length;
  const customDoneCount = customTasksList.filter((ct) => Boolean(ct.submission)).length;
  const totalStages = tasks.length + customTasksList.length;
  const completedStages = coreDoneCount + customDoneCount;
  const remainingStages = Math.max(0, totalStages - completedStages);
  const journeyPct =
    totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  // First incomplete unlocked stage index across core + custom tasks (highlights "UP NEXT" quest node)
  const firstIncompleteCoreIdx = !isSelectedFuture
    ? tasks.findIndex((_, i) => !selectedDone[i])
    : -1;
  const hasCustomNextUp =
    !isSelectedFuture &&
    firstIncompleteCoreIdx === -1 &&
    customTasksList.some((ct) => !ct.submission);

  const getCoreFillIcon = (index: number) => {
    if (index === 0) return FillMoonIcon;
    if (index === 1) {
      if (selectedDay.dayType === "REST_DAY") return FillHeartIcon;
      if (selectedDay.dayType !== "TRAINING_DAY") return FillUsersIcon;
      return FillDumbbellIcon;
    }
    if (index === 2) return FillUtensilsIcon;
    return FillDropletIcon;
  };

  return (
    <section className="w-full space-y-3.5 sm:space-y-4">
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
            Complete every scheduled task for the day: sleep tracking, daily activity,
            meal control, water intake, and any assigned coach checkpoints.
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

      {/* Daily Journey Progress Summary Card (Metrics-Matched Surface & Typography) */}
      <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3 border border-zinc-200/50 dark:border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-500 dark:text-zinc-400 shrink-0 flex items-center">
              <FillFlagIcon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-normal py-[1px]">
              Daily Journey
            </span>
          </div>

          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-[1.08]">
                {completedStages}/{totalStages}
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-normal">
                stages
              </span>
            </div>

            {isSelectedFuture ? (
              <span className="semantic-badge-box inline-flex items-center gap-1 px-1.5 py-[2.5px] rounded-md border border-zinc-300 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300 leading-[1.25] mb-[2px]">
                <FillLockIcon className="w-2.5 h-2.5 shrink-0" />
                <span>Locked</span>
              </span>
            ) : remainingStages === 0 && totalStages > 0 ? (
              <span className="semantic-badge-box inline-flex items-center gap-1 px-1.5 py-[2.5px] rounded-md border border-[#2A7B60] bg-[#1F6E54] dark:border-[#4D9E7B] dark:bg-[#1F6E54] text-[10px] font-mono font-semibold text-white leading-[1.25] mb-[2px]">
                <Check className="w-2.5 h-2.5 stroke-[2.75] shrink-0" />
                <span>Clear</span>
              </span>
            ) : (
              <span className="semantic-badge-box inline-flex items-center gap-1 px-1.5 py-[2.5px] rounded-md border border-[#B03244] bg-[#9E2A3A] dark:border-[#C95B6B] dark:bg-[#9E2A3A] text-[10px] font-mono font-semibold text-white leading-[1.25] mb-[2px]">
                <span>{remainingStages} left</span>
              </span>
            )}
          </div>
        </div>

        <div className="pt-0.5">
          <FiftyBarMeter percent={journeyPct} />
        </div>
      </div>

      {/* Connected Game-Journey Vertical Stage Trail */}
      <div className="w-full">
        <ol className="w-full">
          {tasks.map((t, index) => {
            const isDone = selectedDone[index];
            const isNextUp = firstIncompleteCoreIdx === index;
            const hasMoreBelow =
              index < tasks.length - 1 || customTasksList.length > 0;
            const StageIcon = getCoreFillIcon(index);
            const stageNum = String(index + 1).padStart(2, "0");

            return (
              <li key={t.title} className="w-full flex items-stretch gap-3">
                {/* Left Vertical Game Trail Node + Connector */}
                <div className="w-9 shrink-0 flex flex-col items-center">
                  <button
                    type="button"
                    disabled={isSelectedFuture || (selectedLocked && !isSelectedPast && !isDone)}
                    onClick={() => openDetail(index)}
                    aria-label={`Stage ${stageNum}: ${t.title}`}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition mt-3 relative cursor-pointer disabled:cursor-default ${
                      isDone
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                        : isNextUp
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 ring-2 ring-zinc-950 dark:ring-white ring-offset-2 ring-offset-[#f6f6f4] dark:ring-offset-[#0e0e0e] shadow-sm"
                          : isSelectedFuture
                            ? "bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 text-zinc-400 dark:text-zinc-500"
                            : "bg-[#ececea] dark:bg-white/[0.06] border border-zinc-300/90 dark:border-white/15 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : isSelectedFuture ? (
                      <FillLockIcon className="w-3.5 h-3.5" />
                    ) : (
                      <StageIcon className="w-4 h-4" />
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
                      if (!isSelectedFuture && (!selectedLocked || isSelectedPast || isDone)) {
                        openDetail(index);
                      }
                    }}
                    className={`group w-full rounded-2xl p-3.5 sm:p-4 border transition ${
                      isDone
                        ? "bg-[#e5e5e2] dark:bg-white/[0.07] border-zinc-300/60 dark:border-white/10"
                        : isNextUp
                          ? "bg-[#ececea] dark:bg-white/[0.06] border-zinc-950/30 dark:border-white/30 shadow-xs"
                          : "bg-[#ececea] dark:bg-white/[0.04] border-zinc-200/50 dark:border-white/5 hover:bg-[#e7e7e4] dark:hover:bg-white/[0.06]"
                    } ${isSelectedFuture ? "opacity-70" : "cursor-pointer active:scale-[0.99]"}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 leading-normal">
                        Stage {stageNum}
                      </span>

                      {isSelectedFuture ? (
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
                      {t.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate leading-normal mt-0.5">
                      {t.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {customTasksList.length > 0 && (
          <CustomTaskSection
            programDayId={selectedDay.id}
            customTasks={customTasksList}
            locked={selectedLocked}
            isFuture={isSelectedFuture}
            startStageNumber={tasks.length + 1}
            highlightFirstIncomplete={hasCustomNextUp}
            onSubmitted={(customTaskId, submission, dayCompleted) =>
              props.onCustomTaskSubmitted?.(selectedDay.id, customTaskId, submission, dayCompleted)
            }
          />
        )}
      </div>

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
