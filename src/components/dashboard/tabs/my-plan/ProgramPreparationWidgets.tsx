"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Info,
  Target,
  Users,
  Utensils,
} from "lucide-react";
import { InfoPopupModal } from "../shared";
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
    img: string;
    icon: typeof Utensils;
    badge: string;
    title: string;
    subtitle: string;
  }> = [
    {
      key: "meal",
      img: "/pic.webp",
      icon: Utensils,
      badge: `${totalDaysCount} days`,
      title: "Meal Guide",
      subtitle: "Daily nutrition",
    },
    ...(!isOnlineProgram
      ? [
          {
            key: "meetup" as GuidePageKey,
            img: "/coach.webp",
            icon: Users,
            badge: `${meetupDays.length} ${meetupDays.length === 1 ? "session" : "sessions"}`,
            title: "Meetups & Live",
            subtitle: "Zoom & calls",
          },
        ]
      : []),
    {
      key: "overview",
      img: "/coach3.webp",
      icon: Target,
      badge: `${program.durationDays || totalDaysCount} days focus`,
      title: "Overview",
      subtitle: "Blueprint, gear & studies",
    },
    {
      key: "rules",
      img: "/coach2.webp",
      icon: BookOpen,
      badge: "Code & policy",
      title: "Rules",
      subtitle: "Guidelines & conduct",
    },
    {
      key: "coach",
      img: "/coach.webp",
      icon: Users,
      badge: "Guide team",
      title: "Coaches",
      subtitle: "Faculty & mentors",
    },
  ];

  return (
    <>
      <section className="w-full space-y-4">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Program Guides
            </h2>
            <button
              type="button"
              onClick={() => setShowGuidesInfo(true)}
              aria-label="Program guides overview"
              className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/10 transition"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <InfoPopupModal
          open={showGuidesInfo}
          title="Program Guides"
          subtitle="Meals, sessions, overview, rules & coaches"
          onClose={() => setShowGuidesInfo(false)}
        >
          <p className="font-semibold text-zinc-950 dark:text-white">
            What Program Guides Cover:
          </p>
          <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
            <li>
              <strong className="text-zinc-900 dark:text-white">Meal Guide:</strong> Daily
              nutrition principles, hydration targets, and dietary guidance for each program day.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Meetups &amp; Live:</strong>{" "}
              Scheduled Zoom clinics, live coaching sessions, and community meetups.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Overview:</strong> Program
              logistics, methodology, outcomes, required gear, and scientific references.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Rules:</strong> Practical
              guidelines, daily logging cutoffs, and cohort safety standards.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Coaches:</strong> Dedicated
              faculty and clinical specialists guiding this cohort.
            </li>
          </ul>
        </InfoPopupModal>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {guideCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setActivePage(card.key)}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 text-left flex flex-col justify-between min-h-[110px] transition active:scale-[0.99] hover:border-zinc-300 dark:hover:border-white/20 shadow-sm"
              >
                <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.img}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-[#141414] to-transparent" />
                </div>

                <div className="relative z-10 flex items-center justify-between w-full">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                    {card.badge}
                  </span>
                </div>

                <div className="relative z-10 pt-3 flex items-end justify-between w-full">
                  <div>
                    <p className="text-xs font-semibold text-zinc-950 dark:text-white">
                      {card.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {card.subtitle}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
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
