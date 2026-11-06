"use client";

import { ArrowLeft, ChevronDown, MapPin, Video } from "lucide-react";
import { resolvePublicBadge } from "@/wellness/utils/timeline";
import { formatDateWib, formatIdr, safeHttpUrl } from "./shared";

export interface DetailDay {
  dayNumber: number;
  title: string;
  dayType: string;
  onsiteVenue: string | null;
  onsiteSchedule: string | null;
  meetupLink: string | null;
  eventTitle?: string | null;
  videoUrl: string | null;
  mealRecommendation: string | null;
}

export interface DetailProgram {
  id: string;
  title: string;
  description: string;
  coverImage?: string | null;
  recommendedFor?: string;
  coachName: string;
  coachTitle?: string | null;
  category?: string;
  difficultyLevel?: string;
  dailyCommitment?: string | null;
  durationDays?: number;
  price: number;
  maxQuota: number;
  enrolledCount: number;
  locationType?: string;
  city?: string | null;
  venueAddress?: string | null;
  communityLink: string | null;
  startDate: Date | string;
  endDate: Date | string;
  registrationOpenDate?: Date | string | null;
  registrationDeadline: Date | string;
  status?: string;
  dayCount: number;
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[];
  programGuidelines?: string[];
  days: DetailDay[];
}

function intensityLabel(level?: string) {
  const value = (level || "").toUpperCase();
  if (value.includes("HIGH")) return "Very High";
  if (value === "ADVANCED" || value === "INTERMEDIATE") return "High";
  if (value === "MODERATE") return "Moderate";
  if (value === "BEGINNER") return "Low";
  return level || "All levels";
}

function formatLabel(type?: string) {
  if (type === "HYBRID") return "Hybrid";
  if (type === "ONSITE") return "Onsite";
  return "Online";
}

function dayLabel(type: string) {
  if (type === "REST_DAY") return "Rest";
  if (type === "TRAINING_DAY") return "Training";
  return "Connect";
}

export function ProgramDetailView({
  program,
  enrollmentStatus,
  onClose,
  onOpenPlan: _onOpenPlan,
  onEnroll,
}: {
  program: DetailProgram;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
  onClose: () => void;
  onOpenPlan: () => void;
  onEnroll: () => void;
}) {
  void _onOpenPlan;
  const badge =
    resolvePublicBadge({
      status: program.status,
      registrationOpenDate: program.registrationOpenDate,
      registrationDeadline: program.registrationDeadline,
      startDate: program.startDate,
      endDate: program.endDate,
      maxQuota: program.maxQuota,
      enrolledCount: program.enrolledCount,
    }) || "Open Registration";

  const training = program.days.filter((d) => d.dayType === "TRAINING_DAY").length;
  const meals = program.days.some((d) => d.mealRecommendation);
  const sessions = program.days.filter((d) => d.dayType !== "TRAINING_DAY" && d.dayType !== "REST_DAY");
  const hasVideo = program.days.some((d) => d.videoUrl);
  const community = safeHttpUrl(program.communityLink);
  const enrolled = enrollmentStatus === "ACTIVE";
  const onsite = program.locationType !== "ONLINE";
  const activities = [
    training ? `${training} training days` : null,
    meals ? "Meal recommendations" : null,
    sessions.length ? `${sessions.length} coaching sessions` : null,
    community ? "Community access" : null,
    hasVideo ? "Learning videos" : null,
  ].filter(Boolean) as string[];

  let action: React.ReactNode = null;
  if (enrollmentStatus === "PENDING" || (!enrolled && badge === "Open Registration")) {
    action = (
      <button type="button" onClick={onEnroll} className="px-6 py-3 rounded-full bg-white text-zinc-950 text-sm font-semibold">
        {enrollmentStatus === "PENDING" ? "Complete Payment" : program.price > 0 ? "Enroll Now" : "Join Program"}
      </button>
    );
  } else if (badge === "Coming Soon") {
    action = (
      <a
        href={`https://wa.me/6281290002026?text=${encodeURIComponent(`Halo Concierge, saya ingin bergabung ke waitlist untuk program: ${program.title}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 rounded-full bg-white text-zinc-950 text-sm font-semibold"
      >
        Join Waitlist
      </a>
    );
  } else {
    action = <span className="text-sm text-white/70">Registration closed</span>;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-50 dark:bg-[#070709] overflow-y-auto">
      <div className={`max-w-3xl mx-auto ${enrolled ? "pb-10" : "pb-28"}`}>
        <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-zinc-800">
          {program.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-black/45" />
          <button type="button" onClick={onClose} className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 text-white space-y-3">
            <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider font-semibold">
              {program.category && <span className="px-2 py-1 rounded-full bg-white/15">{program.category}</span>}
              <span className="px-2 py-1 rounded-full bg-white/15">{formatLabel(program.locationType)}</span>
              <span className="px-2 py-1 rounded-full bg-white/15">{intensityLabel(program.difficultyLevel)}</span>
              <span className="px-2 py-1 rounded-full bg-white/15">{program.durationDays || program.dayCount} days</span>
              {!enrolled && <span className="px-2 py-1 rounded-full bg-white/15">{program.price > 0 ? formatIdr(program.price) : "Free"}</span>}
            </div>
            <h1 className="text-2xl font-medium tracking-tight">{program.title}</h1>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-6 space-y-4">
          <dl className="rounded-2xl border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/10 text-sm">
            {[
              ["Duration", `${program.durationDays || program.dayCount} days`],
              ["Schedule", `${formatDateWib(program.startDate)} – ${formatDateWib(program.endDate)}`],
              ["Format", formatLabel(program.locationType)],
              ["Intensity", intensityLabel(program.difficultyLevel)],
              ["Coach", program.coachTitle ? `${program.coachName} · ${program.coachTitle}` : program.coachName],
              enrolled ? null : ["Price", program.price > 0 ? formatIdr(program.price) : "Free"],
              onsite ? ["Location", program.city || program.venueAddress || "Onsite"] : null,
            ]
              .filter(Boolean)
              .map((row) => {
                const [label, value] = row as [string, string];
                return (
                  <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
                    <dt className="text-zinc-500 shrink-0">{label}</dt>
                    <dd className="font-medium text-right">{value}</dd>
                  </div>
                );
              })}
          </dl>

          <div className="space-y-2">
            {[
              activities.length > 0 ? ["Included", activities.join("\n")] : null,
              program.description ? ["Overview", program.description] : null,
              program.methodology ? ["Objectives", program.methodology] : null,
              program.targetState ? ["Expected outcome", program.targetState] : null,
              program.expectedBenefits && program.expectedBenefits.length > 0
                ? ["Benefits", program.expectedBenefits.join("\n")]
                : null,
              program.programGuidelines && program.programGuidelines.length > 0
                ? ["Guidelines", program.programGuidelines.join("\n")]
                : null,
            ]
              .filter(Boolean)
              .map((row) => {
                const [label, value] = row as [string, string];
                return (
                  <details key={label} className="group rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414]">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium">
                      {label}
                      <ChevronDown className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform shrink-0" />
                    </summary>
                    <p className="px-3 pb-3 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-line">{value}</p>
                  </details>
                );
              })}
            {program.days.length > 0 && (
              <details className="group rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414]">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium">
                  Schedule
                  <ChevronDown className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-3 pb-3 space-y-2">
                  <ol className="space-y-2">
                    {program.days.map((day) => (
                      <li key={day.dayNumber} className="flex gap-3 text-sm">
                        <span className="w-14 shrink-0 text-zinc-500">Day {day.dayNumber}</span>
                        <span className="min-w-0">
                          <span className="font-medium">{day.title}</span>
                          <span className="text-zinc-500"> · {dayLabel(day.dayType)}</span>
                          {day.dayType !== "TRAINING_DAY" && day.dayType !== "REST_DAY" && (day.onsiteSchedule || day.meetupLink) && (
                            <span className="block text-xs text-zinc-500 mt-0.5">
                              {day.onsiteSchedule}
                              {day.meetupLink ? " · Online session" : ""}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {onsite && (program.venueAddress || program.city) && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      {[program.venueAddress, program.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {!onsite && sessions.some((s) => s.meetupLink) && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                      <Video className="w-4 h-4" /> Online sessions are included in the schedule.
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
      {!enrolled && (
        <div className="fixed bottom-0 inset-x-0 z-[61] border-t border-white/10 bg-zinc-950 text-white">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60">{badge}</p>
              <p className="text-sm font-semibold">{program.price > 0 ? formatIdr(program.price) : "Free"}</p>
            </div>
            {action}
          </div>
        </div>
      )}
    </div>
  );
}
