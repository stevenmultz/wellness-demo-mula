"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { InfoPopupModal } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import { FiftyBarMeter } from "./my-plan/CohortPerformanceCard";
import {
  FillBellIcon,
  FillCameraIcon,
  FillChecklistIcon,
  FillDropletIcon,
  FillDumbbellIcon,
  FillHeartIcon,
  FillLockIcon,
  FillMoonIcon,
  FillPlayIcon,
  FillScaleIcon,
  FillSparkleIcon,
  FillTargetIcon,
  FillUsersIcon,
  FillUtensilsIcon,
  type FillIconProps,
} from "./sharedFillIcons";
import {
  deriveDayActivities,
  deriveDayChecks,
  deriveDayDone,
  formatDayPillDate,
  getTasksForDay,
  getWibResetCountdown,
  type DailyCheckInProps,
} from "./checkin/checkInUtils";
import { TaskForm } from "./checkin/TaskFormModal";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";

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
  const [openCustomTaskId, setOpenCustomTaskId] = useState<string | null>(null);

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
  const totalTasks = tasks.length + customTasksList.length;
  const completedTasks = coreDoneCount + customDoneCount;
  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const progressPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const allCleared = !isSelectedFuture && totalTasks > 0 && remainingTasks === 0;

  // Find next upcoming meetup / live session in this program (today or upcoming days)
  const upcomingMeetup = useMemo(() => {
    const baseDayNum = selectedDay.dayNumber || day.dayNumber || 1;
    const candidate = programDays.find(
      (d) =>
        d.dayNumber >= baseDayNum &&
        (d.dayType === "CONNECTION_DAY" ||
          d.dayType === "MEETUP_DAY" ||
          d.dayType === "CONNECT_DAY" ||
          Boolean(d.eventTitle && d.eventTitle.trim()) ||
          Boolean(d.meetupLink && d.meetupLink.trim()) ||
          Boolean(d.onsiteVenue && d.onsiteVenue.trim()))
    );
    if (!candidate) return null;
    const daysUntil = Math.max(0, candidate.dayNumber - baseDayNum);
    const label = candidate.eventTitle?.trim() || candidate.title || "Live Meetup";
    const dateLabel = formatDayPillDate(candidate.unlockDate, candidate.dayNumber);
    const schedule = candidate.onsiteSchedule?.trim() || null;
    return { daysUntil, label, dateLabel, schedule };
  }, [programDays, selectedDay.dayNumber, day.dayNumber]);

  const dailyReminderText = useMemo(() => {
    if (isSelectedFuture) {
      return `Unlocks ${formatDayPillDate(selectedDay.unlockDate, selectedDay.dayNumber)} at 00:00 WIB.`;
    }
    if (isSelectedPast) {
      return allCleared
        ? `Day ${selectedDay.dayNumber} done. All tasks logged.`
        : `Closed at 23:59 WIB (${completedTasks}/${totalTasks} done).`;
    }
    if (allCleared) {
      return `All tasks done for Day ${selectedDay.dayNumber}. Great consistency!`;
    }
    if (selectedDay.dayType === "REST_DAY") {
      return "Focus on recovery & hydration today.";
    }
    if (selectedDay.dayType === "TRAINING_DAY") {
      return "Finish today's tasks in any order before 23:59 WIB.";
    }
    return "Check session details & finish today's logs.";
  }, [
    isSelectedFuture,
    isSelectedPast,
    allCleared,
    selectedDay.unlockDate,
    selectedDay.dayNumber,
    selectedDay.dayType,
    completedTasks,
    totalTasks,
  ]);

  const getCoreFillIcon = (index: number): ComponentType<FillIconProps> => {
    if (index === 0) return FillMoonIcon;
    if (index === 1) {
      if (selectedDay.dayType === "REST_DAY") return FillHeartIcon;
      if (selectedDay.dayType !== "TRAINING_DAY") return FillUsersIcon;
      return FillDumbbellIcon;
    }
    if (index === 2) return FillUtensilsIcon;
    return FillDropletIcon;
  };

  const getCustomFillIcon = (ct: ProgramDayCustomTaskDTO): ComponentType<FillIconProps> => {
    const titleLower = ct.title.toLowerCase();
    if (
      titleLower.includes("intro") ||
      titleLower.includes("final") ||
      titleLower.includes("sambutan") ||
      titleLower.includes("penutup") ||
      ct.fields.some((f) => f.key === "videoUrl" || f.key === "videoWatched")
    ) {
      return FillPlayIcon;
    }
    switch (ct.taskType) {
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
  };

  interface DailyTaskTile {
    key: string;
    title: string;
    isDone: boolean;
    Icon: ComponentType<FillIconProps>;
    onOpen: () => void;
    disabled: boolean;
  }

  const taskTiles: DailyTaskTile[] = [
    ...tasks.map((t, index) => {
      const isDone = selectedDone[index];
      return {
        key: `core-${t.title}`,
        title: t.title,
        isDone,
        Icon: getCoreFillIcon(index),
        disabled: isSelectedFuture || (selectedLocked && !isSelectedPast && !isDone),
        onOpen: () => openDetail(index),
      };
    }),
    ...customTasksList.map((ct) => {
      const isDone = Boolean(ct.submission);
      return {
        key: `custom-${ct.id}`,
        title: ct.title,
        isDone,
        Icon: getCustomFillIcon(ct),
        disabled: isSelectedFuture || (selectedLocked && !isDone),
        onOpen: () => setOpenCustomTaskId(ct.id),
      };
    }),
  ];

  return (
    <section className="w-full space-y-3 sm:space-y-4">
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

      {/* Top Row (50/50 Side-by-Side): Today Progress & Reminder */}
      <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
        {/* Widget 1: Today Progress (Metrics-Matched Surface, Typography & Segmented Meter) */}
        <div className="w-full h-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 flex flex-col justify-between gap-3 border border-zinc-200/50 dark:border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-zinc-500 dark:text-zinc-400 shrink-0 flex items-center">
                <FillTargetIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-normal py-[1px]">
                Today Progress
              </span>
            </div>

            <div className="flex items-end gap-1.5 flex-wrap">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-[1.08]">
                  {progressPct}
                </span>
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-normal">
                  %
                </span>
              </div>

              {isSelectedFuture ? (
                <span className="semantic-badge-box inline-flex items-center gap-1 px-1.5 py-[2.5px] rounded-md border border-zinc-300 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300 leading-[1.25] mb-[2px]">
                  <FillLockIcon className="w-2.5 h-2.5 shrink-0" />
                  <span>Locked</span>
                </span>
              ) : allCleared ? (
                <span className="semantic-badge-box inline-flex items-center gap-1 px-1.5 py-[2.5px] rounded-md border border-[#2A7B60] bg-[#1F6E54] dark:border-[#4D9E7B] dark:bg-[#1F6E54] text-[10px] font-mono font-semibold text-white leading-[1.25] mb-[2px]">
                  <Check className="w-2.5 h-2.5 stroke-[2.75] shrink-0" />
                  <span>
                    {completedTasks}/{totalTasks}
                  </span>
                </span>
              ) : (
                <span className="semantic-badge-box inline-flex items-center gap-1 px-1.5 py-[2.5px] rounded-md border border-[#B03244] bg-[#9E2A3A] dark:border-[#C95B6B] dark:bg-[#9E2A3A] text-[10px] font-mono font-semibold text-white leading-[1.25] mb-[2px]">
                  <span>{remainingTasks} left</span>
                </span>
              )}
            </div>
          </div>

          <div className="pt-0.5">
            <FiftyBarMeter percent={progressPct} segments={24} />
          </div>
        </div>

        {/* Widget 2: Daily Reminder & Upcoming Meetup Alert */}
        <div className="w-full h-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 flex flex-col justify-between gap-2.5 border border-zinc-200/50 dark:border-white/5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-zinc-500 dark:text-zinc-400 shrink-0 flex items-center">
                <FillBellIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-normal py-[1px]">
                Reminder
              </span>
            </div>

            <p className="text-[11px] sm:text-xs text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-3">
              {dailyReminderText}
            </p>
          </div>

          {upcomingMeetup ? (
            <div className="pt-2 border-t border-zinc-300/60 dark:border-white/10 space-y-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <FillUsersIcon className="w-3 h-3 text-zinc-700 dark:text-zinc-300 shrink-0" />
                  <span className="text-[11px] font-semibold text-zinc-950 dark:text-white truncate leading-normal">
                    {upcomingMeetup.label}
                  </span>
                </div>
                <span className="semantic-badge-box shrink-0 px-1.5 py-[2px] rounded-md border border-zinc-900/15 dark:border-white/15 bg-white/85 dark:bg-white/10 text-[9px] font-mono font-semibold text-zinc-950 dark:text-white leading-[1.25] whitespace-nowrap">
                  {upcomingMeetup.daysUntil === 0
                    ? "Today"
                    : upcomingMeetup.daysUntil === 1
                      ? "Tomorrow"
                      : `In ${upcomingMeetup.daysUntil}d`}
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate leading-normal">
                {upcomingMeetup.dateLabel}
                {upcomingMeetup.schedule ? ` · ${upcomingMeetup.schedule}` : ""}
              </p>
            </div>
          ) : !isAnytime && isSelectedToday ? (
            <p className="pt-2 border-t border-zinc-300/60 dark:border-white/10 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate leading-normal">
              {resetCountdown}
            </p>
          ) : null}
        </div>
      </div>

      {/* Free-Order 2-Column Task Tiles Grid (Complete in any order; Ruby dot on top-right of icon when pending) */}
      <ol className="w-full grid grid-cols-2 gap-3 sm:gap-4">
        {taskTiles.map((tile) => {
          const TileIcon = tile.Icon;
          const isPending = !tile.isDone && !isSelectedFuture;

          return (
            <li key={tile.key} className="w-full">
              <button
                type="button"
                disabled={tile.disabled}
                onClick={tile.onOpen}
                aria-label={tile.title}
                className={`group relative w-full h-full min-h-[108px] rounded-2xl p-4 flex flex-col justify-between text-left border transition cursor-pointer disabled:cursor-default ${
                  tile.isDone
                    ? "bg-[#e5e5e2] dark:bg-white/[0.07] border-zinc-300/60 dark:border-white/10"
                    : "bg-[#ececea] dark:bg-white/[0.04] border-zinc-200/60 dark:border-white/5 hover:bg-[#e7e7e4] dark:hover:bg-white/[0.06]"
                } ${isSelectedFuture ? "opacity-65" : "active:scale-[0.98]"}`}
              >
                {/* Top Row: Solid Fill Icon (with Red Pending Dot on icon top-right) + Emerald Check when done */}
                <div className="w-full flex items-start justify-between gap-2">
                  <span
                    className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                      tile.isDone
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-2xs"
                        : "bg-white/90 dark:bg-white/10 text-zinc-900 dark:text-white"
                    }`}
                  >
                    {isSelectedFuture ? (
                      <FillLockIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    ) : (
                      <TileIcon className="w-4 h-4" />
                    )}

                    {isPending && (
                      <span
                        aria-label="Not completed"
                        className="semantic-badge-box absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#9E2A3A] dark:bg-[#E06C7C] ring-2 ring-[#ececea] dark:ring-[#18181b]"
                      />
                    )}
                  </span>

                  {tile.isDone ? (
                    <span
                      aria-label="Completed"
                      className="semantic-badge-box w-5 h-5 rounded-full bg-[#1F6E54] border border-[#2A7B60] text-white flex items-center justify-center shrink-0"
                    >
                      <Check className="w-3 h-3 stroke-[2.75]" />
                    </span>
                  ) : null}
                </div>

                {/* Bottom: Clean Task Name Only */}
                <span className="pt-3 text-sm font-semibold text-zinc-950 dark:text-white leading-normal truncate w-full">
                  {tile.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Custom Coach Task Modal Host (opened directly when tapping custom task tiles) */}
      {customTasksList.length > 0 && (
        <CustomTaskSection
          programDayId={selectedDay.id}
          customTasks={customTasksList}
          locked={selectedLocked}
          isFuture={isSelectedFuture}
          modalOnly
          externalOpenTaskId={openCustomTaskId}
          onExternalModalClose={() => setOpenCustomTaskId(null)}
          onSubmitted={(customTaskId, submission, dayCompleted) =>
            props.onCustomTaskSubmitted?.(selectedDay.id, customTaskId, submission, dayCompleted)
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
