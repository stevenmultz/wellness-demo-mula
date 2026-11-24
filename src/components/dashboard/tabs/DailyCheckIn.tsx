"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, ExternalLink } from "lucide-react";
import { InfoPopupModal, safeHttpUrl } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import {
  FillCalendarIcon,
  FillCameraIcon,
  FillChecklistIcon,
  FillDropletIcon,
  FillDumbbellIcon,
  FillHeartIcon,
  FillLockIcon,
  FillMapPinIcon,
  FillMoonIcon,
  FillPlayIcon,
  FillScaleIcon,
  FillSparkleIcon,
  FillTargetIcon,
  FillUsersIcon,
  FillUtensilsIcon,
  FillVideoIcon,
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
  const [upcomingOpen, setUpcomingOpen] = useState(false);

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
  const progressPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Single next upcoming Onsite Meet or Online Meet from program schedule
  const nextUpcomingMeet = useMemo(() => {
    const baseDayNum = selectedDay.dayNumber || day.dayNumber || 1;
    const isSessionDay = (d: (typeof programDays)[number]) =>
      d.dayType === "CONNECTION_DAY" ||
      d.dayType === "MEETUP_DAY" ||
      d.dayType === "CONNECT_DAY" ||
      Boolean(d.onsiteVenue && d.onsiteVenue.trim()) ||
      Boolean(d.meetupLink && d.meetupLink.trim());

    const nextDay = programDays.find(
      (d) => d.dayNumber >= baseDayNum && isSessionDay(d)
    );
    if (!nextDay) return null;

    const venue =
      nextDay.onsiteVenue?.trim() ||
      (!nextDay.meetupLink?.trim() ? props.programVenueAddress?.trim() || null : null);
    const zoomUrl = safeHttpUrl(nextDay.meetupLink);
    const isOnsite = Boolean(venue) && (!zoomUrl || Boolean(nextDay.onsiteVenue?.trim()));
    const diff = nextDay.dayNumber - baseDayNum;
    const countdown =
      diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff > 1 ? `In ${diff}d` : null;

    return {
      kind: isOnsite ? ("onsite" as const) : ("online" as const),
      label: isOnsite ? "Onsite Meet" : "Online Meet",
      title:
        (nextDay.eventTitle || nextDay.title || (isOnsite ? "Onsite Meet" : "Online Meet"))
          .replace(/^day\s*\d+\s*:\s*/i, "")
          .trim(),
      dateLabel: formatDayPillDate(nextDay.unlockDate, nextDay.dayNumber),
      timeLabel: nextDay.onsiteSchedule?.trim() || null,
      venue,
      details: nextDay.eventDetails?.trim() || null,
      mapUrl: safeHttpUrl(nextDay.mapLink),
      zoomUrl,
      countdown,
    };
  }, [programDays, selectedDay.dayNumber, day.dayNumber, props.programVenueAddress]);

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

      {/* Upcoming Meet Detail Modal (Opens when tapping Upcoming widget) */}
      <InfoPopupModal
        open={upcomingOpen}
        title={nextUpcomingMeet?.label || "Upcoming"}
        subtitle={nextUpcomingMeet?.title || "Session schedule"}
        onClose={() => setUpcomingOpen(false)}
      >
        {nextUpcomingMeet ? (
          <div className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500 dark:text-zinc-400">Date</span>
                <span className="font-mono font-semibold text-zinc-950 dark:text-white">
                  {nextUpcomingMeet.dateLabel}
                </span>
              </div>
              {nextUpcomingMeet.timeLabel && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Time</span>
                  <span className="font-mono font-semibold text-zinc-950 dark:text-white">
                    {nextUpcomingMeet.timeLabel}
                  </span>
                </div>
              )}
              {nextUpcomingMeet.venue && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">Location</span>
                  <span className="text-right font-medium text-zinc-950 dark:text-white">
                    {nextUpcomingMeet.venue}
                  </span>
                </div>
              )}
            </div>

            {nextUpcomingMeet.details && (
              <p className="pt-2 border-t border-zinc-200 dark:border-white/10 text-[11px] leading-relaxed whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                {nextUpcomingMeet.details}
              </p>
            )}

            <div className="space-y-2 pt-1">
              {nextUpcomingMeet.zoomUrl && (
                <a
                  href={nextUpcomingMeet.zoomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  <FillVideoIcon className="w-3.5 h-3.5" />
                  <span>Join Online Meet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {nextUpcomingMeet.mapUrl && (
                <a
                  href={nextUpcomingMeet.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full h-9 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                    nextUpcomingMeet.zoomUrl
                      ? "bg-[#ececea] dark:bg-white/10 text-zinc-950 dark:text-white"
                      : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  }`}
                >
                  <FillMapPinIcon className="w-3.5 h-3.5" />
                  <span>Open Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No upcoming onsite or online meet scheduled yet.
          </p>
        )}
      </InfoPopupModal>

      {/* Top Row (1/3 Tasks with Slim Vertical Progress Bar & 2/3 Upcoming Side-by-Side) */}
      <div className="w-full grid grid-cols-3 gap-3 sm:gap-4 items-stretch">
        {/* 1/3: Tasks (Slim vertical bar adapts smoothly to adjacent Upcoming card height) */}
        <div className="col-span-1 w-full h-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-3.5 sm:p-4 flex flex-col justify-between gap-3 border border-zinc-200/50 dark:border-white/5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-500 dark:text-zinc-400 shrink-0 flex items-center">
              <FillTargetIcon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-normal py-[1px]">
              Tasks
            </span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-2 min-h-[38px]">
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-[1.08]">
                {progressPct}
              </span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 leading-normal">
                %
              </span>
            </div>

            {/* Slim Vertical Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tasks ${progressPct}%`}
              className="w-2 sm:w-2.5 self-stretch min-h-[38px] rounded-full bg-zinc-300/75 dark:bg-white/15 overflow-hidden flex flex-col justify-end shrink-0"
            >
              <div
                style={{ height: `${progressPct}%` }}
                className="w-full rounded-full bg-zinc-950 dark:bg-white transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* 2/3: Upcoming (Next Onsite Meet or Online Meet Only; Tap for Detail Popup) */}
        <button
          type="button"
          onClick={() => setUpcomingOpen(true)}
          className="col-span-2 w-full h-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] hover:bg-[#e7e7e4] dark:hover:bg-white/[0.06] p-3.5 sm:p-4 flex flex-col justify-between gap-3 text-left border border-zinc-200/50 dark:border-white/5 transition active:scale-[0.99] cursor-pointer"
        >
          <div className="w-full flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-zinc-500 dark:text-zinc-400 shrink-0 flex items-center">
                <FillCalendarIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-normal py-[1px]">
                Upcoming
              </span>
            </div>

            {nextUpcomingMeet?.countdown && (
              <span className="semantic-badge-box px-1.5 py-[1px] rounded-md border border-zinc-900/15 dark:border-white/15 bg-white/85 dark:bg-white/10 text-[9px] sm:text-[10px] font-mono font-semibold text-zinc-900 dark:text-white leading-[1.25] shrink-0">
                {nextUpcomingMeet.countdown}
              </span>
            )}
          </div>

          <div className="w-full flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-white/90 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
                {nextUpcomingMeet?.kind === "online" ? (
                  <FillVideoIcon className="w-3.5 h-3.5" />
                ) : (
                  <FillMapPinIcon className="w-3.5 h-3.5" />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white truncate leading-normal">
                  {nextUpcomingMeet ? nextUpcomingMeet.label : "No upcoming meet"}
                </p>
                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate leading-normal">
                  {nextUpcomingMeet ? nextUpcomingMeet.dateLabel : "TBA"}
                </p>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
          </div>
        </button>
      </div>

      {/* Free-Order 2-Column Task Tiles Grid (Pending dot & Completed check share exact top-right icon anchor) */}
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
                {/* Top: Solid Fill Icon with Dusty Red Pending Dot or Sage Green Check at identical top-right anchor */}
                <div className="w-full flex items-start">
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
                        className="semantic-badge-box absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--semantic-red-dot)] ring-2 ring-[#ececea] dark:ring-[#18181b]"
                      />
                    )}

                    {tile.isDone && (
                      <span
                        aria-label="Completed"
                        className="semantic-badge-box absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--semantic-green)] text-white ring-2 ring-[#e5e5e2] dark:ring-[#18181b] flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </span>
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
