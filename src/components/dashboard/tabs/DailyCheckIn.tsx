"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { InfoPopupModal } from "./shared";
import { CustomTaskSection } from "./CustomTaskSection";
import {
  FillCameraIcon,
  FillChecklistIcon,
  FillDropletIcon,
  FillDumbbellIcon,
  FillFlagIcon,
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
  const totalStages = tasks.length + customTasksList.length;
  const remainingStages = Math.max(0, totalStages - (coreDoneCount + customDoneCount));

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

  interface JourneyMapNode {
    key: string;
    stageNum: string;
    title: string;
    description: string;
    isDone: boolean;
    Icon: ComponentType<FillIconProps>;
    onOpen: () => void;
    disabled: boolean;
  }

  const journeyNodes: JourneyMapNode[] = [
    ...tasks.map((t, index) => {
      const isDone = selectedDone[index];
      return {
        key: `core-${t.title}`,
        stageNum: String(index + 1).padStart(2, "0"),
        title: t.title,
        description: t.description,
        isDone,
        Icon: getCoreFillIcon(index),
        disabled: isSelectedFuture || (selectedLocked && !isSelectedPast && !isDone),
        onOpen: () => openDetail(index),
      };
    }),
    ...customTasksList.map((ct, idx) => {
      const isDone = Boolean(ct.submission);
      return {
        key: `custom-${ct.id}`,
        stageNum: String(tasks.length + idx + 1).padStart(2, "0"),
        title: ct.title,
        description: ct.instructions || "Coach checkpoint",
        isDone,
        Icon: getCustomFillIcon(ct),
        disabled: isSelectedFuture || (selectedLocked && !isDone),
        onOpen: () => setOpenCustomTaskId(ct.id),
      };
    }),
  ];

  const firstIncompleteNodeIdx = !isSelectedFuture
    ? journeyNodes.findIndex((n) => !n.isDone)
    : -1;
  const allCleared = !isSelectedFuture && totalStages > 0 && remainingStages === 0;

  // Winding S-Curve Game Map Geometry
  const SVG_W = 360;
  const TOP_PAD = 68;
  const ROW_STEP = 104;
  const FINISH_STEP = 92;
  const BOTTOM_PAD = 56;

  const mapPoints = journeyNodes.map((node, idx) => {
    const isLeft = idx % 2 === 0;
    const xPct = isLeft ? 24 : 76;
    const xSvg = (xPct / 100) * SVG_W;
    const yPx = TOP_PAD + idx * ROW_STEP;
    return { ...node, idx, isLeft, xPct, xSvg, yPx };
  });

  const lastNodeY =
    mapPoints.length > 0 ? mapPoints[mapPoints.length - 1].yPx : TOP_PAD;
  const finishNode = {
    xPct: 50,
    xSvg: SVG_W / 2,
    yPx: lastNodeY + FINISH_STEP,
  };
  const mapHeight = finishNode.yPx + BOTTOM_PAD;

  const roadSegments = mapPoints.map((pt, idx) => {
    const next = idx < mapPoints.length - 1 ? mapPoints[idx + 1] : finishNode;
    const midY = (pt.yPx + next.yPx) / 2;
    const pathD = `M ${pt.xSvg.toFixed(1)} ${pt.yPx.toFixed(1)} C ${pt.xSvg.toFixed(1)} ${midY.toFixed(1)}, ${next.xSvg.toFixed(1)} ${midY.toFixed(1)}, ${next.xSvg.toFixed(1)} ${next.yPx.toFixed(1)}`;
    return {
      key: `seg-${pt.key}`,
      pathD,
      paved: pt.isDone,
    };
  });

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

      {/* Winding S-Curve Game Map Journey Canvas (Metrics-Matched Monochrome Editorial Surface) */}
      <div
        className="relative w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/50 dark:border-white/5 overflow-hidden select-none"
        style={{ height: `${mapHeight}px` }}
      >
        {/* Subtle Minimalist Topographic Dot-Grid Terrain */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-45 dark:opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(24, 24, 27, 0.16) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* Winding Cubic-Bezier SVG Trail (vectorEffect keeps stroke width crisp on all viewports) */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${SVG_W} ${mapHeight}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {roadSegments.map((seg) => (
            <g key={seg.key}>
              {/* Wide stone path underlay */}
              <path
                d={seg.pathD}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth={14}
                strokeLinecap="round"
                className="stroke-zinc-300/55 dark:stroke-white/[0.08]"
              />
              {/* Paved solid trail (completed) vs dashed route (upcoming) */}
              <path
                d={seg.pathD}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth={seg.paved ? 3.5 : 2.5}
                strokeDasharray={seg.paved ? undefined : "6 6"}
                strokeLinecap="round"
                className={
                  seg.paved
                    ? "stroke-zinc-950 dark:stroke-white transition-all duration-300"
                    : "stroke-zinc-400/80 dark:stroke-white/30"
                }
              />
            </g>
          ))}
        </svg>

        {/* Interactive Waypoint Nodes + Signpost Labels along the Winding Map */}
        {mapPoints.map((pt) => {
          const isNextUp = firstIncompleteNodeIdx === pt.idx;
          const StageIcon = pt.Icon;

          return (
            <div key={pt.key}>
              {/* Tactile Round Map Waypoint Node */}
              <div
                style={{ left: `${pt.xPct}%`, top: `${pt.yPx}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              >
                {/* Floating "NEXT" game quest callout bubble above active stage */}
                {isNextUp && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                    <span className="px-2 py-[2px] rounded-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[9px] font-mono font-bold uppercase tracking-[0.12em] leading-[1.25] whitespace-nowrap shadow-xs">
                      Next
                    </span>
                    <span className="w-1.5 h-1.5 bg-zinc-950 dark:bg-white rotate-45 -mt-[3px]" />
                  </div>
                )}

                <button
                  type="button"
                  disabled={pt.disabled}
                  onClick={pt.onOpen}
                  aria-label={`Stage ${pt.stageNum}: ${pt.title}`}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-default ${
                    pt.isDone
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-[0_4px_0_0_rgba(24,24,27,0.28)] active:translate-y-[2px]"
                      : isNextUp
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 ring-[3px] ring-zinc-950/25 dark:ring-white/30 ring-offset-2 ring-offset-[#ececea] dark:ring-offset-zinc-900 shadow-[0_5px_0_0_rgba(24,24,27,0.3)] active:translate-y-[2px]"
                        : isSelectedFuture
                          ? "bg-zinc-200/85 dark:bg-white/[0.06] border border-zinc-300/80 dark:border-white/10 text-zinc-400 dark:text-zinc-500"
                          : "bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-white/20 text-zinc-800 dark:text-zinc-100 shadow-[0_4px_0_0_rgba(24,24,27,0.1)] hover:border-zinc-400 active:translate-y-[2px]"
                  }`}
                >
                  {isSelectedFuture ? (
                    <FillLockIcon className="w-5 h-5" />
                  ) : (
                    <StageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}

                  {/* Emerald Check Badge pinned to completed node */}
                  {pt.isDone && (
                    <span className="semantic-badge-box absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#1F6E54] border-2 border-[#ececea] dark:border-zinc-900 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              </div>

              {/* Clean Map Signpost Label on the open side of the S-curve (task name only) */}
              <button
                type="button"
                disabled={pt.disabled}
                onClick={pt.onOpen}
                style={
                  pt.isLeft
                    ? {
                        top: `${pt.yPx}px`,
                        left: "calc(24% + 44px)",
                        right: "16px",
                      }
                    : {
                        top: `${pt.yPx}px`,
                        left: "16px",
                        right: "calc(24% + 44px)",
                      }
                }
                className={`absolute -translate-y-1/2 z-10 flex items-center cursor-pointer disabled:cursor-default group transition active:scale-[0.99] ${
                  pt.isLeft ? "justify-start text-left" : "justify-end text-right"
                } ${isSelectedFuture ? "opacity-65" : ""}`}
              >
                <span className="text-sm font-semibold text-zinc-950 dark:text-white leading-normal truncate max-w-full group-hover:opacity-75 transition">
                  {pt.title}
                </span>
              </button>
            </div>
          );
        })}

        {/* Finish Milestone Flag at the End of the Winding Map */}
        <div
          style={{ left: `${finishNode.xPct}%`, top: `${finishNode.yPx}px` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1.5"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
              allCleared
                ? "bg-[#1F6E54] text-white ring-[3px] ring-[#1F6E54]/25 ring-offset-2 ring-offset-[#ececea] dark:ring-offset-zinc-900 shadow-sm"
                : "bg-zinc-300/80 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-white/15"
            }`}
          >
            <FillFlagIcon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 leading-normal whitespace-nowrap">
            {allCleared
              ? `Day ${selectedDay.dayNumber} Clear`
              : `Day ${selectedDay.dayNumber} Goal`}
          </span>
        </div>
      </div>

      {/* Custom Coach Task Modal Host (opened directly when tapping custom nodes on the map) */}
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
