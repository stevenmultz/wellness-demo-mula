import Link from "next/link";
import Image from "next/image";
import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicTopBrand,
  PublicBottomNavbar,
  PublicMobileBackdrop,
  PublicPageActions,
} from "@/components/home/PublicNavbar";
import {
  resolvePublicBadge,
  PublicProgramBadge,
} from "@/wellness/utils/timeline";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Clock,
  Dumbbell,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const FALLBACK_COHORT_IMAGES = [
  "/test.webp",
  "/pic.webp",
  "/image.webp",
  "/coach.webp",
  "/coach2.webp",
];

function formatDate(dateVal?: Date | string | null) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export default async function ProgramsPage() {
  const { sessionUser, programs } = await getPublicSanctuaryData();

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200 overflow-x-clip">
      <PublicMobileBackdrop />

      <div className="relative z-10 max-w-5xl w-full mx-auto px-5 sm:px-10 py-5 sm:py-8 flex-1 flex flex-col justify-between space-y-6 sm:space-y-10">
        {/* TOP: LOGO + BORDERLESS THEME ICON */}
        <PublicTopBrand />

        <div className="space-y-6 sm:space-y-10 my-auto">
          {/* HEADER */}
          <section className="space-y-2.5 max-w-3xl">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 block">
              Curated Cohorts • Live Database Catalog
            </span>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-snug">
              Active Programs ({programs.length})
            </h1>
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Explore all published cohorts with their exact curriculum length,
              specialist faculty, daily commitment, equipment, and real-time
              seat availability.
            </p>
          </section>

          {/* PROGRAMS LIST */}
          {programs.length === 0 ? (
            <section className="p-6 sm:p-10 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] text-center space-y-3">
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                No active cohorts are currently published. Please check back
                soon or contact our Private Concierge.
              </p>
              <Link
                href="/concierge"
                className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
              >
                <span>Contact Concierge</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </section>
          ) : (
            <section className="space-y-4 sm:space-y-6">
              {programs.map((prog, idx) => {
                const startDate = formatDate(prog.startDate);
                const endDate = formatDate(prog.endDate);
                const publicBadge: PublicProgramBadge =
                  resolvePublicBadge({
                    status: prog.status,
                    registrationOpenDate: prog.registrationOpenDate,
                    registrationDeadline: prog.registrationDeadline,
                    startDate: prog.startDate,
                    endDate: prog.endDate,
                    maxQuota: prog.maxQuota,
                    enrolledCount: prog.enrolledCount,
                  }) || "Open Registration";

                const isEnrollable = publicBadge === "Open Registration";

                const attendanceLabel =
                  prog.locationType === "ONLINE"
                    ? "Online"
                    : prog.locationType === "ONSITE"
                      ? `On-Site • ${prog.city || "Jakarta Selatan"}`
                      : `Hybrid • ${prog.city || "Jakarta Selatan"}`;

                const coverSrc =
                  prog.coverImage && prog.coverImage.trim().length > 0
                    ? prog.coverImage
                    : FALLBACK_COHORT_IMAGES[
                        idx % FALLBACK_COHORT_IMAGES.length
                      ];

                return (
                  <article
                    key={prog.id}
                    className="rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
                  >
                    {/* Visual Column (Compact height on mobile) */}
                    <div className="lg:col-span-4 relative h-40 sm:h-52 lg:h-auto bg-zinc-950">
                      <Image
                        src={coverSrc}
                        alt={prog.title}
                        fill
                        priority={idx === 0}
                        unoptimized={/^https?:/i.test(coverSrc)}
                        className="object-cover object-center grayscale contrast-[1.08] brightness-[0.78]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isEnrollable
                              ? "bg-white text-zinc-950"
                              : "bg-black/70 text-zinc-100"
                          }`}
                        >
                          {publicBadge}
                        </span>
                        {prog.category && (
                          <span className="px-2.5 py-0.5 rounded-full bg-black/70 text-zinc-100 text-[10px] font-mono uppercase tracking-wider truncate max-w-[200px]">
                            {prog.category}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                        <span className="text-[11px] font-semibold text-white block truncate">
                          {prog.coachName || "BMS Specialist"}
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate">
                          {prog.coachTitle || "Movement & Longevity Faculty"}
                        </span>
                      </div>
                    </div>

                    {/* Details Column */}
                    <div className="lg:col-span-8 p-4 sm:p-6 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        {/* Metadata Badges */}
                        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>
                              {prog.durationDays} Days ({prog.trainingDays}{" "}
                              Train
                              {prog.restDays > 0
                                ? ` • ${prog.restDays} Rest`
                                : ""}
                              {prog.connectionDays > 0
                                ? ` • ${prog.connectionDays} Live`
                                : ""}
                              )
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{attendanceLabel}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3 shrink-0" />
                            <span>
                              {prog.enrolledCount}/{prog.maxQuota} Enrolled
                            </span>
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-base sm:text-xl font-geometric font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                            {prog.title}
                          </h2>
                          {startDate && (
                            <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                              Timeline: {startDate}
                              {endDate ? ` – ${endDate}` : ""}
                              {prog.venueAddress
                                ? ` • ${prog.venueAddress}`
                                : ""}
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {prog.description}
                        </p>

                        {/* Equipment, Commitment, Audience Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                          {prog.dailyCommitment && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-medium">
                              <Clock className="w-3 h-3" />
                              <span>{prog.dailyCommitment}</span>
                            </span>
                          )}
                          {prog.equipment && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-medium">
                              <Dumbbell className="w-3 h-3" />
                              <span>{prog.equipment}</span>
                            </span>
                          )}
                          {prog.recommendedFor && (
                            <span className="px-2.5 py-0.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-medium">
                              For: {prog.recommendedFor}
                            </span>
                          )}
                        </div>

                        {prog.termsList && prog.termsList.length > 0 && (
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                            {prog.termsList.slice(0, 4).map((term, tIdx) => (
                              <li
                                key={tIdx}
                                className="flex items-start gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300"
                              >
                                <CheckCircle2 className="w-3 h-3 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                                <span>{term}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Price & Action Row */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          {prog.discountPercentage &&
                          prog.discountPercentage > 0 &&
                          prog.actualPrice ? (
                            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 line-through block">
                              Rp {prog.actualPrice.toLocaleString("id-ID")} (
                              {prog.discountPercentage}% Off)
                            </span>
                          ) : null}
                          <span className="text-base sm:text-xl font-geometric font-semibold text-zinc-950 dark:text-white">
                            Rp {prog.price.toLocaleString("id-ID")}
                          </span>
                        </div>

                        {sessionUser && prog.isUserEnrolled ? (
                          <Link
                            href="/dashboard"
                            className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 transition"
                          >
                            <span>Open in Dashboard</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : isEnrollable ? (
                          <Link
                            href={
                              sessionUser
                                ? `/dashboard?enroll=${prog.id}`
                                : `/?auth=signup&program=${encodeURIComponent(prog.title)}`
                            }
                            className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 transition"
                          >
                            <span>
                              {sessionUser
                                ? "Enroll Cohort"
                                : "Join Cohort & Sign Up"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span className="h-9 sm:h-10 px-4 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 text-[11px] font-mono uppercase tracking-wider inline-flex items-center">
                            {publicBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* BACK TO SIGN IN & NEXT PAGE BUTTONS */}
          <PublicPageActions
            sessionUser={sessionUser}
            nextHref="/specialists"
            nextLabel="Next: Specialists"
          />
        </div>

        {/* BOTTOM: SINGLE NAVBAR */}
        <PublicBottomNavbar />
      </div>
    </div>
  );
}
