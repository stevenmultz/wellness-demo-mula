import Link from "next/link";
import Image from "next/image";
import { getPublicSanctuaryData } from "@/wellness/public-data";
import { PublicNavbar } from "@/components/home/PublicNavbar";
import {
  resolvePublicBadge,
  PublicProgramBadge,
} from "@/wellness/utils/timeline";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const FALLBACK_COHORT_IMAGES = [
  "/pic.webp",
  "/test.webp",
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
    <div className="min-h-screen bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-6 sm:py-8 space-y-12 sm:space-y-16">
        {/* SINGLE TOP NAVBAR */}
        <PublicNavbar sessionUser={sessionUser} showBackToSignIn />

        {/* HEADER */}
        <section className="space-y-4 max-w-3xl">
          <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500 block">
            Curated Cohorts • Private 35-Member Batches
          </span>
          <h1 className="text-3xl sm:text-5xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.12]">
            Active Programs ({programs.length})
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Select a cohort below to inspect its daily training structure,
            specialist faculty, studio location, and enrollment availability.
          </p>
        </section>

        {/* PROGRAMS LIST */}
        {programs.length === 0 ? (
          <section className="p-10 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] text-center space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No active cohorts are currently published. Please check back soon
              or contact our Private Concierge.
            </p>
            <Link
              href="/concierge"
              className="h-11 px-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
            >
              <span>Contact Concierge</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </section>
        ) : (
          <section className="space-y-8">
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
                  ? "Online Sanctuary"
                  : prog.locationType === "ONSITE"
                    ? `On-Site • ${prog.city || "Jakarta"}`
                    : `Hybrid • ${prog.city || "Jakarta"}`;

              const coverSrc =
                prog.coverImage && prog.coverImage.trim().length > 0
                  ? prog.coverImage
                  : FALLBACK_COHORT_IMAGES[idx % FALLBACK_COHORT_IMAGES.length];

              return (
                <article
                  key={prog.id}
                  className="rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
                >
                  {/* Visual Column */}
                  <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full bg-zinc-950">
                    <Image
                      src={coverSrc}
                      alt={prog.title}
                      fill
                      priority={idx === 0}
                      unoptimized={/^https?:/i.test(coverSrc)}
                      className="object-cover object-center grayscale contrast-[1.08] brightness-[0.8]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-5 left-5 flex flex-wrap items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isEnrollable
                            ? "bg-white text-zinc-950"
                            : "bg-black/60 text-zinc-200 backdrop-blur-md"
                        }`}
                      >
                        {publicBadge}
                      </span>
                      {prog.category && (
                        <span className="px-3 py-1 rounded-full bg-black/60 text-zinc-200 backdrop-blur-md text-[10px] font-mono uppercase tracking-wider">
                          {prog.category}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300 block">
                        Guided by Coach {prog.coachName || "BMS Specialist"}
                      </span>
                      <span className="text-xs text-zinc-300">
                        {prog.coachTitle || "Movement & Longevity Faculty"}
                      </span>
                    </div>
                  </div>

                  {/* Details Column */}
                  <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {prog.trainingDays || prog.durationDays || 3}{" "}
                            Training Days + {prog.connectionDays || 2} Connection
                            Days
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{attendanceLabel}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>{prog.maxQuota} Member Cap</span>
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h2 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                          {prog.title}
                        </h2>
                        {(startDate || prog.recommendedFor) && (
                          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                            {startDate
                              ? `Schedule: ${startDate}${endDate ? ` – ${endDate}` : ""}`
                              : "Flexible Cohort Schedule"}{" "}
                            {prog.recommendedFor
                              ? `• Recommended for ${prog.recommendedFor}`
                              : ""}
                          </p>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {prog.description}
                      </p>

                      {prog.termsList && prog.termsList.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 block">
                            Cohort Inclusions &amp; Terms
                          </span>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {prog.termsList.slice(0, 4).map((term, tIdx) => (
                              <li
                                key={tIdx}
                                className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                                <span>{term}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        {prog.discountPercentage &&
                        prog.discountPercentage > 0 &&
                        prog.actualPrice ? (
                          <span className="text-xs font-mono text-zinc-400 line-through block">
                            Rp {prog.actualPrice.toLocaleString("id-ID")}
                          </span>
                        ) : null}
                        <span className="text-xl sm:text-2xl font-geometric font-semibold text-zinc-950 dark:text-white">
                          Rp {prog.price.toLocaleString("id-ID")}
                        </span>
                      </div>

                      {sessionUser && prog.isUserEnrolled ? (
                        <Link
                          href="/dashboard"
                          className="h-11 px-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
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
                          className="h-11 px-6 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
                        >
                          <span>
                            {sessionUser
                              ? "Enroll Cohort"
                              : "Join Cohort & Sign Up"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="h-11 px-6 rounded-full bg-zinc-300/60 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider inline-flex items-center">
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

        {/* BOTTOM NAVIGATION / BACK TO SIGN IN CTA */}
        <section className="pt-4 pb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="h-12 px-7 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              {sessionUser ? "Return to Account" : "Back to Sign In"}
            </span>
          </Link>

          <Link
            href="/specialists"
            className="h-12 px-7 rounded-full bg-zinc-200/70 hover:bg-zinc-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-950 dark:text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
          >
            <span>Meet Specialist Faculty</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
