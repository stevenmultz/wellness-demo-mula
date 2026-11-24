"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Check, MessageCircle, User, Users } from "lucide-react";
import { buildConciergeWhatsAppUrl } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { InfoPopupModal } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import {
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
  const progressPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const { locale } = useLocale();
  const isId = locale === "id";
  const coachDisplayName = props.coachName || selectedDay.coachName || "Coach";
  const programTitle = props.programTitle || "Program";
  const coachChatUrl = buildConciergeWhatsAppUrl(
    isId
      ? `Halo Coach ${coachDisplayName}, saya ingin bertanya mengenai program ${programTitle}.`
      : `Hi Coach ${coachDisplayName}, I have a question regarding ${programTitle}.`
  );

  const handleOpenGroupChat = () => {
    if (props.onOpenCommunity) {
      props.onOpenCommunity();
      return;
    }
    const groupUrl =
      props.communityLink ||
      buildConciergeWhatsAppUrl(
        isId
          ? `Halo Concierge, saya ingin bergabung ke group chat komunitas untuk: ${programTitle}`
          : `Hello Concierge, I would like to join the community group for: ${programTitle}`
      );
    if (typeof window !== "undefined") {
      window.open(groupUrl, "_blank", "noopener,noreferrer");
    }
  };

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

  const getCoreDurationLabel = (index: number): string => {
    if (index === 0) return "1 min";
    if (index === 1) {
      if (selectedDay.dayType === "TRAINING_DAY") return "15 min";
      return "2 min";
    }
    if (index === 2) return "2 min";
    return "1 min";
  };

  const getCustomDurationLabel = (ct: ProgramDayCustomTaskDTO): string => {
    const titleLower = ct.title.toLowerCase();
    if (
      titleLower.includes("intro") ||
      titleLower.includes("final") ||
      titleLower.includes("sambutan") ||
      titleLower.includes("penutup") ||
      ct.fields.some((f) => f.key === "videoUrl" || f.key === "videoWatched")
    ) {
      return "3 min";
    }
    switch (ct.taskType) {
      case "MEASUREMENT":
        return "2 min";
      case "BENCHMARK":
        return "5 min";
      case "MEDIA_UPLOAD":
        return "2 min";
      default:
        return "1 min";
    }
  };

  interface DailyTaskTile {
    key: string;
    title: string;
    durationLabel: string;
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
        durationLabel: getCoreDurationLabel(index),
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
        durationLabel: getCustomDurationLabel(ct),
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

      {/* Standalone Daily Tasks Progress Widget (Per-Task Segmented Bar) */}
      <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3 border border-zinc-200/50 dark:border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-900 dark:text-white shrink-0 flex items-center">
              <FillTargetIcon className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate leading-normal py-[1px]">
              Daily Tasks Progress
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-[1.08]">
              {progressPct}
            </span>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-normal">
              %
            </span>
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Daily Tasks Progress ${progressPct}%`}
          className="w-full flex items-center gap-1.5"
        >
          {Array.from({ length: Math.max(1, totalTasks) }, (_, idx) => {
            const isFilled = idx < completedTasks;
            return (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  isFilled
                    ? "bg-zinc-950 dark:bg-white"
                    : "bg-zinc-300/80 dark:bg-white/15"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Free-Order 2-Column Task Tiles Grid */}
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
                    ? "opacity-60 bg-[#e4e4e1] dark:bg-white/[0.03] border-zinc-300/50 dark:border-white/5"
                    : "bg-[#ececea] dark:bg-white/[0.04] border-zinc-200/50 dark:border-white/5 hover:bg-[#e7e7e4] dark:hover:bg-white/[0.06]"
                } ${isSelectedFuture ? "opacity-65" : "active:scale-[0.98]"}`}
              >
                {/* Top: Clean Solid Fill Icon */}
                <div className="w-full flex items-start">
                  <span className="relative inline-flex items-center justify-center shrink-0 text-zinc-900 dark:text-white">
                    {isSelectedFuture ? (
                      <FillLockIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                    ) : (
                      <TileIcon className="w-6 h-6" />
                    )}

                    {isPending && (
                      <span
                        aria-label="Not completed"
                        className="semantic-badge-box absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--semantic-red-dot)] ring-2 ring-[#ececea] dark:ring-[#18181b]"
                      />
                    )}

                    {tile.isDone && (
                      <span
                        aria-label="Completed"
                        className="semantic-badge-box absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[var(--semantic-green)] text-white ring-2 ring-[#e4e4e1] dark:ring-[#18181b] flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </span>
                </div>

                {/* Bottom: Task Name + Estimated Completion Time */}
                <div className="pt-3 w-full min-w-0 space-y-0.5">
                  <span className="block text-sm font-semibold text-zinc-950 dark:text-white leading-normal truncate w-full">
                    {tile.title}
                  </span>
                  <span className="block text-[11px] font-mono text-zinc-500 dark:text-zinc-400 leading-normal">
                    {tile.durationLabel}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Chat with Coach & Group Widget */}
      <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5 space-y-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-900 dark:text-white shrink-0 flex items-center">
              <MessageCircle className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate leading-normal py-[1px]">
              {isId ? "Tanya Coach & Group Chat" : "Coach & Community Chat"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {isId
              ? "Konsultasikan kendala tugas Anda langsung ke coach atau berdiskusi di grup komunitas."
              : "Reach out to your coach directly or chat with peers in the cohort group."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          {/* Chat with Coach */}
          <a
            href={coachChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30 text-zinc-950 dark:text-white transition active:scale-[0.98] cursor-pointer shadow-2xs group"
          >
            <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white group-hover:scale-105 transition-transform">
              <User className="w-4 h-4" />
            </span>
            <div className="min-w-0 text-left">
              <span className="block text-xs font-semibold text-zinc-950 dark:text-white truncate leading-tight">
                Chat Coach
              </span>
              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
                {coachDisplayName}
              </span>
            </div>
          </a>

          {/* Group Chat */}
          <button
            type="button"
            onClick={handleOpenGroupChat}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30 text-zinc-950 dark:text-white transition active:scale-[0.98] cursor-pointer shadow-2xs group"
          >
            <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </span>
            <div className="min-w-0 text-left">
              <span className="block text-xs font-semibold text-zinc-950 dark:text-white truncate leading-tight">
                Group Chat
              </span>
              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
                Cohort Member
              </span>
            </div>
          </button>
        </div>
      </div>

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
