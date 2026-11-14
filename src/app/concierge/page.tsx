import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicTopBrand,
  PublicBottomNavbar,
  PublicMobileBackdrop,
  PublicPageActions,
} from "@/components/home/PublicNavbar";
import {
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConciergePage() {
  const { sessionUser, programs, curriculumSample } =
    await getPublicSanctuaryData();

  const distinctVenues = Array.from(
    new Set(
      programs
        .map((p) =>
          p.venueAddress
            ? `${p.venueAddress}${p.city ? `, ${p.city}` : ""}`
            : null
        )
        .filter((v): v is string => Boolean(v))
    )
  );

  const venueList =
    distinctVenues.length > 0
      ? distinctVenues
      : [
          "The Sanctuary Wellness Pavilion, Senopati, Jakarta Selatan",
          "BMS Sanctuary Studio, Senopati, Jakarta Selatan",
        ];

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
              Private Concierge • Studio &amp; Enrollment Support
            </span>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-snug">
              Studio Venues &amp; Direct Assistance
            </h1>
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Our concierge team assists with cohort selection, 15-minute QRIS
              invoice verification, private studio Connection Days in Senopati,
              and hybrid attendance options.
            </p>
          </section>

          {/* STUDIO VENUES, HOURS & QRIS FLOW */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5">
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2.5">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white">
                <MapPin className="w-4 h-4 shrink-0" />
                <h2 className="text-sm sm:text-base font-semibold">
                  Active Studio Venues
                </h2>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                {venueList.map((v, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2.5">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white">
                <Clock className="w-4 h-4 shrink-0" />
                <h2 className="text-sm sm:text-base font-semibold">
                  Concierge &amp; Meetup Hours
                </h2>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Concierge Support: Monday – Sunday, 06:00 – 21:00 WIB.
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Connection Day Schedule: {curriculumSample.connectionSchedule}
              </p>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2.5">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <h2 className="text-sm sm:text-base font-semibold">
                  15-Min QRIS Enrollment
                </h2>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Sign in or create an account, select an Open Registration cohort
                in your Member Dashboard, choose Virtual or In-Person attendance
                mode, and complete instant QRIS verification.
              </p>
            </div>
          </section>

          {/* DIRECT CONTACT ACTIONS */}
          <section className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400 block">
                Direct Concierge Channels
              </span>
              <h3 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950 dark:text-white">
                Speak with our Sanctuary Team
              </h3>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                Typical response time under 15 minutes during operating hours.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
              <a
                href="https://wa.me/6281290002026?text=Hello%20Sanctuary,%20I%20would%20like%20to%20inquire%20about%20the%20upcoming%20cohort."
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[11px] sm:text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 sm:gap-2 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </a>

              <a
                href="mailto:concierge@bms.id?subject=Cohort%20Inquiry"
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-full bg-zinc-900/10 hover:bg-zinc-900/15 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-950 dark:text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 sm:gap-2 transition"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>Email</span>
              </a>
            </div>
          </section>

          {/* BACK TO SIGN IN & NEXT PAGE BUTTONS */}
          <PublicPageActions
            sessionUser={sessionUser}
            nextHref="/programs"
            nextLabel="Explore Programs"
          />
        </div>

        {/* BOTTOM: SINGLE NAVBAR */}
        <PublicBottomNavbar />
      </div>
    </div>
  );
}
