"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  MapPin,
  Video,
} from "lucide-react";
import { HeaderBackButton, safeHttpUrl } from "../shared";
import { ProgramIntroVideoPlayer } from "../ProgramIntroVideoPlayer";
import {
  formatIntensityBadge,
  formatMealNoteSummary,
  formatShortDayDate,
  splitActivities,
  type PlanDay,
  type PlanProgramInfo,
} from "./myPlanUtils";

export type GuidePageKey = "meal" | "meetup" | "overview" | "rules" | "coach";

export interface GuideCoachItem {
  id: string;
  photo: string;
  alt: string;
  name: string;
  role: string;
  title: string;
  bio: string;
}

function GuideAccordion({
  title,
  count,
  open,
  onToggle,
  leading,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  leading?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full py-3.5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition"
      >
        <span className="flex items-center gap-2.5 min-w-0 font-medium text-left">
          {leading}
          <span className="truncate">
            {title}
            {typeof count === "number" ? ` (${count})` : ""}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 shrink-0 text-zinc-400">
          <span>{open ? "Hide" : "Show"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

const COMPLIANCE_LABELS: Record<string, string> = {
  FULL: "Followed",
  YES: "Followed",
  PARTIAL: "Partial",
  SIMILAR: "Similar",
  OFF_TRACK: "Off Track",
  SKIPPED: "Skipped",
};

function renderMealRows(list: PlanDay[], dimmed: boolean) {
  return (
    <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
      {list.map((d) => {
        const rawLines = splitActivities(d.mealRecommendation).map((l) =>
          l.replace(/^meal\s*\d+\s*:\s*/i, "").trim()
        );
        const complianceLabel = d.userProgress?.mealCompliance
          ? COMPLIANCE_LABELS[d.userProgress.mealCompliance] ?? null
          : null;
        const mealNotes = formatMealNoteSummary(d.userProgress?.mealNotes);
        const cleanTitle = d.title ? d.title.replace(/^day\s*\d+\s*:\s*/i, "").trim() : "";

        return (
          <div key={d.id} className={`py-5 space-y-2.5 ${dimmed ? "opacity-80" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <h3 className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white">
                  {cleanTitle ? `Day ${d.dayNumber} · ${cleanTitle}` : `Day ${d.dayNumber}`}
                </h3>
                <span className="text-[11px] text-zinc-400 block">
                  {formatShortDayDate(d.unlockDate, d.dayNumber)}
                </span>
              </div>
              {complianceLabel && (
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                  {complianceLabel}
                </span>
              )}
            </div>

            {rawLines.length > 0 ? (
              <ul className="space-y-2 pt-0.5">
                {rawLines.map((line, idx) => (
                  <li
                    key={idx}
                    className="text-xs sm:text-sm flex items-start gap-2.5 leading-relaxed text-zinc-600 dark:text-zinc-300"
                  >
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-1 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Balanced whole-food nutrition and circadian recovery hydration.
              </p>
            )}

            {mealNotes && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
                {mealNotes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderMeetupRows(list: PlanDay[], isPast: boolean, program: PlanProgramInfo) {
  return (
    <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
      {list.map((d) => {
        const meetUrl = safeHttpUrl(d.meetupLink);
        const mapUrl = safeHttpUrl(d.mapLink);
        const hostName = d.eventHost || d.coachName || program.coachName;
        const rawSessionTitle = d.eventTitle || d.title || "Live Coaching Session";
        const cleanSessionTitle = rawSessionTitle.replace(/^day\s*\d+\s*:\s*/i, "").trim();

        return (
          <div key={d.id} className={`py-5 space-y-2.5 ${isPast ? "opacity-80" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-geometric font-medium leading-snug text-zinc-950 dark:text-white">
                  {`Day ${d.dayNumber} · ${cleanSessionTitle}`}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {formatShortDayDate(d.unlockDate, d.dayNumber)}
                  {hostName ? ` · Hosted by ${hostName}` : ""}
                </p>
              </div>
              {d.onsiteSchedule && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1 shrink-0 pt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{d.onsiteSchedule}</span>
                </span>
              )}
            </div>

            {d.eventDetails && (
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line text-zinc-600 dark:text-zinc-300">
                {d.eventDetails}
              </p>
            )}

            {(d.onsiteVenue || program.venueAddress) && (
              <div className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{d.onsiteVenue || program.venueAddress}</span>
              </div>
            )}

            {(meetUrl || mapUrl) && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {meetUrl && (
                  <a
                    href={meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`h-8 px-4 rounded-full text-xs font-medium inline-flex items-center gap-1.5 active:scale-95 transition ${
                      isPast
                        ? "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                        : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{isPast ? "Session Archive" : "Join Live Meeting"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-4 rounded-full border border-zinc-200 dark:border-white/20 text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 active:scale-95 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Directions</span>
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface GuideAccordionModalProps {
  activePage: GuidePageKey | null;
  onClose: () => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  prepHeaderVisible: boolean;
  prepOverBanner: boolean;
  program: PlanProgramInfo;
  mealDays: PlanDay[];
  pastMealDays: PlanDay[];
  upcomingMealDays: PlanDay[];
  meetupDays: PlanDay[];
  pastMeetupDays: PlanDay[];
  upcomingMeetupDays: PlanDay[];
  equipmentItems: string[];
  validReferences: Array<{ title: string; url?: string }>;
  benefitsList: string[];
  conductRules: Array<{ title: string; desc: string }>;
  coachesList: GuideCoachItem[];
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
}

const BANNER_META: Record<GuidePageKey, { img: string; title: string }> = {
  meal: { img: "/pic.webp", title: "Meal Guide" },
  meetup: { img: "/coach.webp", title: "Meetups & Live" },
  overview: { img: "/coach3.webp", title: "Overview" },
  rules: { img: "/coach2.webp", title: "Rules & Guidelines" },
  coach: { img: "/coach.webp", title: "Coaches" },
};

export function GuideAccordionModal({
  activePage,
  onClose,
  onScroll,
  prepHeaderVisible,
  prepOverBanner,
  program,
  mealDays,
  pastMealDays,
  upcomingMealDays,
  meetupDays,
  pastMeetupDays,
  upcomingMeetupDays,
  equipmentItems,
  validReferences,
  benefitsList,
  conductRules,
  coachesList,
  openSections,
  toggleSection,
}: GuideAccordionModalProps) {
  if (!activePage || typeof document === "undefined") return null;

  const meta = BANNER_META[activePage];
  const subtitle =
    activePage === "meal"
      ? `${mealDays.length} cohort days of nutrition & hydration guidance.`
      : activePage === "meetup"
        ? `${meetupDays.length} scheduled live coaching & cohort sessions.`
        : activePage === "overview"
          ? "Commitment, methodology, gear, and clinical references."
          : activePage === "rules"
            ? "Daily cadence, medical safety, and cohort conduct."
            : `${coachesList.length} specialists guiding this program.`;

  return createPortal(
    <div
      onScroll={onScroll}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[80] bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto"
    >
      <header
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className={`fixed top-0 left-0 right-0 z-[90] w-full pointer-events-none transition-all duration-300 ${
          prepHeaderVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
          <HeaderBackButton
            onClick={onClose}
            overlay={prepOverBanner}
            className="pointer-events-auto"
          />
        </div>
      </header>

      <div className="relative h-[340px] sm:h-[400px] w-full overflow-hidden bg-zinc-950 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={meta.img} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />

        <div className="absolute inset-x-0 bottom-14 sm:bottom-16 z-0">
          <div className="max-w-2xl mx-auto w-full px-6 sm:px-10 space-y-1.5">
            <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-white leading-tight drop-shadow-md">
              {meta.title}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-lg">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="relative -mt-8 sm:-mt-10 z-10 rounded-t-[32px] sm:rounded-t-[36px] border-t border-x border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] shadow-2xl pt-8 sm:pt-10 px-6 sm:px-10 pb-32 max-w-2xl mx-auto w-full flex-1">
        {activePage === "meal" && (
          <div className="space-y-4">
            {pastMealDays.length > 0 && (
              <GuideAccordion
                title="Past Days"
                count={pastMealDays.length}
                open={!!openSections["meal-past"]}
                onToggle={() => toggleSection("meal-past")}
              >
                {renderMealRows(pastMealDays, true)}
              </GuideAccordion>
            )}

            {upcomingMealDays.length > 0 ? (
              <GuideAccordion
                title="Upcoming Days"
                count={upcomingMealDays.length}
                open={!!openSections["meal-upcoming"]}
                onToggle={() => toggleSection("meal-upcoming")}
              >
                {renderMealRows(upcomingMealDays, false)}
              </GuideAccordion>
            ) : (
              <div className="py-10 border-y border-zinc-200/80 dark:border-white/10 text-center text-xs text-zinc-500 dark:text-zinc-400">
                All scheduled meal days have passed.
              </div>
            )}
          </div>
        )}

        {activePage === "meetup" && (
          <div className="space-y-4">
            {meetupDays.length > 0 ? (
              <>
                {pastMeetupDays.length > 0 && (
                  <GuideAccordion
                    title="Past Meetups"
                    count={pastMeetupDays.length}
                    open={!!openSections["meetup-past"]}
                    onToggle={() => toggleSection("meetup-past")}
                  >
                    {renderMeetupRows(pastMeetupDays, true, program)}
                  </GuideAccordion>
                )}

                {upcomingMeetupDays.length > 0 && (
                  <GuideAccordion
                    title="Upcoming Meetups"
                    count={upcomingMeetupDays.length}
                    open={!!openSections["meetup-upcoming"]}
                    onToggle={() => toggleSection("meetup-upcoming")}
                  >
                    {renderMeetupRows(upcomingMeetupDays, false, program)}
                  </GuideAccordion>
                )}
              </>
            ) : (
              <div className="py-12 border-y border-zinc-200/80 dark:border-white/10 text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                No live sessions scheduled for this program.
              </div>
            )}
          </div>
        )}

        {activePage === "overview" && (
          <div className="space-y-4">
            {program.introVideoUrl && (
              <ProgramIntroVideoPlayer
                videoUrl={program.introVideoUrl}
                fallbackImage={program.coverImage}
                coachName={program.coachName}
                programTitle={program.title}
              />
            )}

            <GuideAccordion
              title="Logistics & Commitment"
              open={!!openSections["ov-logistics"]}
              onToggle={() => toggleSection("ov-logistics")}
            >
              <dl className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10 text-xs sm:text-sm">
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                    Daily Commitment
                  </dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {program.dailyCommitment || "20–30 mins/day"}
                  </dd>
                </div>
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                    Intensity Level
                  </dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {formatIntensityBadge(program.difficultyLevel)}
                  </dd>
                </div>
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                    Delivery &amp; Location
                  </dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {program.locationType === "HYBRID"
                      ? `Hybrid${program.city ? ` · ${program.city}` : ""}`
                      : "Online · Anytime Access"}
                  </dd>
                </div>
              </dl>
            </GuideAccordion>

            <GuideAccordion
              title="Methodology & Target State"
              open={!!openSections["ov-methodology"]}
              onToggle={() => toggleSection("ov-methodology")}
            >
              <div className="space-y-4 py-4 border-b border-zinc-200/80 dark:border-white/10">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                    Core Focus
                  </span>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {program.methodology ||
                      program.description ||
                      "Evidence-based somatic training combined with structured recovery routines and circadian alignment."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                    Target Physical &amp; Mental State
                  </span>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {program.targetState ||
                      "Optimal physical vitality, enhanced postural stability, regulated nervous system tone, and restored metabolic recovery."}
                  </p>
                </div>
              </div>
            </GuideAccordion>

            <GuideAccordion
              title="Expected Benefits"
              count={benefitsList.length}
              open={!!openSections["ov-benefits"]}
              onToggle={() => toggleSection("ov-benefits")}
            >
              <ul className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                {benefitsList.map((benefit, i) => (
                  <li
                    key={i}
                    className="py-3.5 flex items-start gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed"
                  >
                    <Check className="w-4 h-4 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </GuideAccordion>

            <GuideAccordion
              title="Required Gear"
              count={equipmentItems.length}
              open={!!openSections["ov-gear"]}
              onToggle={() => toggleSection("ov-gear")}
            >
              <ul className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                {equipmentItems.map((item, idx) => (
                  <li key={idx} className="py-3.5 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-zinc-950 dark:text-white shrink-0" />
                    <span className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </GuideAccordion>

            <GuideAccordion
              title="Scientific References"
              count={validReferences.length}
              open={!!openSections["ov-refs"]}
              onToggle={() => toggleSection("ov-refs")}
            >
              {validReferences.length > 0 ? (
                <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                  {validReferences.map((ref, idx) => {
                    const url = safeHttpUrl(ref.url);
                    return (
                      <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                            Source {String(idx + 1).padStart(2, "0")}
                          </span>
                          <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                            {ref.title}
                          </p>
                        </div>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-medium text-zinc-950 dark:text-white inline-flex items-center gap-1 hover:underline underline-offset-4 pt-1"
                          >
                            <span>Study</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-5 border-b border-zinc-200/80 dark:border-white/10 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  No clinical references cited for this program.
                </p>
              )}
            </GuideAccordion>

            {/* Practical Guidelines in Overview */}
            {program.programGuidelines && program.programGuidelines.length > 0 && (
              <GuideAccordion
                title="Practical Guidelines"
                count={program.programGuidelines.length}
                open={!!openSections["ov-guidelines"]}
                onToggle={() => toggleSection("ov-guidelines")}
              >
                <ul className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                  {program.programGuidelines.map((g, i) => (
                    <li
                      key={i}
                      className="py-3.5 flex items-start gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed"
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-1 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </GuideAccordion>
            )}

            {/* Rules & Conduct in Overview */}
            <GuideAccordion
              title="Code of Conduct & Rules"
              count={conductRules.length}
              open={!!openSections["ov-conduct"]}
              onToggle={() => toggleSection("ov-conduct")}
            >
              <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                {conductRules.map((rule, idx) => (
                  <div key={idx} className="py-3.5 space-y-1">
                    <p className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white">
                      {rule.title}
                    </p>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {rule.desc}
                    </p>
                  </div>
                ))}
              </div>
            </GuideAccordion>

            {/* Faculty & Coaches in Overview */}
            <GuideAccordion
              title="Faculty & Coaches"
              count={coachesList.length}
              open={!!openSections["ov-coaches"]}
              onToggle={() => toggleSection("ov-coaches")}
            >
              <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                {coachesList.map((coach) => (
                  <div key={coach.id} className="py-3.5 flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coach.photo}
                      alt={coach.alt}
                      className="w-10 h-10 rounded-xl object-cover object-top shrink-0 bg-zinc-200 dark:bg-zinc-800"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white">
                          {coach.name}
                        </p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                          {coach.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {coach.title}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                        {coach.bio}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GuideAccordion>
          </div>
        )}

        {activePage === "rules" && (
          <div className="space-y-4">
            {program.programGuidelines && program.programGuidelines.length > 0 && (
              <GuideAccordion
                title="Practical Guidelines"
                count={program.programGuidelines.length}
                open={!!openSections["rules-practical"]}
                onToggle={() => toggleSection("rules-practical")}
              >
                <ul className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                  {program.programGuidelines.map((g, i) => (
                    <li
                      key={i}
                      className="py-3.5 flex items-start gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed"
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-1 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </GuideAccordion>
            )}

            <GuideAccordion
              title="Code of Conduct"
              count={conductRules.length}
              open={!!openSections["rules-conduct"]}
              onToggle={() => toggleSection("rules-conduct")}
            >
              <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                {conductRules.map((rule, idx) => (
                  <div key={idx} className="py-4 space-y-1.5">
                    <span className="text-[10px] font-mono tracking-[0.04em] text-zinc-400 dark:text-zinc-500 block">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-geometric font-medium text-zinc-950 dark:text-white text-sm sm:text-base">
                      {rule.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {rule.desc}
                    </p>
                  </div>
                ))}
              </div>
            </GuideAccordion>
          </div>
        )}

        {activePage === "coach" && (
          <div className="space-y-4">
            {coachesList.map((coach) => (
              <GuideAccordion
                key={coach.id}
                title={`${coach.name} · ${coach.role}`}
                open={!!openSections[`coach-${coach.id}`]}
                onToggle={() => toggleSection(`coach-${coach.id}`)}
                leading={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coach.photo}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover object-top shrink-0 bg-zinc-200 dark:bg-zinc-800"
                  />
                }
              >
                <article className="pt-2 pb-4 border-b border-zinc-200/80 dark:border-white/10 space-y-3.5">
                  <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full rounded-3xl overflow-hidden bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coach.photo}
                      alt={coach.alt}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 space-y-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-medium tracking-[0.03em] text-white">
                        {coach.role}
                      </span>
                      <h3 className="text-lg sm:text-xl font-geometric font-medium text-white leading-snug pt-0.5">
                        {coach.name}
                      </h3>
                      <p className="text-xs text-white/75 leading-snug">{coach.title}</p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed px-1">
                    {coach.bio}
                  </p>
                </article>
              </GuideAccordion>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
