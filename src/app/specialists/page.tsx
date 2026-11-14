import Link from "next/link";
import Image from "next/image";
import { getPublicSanctuaryData } from "@/wellness/public-data";
import { PublicNavbar } from "@/components/home/PublicNavbar";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const DEFAULT_COACH_PROFILES = [
  {
    name: "Marcus Vance",
    role: "Movement & Mobility Lead",
    specialty: "Functional Movement & Spine Longevity",
    bio: "Specializes in postural decompression, scapular mechanics, and low-impact spinal articulation across daily 25-minute movement sequences.",
    image: "/coach.webp",
  },
  {
    name: "Elena Rostova",
    role: "Nutrition & Longevity Director",
    specialty: "Anti-Inflammatory Whole Food Protocols",
    bio: "Designs sustainable, zero-fatigue whole-food menus focused on glycemic stability, gut microbiome resilience, and clean cellular energy.",
    image: "/coach2.webp",
  },
  {
    name: "Julian Thorne",
    role: "Breathwork & Recovery Lead",
    specialty: "Parasympathetic Recovery & Sleep Architecture",
    bio: "Guides evening nervous-system down-regulation, breath cadence training, and circadian sleep restoration protocols.",
    image: "/coach3.webp",
  },
];

const COACH_FALLBACK_IMAGES = [
  "/coach.webp",
  "/coach2.webp",
  "/coach3.webp",
  "/coach.webp",
];

const COACH_FALLBACK_BIOS = [
  "Guides daily functional movement, postural alignment, and joint longevity protocols across private 35-member cohorts.",
  "Curates anti-inflammatory whole-food nutrition and sustainable metabolic habits tailored for daily compliance.",
  "Architects evening parasympathetic recovery, breathwork, and circadian sleep optimization routines.",
];

export default async function SpecialistsPage() {
  const { sessionUser, coaches } = await getPublicSanctuaryData();

  const displayCoaches =
    coaches && coaches.length > 0
      ? coaches.map((c, idx) => ({
          name: c.name,
          role: c.title || "Specialist Faculty",
          specialty: c.title || "Movement & Longevity Protocol",
          bio: COACH_FALLBACK_BIOS[idx % COACH_FALLBACK_BIOS.length],
          image: COACH_FALLBACK_IMAGES[idx % COACH_FALLBACK_IMAGES.length],
        }))
      : DEFAULT_COACH_PROFILES;

  return (
    <div className="min-h-screen bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-6 sm:py-8 space-y-12 sm:space-y-16">
        {/* SINGLE TOP NAVBAR */}
        <PublicNavbar sessionUser={sessionUser} showBackToSignIn />

        {/* HEADER */}
        <section className="space-y-4 max-w-3xl">
          <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500 block">
            Specialist Faculty • Multidisciplinary Guidance
          </span>
          <h1 className="text-3xl sm:text-5xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.12]">
            Guided by Specialists
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Every BMS cohort is led by our multidisciplinary faculty spanning
            functional biomechanics, anti-inflammatory nutrition, and nervous
            system recovery.
          </p>
        </section>

        {/* SPECIALISTS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayCoaches.map((coach, idx) => (
            <article
              key={idx}
              className="rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] overflow-hidden flex flex-col justify-between"
            >
              <div className="relative aspect-[4/5] w-full bg-zinc-950 overflow-hidden">
                <Image
                  src={coach.image}
                  alt={coach.name}
                  fill
                  priority={idx < 3}
                  className="object-cover object-top grayscale contrast-[1.08] brightness-[0.85]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300 block">
                    {coach.role}
                  </span>
                  <h2 className="text-xl font-geometric font-medium tracking-tight text-white">
                    {coach.name}
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Specialty • {coach.specialty}
                  </span>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {coach.bio}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

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
            href="/concierge"
            className="h-12 px-7 rounded-full bg-zinc-200/70 hover:bg-zinc-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-950 dark:text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
          >
            <span>Private Concierge</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
