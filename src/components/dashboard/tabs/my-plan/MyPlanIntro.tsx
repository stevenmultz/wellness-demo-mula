"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User as UserIcon,
  Users,
} from "lucide-react";
import { buildConciergeWhatsAppUrl } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  formatDayTypeLabel,
  formatStartsIn,
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

  // If user has 0 plans, immediately render dedicated No Plan page
  if (plans.length === 0) {
    return <MyPlanNoPlanPage onExplore={onExplore} />;
  }

  // Active plan index among enrolled plans
  const [activeSlide, setActiveSlide] = useState(0);
  const safeSlide = Math.min(activeSlide, Math.max(0, plans.length - 1));
  const currentPlan = plans[safeSlide] || plans[0];

  // Subtabs: Guides (0), Tasks (1), Metrics (2)
  const [widgetIndex, setWidgetIndex] = useState<0 | 1 | 2>(1);

  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const total = Math.max(1, currentPlan.totalDays || currentPlan.dayCount || 1);
  const completed = Math.min(total, Math.max(0, currentPlan.completedDays || 0));
  const progressPct = currentPlan.isCompleted
    ? 100
    : currentPlan.isUpcoming
      ? 0
      : Math.round((completed / total) * 100);
  const startsIn = currentPlan.isUpcoming ? formatStartsIn(currentPlan.startDate, locale) : null;
  const todayTypeLabel =
    !currentPlan.isUpcoming && !currentPlan.isCompleted
      ? formatDayTypeLabel(currentPlan.todayDayType, locale)
      : null;
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
                  className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                    active
                      ? "bg-zinc-950/10 dark:bg-white/15 text-zinc-950 dark:text-white font-bold"
                      : "bg-zinc-300 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Widgets below subtabs */}
      <div className="space-y-5">

          {/* Subtab 0: GUIDES */}
          {widgetIndex === 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h3 className="text-base font-geometric font-semibold text-zinc-950 dark:text-white">
                    {isId ? "Panduan & Protokol Program" : "Program Guidelines & Overview"}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {isId ? "Komitmen Harian" : "Daily Commitment"}
                    </span>
                    <p className="text-xs font-geometric font-semibold text-zinc-900 dark:text-zinc-100">
                      {currentPlan.dailyCommitment || "15–20 Mins / Day"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {isId ? "Durasi Total" : "Total Duration"}
                    </span>
                    <p className="text-xs font-geometric font-semibold text-zinc-900 dark:text-zinc-100">
                      {total} {isId ? "Hari" : "Days"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {isId ? "Hari Ini" : "Today"}
                    </span>
                    <p className="text-xs font-geometric font-semibold text-zinc-900 dark:text-zinc-100">
                      {currentPlan.isCompleted
                        ? (isId ? "Selesai" : "Completed")
                        : currentPlan.isUpcoming
                          ? startsIn
                            ? `${startsIn.headline}`
                            : (isId ? "Akan Datang" : "Upcoming")
                          : `${t.myPlan.dayLabel} ${currentPlan.currentDayNumber || 1}`}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {isId
                      ? "Ikuti seluruh rangkaian latihan, checklist habit harian, serta protokol tidur dan nutrisi yang telah disiapkan secara terstruktur oleh coach untuk mendapatkan hasil maksimal."
                      : "Follow the scheduled daily workouts, habit checklists, and nutrition protocols prepared by your coach to achieve maximum wellness results."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 1: TASKS */}
          {widgetIndex === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <h3 className="text-base font-geometric font-semibold text-zinc-950 dark:text-white">
                        {isId ? "Tugas & Check-in Hari Ini" : "Today's Tasks & Check-in"}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t.myPlan.dayLabel} {currentPlan.currentDayNumber || 1} {t.myPlan.ofLabel} {total}
                        {todayTypeLabel ? ` · ${todayTypeLabel}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectPlan(currentPlan.programId)}
                    className="px-3.5 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-geometric font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer"
                  >
                    {isId ? "Buka Task" : "Open Tasks"}
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {isId ? "Latihan / Workout Harian" : "Daily Movement / Workout"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {isId ? "Protokol" : "Protocol"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {isId ? "Catat Tidur & Pemulihan" : "Sleep & Recovery Log"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {isId ? "Tidur" : "Sleep"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {isId ? "Kepatuhan Nutrisi & Refleksi" : "Nutrition Compliance & Reflection"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {isId ? "Nutrisi" : "Nutrition"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: METRICS */}
          {widgetIndex === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <h3 className="text-base font-geometric font-semibold text-zinc-950 dark:text-white">
                        {isId ? "Metrik & Progres Penyelesaian" : "Metrics & Completion Progress"}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {completed}/{total} {isId ? "hari selesai" : "days done"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-zinc-950 dark:text-white tabular-nums">
                    {progressPct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${currentPlan.title} progress`}
                  className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
                >
                  <div
                    style={{ width: `${progressPct}%` }}
                    className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all duration-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 space-y-0.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {isId ? "Hari Selesai" : "Completed"}
                    </span>
                    <p className="text-base font-mono font-bold text-zinc-950 dark:text-white tabular-nums">
                      {completed} <span className="text-xs font-normal text-zinc-500">/ {total}</span>
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 space-y-0.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {isId ? "Tugas Pending" : "Pending Tasks"}
                    </span>
                    <p className="text-base font-mono font-bold text-zinc-950 dark:text-white tabular-nums">
                      {pendingTasks}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-white/5 space-y-0.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {isId ? "Status" : "Status"}
                    </span>
                    <p className="text-xs font-geometric font-semibold text-zinc-900 dark:text-zinc-100">
                      {currentPlan.isCompleted
                        ? isId ? "Selesai" : "Completed"
                        : currentPlan.isUpcoming
                          ? isId ? "Akan Datang" : "Upcoming"
                          : isId ? "Aktif Berjalan" : "Ongoing"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

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
