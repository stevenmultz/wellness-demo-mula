"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";
import { InfoPopupModal } from "../shared";
import {
  FillTargetIcon,
  FillUsersIcon,
  FillUtensilsIcon,
  type FillIconProps,
} from "../sharedFillIcons";
import {
  GuideAccordionModal,
  type GuideCoachItem,
  type GuidePageKey,
} from "./GuideAccordionModal";
import type { PlanDay, PlanProgramInfo } from "./myPlanUtils";

const CONDUCT_RULES = [
  {
    title: "Daily Cadence & 23:59 WIB Cutoff",
    desc: "Curriculum tasks unlock at 00:00 WIB and must be logged before 23:59 WIB. Daily consistency anchors neural adaptation. Missed tasks can be marked as skipped without penalizing your habit profile.",
  },
  {
    title: "Medical Safety & Intuitive Pacing",
    desc: "Listen to biofeedback. Movement drills should never cause sharp pain. Stop immediately and contact your physician if feeling faint or discomfort.",
  },
  {
    title: "Cohort Privacy & Respectful Space",
    desc: "Everything shared within the cohort (photos, journals, questions) is strictly confidential. Mutual respect and encouragement are mandatory.",
  },
  {
    title: "Data Integrity & Truthful Logging",
    desc: "Log sleep hours, training reps, and meals accurately. Authentic tracking empowers personalized AI adjustments and honest self-discovery.",
  },
  {
    title: "Rest Days & Nervous System Restoration",
    desc: "Rest days are as vital as training days. Respect recovery protocols to allow neuromuscular integration and avoid chronic sympathetic overload.",
  },
];

const DEFAULT_BENEFITS = [
  "Sustained all-day physical energy and enhanced mental focus without mid-day crashes.",
  "Noticeable improvement in deep sleep duration and nighttime recovery scores.",
  "Enhanced joint mobility, core stability, and functional movement mechanics.",
  "Sustainable whole-food nutrition habits and reduced systemic metabolic strain.",
];

export function ProgramPreparationWidgets({
  program,
  days,
  currentDayId,
  onSwitchWidget: _onSwitchWidget,
}: {
  program: PlanProgramInfo;
  days: PlanDay[];
  currentDayId?: string;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}) {
  void _onSwitchWidget;
  const [activePage, setActivePage] = useState<GuidePageKey | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const [showGuidesInfo, setShowGuidesInfo] = useState(false);
  const [prepHeaderVisible, setPrepHeaderVisible] = useState(true);
  const [prepOverBanner, setPrepOverBanner] = useState(true);
  const prepScrollYRef = useRef(0);

  const handlePrepScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    setPrepOverBanner(currentScrollY < 260);
    if (currentScrollY > prepScrollYRef.current && currentScrollY > 40) {
      setPrepHeaderVisible(false);
    } else {
      setPrepHeaderVisible(true);
    }
    prepScrollYRef.current = currentScrollY;
  };

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.dayNumber - b.dayNumber),
    [days]
  );
  const currentDay = useMemo(
    () => sortedDays.find((d) => d.id === currentDayId),
    [sortedDays, currentDayId]
  );
  const totalDaysCount = sortedDays.length || program.totalDays || 0;

  useEffect(() => {
    if (!activePage) return;
    setPrepOverBanner(true);
    setPrepHeaderVisible(true);
    prepScrollYRef.current = 0;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [activePage]);

  const meetupDays = useMemo(
    () =>
      sortedDays.filter(
        (d) =>
          d.dayType === "CONNECT_DAY" ||
          d.dayType === "MEETUP_DAY" ||
          d.dayType === "CONNECTION_DAY" ||
          !!(d.meetupLink && d.meetupLink.trim()) ||
          !!(d.onsiteVenue && d.onsiteVenue.trim()) ||
          !!(d.onsiteSchedule && d.onsiteSchedule.trim()) ||
          !!(d.eventTitle && d.eventTitle.trim())
      ),
    [sortedDays]
  );

  const isPastDay = useCallback(
    (d: PlanDay) => {
      const isToday = d.id === currentDayId;
      return (
        !isToday &&
        (d.isPast2359 || (currentDay ? d.dayNumber < currentDay.dayNumber : false))
      );
    },
    [currentDayId, currentDay]
  );

  const mealDays = sortedDays;
  const pastMealDays = useMemo(() => mealDays.filter(isPastDay), [mealDays, isPastDay]);
  const upcomingMealDays = useMemo(
    () => mealDays.filter((d) => !isPastDay(d)),
    [mealDays, isPastDay]
  );
  const pastMeetupDays = useMemo(
    () => meetupDays.filter(isPastDay),
    [meetupDays, isPastDay]
  );
  const upcomingMeetupDays = useMemo(
    () => meetupDays.filter((d) => !isPastDay(d)),
    [meetupDays, isPastDay]
  );

  const equipmentItems = useMemo(() => {
    const rawEquipment = program.equipment || "Movement Mat";
    return rawEquipment
      .split(/\n|,|•|·|;/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }, [program.equipment]);

  const validReferences = useMemo(
    () =>
      (program.scientificReferences || []).filter(
        (r) => r && r.title && r.title.trim().length > 0
      ),
    [program.scientificReferences]
  );

  const benefitsList =
    program.expectedBenefits && program.expectedBenefits.length > 0
      ? program.expectedBenefits
      : DEFAULT_BENEFITS;

  const coachesList: GuideCoachItem[] = [
    {
      id: "lead",
      photo: "/coach.webp",
      alt: program.coachName || "Lead Coach",
      name: program.coachName || "Coach Julian Thorne",
      role: "Lead Guide",
      title: program.coachTitle || "Master Longevity & Movement Specialist",
      bio: "Specializes in biomechanics, mobility progression, and neuromuscular longevity conditioning. Designed the daily training curriculum for this cohort.",
    },
    {
      id: "nutrition",
      photo: "/coach2.webp",
      alt: "Nutrition Specialist",
      name: "Dr. Marcus Vance, ND",
      role: "Nutrition",
      title: "Integrative Nutritionist & Metabolic Health Researcher",
      bio: "Oversees dietary recommendations, circadian fasting windows, and cellular anti-inflammatory nutrition protocols for optimal recovery.",
    },
    {
      id: "recovery",
      photo: "/coach3.webp",
      alt: "Sleep & Recovery Guide",
      name: "Elena Rostova, MSc",
      role: "Recovery",
      title: "Circadian Somatics & Autonomic Nervous System Coach",
      bio: "Guides breathwork sessions, parasympathetic wind-down routines, and daily sleep hygiene protocols.",
    },
  ];

  const isOnlineProgram = (program.locationType || "ONLINE").toUpperCase() === "ONLINE";

  const guideCards: Array<{
    key: GuidePageKey;
    icon: ComponentType<FillIconProps>;
    badge: string;
    title: string;
    subtitle: string;
  }> = [
    {
      key: "meal",
      icon: FillUtensilsIcon,
      badge: `${totalDaysCount} days`,
      title: "Nutrition",
      subtitle: "Daily meals & hydration",
    },
    ...(!isOnlineProgram
      ? [
          {
            key: "meetup" as GuidePageKey,
            icon: FillUsersIcon,
            badge: `${meetupDays.length} ${meetupDays.length === 1 ? "session" : "sessions"}`,
            title: "Sessions",
            subtitle: "Live clinics & meetups",
          },
        ]
      : []),
    {
      key: "overview",
      icon: FillTargetIcon,
      badge: `${program.durationDays || totalDaysCount} days`,
      title: "Overview",
      subtitle: "Blueprint, rules & coaches",
    },
  ];

  return (
    <>
      <section className="w-full space-y-4">
        <InfoPopupModal
          open={showGuidesInfo}
          title="Guides"
          subtitle="Nutrition, sessions, and program overview"
          onClose={() => setShowGuidesInfo(false)}
        >
          <p className="font-semibold text-zinc-950 dark:text-white">
            What Guides Cover:
          </p>
          <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
            <li>
              <strong className="text-zinc-900 dark:text-white">Nutrition:</strong> Daily
              meal recommendations, hydration targets, and dietary principles.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Sessions:</strong>{" "}
              Scheduled live coaching sessions and community meetups.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Overview:</strong> Program
              methodology, rules of conduct, coaching faculty, required gear, and references.
            </li>
          </ul>
        </InfoPopupModal>

        {/* 2-Column Editorial Hardcover Book Grid */}
        <ol className="w-full grid grid-cols-2 gap-3.5 sm:gap-4">
          {guideCards.map((card, idx) => {
            const Icon = card.icon;
            const volNum = String(idx + 1).padStart(2, "0");

            return (
              <li key={card.key} className="w-full">
                <button
                  type="button"
                  onClick={() => setActivePage(card.key)}
                  aria-label={`Open ${card.title} guide`}
                  className="group relative w-full aspect-[3/4] text-left rounded-r-2xl rounded-l-[5px] bg-[#ececea] dark:bg-white/[0.05] border border-zinc-300/75 dark:border-white/10 shadow-[4px_5px_0_0_rgba(24,24,27,0.10)] dark:shadow-[4px_5px_0_0_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:bg-[#e7e7e4] dark:hover:bg-white/[0.07] active:translate-y-0 transition-all duration-200 overflow-hidden cursor-pointer flex"
                >
                  {/* Hardcover Book Spine (Left Edge) */}
                  <div
                    aria-hidden="true"
                    className="w-3 sm:w-3.5 shrink-0 h-full bg-zinc-950/[0.08] dark:bg-white/[0.08] border-r border-zinc-950/10 dark:border-white/10 relative"
                  >
                    <span className="absolute inset-y-0 right-0 w-px bg-white/60 dark:bg-white/10" />
                  </div>

                  {/* Book Cover Front Face */}
                  <div className="flex-1 min-w-0 p-3.5 sm:p-4 flex flex-col justify-between">
                    {/* Top Row: Solid Fill Icon + Volume Number */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-2xs">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500 leading-normal">
                        {volNum}
                      </span>
                    </div>

                    {/* Center-Bottom Editorial Title & Subtitle */}
                    <div className="space-y-2.5 pt-2">
                      <div className="space-y-1">
                        <p className="text-base sm:text-lg font-geometric font-medium tracking-tight text-zinc-950 dark:text-white leading-snug">
                          {card.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                          {card.subtitle}
                        </p>
                      </div>

                      {/* Footer Rule + Edition Meta */}
                      <div className="pt-2.5 border-t border-zinc-300/70 dark:border-white/10 flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400 truncate leading-normal">
                          {card.badge}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <GuideAccordionModal
        activePage={activePage}
        onClose={() => setActivePage(null)}
        onScroll={handlePrepScroll}
        prepHeaderVisible={prepHeaderVisible}
        prepOverBanner={prepOverBanner}
        program={program}
        mealDays={mealDays}
        pastMealDays={pastMealDays}
        upcomingMealDays={upcomingMealDays}
        meetupDays={meetupDays}
        pastMeetupDays={pastMeetupDays}
        upcomingMeetupDays={upcomingMeetupDays}
        equipmentItems={equipmentItems}
        validReferences={validReferences}
        benefitsList={benefitsList}
        conductRules={CONDUCT_RULES}
        coachesList={coachesList}
        openSections={openSections}
        toggleSection={toggleSection}
      />
    </>
  );
}
