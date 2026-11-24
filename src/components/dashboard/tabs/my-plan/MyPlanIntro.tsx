"use client";

import { useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User as UserIcon,
  Users,
} from "lucide-react";
import { buildConciergeWhatsAppUrl } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  type MyPlanIndexItem,
} from "./myPlanUtils";
import { MyPlanNoPlanPage } from "./MyPlanNoPlanPage";

export type MyPlanFilter = "all" | "ongoing" | "upcoming" | "completed";

export { MyPlanNoPlanPage };

export function MyPlanIntro({
  userId: _userId,
  userName,
  userEmail: _userEmail,
  userAvatarUrl,
  userSubtitle: _userSubtitle,
  plans,
  onSelectPlan,
  onExplore,
  onEditProfile: _onEditProfile,
}: {
  userId: string;
  userName: string;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  userSubtitle?: string | null;
  plans: MyPlanIndexItem[];
  onSelectPlan: (programId: string) => void;
  onExplore: () => void;
  onEditProfile?: () => void;
}) {
  const { locale, t } = useLocale();
  const isId = locale === "id";
  const displayName = (userName || "Member").trim() || "Member";

  // Active plan index among enrolled plans
  const [activeSlide, setActiveSlide] = useState(0);
  // Subtabs: Guides (0), Tasks (1), Metrics (2)
  const [widgetIndex, setWidgetIndex] = useState<0 | 1 | 2>(1);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // If user has 0 plans, immediately render dedicated No Plan page
  if (plans.length === 0) {
    return <MyPlanNoPlanPage onExplore={onExplore} />;
  }

  const safeSlide = Math.min(activeSlide, Math.max(0, plans.length - 1));
  const currentPlan = plans[safeSlide] || plans[0];

  const total = Math.max(1, currentPlan.totalDays || currentPlan.dayCount || 1);
  const pendingTasks =
    !currentPlan.isUpcoming && !currentPlan.isCompleted ? currentPlan.pendingTasksCount ?? 0 : 0;

  const subtabs = [
    { index: 0 as const, label: t.myPlan.subtabGuides, count: 0 },
    { index: 1 as const, label: t.myPlan.subtabTasks, count: pendingTasks },
    { index: 2 as const, label: t.myPlan.subtabMetrics, count: 0 },
  ];

  const destinationCommunityUrl = buildConciergeWhatsAppUrl(
    `Hello Concierge, I would like to join the community group for: ${currentPlan.title}`
  );

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-16">
      {/* 1. Contained Image Banner */}
      <section className="relative w-full rounded-3xl overflow-hidden bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-white/10 min-h-[190px] sm:min-h-[220px] flex flex-col justify-end p-5 sm:p-7 text-white">
        {/* Program cover image */}
        {currentPlan.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentPlan.coverImage}
            alt={currentPlan.title}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />

        {/* Plan index switcher (only shown when plans exist) */}
        {plans.length > 0 && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
            {plans.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = Math.max(0, safeSlide - 1);
                    setActiveSlide(nextIdx);
                    onSelectPlan(plans[nextIdx].programId);
                  }}
                  disabled={safeSlide === 0}
                  aria-label="Previous plan"
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white inline-flex items-center justify-center disabled:opacity-30 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span
                  data-testid="home-program-index"
                  className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-[11px] font-mono font-semibold text-white tabular-nums"
                >
                  {safeSlide + 1} / {plans.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = Math.min(plans.length - 1, safeSlide + 1);
                    setActiveSlide(nextIdx);
                    onSelectPlan(plans[nextIdx].programId);
                  }}
                  disabled={safeSlide >= plans.length - 1}
                  aria-label="Next plan"
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white inline-flex items-center justify-center disabled:opacity-30 transition cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span
                data-testid="home-program-index"
                className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-[11px] font-mono font-semibold text-white tabular-nums"
              >
                1 / 1
              </span>
            )}
          </div>
        )}

        <div className="relative z-10 space-y-3">
          {/* Program title */}
          <h1 className="text-xl sm:text-2xl font-geometric font-semibold tracking-tight text-white leading-tight">
            {currentPlan.title}
          </h1>

          {/* Action buttons (Community & Report - without "Join") */}
          <div className="flex items-center gap-4 pt-0.5">
            <button
              type="button"
              onClick={() => setShowCommunityModal(true)}
              className="py-1 text-xs font-medium text-white/95 hover:text-white inline-flex items-center gap-1.5 active:scale-95 transition drop-shadow-xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isId ? "Komunitas" : "Community"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="py-1 text-xs font-medium text-white/80 hover:text-white inline-flex items-center gap-1.5 active:scale-95 transition drop-shadow-xs cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{t.myPlan.report}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. User Profile below banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-white/20 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950 dark:text-white truncate">
              {displayName}
            </h2>
            {(_userSubtitle || _userEmail) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {_userSubtitle || _userEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Subtabs below profile: Guides | Tasks | Metrics */}
      <div
        role="tablist"
        aria-label="Program sections"
        className="rounded-xl p-1 bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-white/10 grid grid-cols-3 gap-1"
      >
        {subtabs.map(({ index, label, count }) => {
          const active = widgetIndex === index;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setWidgetIndex(index)}
              className={`h-9 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer ${
                active
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>{label}</span>
              {count > 0 && (
                <span
                  aria-label="Incomplete tasks"
                  className="semantic-badge-box w-2 h-2 rounded-full bg-[#9E2A3A] dark:bg-[#E06C7C] shrink-0"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Widgets below subtabs — intentionally empty on intro page (user taps plan to open detail) */}

      {/* Community Disclaimer Modal */}
      {showCommunityModal && (
        <div
          onClick={() => setShowCommunityModal(false)}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.myPlan.joinCommunity}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[#f6f6f4] dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 p-6 space-y-5 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-base font-geometric font-semibold text-zinc-950 dark:text-white">
                {t.myPlan.joinCommunity}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {isId
                  ? "Kamu akan diarahkan ke grup WhatsApp komunitas resmi untuk berdiskusi dengan sesama anggota dan coach."
                  : "You will be directed to the official WhatsApp community group to connect with fellow members and coaches."}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCommunityModal(false)}
                className="px-4 py-2 rounded-full border border-zinc-300 dark:border-white/15 text-xs font-semibold text-zinc-700 dark:text-zinc-300 active:scale-95 transition cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCommunityModal(false);
                  if (typeof window !== "undefined") {
                    window.open(destinationCommunityUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                className="px-5 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
              >
                <span>{t.myPlan.continueExternal || (isId ? "Lanjutkan" : "Continue")}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div
          onClick={() => setShowReportModal(false)}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.myPlan.report}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[#f6f6f4] dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 p-6 space-y-5 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-base font-geometric font-semibold text-zinc-950 dark:text-white">
                {t.myPlan.report}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {isId
                  ? "Punya kendala pada program ini? Hubungi layanan Concierge WhatsApp kami untuk bantuan cepat."
                  : "Have an issue with this program? Contact our WhatsApp Concierge for prompt assistance."}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-full border border-zinc-300 dark:border-white/15 text-xs font-semibold text-zinc-700 dark:text-zinc-300 active:scale-95 transition cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  if (typeof window !== "undefined") {
                    window.open(
                      buildConciergeWhatsAppUrl(`Report issue on program: ${currentPlan.title}`),
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }
                }}
                className="px-5 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
              >
                <span>{isId ? "Hubungi Concierge" : "Contact Concierge"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
