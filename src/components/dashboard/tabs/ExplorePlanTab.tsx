"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Globe,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { getPublicBadgeMeta, PublicProgramBadge } from "@/wellness/utils/timeline";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  BrandWordmark,
  EmptyState,
  ErrorState,
  FloatingHeader,
  HeaderBackButton,
  HeaderProfileButton,
  LoadingState,
  PullToRefreshBanner,
  formatDateWib,
  formatIdr,
  usePullToRefresh,
} from "./shared";
import {
  categoriesOf,
  coachAvatarFor,
  computeSupportedFilterOptions,
  countActive,
  EMPTY,
  FORMAT_OPTIONS,
  intensityOf,
  matches,
  PAGE_SIZE,
  PRICE_BANDS,
  splitCoachTokens,
  type ExploreProgram,
  type Filters,
  type LoadState,
} from "./explore/exploreFilters";
import { ExploreFilterDialog } from "./explore/ExploreFilterDialog";
import { ExploreCoachesView } from "./explore/ExploreCoachesView";
import {
  buildExploreCommunities,
  ExploreCommunitiesView,
} from "./explore/ExploreCommunitiesView";

export type ExploreViewMode = "intro" | "catalog" | "coaches" | "communities";

export function ExplorePlanTab({
  headerVisible,
  isActive = true,
  viewMode,
  onChangeViewMode,
  onRegister,
  onViewDetails,
  onOpenPlan: _onOpenPlan,
  registeringId,
  profileAvatarUrl,
  profileName,
  profileEmail,
  onOpenProfile,
}: {
  headerVisible: boolean;
  isActive?: boolean;
  viewMode?: ExploreViewMode;
  onChangeViewMode?: (mode: ExploreViewMode) => void;
  onRegister: (programId: string) => void;
  onViewDetails: (programId: string) => void;
  onOpenPlan: (programId: string) => void;
  registeringId: string | null;
  profileAvatarUrl?: string | null;
  profileName?: string | null;
  profileEmail?: string | null;
  onOpenProfile?: () => void;
}) {
  void _onOpenPlan;
  const { locale, t } = useLocale();
  const [internalMode, setInternalMode] = useState<ExploreViewMode>("intro");
  const mode = viewMode ?? internalMode;
  const setMode = (next: ExploreViewMode) => {
    setInternalMode(next);
    onChangeViewMode?.(next);
    window.scrollTo({ top: 0 });
  };
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [coachSearch, setCoachSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [coachPage, setCoachPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, applied, selectedCoach, selectedCommunity]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [filtersOpen]);

  const load = useCallback(async (signal: AbortSignal, isBackgroundRefresh = false) => {
    if (isBackgroundRefresh) {
      setRefreshing(true);
    } else {
      setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
      setRefreshing(true);
    }
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/explore/programs?${params.toString()}`, { signal, cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load plans.");
      setState({ status: "ready", programs: json.programs as ExploreProgram[] });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setState((prev) =>
        prev.status === "ready"
          ? prev
          : { status: "error", message: err instanceof Error ? err.message : "Failed to load plans." }
      );
    } finally {
      if (!signal.aborted) setRefreshing(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal, reloadKey > 0);
    return () => controller.abort();
  }, [load, reloadKey]);

  const handlePullRefresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const { pullDistance } = usePullToRefresh({
    active: isActive,
    refreshing,
    onRefresh: handlePullRefresh,
  });

  const catalog = useMemo(() => (state.status === "ready" ? state.programs : []), [state]);

  const availableCoaches = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string }>();
    catalog.forEach((p) => {
      for (const name of splitCoachTokens(p.coachName)) {
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { name, avatar: coachAvatarFor(name) });
        }
      }
    });
    return Array.from(map.values());
  }, [catalog]);

  const availableCommunities = useMemo(() => buildExploreCommunities(catalog), [catalog]);

  const sportsCategoriesWithCounts = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const p of catalog) {
      for (const cat of categoriesOf(p)) {
        const key = cat.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, { name: cat, count: 1 });
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );
  }, [catalog]);

  const onlinePlansCount = useMemo(
    () => catalog.filter((p) => p.locationType === "ONLINE").length,
    [catalog]
  );
  const hybridPlansCount = useMemo(
    () => catalog.filter((p) => p.locationType === "HYBRID").length,
    [catalog]
  );

  const coachScopedCatalog = useMemo(() => {
    let list = catalog;
    if (selectedCommunity) {
      list = list.filter(
        (p) =>
          (p.organizationName || "").trim().toLowerCase() ===
          selectedCommunity.trim().toLowerCase()
      );
    }
    if (selectedCoach) {
      list = list.filter((p) =>
        splitCoachTokens(p.coachName).some(
          (c) => c.toLowerCase() === selectedCoach.trim().toLowerCase()
        )
      );
    }
    return list;
  }, [catalog, selectedCoach, selectedCommunity]);
  const supported = useMemo(
    () => computeSupportedFilterOptions(coachScopedCatalog),
    [coachScopedCatalog]
  );

  const filtered = coachScopedCatalog.filter((p) => matches(p, applied));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = countActive(applied);

  const toggle = (key: keyof Filters, value: string) => {
    setDraft((f) => {
      const list = f[key];
      if (!Array.isArray(list)) return f;
      return { ...f, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  };

  const removeChip = (key: string, value?: string) => {
    if (key === "coach") {
      setSelectedCoach(null);
      setPage(1);
      return;
    }
    if (key === "community") {
      setSelectedCommunity(null);
      setPage(1);
      return;
    }
    setApplied((f) => {
      const list = f[key as keyof Filters];
      if (!Array.isArray(list) || !value) return f;
      return { ...f, [key]: list.filter((v) => v !== value) };
    });
    setPage(1);
  };

  const chips: { key: string; value: string; label: string }[] = [
    ...(selectedCommunity
      ? [
          {
            key: "community",
            value: selectedCommunity,
            label: `${locale === "id" ? "Komunitas" : "Community"}: ${selectedCommunity}`,
          },
        ]
      : []),
    ...(selectedCoach
      ? [{ key: "coach", value: selectedCoach, label: `${t.explore.coachPrefix}: ${selectedCoach}` }]
      : []),
    ...applied.format.map((value) => ({ key: "format", value, label: FORMAT_OPTIONS.find((o) => o.id === value)?.label || value })),
    ...applied.intensity.map((value) => ({ key: "intensity", value, label: value })),
    ...applied.category.map((value) => ({ key: "category", value, label: `${t.explore.categoryPrefix}: ${value}` })),
    ...applied.duration.map((value) => ({ key: "duration", value, label: value })),
    ...applied.price.map((value) => ({
      key: "price",
      value,
      label: value === "free" ? t.explore.priceFree : PRICE_BANDS.find((b) => b.id === value)?.label || value,
    })),
    ...applied.experience.map((value) => ({ key: "experience", value, label: value })),
    ...applied.schedule.map((value) => ({ key: "schedule", value, label: value })),
    ...applied.availability.map((value) => ({ key: "availability", value, label: value })),
  ];

  const isId = locale === "id";

  const openCatalogWith = (opts?: {
    filters?: Filters;
    community?: string | null;
    coach?: string | null;
  }) => {
    const nextFilters = opts?.filters ?? EMPTY;
    setSelectedCoach(opts?.coach ?? null);
    setSelectedCommunity(opts?.community ?? null);
    setApplied(nextFilters);
    setDraft(nextFilters);
    setPage(1);
    setMode("catalog");
  };

  return (
    <>
      <FloatingHeader visible={headerVisible}>
        {mode === "intro" ? (
          <>
            <BrandWordmark />
            <HeaderProfileButton
              avatarUrl={profileAvatarUrl}
              fullName={profileName}
              email={profileEmail}
              onClick={() => onOpenProfile?.()}
            />
          </>
        ) : mode === "communities" ? (
          <div className="w-full flex items-center gap-2">
            <HeaderBackButton
              onClick={() => setMode("intro")}
              ariaLabel={t.common.back}
            />
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-zinc-100 border border-zinc-200 px-3 h-9">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="search"
                inputMode="search"
                value={communitySearch}
                onChange={(e) => setCommunitySearch(e.target.value)}
                placeholder={isId ? "Cari komunitas atau kota..." : "Search community or city..."}
                aria-label={isId ? "Cari komunitas atau kota" : "Search community or city"}
                maxLength={100}
                className="w-full bg-transparent outline-none text-xs sm:text-sm text-zinc-950 placeholder:text-xs placeholder:text-zinc-500"
              />
            </div>
          </div>
        ) : mode === "coaches" ? (
          <div className="w-full flex items-center gap-2">
            <HeaderBackButton
              onClick={() => setMode("intro")}
              ariaLabel={t.common.back}
            />
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-zinc-100 border border-zinc-200 px-3 h-9">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="search"
                inputMode="search"
                value={coachSearch}
                onChange={(e) => {
                  setCoachSearch(e.target.value);
                  setCoachPage(1);
                }}
                placeholder={t.explore.searchCoachPlaceholder}
                aria-label={t.explore.searchCoachPlaceholder}
                maxLength={100}
                className="w-full bg-transparent outline-none text-xs sm:text-sm text-zinc-950 placeholder:text-xs placeholder:text-zinc-500"
              />
            </div>
          </div>
        ) : (
          <div className="relative w-full flex items-center gap-2">
            <HeaderBackButton
              onClick={() => setMode("intro")}
              ariaLabel={t.common.back}
            />
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-zinc-100 border border-zinc-200 px-3 h-9">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="search"
                inputMode="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.explore.searchPlanPlaceholder}
                aria-label={t.explore.searchPlanPlaceholder}
                maxLength={100}
                className="w-full bg-transparent outline-none text-xs sm:text-sm text-zinc-950 placeholder:text-xs placeholder:text-zinc-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft(applied);
                setFiltersOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              className={`shrink-0 h-9 px-3 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition ${
                activeCount > 0
                  ? "border-zinc-950 bg-zinc-100 text-zinc-950"
                  : "border-zinc-300 bg-white text-zinc-900"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t.explore.filterTitle}</span>
              {activeCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-zinc-950 text-white text-[9px] font-bold inline-flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        )}
      </FloatingHeader>

      {mode === "intro" ? (
        <div className="relative flex-1 flex flex-col">
          <div className="relative z-10 w-full max-w-3xl mx-auto flex-1 flex flex-col gap-7 pt-[calc(5rem+env(safe-area-inset-top))] pb-[calc(6.25rem+env(safe-area-inset-bottom))]">
            <PullToRefreshBanner
              pullDistance={pullDistance}
              refreshing={refreshing && state.status === "ready"}
            />

            {/* Clean Light Header */}
            <header className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-px bg-zinc-400" />
                <span className="text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-zinc-500">
                  {t.explore.eyebrow}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-geometric font-light tracking-tight text-zinc-950 leading-[1.1]">
                {t.explore.title}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-lg">
                {isId
                  ? "Temukan program latihan, nutrisi, dan pemulihan sesuai ritme harian Anda — fleksibel secara online maupun terjadwal bersama komunitas."
                  : "Discover movement, nutrition, and recovery programs built around your rhythm — flexible online or scheduled with a live cohort."}
              </p>
            </header>

            {/* =============================================================== */}
            {/* SECTION 1: EXPLORE ALL PLANS + SPORTS CATEGORY                  */}
            {/* =============================================================== */}
            <section aria-labelledby="explore-sec-1" className="space-y-3.5">
              <span
                id="explore-sec-1"
                className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400 block"
              >
                {isId ? "01 • Semua Program & Kategori" : "01 • All Plans & Sports Category"}
              </span>

              <button
                type="button"
                onClick={() => openCatalogWith()}
                className="group w-full p-5 sm:p-6 rounded-3xl bg-zinc-950 text-white hover:bg-zinc-900 text-left flex items-start justify-between gap-4 shadow-sm active:scale-[0.99] transition cursor-pointer"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-300">
                    <Compass className="w-3.5 h-3.5" />
                    <span>
                      {state.status === "ready"
                        ? `${catalog.length} ${catalog.length === 1 ? t.explore.planSingular : t.explore.planPlural}`
                        : t.common.loading}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-geometric font-medium tracking-tight text-white">
                    {isId ? "Explore All Plans" : "Explore All Plans"}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {isId
                      ? "Lihat seluruh katalog program aktif sekaligus — bandingkan durasi, tingkat intensitas, coach, dan jadwal dalam satu tempat."
                      : "Browse the complete catalog of active programs at once — compare duration, intensity, coaches, and formats in one place."}
                  </p>
                </div>
                <span className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center shrink-0 mt-1 transition">
                  <ArrowRight className="w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </button>

              {/* Sports Category right below Explore All Plans */}
              <div className="rounded-2xl bg-white border border-zinc-200/85 p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-geometric font-semibold text-zinc-950">
                    {isId ? "Sports Category" : "Sports Category"}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {isId
                      ? "Pilih kategori olahraga atau fokus kebugaran untuk langsung melihat program yang relevan."
                      : "Pick a sport or wellness focus to jump straight to matching programs."}
                  </p>
                </div>

                {sportsCategoriesWithCounts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sportsCategoriesWithCounts.map(({ name, count }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          openCatalogWith({ filters: { ...EMPTY, category: [name] } })
                        }
                        className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#f6f6f4] hover:bg-zinc-950 hover:text-white border border-zinc-200/90 hover:border-zinc-950 text-xs font-medium text-zinc-800 transition active:scale-95 cursor-pointer"
                      >
                        <span>{name}</span>
                        <span className="text-[10px] font-mono opacity-65 tabular-nums">
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 font-mono">
                    {state.status === "loading"
                      ? t.explore.loadingPlans
                      : isId
                        ? "Belum ada kategori yang tersedia."
                        : "No categories available yet."}
                  </p>
                )}
              </div>
            </section>

            {/* =============================================================== */}
            {/* SECTION 2: ONLINE PLANS & HYBRID PLANS                          */}
            {/* =============================================================== */}
            <section aria-labelledby="explore-sec-2" className="space-y-3.5">
              <span
                id="explore-sec-2"
                className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400 block"
              >
                {isId ? "02 • Format Program" : "02 • Choose Your Format"}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Explore All Online Plans */}
                <button
                  type="button"
                  onClick={() =>
                    openCatalogWith({ filters: { ...EMPTY, format: ["ONLINE"] } })
                  }
                  className="group p-5 rounded-3xl bg-white border border-zinc-200/85 hover:border-zinc-400 text-left flex flex-col justify-between gap-4 shadow-2xs active:scale-[0.99] transition cursor-pointer"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono uppercase tracking-wider font-medium">
                        <Globe className="w-3 h-3" />
                        <span>{isId ? "Fleksibel • Kapan Saja" : "Flexible • Anytime"}</span>
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {onlinePlansCount}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950">
                      Explore All Online Plans
                    </h2>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {isId
                        ? "Full online, tidak terikat waktu maupun tempat. Semua modul terbuka fleksibel sehingga Anda bebas mulai dan latihan kapan saja sesuai jadwal sendiri."
                        : "100% online with no fixed dates or location. Modules unlock flexibly so you can start and train whenever it fits your schedule."}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950 pt-1">
                    <span>{isId ? "Lihat Online Plans" : "Browse Online Plans"}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </button>

                {/* Explore All Hybrid Plans */}
                <button
                  type="button"
                  onClick={() =>
                    openCatalogWith({ filters: { ...EMPTY, format: ["HYBRID"] } })
                  }
                  className="group p-5 rounded-3xl bg-white border border-zinc-200/85 hover:border-zinc-400 text-left flex flex-col justify-between gap-4 shadow-2xs active:scale-[0.99] transition cursor-pointer"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono uppercase tracking-wider font-medium">
                        <MapPin className="w-3 h-3" />
                        <span>{isId ? "Terjadwal & Tatap Muka" : "Scheduled & Onsite"}</span>
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {hybridPlansCount}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950">
                      Explore All Hybrid Plans
                    </h2>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {isId
                        ? "Gabungan panduan harian online dan sesi tatap muka bersama coach & cohort. Pastikan cek tanggal mulai, batas waktu 00:00 WIB, serta lokasi kota/venue agar tidak terlewat."
                        : "Combines daily online tracking with live in-person sessions. Check the start date, 00:00 WIB schedule, and city/venue carefully so you don't miss a session."}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950 pt-1">
                    <span>{isId ? "Lihat Hybrid Plans" : "Browse Hybrid Plans"}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </button>
              </div>
            </section>

            {/* =============================================================== */}
            {/* SECTION 3: EXPLORE COMMUNITY                                    */}
            {/* =============================================================== */}
            <section aria-labelledby="explore-sec-3" className="space-y-3.5">
              <span
                id="explore-sec-3"
                className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400 block"
              >
                {isId ? "03 • Komunitas & Ekosistem" : "03 • Community & Partners"}
              </span>

              <button
                type="button"
                onClick={() => {
                  setCommunitySearch("");
                  setMode("communities");
                }}
                className="group w-full p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/85 hover:border-zinc-400 text-left flex items-start justify-between gap-4 shadow-2xs active:scale-[0.99] transition cursor-pointer"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono uppercase tracking-wider font-medium">
                    <Building2 className="w-3 h-3" />
                    <span>
                      {availableCommunities.length}{" "}
                      {isId ? "Komunitas Aktif" : availableCommunities.length === 1 ? "Community" : "Communities"}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950">
                    Explore Community
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    {isId
                      ? "Kenali komunitas, studio partner, dan penyelenggara resmi di balik setiap program agar Anda dapat berlatih bersama lingkungan yang paling sesuai."
                      : "Explore verified partner studios, wellness communities, and official hosts behind each program to train with the right circle."}
                  </p>
                </div>
                <span className="w-9 h-9 rounded-full bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white text-zinc-700 flex items-center justify-center shrink-0 mt-1 transition">
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </button>
            </section>
          </div>
        </div>
      ) : mode === "communities" ? (
        <ExploreCommunitiesView
          communities={availableCommunities}
          search={communitySearch}
          onResetSearch={() => setCommunitySearch("")}
          onSelectCommunity={(name) => openCatalogWith({ community: name })}
          pullDistance={pullDistance}
          refreshing={refreshing}
          loadStatus={state.status}
        />
      ) : mode === "coaches" ? (
        <ExploreCoachesView
          availableCoaches={availableCoaches}
          catalog={catalog}
          coachSearch={coachSearch}
          onResetSearch={() => {
            setCoachSearch("");
            setCoachPage(1);
          }}
          coachPage={coachPage}
          onChangeCoachPage={setCoachPage}
          onSelectCoach={(name) => {
            setSelectedCoach(name);
            setPage(1);
            setMode("catalog");
          }}
          pullDistance={pullDistance}
          refreshing={refreshing}
          loadStatus={state.status}
        />
      ) : (
        <>

      <ExploreFilterDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        catalog={coachScopedCatalog}
        supported={supported}
        draft={draft}
        setDraft={setDraft}
        applied={applied}
        onToggle={toggle}
        onReset={() => {
          setDraft(EMPTY);
        }}
        onApply={() => {
          setApplied(draft);
          setPage(1);
          setFiltersOpen(false);
        }}
      />

      <div className="space-y-4">
        <PullToRefreshBanner
          pullDistance={pullDistance}
          refreshing={refreshing && state.status === "ready"}
        />

        {/* MINIMAL COMPACT COACH FILTER STRIP */}
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pb-0.5 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          <button
            type="button"
            onClick={() => setSelectedCoach(null)}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-geometric font-medium transition focus:outline-none ${
              !selectedCoach
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-white/30"
            }`}
          >
            {t.explore.allCoaches}
          </button>

          {availableCoaches.map(({ name, avatar }) => {
            const isSelected = selectedCoach?.toLowerCase() === name.toLowerCase();
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedCoach(isSelected ? null : name)}
                className={`shrink-0 h-8 pl-1 pr-3 rounded-full inline-flex items-center gap-2 text-xs font-geometric font-medium transition focus:outline-none ${
                  isSelected
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-white/30"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar}
                  alt={name}
                  className="w-6 h-6 rounded-full object-cover object-top shrink-0 bg-zinc-200 dark:bg-zinc-800"
                />
                <span className="whitespace-nowrap">{name}</span>
              </button>
            );
          })}

          {availableCoaches.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCoachSearch("");
                setCoachPage(1);
                setMode("coaches");
              }}
              className="shrink-0 h-8 px-3.5 rounded-full bg-zinc-200/80 hover:bg-zinc-300/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-geometric font-medium text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition active:scale-95"
            >
              <span>{locale === "id" ? "Lainnya" : "And more"}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

          {supported.category.length > 0 && (
            <div
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 scroll-smooth"
              style={{ scrollbarWidth: "none" }}
            >
              <button
                type="button"
                onClick={() => {
                  setApplied((f) => ({ ...f, category: [] }));
                  setDraft((f) => ({ ...f, category: [] }));
                  setPage(1);
                }}
                className={`shrink-0 h-7 px-3 rounded-full text-[11px] font-geometric font-medium transition ${
                  applied.category.length === 0
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                    : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                {t.explore.allCategories}
              </button>
              {supported.category.map((cat) => {
                const isSelected = applied.category.some(
                  (c) => c.toLowerCase() === cat.toLowerCase()
                );
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const nextCats = isSelected
                        ? applied.category.filter(
                            (c) => c.toLowerCase() !== cat.toLowerCase()
                          )
                        : [...applied.category, cat];
                      setApplied((f) => ({ ...f, category: nextCats }));
                      setDraft((f) => ({ ...f, category: nextCats }));
                      setPage(1);
                    }}
                    className={`shrink-0 h-7 px-3 rounded-full text-[11px] font-geometric font-medium transition ${
                      isSelected
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                        : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={`${chip.key}-${chip.value}`}
                type="button"
                onClick={() => removeChip(chip.key, chip.value)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-[2px] bg-zinc-100 dark:bg-white/10 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 transition hover:bg-zinc-200 dark:hover:bg-white/20"
              >
                {chip.label} <X className="w-3 h-3 text-zinc-400" />
              </button>
            ))}
          </div>
        )}

        {state.status === "loading" && <LoadingState label={t.explore.loadingPlans} />}
        {state.status === "error" && <ErrorState message={state.message} onRetry={() => setReloadKey((k) => k + 1)} />}
        {state.status === "ready" && filtered.length === 0 && (
          <EmptyState
            title={
              debouncedSearch || activeCount || selectedCoach || selectedCommunity
                ? t.explore.noPlansMatch
                : t.explore.noPlansYet
            }
            description={
              debouncedSearch || activeCount || selectedCoach || selectedCommunity
                ? t.explore.noPlansMatchDesc
                : t.explore.noPlansYetDesc
            }
            action={
              activeCount || debouncedSearch || selectedCoach || selectedCommunity ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCoach(null);
                    setSelectedCommunity(null);
                    setApplied(EMPTY);
                    setDraft(EMPTY);
                  }}
                  className="px-4 py-1.5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase"
                >
                  {t.common.clearAll}
                </button>
              ) : undefined
            }
          />
        )}

        {state.status === "ready" && visible.length > 0 && (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visible.map((p) => {
                const meta = getPublicBadgeMeta(p.badge as PublicProgramBadge);
                const isOnline = p.locationType === "ONLINE";
                const locLabel = isOnline ? "Online" : "Hybrid";
                const cityLabel = isOnline ? "Anytime" : p.city;
                const isExpanded = !!expandedIds[p.id];

                return (
                  <li
                    key={p.id}
                    className="rounded-2xl overflow-hidden bg-white dark:bg-[#141414] border border-zinc-300/90 dark:border-white/15 shadow-xs flex flex-col transition-all"
                  >
                    {/* Program Banner Image with Commitment Label */}
                    <div className="relative h-44 bg-zinc-200 dark:bg-zinc-800 border-b border-zinc-200/80 dark:border-white/10">
                      <Image
                        src={p.coverImage || "/image.webp"}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        unoptimized={!!p.coverImage && /^https?:/i.test(p.coverImage)}
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                      {/* Top Badges: Status and Daily Commitment */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase bg-white text-zinc-950 shadow-sm">
                          {meta.label}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase bg-black/60 backdrop-blur-md text-white border border-white/20 inline-flex items-center gap-1 shadow-2xs">
                          <Clock className="w-2.5 h-2.5 text-white/80" />
                          <span>{p.dailyCommitment || "20–30m/day"}</span>
                        </span>
                      </div>

                      {/* Bottom Banner Labels: Location Type, City, and Intensity */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-1.5 flex-wrap text-[10px] font-mono uppercase text-white/95">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20">
                            {locLabel}
                          </span>
                          {cityLabel && (
                            <span className="px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20 inline-flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-white/70" />
                              <span>{cityLabel}</span>
                            </span>
                          )}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20">
                          {intensityOf(p.difficultyLevel)}
                        </span>
                      </div>
                    </div>

                    {/* Card Content with Expandable Dropdown Arrow */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {(p.organizationName || p.batchNumber) && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              {p.organizationName && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                                  {p.organizationLogo && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={p.organizationLogo}
                                      alt={p.organizationName}
                                      className="w-4 h-4 rounded-full object-contain bg-white border border-zinc-200/80 shrink-0"
                                    />
                                  )}
                                  <span>{p.organizationName}</span>
                                </span>
                              )}
                              {p.batchNumber ? (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-[9px] font-mono font-semibold uppercase text-zinc-700 dark:text-zinc-200">
                                  Batch {p.batchNumber}
                                </span>
                              ) : null}
                            </div>
                          )}
                          <h3 className="text-sm font-semibold text-zinc-950 dark:text-white line-clamp-2 leading-snug">
                            {p.title}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                            Coach {p.coachName}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                          }
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? `Hide details for ${p.title}`
                              : `Show schedule and details for ${p.title}`
                          }
                          className="shrink-0 w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 inline-flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-950 dark:hover:text-white transition active:scale-95"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-zinc-950 dark:text-white" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] p-3.5 space-y-3 text-xs">
                          <dl className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <dt className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 shrink-0">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>Schedule</span>
                              </dt>
                              <dd className="text-right font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                                {isOnline || !p.startDate
                                  ? `${t.explore.anytimeAccess} · ${p.durationDays} Modules`
                                  : `${formatDateWib(p.startDate)} – ${formatDateWib(p.endDate)} · ${p.durationDays}d`}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <dt className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 shrink-0">
                                <Users className="w-3.5 h-3.5 shrink-0" />
                                <span>Availability</span>
                              </dt>
                              <dd className="text-right font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                                {p.seatsLeft} / {p.maxQuota || p.seatsLeft} spots left
                                {(p.minQuota ?? 1) > 1 ? ` · Min ${p.minQuota}` : ""}
                              </dd>
                            </div>
                            {p.category && (
                              <div className="flex items-start justify-between gap-3">
                                <dt className="text-zinc-500 dark:text-zinc-400 shrink-0">
                                  {t.explore.categoryPrefix}
                                </dt>
                                <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                                  {p.category}
                                </dd>
                              </div>
                            )}
                          </dl>

                          <div
                            className={`grid ${isOnline ? "grid-cols-2" : "grid-cols-3"} gap-2 pt-2.5 border-t border-zinc-200/80 dark:border-white/10 text-center`}
                          >
                            <div className="rounded-lg bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 py-1.5 px-2">
                              <span className="block text-xs font-mono font-semibold tabular-nums text-zinc-950 dark:text-white">
                                {p.trainingDaysTotal ?? 0}
                              </span>
                              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">Training</span>
                            </div>
                            {!isOnline && (
                              <div className="rounded-lg bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 py-1.5 px-2">
                                <span className="block text-xs font-mono font-semibold tabular-nums text-zinc-950 dark:text-white">
                                  {p.connectDaysTotal ?? 0}
                                </span>
                                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">Connect</span>
                              </div>
                            )}
                            <div className="rounded-lg bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 py-1.5 px-2">
                              <span className="block text-xs font-mono font-semibold tabular-nums text-zinc-950 dark:text-white">
                                {p.restDaysTotal ?? 0}
                              </span>
                              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">Rest</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pricing & Action Buttons */}
                      <div className="mt-auto pt-3.5 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-zinc-950 dark:text-white">
                              {p.price > 0 ? formatIdr(p.price) : t.common.free}
                            </span>
                            {p.discountPercentage && p.discountPercentage > 0 && p.actualPrice && p.actualPrice > p.price ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                                -{p.discountPercentage}%
                              </span>
                            ) : null}
                          </div>
                          {p.actualPrice && p.actualPrice > p.price && (
                            <span className="text-[11px] text-zinc-400 line-through block">
                              {formatIdr(p.actualPrice)}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onViewDetails(p.id)}
                            className="px-3.5 py-1.5 rounded-full border border-zinc-300 dark:border-white/20 text-[11px] font-semibold active:scale-95 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                          >
                            {t.common.view}
                          </button>
                          {p.canEnroll ? (
                            <button
                              type="button"
                              disabled={registeringId === p.id}
                              onClick={() => onRegister(p.id)}
                              className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase disabled:opacity-50 active:scale-95 transition hover:opacity-90"
                            >
                              {p.enrollmentStatus === "PENDING"
                                ? t.common.payNow
                                : registeringId === p.id
                                  ? "..."
                                  : t.common.register}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {pages > 1 && (
              <nav aria-label="Plan pages" className="flex items-center justify-center gap-1.5 pt-2">
                <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs disabled:opacity-40 inline-flex items-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" /> {t.common.previous}
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" aria-current={n === safePage ? "page" : undefined} onClick={() => setPage(n)} className={`w-9 h-9 rounded-full text-xs font-semibold ${n === safePage ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "border border-zinc-200 dark:border-white/15"}`}>
                    {n}
                  </button>
                ))}
                <button type="button" disabled={safePage === pages} onClick={() => setPage(safePage + 1)} className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs disabled:opacity-40 inline-flex items-center gap-1">
                  {t.common.next} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
        </>
      )}
    </>
  );
}
