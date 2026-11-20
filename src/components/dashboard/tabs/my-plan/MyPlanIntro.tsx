"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  ImagePlus,
  Loader2,
  Pencil,
  RotateCcw,
  User as UserIcon,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  DEFAULT_PROFILE_BANNER,
  loadSavedProfileBanner,
  PROFILE_BANNER_EVENT,
  PROFILE_BANNER_PRESETS,
  resizeBannerImage,
  saveProfileBanner,
} from "../../profileBannerStorage";
import {
  formatDayTypeLabel,
  formatStartsIn,
  type MyPlanIndexItem,
} from "./myPlanUtils";

export type MyPlanFilter = "all" | "ongoing" | "upcoming" | "completed";

export function MyPlanIntro({
  userId,
  userName,
  userEmail,
  userAvatarUrl,
  userSubtitle,
  plans,
  onSelectPlan,
  onExplore,
  onEditProfile,
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

  // Editable Profile Banner state (persisted per user in localStorage)
  const [bannerUrl, setBannerUrl] = useState<string>(DEFAULT_PROFILE_BANNER);
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBannerUrl(loadSavedProfileBanner(userId));
    const onBannerChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<{ userId?: string; banner?: string }>).detail;
      if (detail?.userId === userId && detail.banner) {
        setBannerUrl(detail.banner);
      }
    };
    window.addEventListener(PROFILE_BANNER_EVENT, onBannerChanged);
    return () => window.removeEventListener(PROFILE_BANNER_EVENT, onBannerChanged);
  }, [userId]);

  const handleSelectBannerPreset = (src: string) => {
    setBannerError(null);
    const saved = saveProfileBanner(userId, src);
    setBannerUrl(saved);
    setBannerEditorOpen(false);
  };

  const handleUploadBannerFile = async (file: File | undefined) => {
    if (!file) return;
    setBannerError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setBannerError(
        isId
          ? "Pilih gambar berformat JPEG, PNG, atau WebP."
          : "Please choose a JPEG, PNG, or WebP image."
      );
      return;
    }
    setBannerBusy(true);
    try {
      const resized = await resizeBannerImage(file);
      const saved = saveProfileBanner(userId, resized);
      setBannerUrl(saved);
      setBannerEditorOpen(false);
    } catch (err) {
      setBannerError(
        err instanceof Error
          ? err.message
          : isId
            ? "Gagal memproses gambar banner."
            : "Failed to process banner image."
      );
    } finally {
      setBannerBusy(false);
    }
  };

  const handleResetBanner = () => {
    setBannerError(null);
    const saved = saveProfileBanner(userId, DEFAULT_PROFILE_BANNER);
    setBannerUrl(saved);
    setBannerEditorOpen(false);
  };

  // Order plans: ongoing first, then upcoming, then completed
  const orderedPlans = useMemo(() => {
    const rank = (p: MyPlanIndexItem) =>
      !p.isUpcoming && !p.isCompleted ? 0 : p.isUpcoming ? 1 : 2;
    return [...plans].sort((a, b) => rank(a) - rank(b));
  }, [plans]);

  const activeCount = useMemo(
    () => orderedPlans.filter((p) => !p.isCompleted).length,
    [orderedPlans]
  );

  // Swipe carousel state & index
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const safeSlide = Math.min(activeSlide, Math.max(0, orderedPlans.length - 1));

  const handleTrackScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth <= 0) return;
    const nextIdx = Math.round(el.scrollLeft / el.clientWidth);
    if (nextIdx !== activeSlide && nextIdx >= 0 && nextIdx < orderedPlans.length) {
      setActiveSlide(nextIdx);
    }
  };

  const scrollToSlide = (idx: number) => {
    const clamped = Math.max(0, Math.min(orderedPlans.length - 1, idx));
    const el = trackRef.current;
    if (el && el.clientWidth > 0) {
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    }
    setActiveSlide(clamped);
  };

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col gap-6 pt-[calc(5rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {/* =============================================================== */}
        {/* SECTION 1: USER PROFILE HEADER WITH EDITABLE BANNER & AVATAR    */}
        {/* =============================================================== */}
        <section
          aria-label={isId ? "Profil Pengguna" : "User Profile"}
          className="rounded-3xl bg-white border border-zinc-200/80 overflow-hidden shadow-2xs"
        >
          {/* Editable Cover Banner */}
          <div className="relative h-32 sm:h-40 w-full bg-zinc-900 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt=""
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25" />

            <button
              type="button"
              onClick={() => {
                setBannerError(null);
                setBannerEditorOpen(true);
              }}
              aria-label={isId ? "Ubah banner profil" : "Edit profile banner"}
              className="absolute top-3 right-3 h-8 px-3 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white text-[11px] font-geometric font-medium inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>{isId ? "Edit Banner" : "Edit Banner"}</span>
            </button>
          </div>

          {/* Profile Photo & Identity Row */}
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex items-end justify-between gap-3">
            <div className="flex items-end gap-3.5 min-w-0">
              <div className="relative -mt-9 sm:-mt-10 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditProfile?.()}
                  aria-label={isId ? "Edit foto profil" : "Edit profile photo"}
                  className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-zinc-100 border-[3px] border-white shadow-md flex items-center justify-center active:scale-95 transition cursor-pointer"
                >
                  {userAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userAvatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-7 h-7 text-zinc-400" />
                  )}
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                  </span>
                </button>
              </div>

              <div className="min-w-0 pt-2 pb-0.5 space-y-0.5">
                <h1 className="text-lg sm:text-xl font-geometric font-semibold tracking-tight text-zinc-950 truncate leading-tight">
                  {displayName}
                </h1>
                {(userSubtitle || userEmail) && (
                  <p className="text-xs text-zinc-500 truncate">
                    {userSubtitle || userEmail}
                  </p>
                )}
              </div>
            </div>

            {orderedPlans.length > 0 && (
              <span className="shrink-0 mb-0.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono font-medium tabular-nums">
                {activeCount > 0
                  ? `${activeCount} ${isId ? "Aktif" : "Active"}`
                  : `${orderedPlans.length} ${isId ? "Program" : orderedPlans.length === 1 ? "Program" : "Programs"}`}
              </span>
            )}
          </div>
        </section>

        {/* =============================================================== */}
        {/* SECTION 2: ENROLLED PROGRAMS (IMMEDIATE + SWIPE + INDEX)        */}
        {/* =============================================================== */}
        <section
          aria-labelledby="home-programs-heading"
          className="space-y-3.5"
        >
          <div className="flex items-center justify-between gap-3 px-0.5">
            <h2
              id="home-programs-heading"
              className="text-lg sm:text-xl font-geometric font-medium tracking-tight text-zinc-950"
            >
              {isId ? "Program Saya" : "My Programs"}
            </h2>

            {orderedPlans.length > 1 && (
              <div className="flex items-center gap-2">
                <span
                  aria-live="polite"
                  data-testid="home-program-index"
                  className="px-2.5 py-1 rounded-full bg-white border border-zinc-200/90 text-[11px] font-mono font-semibold text-zinc-800 tabular-nums"
                >
                  {safeSlide + 1} / {orderedPlans.length}
                </span>
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollToSlide(safeSlide - 1)}
                    disabled={safeSlide === 0}
                    aria-label={isId ? "Program sebelumnya" : "Previous program"}
                    className="w-7 h-7 rounded-full bg-white border border-zinc-200/90 text-zinc-800 inline-flex items-center justify-center hover:bg-zinc-100 disabled:opacity-35 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSlide(safeSlide + 1)}
                    disabled={safeSlide === orderedPlans.length - 1}
                    aria-label={isId ? "Program berikutnya" : "Next program"}
                    className="w-7 h-7 rounded-full bg-white border border-zinc-200/90 text-zinc-800 inline-flex items-center justify-center hover:bg-zinc-100 disabled:opacity-35 transition cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {orderedPlans.length > 0 ? (
            <div className="space-y-3">
              <div
                ref={trackRef}
                onScroll={handleTrackScroll}
                aria-label={
                  isId ? "Daftar program yang diikuti" : "Enrolled programs carousel"
                }
                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar -mx-1 px-1"
                style={{ scrollbarWidth: "none" }}
              >
                {orderedPlans.map((p) => {
                  const total = Math.max(1, p.totalDays || p.dayCount || 1);
                  const completed = Math.min(total, Math.max(0, p.completedDays || 0));
                  const progressPct = p.isCompleted
                    ? 100
                    : p.isUpcoming
                      ? 0
                      : Math.round((completed / total) * 100);
                  const isOnline = (p.locationType || "ONLINE").toUpperCase() === "ONLINE";
                  const startsIn = p.isUpcoming ? formatStartsIn(p.startDate, locale) : null;
                  const todayTypeLabel =
                    !p.isUpcoming && !p.isCompleted
                      ? formatDayTypeLabel(p.todayDayType, locale)
                      : null;
                  const pendingTasks =
                    !p.isUpcoming && !p.isCompleted ? p.pendingTasksCount ?? 0 : 0;

                  const statusLabel = p.isCompleted
                    ? isId
                      ? "Selesai"
                      : "Completed"
                    : p.isUpcoming
                      ? isId
                        ? "Akan Datang"
                        : "Upcoming"
                      : isId
                        ? "Berlangsung"
                        : "Ongoing";

                  const dayIndicatorLabel = p.isCompleted
                    ? `${completed}/${total} ${isId ? "hari selesai" : "days completed"}`
                    : startsIn
                      ? `${startsIn.headline} · ${startsIn.dateLabel}`
                      : `${t.myPlan.dayLabel} ${p.currentDayNumber || 1} ${t.myPlan.ofLabel} ${total}${
                          todayTypeLabel ? ` · ${todayTypeLabel}` : ""
                        }`;

                  return (
                    <div
                      key={p.programId}
                      className="w-full shrink-0 snap-center px-1"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectPlan(p.programId)}
                        className="group w-full rounded-3xl overflow-hidden bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-2xs text-left block active:scale-[0.99] transition cursor-pointer"
                      >
                        {/* Program Cover Image & Title Overlay */}
                        <div className="relative h-44 sm:h-52 w-full bg-zinc-900 overflow-hidden">
                          {p.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.coverImage}
                              alt={p.title}
                              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                              <BrandLogo size="sm" tone="light" className="opacity-70" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

                          {/* Top Status & Format Badges */}
                          <div className="absolute top-3.5 inset-x-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-full bg-white text-zinc-950 text-[10px] font-mono font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    p.isCompleted
                                      ? "bg-zinc-400"
                                      : p.isUpcoming
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                  }`}
                                />
                                <span>{statusLabel}</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-mono font-medium uppercase text-white">
                                {isOnline ? "Online" : "Hybrid"}
                              </span>
                            </div>

                            {pendingTasks > 0 && (
                              <span className="px-2.5 py-1 rounded-full bg-white text-zinc-950 text-[10px] font-mono font-semibold tabular-nums shadow-xs">
                                {pendingTasks}{" "}
                                {pendingTasks === 1
                                  ? t.myPlan.taskSingular
                                  : t.myPlan.taskPlural}
                              </span>
                            )}
                          </div>

                          {/* Program Title & Host */}
                          <div className="absolute bottom-3.5 inset-x-4 space-y-0.5">
                            <h3 className="text-lg sm:text-xl font-geometric font-semibold text-white leading-snug line-clamp-2">
                              {p.title}
                            </h3>
                            <p className="text-xs text-white/80 truncate">
                              {p.organizationName ? `${p.organizationName} • ` : ""}
                              Coach {p.coachName || BRAND.facultyFallback}
                            </p>
                          </div>
                        </div>

                        {/* Program Progress & Indicators Footer */}
                        <div className="p-4 sm:p-5 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-geometric font-medium text-zinc-700 truncate">
                              {dayIndicatorLabel}
                            </span>
                            <span className="shrink-0 text-xs font-mono font-semibold text-zinc-950 tabular-nums">
                              {progressPct}%
                            </span>
                          </div>

                          {/* Progress Indicator Bar */}
                          <div
                            role="progressbar"
                            aria-valuenow={progressPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${p.title} progress`}
                            className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden"
                          >
                            <div
                              style={{ width: `${progressPct}%` }}
                              className="h-full rounded-full bg-zinc-950 transition-all duration-500"
                            />
                          </div>

                          <div className="pt-1 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                              {completed}/{total}{" "}
                              {isId ? "hari selesai" : "days done"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-geometric font-semibold text-zinc-950 group-hover:translate-x-0.5 transition-transform">
                              <span>
                                {isId ? "Buka Program" : "Open Program"}
                              </span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Swipe Index Pagination Dots */}
              {orderedPlans.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-0.5">
                  <div
                    role="tablist"
                    aria-label={isId ? "Indeks program" : "Program index"}
                    className="flex items-center gap-1.5"
                  >
                    {orderedPlans.map((pl, idx) => {
                      const isCurrent = idx === safeSlide;
                      return (
                        <button
                          key={pl.programId}
                          type="button"
                          role="tab"
                          aria-selected={isCurrent}
                          aria-label={`${idx + 1} / ${orderedPlans.length}: ${pl.title}`}
                          onClick={() => scrollToSlide(idx)}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            isCurrent
                              ? "w-6 bg-zinc-950"
                              : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-zinc-200/80 p-6 sm:p-8 text-center space-y-4 shadow-2xs">
              <div className="space-y-1.5">
                <h3 className="text-base font-geometric font-semibold text-zinc-950">
                  {t.myPlan.emptyAllTitle}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  {t.myPlan.emptyAllDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={onExplore}
                className="group px-5 py-2.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-geometric font-semibold inline-flex items-center gap-2 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>{t.myPlan.explorePlans}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* =============================================================== */}
      {/* EDIT PROFILE BANNER MODAL                                       */}
      {/* =============================================================== */}
      {bannerEditorOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={() => setBannerEditorOpen(false)}
            className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={isId ? "Ubah Banner Profil" : "Edit Profile Banner"}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#f6f6f4] border border-zinc-200/80 p-5 sm:p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-geometric font-semibold text-zinc-950">
                    {isId ? "Ubah Banner Profil" : "Edit Profile Banner"}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {isId
                      ? "Unggah foto sendiri atau pilih preset banner."
                      : "Upload your own photo or choose a curated banner."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBannerEditorOpen(false)}
                  aria-label={t.common.close}
                  className="w-8 h-8 rounded-full bg-zinc-200/70 text-zinc-600 hover:text-zinc-950 inline-flex items-center justify-center active:scale-95 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {bannerError && (
                <p
                  role="alert"
                  className="text-xs px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700"
                >
                  {bannerError}
                </p>
              )}

              {/* Upload Custom Image Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={bannerBusy}
                  onClick={() => bannerFileRef.current?.click()}
                  className="w-full h-11 px-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-geometric font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition cursor-pointer"
                >
                  {bannerBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                  <span>
                    {isId ? "Unggah Foto Banner" : "Upload Custom Banner"}
                  </span>
                </button>
                <input
                  ref={bannerFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    e.target.value = "";
                    void handleUploadBannerFile(picked);
                  }}
                />
              </div>

              {/* Curated Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                  {isId ? "Preset Banner" : "Curated Presets"}
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {PROFILE_BANNER_PRESETS.map((preset) => {
                    const selected = bannerUrl === preset.src;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectBannerPreset(preset.src)}
                        className={`relative h-16 rounded-2xl overflow-hidden border-2 transition active:scale-95 cursor-pointer ${
                          selected
                            ? "border-zinc-950 shadow-sm"
                            : "border-transparent hover:border-zinc-400"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preset.src}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-end p-1.5">
                          <span className="text-[10px] font-geometric font-semibold text-white truncate">
                            {preset.label}
                          </span>
                        </div>
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {bannerUrl !== DEFAULT_PROFILE_BANNER && (
                <button
                  type="button"
                  onClick={handleResetBanner}
                  className="w-full h-9 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-geometric font-medium text-zinc-700 inline-flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isId ? "Kembalikan Default" : "Reset to Default"}</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
