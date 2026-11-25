"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  Dumbbell,
  Footprints,
  Loader2,
  MessageCircle,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { buildConciergeWhatsAppUrl } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { formatWibDateKey } from "@/wellness/utils/timezone";
import {
  EXTRA_WORKOUT_PRESETS,
  computeExtraWorkoutKcal,
  detectHighTrainingLoad,
} from "@/wellness/utils/wellness-metrics";
import { HeaderBackButton, InfoPopupModal } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import {
  FillCameraIcon,
  FillChecklistIcon,
  FillDropletIcon,
  FillDumbbellIcon,
  FillFlameIcon,
  FillFootprintsIcon,
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
      timeZone: "Asia/Jakarta",
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
    // Water task (step === 3) reflects live waterMl > 0 from parent props so resetting to 0 ml never shows done
    if (!selectedLocked && isSelectedToday && step !== 3) {
      markDone(step);
    }
    setDetailOpen(false);
  };

  const customTasksList = selectedDay.customTasks || [];
  const selectedDateKey =
    selectedDay.wibDateKey ||
    (selectedDay.unlockDate ? formatWibDateKey(selectedDay.unlockDate) : formatWibDateKey(new Date()));

  const { locale } = useLocale();
  const isId = locale === "id";
  const programTitle = props.programTitle || "Program";

  // ── Daily Steps Task State (PostgreSQL-backed via UserDailyLog, Multi-Plan Synced) ──
  const steps = selectedDay.userProgress?.stepsCount ?? 0;
  const [stepsModalOpen, setStepsModalOpen] = useState(false);
  const [draftSteps, setDraftSteps] = useState<number>(steps);
  const [stepsBusy, setStepsBusy] = useState(false);
  const [showCustomSteps, setShowCustomSteps] = useState(false);
  const [customStepsInput, setCustomStepsInput] = useState("");

  useEffect(() => {
    setDraftSteps(selectedDay.userProgress?.stepsCount ?? 0);
    setStepsModalOpen(false);
    setShowCustomSteps(false);
    setCustomStepsInput("");
  }, [selectedDay.id, selectedDay.userProgress?.stepsCount]);

  const openStepsModal = () => {
    if (isSelectedFuture) return;
    setDraftSteps(steps);
    setShowCustomSteps(false);
    setCustomStepsInput("");
    setStepsModalOpen(true);
  };

  const handleAddDraftSteps = (inc: number) => {
    setDraftSteps((prev) => Math.max(0, Math.min(100000, prev + inc)));
  };

  const handleCustomStepsSubmit = () => {
    const val = parseInt(customStepsInput, 10);
    if (!Number.isNaN(val) && val > 0) {
      handleAddDraftSteps(val);
      setCustomStepsInput("");
      setShowCustomSteps(false);
    }
  };

  const handleSaveStepsModal = async () => {
    if (stepsBusy) return;
    if (!selectedLocked || isAnytime) {
      setStepsBusy(true);
      try {
        const ok = await props.onSaveSteps?.(draftSteps, selectedDay.id);
        if (ok === false) return;
      } finally {
        setStepsBusy(false);
      }
    }
    setStepsModalOpen(false);
  };

  const programActivityDone = Boolean(selectedDone[1]);
  const customDoneCount = customTasksList.filter((ct) => Boolean(ct.submission)).length;
  const totalTasks = 1 + customTasksList.length;
  const completedTasks = (programActivityDone ? 1 : 0) + customDoneCount;
  const progressPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ── More Training (PostgreSQL-backed via UserExtraWorkoutLog, Multi-Plan Synced) ──
  const extraSessions = selectedDay.userProgress?.extraWorkouts ?? [];
  const [moreTrainingOpen, setMoreTrainingOpen] = useState(false);
  const [extraBusy, setExtraBusy] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<
    "run" | "strength" | "hiit" | "mobility" | "cycling" | "swim" | "custom"
  >("run");
  const [customExtraName, setCustomExtraName] = useState<string>("");
  const [extraDurationMins, setExtraDurationMins] = useState<number>(30);
  const [extraCustomKcal, setExtraCustomKcal] = useState<string>("");
  const [excludeFromNetBurn, setExcludeFromNetBurn] = useState<boolean>(false);

  useEffect(() => {
    setMoreTrainingOpen(false);
  }, [selectedDay.id]);

  const handleSelectPresetType = (
    typeId: "run" | "strength" | "hiit" | "mobility" | "cycling" | "swim" | "custom"
  ) => {
    setSelectedExtraType(typeId);
    const preset = EXTRA_WORKOUT_PRESETS.find((p) => p.id === typeId);
    // Smart default: if user already logged Steps and picks Run, default hint for double-count guard
    setExcludeFromNetBurn(Boolean(preset?.oftenCountedInSteps && steps > 0));
  };

  const handleAddExtraSession = async () => {
    if (extraBusy || (selectedLocked && !isAnytime) || isSelectedFuture) return;
    const preset =
      EXTRA_WORKOUT_PRESETS.find((p) => p.id === selectedExtraType) || EXTRA_WORKOUT_PRESETS[0];
    const mins = Math.max(1, Math.min(360, Math.round(extraDurationMins || 30)));
    const title = customExtraName.trim() || (isId ? preset.labelId : preset.labelEn);
    const parsedWatchKcal =
      extraCustomKcal.trim() !== "" && Number.isFinite(Number(extraCustomKcal))
        ? Math.max(0, Math.min(3500, Math.round(Number(extraCustomKcal))))
        : null;

    setExtraBusy(true);
    try {
      const ok = await props.onAddExtraWorkout?.({
        logDate: selectedDateKey,
        activityType: selectedExtraType,
        title,
        durationMinutes: mins,
        customKcal: parsedWatchKcal,
        excludeFromNetBurn,
        programDayId: selectedDay.id,
      });
      if (ok !== false) {
        setCustomExtraName("");
        setExtraDurationMins(30);
        setExtraCustomKcal("");
        setExcludeFromNetBurn(false);
        setMoreTrainingOpen(false);
      }
    } finally {
      setExtraBusy(false);
    }
  };

  const handleRemoveExtraSession = async (id: string) => {
    if (extraBusy || (selectedLocked && !isAnytime) || isSelectedFuture) return;
    setExtraBusy(true);
    try {
      await props.onDeleteExtraWorkout?.(id, selectedDateKey, selectedDay.id);
    } finally {
      setExtraBusy(false);
    }
  };

  const totalExtraMins = extraSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalExtraKcal = extraSessions.reduce((acc, s) => acc + s.estimatedKcal, 0);
  const loadAdvisory = detectHighTrainingLoad({
    dayType: selectedDay.dayType,
    overlappingTrainingProgramsCount: props.overlappingTrainingCount,
    extraWorkouts: extraSessions,
  });

  const todayFocusTitle =
    selectedDay.title?.trim() ||
    (selectedDay.dayType === "TRAINING_DAY"
      ? isId
        ? "Latihan Terjadwal & Pemulihan Aktif"
        : "Scheduled Training & Active Conditioning"
      : selectedDay.dayType === "REST_DAY"
        ? isId
          ? "Pemulihan Tubuh, Tidur & Nutrisi"
          : "Full Body Recovery, Sleep & Nutrition"
        : isId
          ? "Sesi Komunitas & Evaluasi Bersama"
          : "Community Session & Cohort Check-In");

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
    isOptional?: boolean;
    Icon: ComponentType<FillIconProps>;
    onOpen: () => void;
    disabled: boolean;
  }

  const primaryProgramTask = tasks[1];
  const taskTiles: DailyTaskTile[] = [
    ...(primaryProgramTask
      ? [
          {
            key: `core-${primaryProgramTask.title}`,
            title: primaryProgramTask.title,
            durationLabel: getCoreDurationLabel(1),
            isDone: programActivityDone,
            Icon: getCoreFillIcon(1),
            disabled:
              isSelectedFuture ||
              (selectedLocked && !isSelectedPast && !programActivityDone),
            onOpen: () => openDetail(1),
          },
        ]
      : []),
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

      {/* Today's Focus Widget */}
      <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5 space-y-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-zinc-900 dark:text-white shrink-0 flex items-center">
            <FillSparkleIcon className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate leading-normal py-[1px]">
            {isId ? "Fokus Hari Ini" : "Today's Focus"}
          </span>
        </div>

        <p className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white leading-snug">
          {todayFocusTitle}
        </p>
      </div>

      {/* Overtraining / Recovery Non-Blocking Advisory */}
      {loadAdvisory.isHighLoad && (
        <div className="w-full rounded-2xl bg-[var(--semantic-yellow-bg)] dark:bg-[var(--semantic-yellow-bg)] border border-[var(--semantic-yellow-border)]/30 p-3.5 sm:p-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[var(--semantic-yellow)] shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <p className="font-semibold text-zinc-950 dark:text-white">
              {isId ? "Catatan Pemulihan & Beban Latihan" : "Recovery & Training Load Advisory"}
            </p>
            <p>
              {loadAdvisory.reasonCode === "REST_DAY_INTENSE_EXTRA"
                ? isId
                  ? "Hari ini adalah Hari Istirahat, namun Anda mencatat sesi intensitas tinggi. Pastikan tidur minimal 7.5 jam & hidrasi optimal."
                  : "Today is a Rest Day with high-intensity extra training logged. Prioritize 7.5h+ sleep and hydration for recovery."
                : loadAdvisory.reasonCode === "MULTI_PROGRAM_TRAINING"
                  ? isId
                    ? "Anda memiliki 2+ jadwal latihan aktif di hari yang sama. Jaga kualitas gerak & hindari overtraining."
                    : "You have 2+ scheduled training programs on the same day. Manage intensity and prioritize recovery."
                  : isId
                    ? "Volume latihan ekstra hari ini cukup tinggi (>60 mnt). Pastikan asupan protein & hidrasi tercukupi."
                    : "High extra workout volume logged today (>60 min). Fuel with adequate protein and hydration."}
            </p>
          </div>
        </div>
      )}

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
          const isPending = !tile.isDone && !tile.isOptional && !isSelectedFuture;

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

      {props.onBackToTodayHub && (
        <div className="rounded-2xl bg-[#ececea]/80 dark:bg-white/[0.03] border border-zinc-200/60 dark:border-white/10 p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {isId
              ? "Sleep, Meal, Water, Daily Steps & More Workouts dicatat terpusat di Today Hub."
              : "Sleep, Meal, Water, Daily Steps & More Workouts are tracked centrally in Today Hub."}
          </p>
          <button
            type="button"
            onClick={props.onBackToTodayHub}
            className="px-3 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold shrink-0 hover:opacity-90 transition cursor-pointer"
          >
            {isId ? "Today Hub" : "Today Hub"}
          </button>
        </div>
      )}

      {/* Community Group Chat Widget */}
      <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5 flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-900 dark:text-white shrink-0 flex items-center">
              <Users className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate leading-normal py-[1px]">
              {isId ? "Grup Komunitas Cohort" : "Cohort Community Chat"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed truncate">
            {isId
              ? "Diskusi dan berbagi progres bersama sesama anggota cohort."
              : "Chat and share progress with fellow cohort members."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenGroupChat}
          className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold shrink-0 hover:opacity-90 active:scale-95 transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{isId ? "Buka Group Chat" : "Group Chat"}</span>
        </button>
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

      {/* Daily Steps Fullscreen Task Modal (matches TaskForm & WaterStepView) */}
      {stepsModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[80] h-[100dvh] w-full bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 overflow-hidden"
          >
            <div className="h-full w-full overflow-y-auto overscroll-contain bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col">
              <header
                style={{ paddingTop: "env(safe-area-inset-top)" }}
                className="sticky top-0 z-10 w-full bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
                  <HeaderBackButton
                    onClick={() => setStepsModalOpen(false)}
                    ariaLabel="Back to dashboard"
                  />

                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums truncate max-w-[60%]">
                    Daily Steps · 1 / 1
                  </span>
                </div>
              </header>

              <div
                className="w-full max-w-xl mx-auto flex-1 flex flex-col px-4 sm:px-6 pt-6 sm:pt-8"
                style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <div className="h-1 flex-1 rounded-full bg-zinc-950 dark:bg-white" />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveStepsModal();
                  }}
                  className="flex-1 flex flex-col justify-between gap-8 pt-6 min-w-0"
                >
                  <div className="space-y-6 min-w-0">
                    <div className="space-y-1.5">
                      <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white leading-tight">
                        {isId
                          ? "Berapa langkah yang Anda tempuh hari ini?"
                          : "How many steps did you take today?"}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {isId
                          ? "Catat langkah harian untuk mengurangi estimasi kalori bersih (~40 kcal per 1.000 langkah)."
                          : "Log your daily steps to deduct estimated calories burned from net daily calories (~40 kcal per 1,000 steps)."}
                      </p>
                    </div>

                    {/* Progress & Live Total Card */}
                    {(() => {
                      const TARGET_STEPS = 10000;
                      const stepsPct = Math.min(100, Math.round((draftSteps / TARGET_STEPS) * 100));
                      const draftBurnedKcal = Math.round(draftSteps * 0.04);
                      const isReadOnly = selectedLocked && !isAnytime;

                      return (
                        <>
                          <div className="p-5 rounded-2xl bg-white/85 dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 space-y-3">
                            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-none">
                                  {draftSteps.toLocaleString()}
                                </span>
                                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                                  / {TARGET_STEPS.toLocaleString()} steps
                                </span>
                              </div>

                              <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                                {draftBurnedKcal > 0
                                  ? `-${draftBurnedKcal} kcal (${stepsPct}%)`
                                  : `${stepsPct}%`}
                              </span>
                            </div>

                            <div className="w-full h-2.5 rounded-full bg-zinc-200/80 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all duration-300"
                                style={{ width: `${stepsPct}%` }}
                              />
                            </div>

                            {!isReadOnly && (
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200/60 dark:border-white/10">
                                <button
                                  type="button"
                                  disabled={draftSteps <= 0}
                                  onClick={() => setDraftSteps(0)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-40 disabled:hover:text-zinc-600 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-default"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{isId ? "Reset Langkah" : "Reset Steps"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setShowCustomSteps((prev) => !prev)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>
                                    {showCustomSteps
                                      ? isId
                                        ? "Tutup Custom"
                                        : "Close Custom"
                                      : isId
                                        ? "Tambah Custom"
                                        : "Add Custom"}
                                  </span>
                                </button>
                              </div>
                            )}

                            {!isReadOnly && showCustomSteps && (
                              <div className="pt-2 flex items-center gap-2 animate-in fade-in duration-150">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={100000}
                                  step={100}
                                  placeholder={
                                    isId ? "Jumlah langkah (mis. 3500)" : "Steps count (e.g. 3500)"
                                  }
                                  value={customStepsInput}
                                  onChange={(e) => setCustomStepsInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleCustomStepsSubmit();
                                    }
                                  }}
                                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#18181b] text-xs font-mono text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white"
                                />
                                <button
                                  type="button"
                                  disabled={!customStepsInput || parseInt(customStepsInput, 10) <= 0}
                                  onClick={handleCustomStepsSubmit}
                                  className="px-4 py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
                                >
                                  {isId ? "Tambah" : "Add"}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 4 Quick Step Tap Cards */}
                          {!isReadOnly && (
                            <div className="space-y-2.5">
                              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                                {isId
                                  ? "Pilih Tambahan Cepat (Tap untuk menambah)"
                                  : "Quick Add (Tap to add steps)"}
                              </span>

                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  {
                                    inc: 1000,
                                    name: isId ? "Jalan Singkat" : "Short Walk",
                                    kcal: 40,
                                  },
                                  {
                                    inc: 2500,
                                    name: isId ? "Jalan Santai" : "Casual Walk",
                                    kcal: 100,
                                  },
                                  {
                                    inc: 5000,
                                    name: isId ? "Jalan Aktif" : "Active Walk",
                                    kcal: 200,
                                  },
                                  {
                                    inc: 10000,
                                    name: isId ? "Target Harian" : "Daily Goal",
                                    kcal: 400,
                                  },
                                ].map((preset) => (
                                  <button
                                    key={preset.inc}
                                    type="button"
                                    onClick={() => handleAddDraftSteps(preset.inc)}
                                    className="group relative p-4 rounded-2xl border border-zinc-200/90 dark:border-white/15 bg-white dark:bg-[#141414] hover:border-zinc-400 dark:hover:border-white/30 text-left transition active:scale-95 cursor-pointer shadow-2xs flex flex-col justify-between min-h-[108px]"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                        <Footprints className="w-5 h-5" />
                                      </span>

                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                                        +{preset.inc.toLocaleString()}
                                      </span>
                                    </div>

                                    <div className="pt-3">
                                      <span className="block text-sm font-semibold text-zinc-950 dark:text-white leading-tight">
                                        {preset.name}
                                      </span>
                                      <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">
                                        -{preset.kcal} kcal · Tap +{preset.inc.toLocaleString()}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={stepsBusy}
                      className="group py-1.5 text-sm font-semibold text-zinc-950 dark:text-white hover:opacity-75 inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-40 transition cursor-pointer"
                    >
                      {stepsBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>
                        {selectedLocked && !isAnytime
                          ? isId
                            ? "Tutup"
                            : "Close"
                          : "Save & Finish"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* More Training Fullscreen Modal */}
      {moreTrainingOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[80] h-[100dvh] w-full bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 overflow-hidden"
          >
            <div className="h-full w-full overflow-y-auto overscroll-contain bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col">
              <header
                style={{ paddingTop: "env(safe-area-inset-top)" }}
                className="sticky top-0 z-10 w-full bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
                  <HeaderBackButton
                    onClick={() => setMoreTrainingOpen(false)}
                    ariaLabel="Back to dashboard"
                  />

                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums truncate max-w-[60%]">
                    More Training · 1 / 1
                  </span>
                </div>
              </header>

              <div
                className="w-full max-w-xl mx-auto flex-1 flex flex-col px-4 sm:px-6 pt-6 sm:pt-8"
                style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <div className="h-1 flex-1 rounded-full bg-zinc-950 dark:bg-white" />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleAddExtraSession();
                  }}
                  className="flex-1 flex flex-col justify-between gap-8 pt-6 min-w-0"
                >
                  <div className="space-y-6 min-w-0">
                    <div className="space-y-1.5">
                      <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white leading-tight">
                        {isId ? "Latihan tambahan apa hari ini?" : "What extra training did you do?"}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {isId
                          ? "Pilih jenis latihan dan durasi untuk mencatat sesi bonus Anda (otomatis tersinkron lintas program)."
                          : "Choose an activity type and duration to log your bonus workout (synced across all plans)."}
                      </p>
                    </div>

                    {/* Logged Extra Sessions Summary (if any) */}
                    {extraSessions.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white/85 dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                            {isId ? "Sesi Tercatat Hari Ini" : "Logged Extra Sessions"}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-300">
                            {totalExtraMins} min · -{totalExtraKcal} kcal
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {extraSessions.map((session) => (
                            <div
                              key={session.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/10"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-950 dark:text-white truncate">
                                  {session.title}
                                </p>
                                <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                                  {session.durationMinutes} min · -{session.estimatedKcal} kcal
                                  {session.excludeFromNetBurn
                                    ? isId
                                      ? " · termasuk di Steps"
                                      : " · counted in Steps"
                                    : ""}
                                </p>
                              </div>
                              {!(selectedLocked && !isAnytime) && !isSelectedFuture && (
                                <button
                                  type="button"
                                  disabled={extraBusy}
                                  onClick={() => void handleRemoveExtraSession(session.id)}
                                  aria-label={`Remove ${session.title}`}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-40 transition cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activity Type Grid & Add Form (hidden when day cutoff 23:59 WIB passed) */}
                    {selectedLocked && !isAnytime ? (
                      <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400">
                        {isId
                          ? "Batas pengisian 23:59 WIB untuk hari ini telah berakhir. Latihan tambahan hanya dapat dilihat."
                          : "This day's 23:59 WIB cutoff has passed. Extra workouts are read-only."}
                      </div>
                    ) : (
                    <>
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                        {isId ? "Jenis Latihan" : "Activity Type"}
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {EXTRA_WORKOUT_PRESETS.map((preset) => {
                          const active = selectedExtraType === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleSelectPresetType(preset.id)}
                              className={`p-3.5 rounded-2xl border text-left transition active:scale-95 cursor-pointer flex items-center gap-2.5 ${
                                active
                                  ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                  : "border-zinc-200/90 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-white/30"
                              }`}
                            >
                              <Dumbbell className="w-4 h-4 shrink-0" />
                              <span className="text-xs font-semibold truncate">
                                {isId ? preset.labelId : preset.labelEn}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Duration Selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {isId ? "Durasi (menit)" : "Duration (minutes)"}
                        </span>
                        <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                          ~
                          {computeExtraWorkoutKcal(
                            selectedExtraType,
                            extraDurationMins || 30,
                            extraCustomKcal.trim() ? Number(extraCustomKcal) : null
                          )}{" "}
                          kcal
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 45, 60].map((mins) => {
                          const active = extraDurationMins === mins;
                          return (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setExtraDurationMins(mins)}
                              className={`py-2.5 rounded-xl border text-xs font-mono font-semibold transition active:scale-95 cursor-pointer ${
                                active
                                  ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                                  : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-400"
                              }`}
                            >
                              {mins}m
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={360}
                        value={extraDurationMins}
                        onChange={(e) => setExtraDurationMins(parseInt(e.target.value, 10) || 0)}
                        placeholder="30"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-xs font-mono text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white"
                      />
                    </div>

                    {/* Optional Watch Calories + Double-Count Guard */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                          {isId
                            ? "Kalori dari Smartwatch (Opsional — kosongkan untuk estimasi otomatis)"
                            : "Smartwatch Active Calories (Optional — leave empty for auto estimate)"}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={3500}
                          value={extraCustomKcal}
                          onChange={(e) => setExtraCustomKcal(e.target.value)}
                          placeholder={isId ? "mis. 320 kcal (Garmin / Apple Watch)" : "e.g. 320 kcal (Garmin / Apple Watch)"}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-xs font-mono text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white"
                        />
                      </div>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/80 dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={excludeFromNetBurn}
                          onChange={(e) => setExcludeFromNetBurn(e.target.checked)}
                          className="mt-0.5 rounded border-zinc-300 accent-zinc-950 dark:accent-white"
                        />
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          <strong className="text-zinc-950 dark:text-white block">
                            {isId
                              ? "Sudah termasuk dalam hitungan Daily Steps?"
                              : "Already counted in Daily Steps?"}
                          </strong>
                          {isId
                            ? "Centang agar kalori lari/jalan tidak dikurangkan dua kali pada Net Calories."
                            : "Check this so walking/running calories are not deducted twice from Net Calories."}
                        </span>
                      </label>
                    </div>

                    {/* Optional Custom Workout Title */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                        {isId ? "Nama Latihan (Opsional)" : "Workout Name (Optional)"}
                      </span>
                      <input
                        type="text"
                        maxLength={80}
                        value={customExtraName}
                        onChange={(e) => setCustomExtraName(e.target.value)}
                        placeholder={
                          isId
                            ? "mis. Easy Run 5K / Core Finisher"
                            : "e.g. Easy 5K Run / Core Finisher"
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-xs text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white"
                      />
                    </div>
                    </>
                    )}
                  </div>

                  {!(selectedLocked && !isAnytime) && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={extraBusy}
                      className="group py-1.5 text-sm font-semibold text-zinc-950 dark:text-white hover:opacity-75 inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-40 transition cursor-pointer"
                    >
                      {extraBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{isId ? "Simpan Latihan" : "Save Training"}</span>
                    </button>
                  </div>
                  )}
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
