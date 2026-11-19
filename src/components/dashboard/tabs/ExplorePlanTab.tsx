"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  communityMonogram,
  ExploreCommunitiesView,
} from "./explore/ExploreCommunitiesView";
import {
  ExploreCategoriesView,
  type SportCategoryItem,
} from "./explore/ExploreCategoriesView";

export type ExploreViewMode = "intro" | "catalog" | "categories" | "coaches" | "communities";

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
  const [categorySearch, setCategorySearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [masterCategories, setMasterCategories] = useState<string[]>([]);
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
      if (Array.isArray(json.categories)) {
        setMasterCategories(json.categories as string[]);
      }
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

  const sportsCategoriesWithCounts = useMemo<SportCategoryItem[]>(() => {
    const map = new Map<string, SportCategoryItem>();
    for (const rawName of masterCategories) {
      const name = rawName.trim();
      if (!name) continue;
      map.set(name.toLowerCase(), { name, count: 0, onlineCount: 0, hybridCount: 0 });
    }
    for (const p of catalog) {
      const isOnline = p.locationType === "ONLINE";
      for (const cat of categoriesOf(p)) {
        const key = cat.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
          if (isOnline) existing.onlineCount += 1;
          else existing.hybridCount += 1;
        } else {
          map.set(key, {
            name: cat,
            count: 1,
            onlineCount: isOnline ? 1 : 0,
            hybridCount: isOnline ? 0 : 1,
          });
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );
  }, [catalog, masterCategories]);

  const onlinePrograms = useMemo(
    () => catalog.filter((p) => p.locationType === "ONLINE"),
    [catalog]
  );
  const hybridPrograms = useMemo(
    () => catalog.filter((p) => p.locationType === "HYBRID"),
    [catalog]
  );
  const isIntroLoading = state.status === "loading";

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
        ) : mode === "categories" ? (
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
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder={isId ? "Cari cabang olahraga..." : "Search sports category..."}
                aria-label={isId ? "Cari cabang olahraga" : "Search sports category"}
                maxLength={100}
                className="w-full bg-transparent outline-none text-xs sm:text-sm text-zinc-950 placeholder:text-xs placeholder:text-zinc-500"
              />
            </div>
          </div>
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
        <div className="relative flex-1 flex flex-col" aria-busy={isIntroLoading}>
          <div className="relative z-10 w-full flex-1 flex flex-col gap-8 pt-[calc(5.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <PullToRefreshBanner
              pullDistance={pullDistance}
              refreshing={refreshing && state.status === "ready"}
            />

            {state.status === "error" ? (
              <ErrorState
                message={state.message}
                onRetry={() => setReloadKey((k) => k + 1)}
              />
            ) : (
              <>
                {/* =============================================================== */}
                {/* SECTION 1: EXPLORE ALL PLANS + COMPACT SPORTS CATEGORY SWIPE    */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-all-heading" className="space-y-3.5">
                  <h1
                    id="explore-all-heading"
                    className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950 leading-tight"
                  >
                    Explore All Plans
                  </h1>

                  {/* Horizontal Swipe: 5 Compact Sports Categories + See All */}
                  <div
                    role={isIntroLoading ? "status" : undefined}
                    aria-label={isIntroLoading ? t.explore.loadingPlans : undefined}
                    className="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 scroll-px-4 sm:scroll-px-0 scroll-smooth"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {isIntroLoading ? (
                      <>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div
                            key={idx}
                            aria-hidden="true"
                            className="w-[88px] sm:w-[96px] h-10 shrink-0 snap-start rounded-xl skeleton-block"
                          />
                        ))}
                        <div
                          aria-hidden="true"
                          className="w-[168px] h-10 shrink-0 snap-start rounded-xl skeleton-block"
                        />
                      </>
                    ) : (
                      <>
                        {sportsCategoriesWithCounts.slice(0, 5).map((cat) => (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() =>
                              openCatalogWith({ filters: { ...EMPTY, category: [cat.name] } })
                            }
                            className="h-10 px-4 shrink-0 snap-start rounded-xl bg-white hover:bg-zinc-100 inline-flex items-center justify-center text-center active:scale-[0.98] transition cursor-pointer"
                          >
                            <span className="text-xs sm:text-sm font-geometric font-semibold text-zinc-950 whitespace-nowrap">
                              {cat.name}
                            </span>
                          </button>
                        ))}

                        {/* Card 6: See All Sports Category */}
                        <button
                          type="button"
                          onClick={() => {
                            setCategorySearch("");
                            setMode("categories");
                          }}
                          className="group h-10 px-4 shrink-0 snap-start rounded-xl bg-zinc-950 text-white hover:bg-zinc-900 inline-flex items-center gap-1.5 active:scale-[0.98] transition cursor-pointer"
                        >
                          <span className="text-xs sm:text-sm font-geometric font-semibold text-white whitespace-nowrap">
                            See all sports category
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-white shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </button>
                      </>
                    )}
                  </div>
                </section>

                {/* =============================================================== */}
                {/* SECTION 2: FULL ONLINE PLANS — IMAGE BG + NAME + PRICE          */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-online-heading" className="space-y-3.5">
                  <div className="space-y-1">
                    <h2
                      id="explore-online-heading"
                      className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950"
                    >
                      Full Online Plans
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-xl">
                      {isId
                        ? "Latihan 100% online. Mulai kapan saja dan atur jadwal sendiri tanpa terikat lokasi."
                        : "100% online training. Start anytime and follow at your own pace from anywhere."}
                    </p>
                  </div>

                  <div
                    className="flex items-stretch gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 scroll-px-4 sm:scroll-px-0 scroll-smooth"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {isIntroLoading ? (
                      <>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div
                            key={idx}
                            aria-hidden="true"
                            className="w-[224px] sm:w-[244px] h-[248px] sm:h-[264px] shrink-0 snap-start rounded-2xl skeleton-block p-4 flex flex-col justify-end gap-2"
                          >
                            <div className="h-4 w-4/5 rounded-md bg-zinc-300/70" />
                            <div className="h-3.5 w-2/5 rounded-md bg-zinc-300/60" />
                          </div>
                        ))}
                        <div
                          aria-hidden="true"
                          className="w-[164px] sm:w-[176px] h-[248px] sm:h-[264px] shrink-0 snap-start rounded-2xl skeleton-block"
                        />
                      </>
                    ) : (
                      <>
                        {onlinePrograms.slice(0, 5).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onViewDetails(p.id)}
                            className="group relative w-[224px] sm:w-[244px] h-[248px] sm:h-[264px] shrink-0 snap-start rounded-2xl overflow-hidden bg-zinc-200 text-left active:scale-[0.98] transition cursor-pointer"
                          >
                            <Image
                              src={p.coverImage || "/test.webp"}
                              alt={p.title}
                              fill
                              sizes="(max-width: 640px) 224px, 244px"
                              unoptimized={!!p.coverImage && /^https?:/i.test(p.coverImage)}
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end gap-1">
                              <h3 className="text-sm sm:text-[15px] font-geometric font-semibold text-white leading-snug line-clamp-2">
                                {p.title}
                              </h3>
                              <span className="text-xs font-mono font-medium text-white/90">
                                {p.price > 0 ? formatIdr(p.price) : t.common.free}
                              </span>
                            </div>
                          </button>
                        ))}

                        {/* Card 6: See All Full Online */}
                        <button
                          type="button"
                          onClick={() =>
                            openCatalogWith({ filters: { ...EMPTY, format: ["ONLINE"] } })
                          }
                          className="group w-[164px] sm:w-[176px] h-[248px] sm:h-[264px] shrink-0 snap-start rounded-2xl bg-zinc-950 text-white hover:bg-zinc-900 p-4 text-left flex flex-col justify-between active:scale-[0.98] transition cursor-pointer"
                        >
                          <span className="text-sm sm:text-base font-geometric font-semibold text-white leading-snug block">
                            See all full online
                          </span>
                          <span className="w-9 h-9 rounded-full bg-white/15 group-hover:bg-white/25 inline-flex items-center justify-center transition">
                            <ArrowRight className="w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </section>

                {/* =============================================================== */}
                {/* SECTION 3: HYBRID PLANS — IMAGE BG + NAME + PRICE               */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-hybrid-heading" className="space-y-3.5">
                  <div className="space-y-1">
                    <h2
                      id="explore-hybrid-heading"
                      className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950"
                    >
                      Hybrid Plans
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-xl">
                      {isId
                        ? "Gabungan latihan online dan sesi tatap muka. Cek tanggal mulai dan lokasi sebelum mendaftar."
                        : "Online training paired with in-person sessions. Check the start date and venue before joining."}
                    </p>
                  </div>

                  <div
                    className="flex items-stretch gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 scroll-px-4 sm:scroll-px-0 scroll-smooth"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {isIntroLoading ? (
                      <>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div
                            key={idx}
                            aria-hidden="true"
                            className="w-[224px] sm:w-[244px] h-[248px] sm:h-[264px] shrink-0 snap-start rounded-2xl skeleton-block p-4 flex flex-col justify-end gap-2"
                          >
                            <div className="h-4 w-4/5 rounded-md bg-zinc-300/70" />
                            <div className="h-3.5 w-2/5 rounded-md bg-zinc-300/60" />
                          </div>
                        ))}
                        <div
                          aria-hidden="true"
                          className="w-[164px] sm:w-[176px] h-[248px] sm:h-[264px] shrink-0 snap-start rounded-2xl skeleton-block"
                        />
                      </>
                    ) : (
                      <>
                        {hybridPrograms.slice(0, 5).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onViewDetails(p.id)}
                            className="group relative w-[224px] sm:w-[244px] h-[248px] sm:h-[264px] shrink-0 snap-start rounded-2xl overflow-hidden bg-zinc-200 text-left active:scale-[0.98] transition cursor-pointer"
                          >
                            <Image
                              src={p.coverImage || "/pic.webp"}
                              alt={p.title}
                              fill
                              sizes="(max-width: 640px) 224px, 244px"
                              unoptimized={!!p.coverImage && /^https?:/i.test(p.coverImage)}
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end gap-1">
                              <h3 className="text-sm sm:text-[15px] font-geometric font-semibold text-white leading-snug line-clamp-2">
                                {p.title}
                              </h3>
                              <span className="text-xs font-mono font-medium text-white/90">
                                {p.price > 0 ? formatIdr(p.price) : t.common.free}
                              </span>
                            </div>
                          </button>
                        ))}

                        {/* Card 6: See All Hybrid */}
                        <button
                          type="button"
                          onClick={() =>
                            openCatalogWith({ filters: { ...EMPTY, format: ["HYBRID"] } })
                          }
                          className="group w-[164px] sm:w-[176px] h-[248px] sm:h-[264px] shrink-0 snap-start rounded-2xl bg-zinc-950 text-white hover:bg-zinc-900 p-4 text-left flex flex-col justify-between active:scale-[0.98] transition cursor-pointer"
                        >
                          <span className="text-sm sm:text-base font-geometric font-semibold text-white leading-snug block">
                            See all hybrid
                          </span>
                          <span className="w-9 h-9 rounded-full bg-white/15 group-hover:bg-white/25 inline-flex items-center justify-center transition">
                            <ArrowRight className="w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </section>

                {/* =============================================================== */}
                {/* SECTION 4: EXPLORE COMMUNITY — LOGO ONLY                        */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-community-heading" className="space-y-3.5">
                  <h2
                    id="explore-community-heading"
                    className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950"
                  >
                    Explore Community
                  </h2>

                  <div
                    className="flex items-stretch gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 scroll-px-4 sm:scroll-px-0 scroll-smooth"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {isIntroLoading ? (
                      <>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div
                            key={idx}
                            aria-hidden="true"
                            className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] shrink-0 snap-start rounded-2xl skeleton-block"
                          />
                        ))}
                        <div
                          aria-hidden="true"
                          className="w-[164px] h-[72px] sm:h-[80px] shrink-0 snap-start rounded-2xl skeleton-block"
                        />
                      </>
                    ) : (
                      <>
                        {availableCommunities.slice(0, 5).map((comm) => (
                          <button
                            key={comm.name}
                            type="button"
                            onClick={() => openCatalogWith({ community: comm.name })}
                            aria-label={comm.name}
                            title={comm.name}
                            className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] shrink-0 snap-start rounded-2xl bg-white hover:bg-zinc-100 p-2.5 flex items-center justify-center overflow-hidden active:scale-[0.97] transition cursor-pointer"
                          >
                            {comm.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={comm.logo}
                                alt={comm.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-base sm:text-lg font-geometric font-bold tracking-wider text-zinc-900">
                                {communityMonogram(comm.name)}
                              </span>
                            )}
                          </button>
                        ))}

                        {/* Card 6: See All Community */}
                        <button
                          type="button"
                          onClick={() => {
                            setCommunitySearch("");
                            setMode("communities");
                          }}
                          className="group h-[72px] sm:h-[80px] px-4 shrink-0 snap-start rounded-2xl bg-zinc-950 text-white hover:bg-zinc-900 flex items-center justify-between gap-2 active:scale-[0.98] transition cursor-pointer"
                        >
                          <span className="text-xs sm:text-sm font-geometric font-semibold text-white whitespace-nowrap">
                            See all community
                          </span>
                          <ArrowRight className="w-4 h-4 text-white shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </button>
                      </>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      ) : mode === "categories" ? (
        <ExploreCategoriesView
          categories={sportsCategoriesWithCounts}
          search={categorySearch}
          onResetSearch={() => setCategorySearch("")}
          onSelectCategory={(name) =>
            openCatalogWith({ filters: { ...EMPTY, category: [name] } })
          }
          pullDistance={pullDistance}
          refreshing={refreshing}
          loadStatus={state.status}
        />
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

      <div className="w-full space-y-4">
        <PullToRefreshBanner
          pullDistance={pullDistance}
          refreshing={refreshing && state.status === "ready"}
        />

        {/* MINIMAL COMPACT COACH FILTER STRIP */}
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pt-1 pb-0.5 scroll-smooth"
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
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5 scroll-smooth"
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

        {state.status === "loading" && (
          <div
            role="status"
            aria-label={t.explore.loadingPlans}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                aria-hidden="true"
                className="rounded-2xl overflow-hidden skeleton-block flex flex-col"
              >
                <div className="h-44 w-full bg-zinc-300/60" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded-md bg-zinc-300/70" />
                  <div className="h-3 w-1/3 rounded-md bg-zinc-300/60" />
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <div className="h-4 w-24 rounded-md bg-zinc-300/70" />
                    <div className="h-7 w-20 rounded-full bg-zinc-300/70" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3.5">
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
