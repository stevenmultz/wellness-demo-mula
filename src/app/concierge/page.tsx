import Link from "next/link";
import Image from "next/image";
import { getWellnessSession } from "@/wellness/security/session";
import {
  PublicTopBrand,
  PublicBottomNavbar,
} from "@/components/home/PublicNavbar";
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConciergePage() {
  const sessionUser = await getWellnessSession();

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200 overflow-x-clip">
      {/* Mobile Full-Screen Image Background */}
      <div className="fixed inset-0 z-0 lg:hidden pointer-events-none">
        <Image
          src="/pic.webp"
          alt=""
          fill
          priority
          className="object-cover object-center grayscale contrast-[1.08]"
        />
        <div className="absolute inset-0 bg-[#f6f6f4]/88 dark:bg-[#0e0e0e]/88 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 max-w-5xl w-full mx-auto px-6 sm:px-10 py-6 sm:py-8 flex-1 flex flex-col justify-between space-y-12 sm:space-y-16">
        {/* TOP: LOGO + TEXT THEME TOGGLE */}
        <PublicTopBrand />

        <div className="space-y-12 sm:space-y-16">
          {/* HEADER */}
          <section className="space-y-4 max-w-3xl">
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500 block">
              Private Concierge • Senopati Sanctuary
            </span>
            <h1 className="text-3xl sm:text-5xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.12]">
              Studio &amp; Direct Member Support
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Our concierge team assists with cohort selection, QRIS enrollment
              verification, private studio appointments in Senopati, and hybrid
              schedule accommodations.
            </p>
          </section>

          {/* STUDIO & HOURS INFO */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-3">
              <MapPin className="w-5 h-5 text-zinc-950 dark:text-white" />
              <h2 className="text-lg font-geometric font-medium text-zinc-950 dark:text-white">
                Senopati Sanctuary Studio
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Senopati, South Jakarta. Private On-Site &amp; Hybrid Connection
                Sessions are reserved exclusively for active cohort members by
                appointment.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-3">
              <Clock className="w-5 h-5 text-zinc-950 dark:text-white" />
              <h2 className="text-lg font-geometric font-medium text-zinc-950 dark:text-white">
                Concierge Hours
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Monday – Sunday, 06:00 – 21:00 WIB. Reach out anytime for cohort
                onboarding, payment confirmation, or protocol guidance.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-3">
              <ShieldCheck className="w-5 h-5 text-zinc-950 dark:text-white" />
              <h2 className="text-lg font-geometric font-medium text-zinc-950 dark:text-white">
                Instant QRIS Onboarding
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Create your account on the Sign In page, choose an open cohort
                inside your Member Dashboard, and activate immediately via QRIS.
              </p>
            </div>
          </section>

          {/* DIRECT CONTACT ACTIONS */}
          <section className="p-6 sm:p-8 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
                Direct Concierge Channels
              </span>
              <h3 className="text-xl font-geometric font-medium text-zinc-950 dark:text-white">
                Speak with our Sanctuary Team
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Typical response time under 15 minutes during studio hours.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://wa.me/6281290002026?text=Hello%20Sanctuary,%20I%20would%20like%20to%20inquire%20about%20the%20upcoming%20cohort."
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-6 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Concierge</span>
              </a>

              <a
                href="mailto:concierge@bms.id?subject=Cohort%20Inquiry"
                className="h-12 px-6 rounded-full bg-zinc-300/70 hover:bg-zinc-300 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-950 dark:text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
              >
                <Mail className="w-4 h-4" />
                <span>Email Concierge</span>
              </a>
            </div>
          </section>

          {/* SINGLE BACK TO SIGN IN CTA */}
          <section className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="h-12 px-7 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                {sessionUser ? "Return to Account" : "Back to Sign In"}
              </span>
            </Link>
          </section>
        </div>

        {/* BOTTOM: SINGLE NAVBAR */}
        <PublicBottomNavbar />
      </div>
    </div>
  );
}
