import Image from "next/image";
import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicPageShell,
  PublicPageActions,
} from "@/components/home/PublicNavbar";

export const dynamic = "force-dynamic";

const DEFAULT_COACHES = [
  {
    id: "coach-1",
    name: "Coach Sarah Jenkins, CPT",
    title: "Senior Mobility & Pilates Specialist",
    programs: [
      {
        id: "prog-1",
        title: "21-Day Holistic Movement & Spinal Longevity",
        category: "Pilates",
        durationDays: 21,
      },
    ],
  },
  {
    id: "coach-2",
    name: "Dr. Marcus Vance, ND",
    title: "Director of Longevity Nutrition",
    programs: [
      {
        id: "prog-2",
        title: "14-Day Anti-Inflammatory Nutrition & Gut Reset",
        category: "Nutrition",
        durationDays: 14,
      },
    ],
  },
  {
    id: "coach-3",
    name: "Coach Julian Thorne",
    title: "Neuro-Breathwork & Sleep Specialist",
    programs: [
      {
        id: "prog-3",
        title: "Executive Deep Sleep & Parasympathetic Breathwork",
        category: "Breathwork",
        durationDays: 7,
      },
    ],
  },
  {
    id: "coach-4",
    name: "Coach Elena Rostova",
    title: "Fascial Release & Posture Director",
    programs: [
      {
        id: "prog-4",
        title: "30-Day Hot/Cold Thermogenesis & Cellular Vitality",
        category: "Mobility",
        durationDays: 30,
      },
    ],
  },
];

const COACH_FALLBACK_IMAGES = [
  "/coach.webp",
  "/coach2.webp",
  "/coach3.webp",
  "/pic.webp",
  "/test.webp",
];

export default async function CoachesPage() {
  const { coaches } = await getPublicSanctuaryData();

  const displayCoaches = (
    coaches && coaches.length > 0 ? coaches : DEFAULT_COACHES
  ).slice(0, 5);

  return (
    <PublicPageShell>
      {/* HERO */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
          Coaches
        </span>
        <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-tight">
          Sanctuary Coaches
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Master Coaches guiding our daily movement, whole-food nutrition, and
          recovery cohorts.
        </p>
      </section>

      {/* MINIMAL COACH LIST (MAX 5) */}
      <section className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
        {displayCoaches.map((coach, idx) => {
          const portraitSrc =
            COACH_FALLBACK_IMAGES[idx % COACH_FALLBACK_IMAGES.length];

          return (
            <article
              key={coach.id}
              className="py-5 sm:py-6 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-zinc-950 shrink-0">
                  <Image
                    src={portraitSrc}
                    alt={coach.name}
                    fill
                    className="object-cover object-top grayscale contrast-[1.08]"
                  />
                </div>

                <div className="min-w-0 space-y-0.5">
                  <h2 className="text-sm sm:text-base font-geometric font-medium text-zinc-950 dark:text-white truncate">
                    {coach.name}
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                    {coach.title}
                  </p>
                  {coach.programs.length > 0 && (
                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                      {coach.programs[0].title}
                    </p>
                  )}
                </div>
              </div>

              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                {coach.programs.length}{" "}
                {coach.programs.length === 1 ? "Cohort" : "Cohorts"}
              </span>
            </article>
          );
        })}
      </section>

      <PublicPageActions nextHref="/about" nextLabel="About" />
    </PublicPageShell>
  );
}
