"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  BrandWordmark,
  EmptyState,
  ErrorState,
  FloatingHeader,
  HeaderBackButton,
  HeaderProfileButton,
  type HeaderProfileMenuActions,
  PullToRefreshBanner,
  formatIdr,
  usePullToRefresh,
} from "./shared";
import {
  categoriesOf,
  coachAvatarFor,
  countActive,
  EMPTY,
  matches,
  PAGE_SIZE,
  splitCoachTokens,
  type ExploreProgram,
  type Filters,
  type LoadState,
} from "./explore/exploreFilters";
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

type ExploreSortBy =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "duration_asc"
  | "duration_desc"
  | "title_asc";

export function ExplorePlanTab({
  headerVisible,
  isActive = true,
  viewMode,
  onChangeViewMode,
  onRegister: _onRegister,
  onViewDetails,
  onOpenPlan: _onOpenPlan,
  registeringId: _registeringId,
  profileAvatarUrl,
  profileName,
  profileEmail,
  onOpenProfile,
  profileMenuActions,
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
  profileMenuActions?: HeaderProfileMenuActions;
}) {
  void _onOpenPlan;
  void _onRegister;
  void _registeringId;
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
  const [sortBy, setSortBy] = useState<ExploreSortBy>("recommended");
  const [sortOpen, setSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
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
  }, [debouncedSearch, applied, selectedCoach, selectedCommunity, sortBy]);

  useEffect(() => {
    if (!sortOpen) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

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
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load programs.");
      if (Array.isArray(json.categories)) {
        setMasterCategories(json.categories as string[]);
      }
      setState({ status: "ready", programs: json.programs as ExploreProgram[] });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setState((prev) =>
        prev.status === "ready"
          ? prev
          : { status: "error", message: err instanceof Error ? err.message : "Failed to load programs." }
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

  const availableCommunitiesForFilter = useMemo(() => {
    if (applied.category.length > 0) {
      const selectedCatLower = applied.category.map((c) => c.toLowerCase());
      const scopedPrograms = catalog.filter((p) => {
        if (applied.format.length > 0 && !applied.format.includes(p.locationType)) {
          return false;
        }
        return categoriesOf(p).some((c) => selectedCatLower.includes(c.toLowerCase()));
      });
      return buildExploreCommunities(scopedPrograms);
    }
    if (selectedCommunity) {
      return availableCommunities;
    }
    return [];
  }, [catalog, applied.category, applied.format, selectedCommunity, availableCommunities]);

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

  const filtered = useMemo(() => {
    const list = coachScopedCatalog.filter((p) => matches(p, applied));
    if (sortBy === "recommended") return list;
    const sorted = [...list];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => a.price - b.price || a.title.localeCompare(b.title));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => b.price - a.price || a.title.localeCompare(b.title));
    } else if (sortBy === "duration_asc") {
      sorted.sort((a, b) => a.durationDays - b.durationDays || a.title.localeCompare(b.title));
    } else if (sortBy === "duration_desc") {
      sorted.sort((a, b) => b.durationDays - a.durationDays || a.title.localeCompare(b.title));
    } else if (sortBy === "title_asc") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [coachScopedCatalog, applied, sortBy]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = countActive(applied);

  const isId = locale === "id";

  const sortOptions: Array<{ id: ExploreSortBy; label: string }> = [
    { id: "recommended", label: isId ? "Paling Relevan" : "Recommended" },
    { id: "price_asc", label: isId ? "Harga: Termurah" : "Price: Low to High" },
    { id: "price_desc", label: isId ? "Harga: Termahal" : "Price: High to Low" },
    { id: "duration_asc", label: isId ? "Durasi: Tersingkat" : "Duration: Shortest" },
    { id: "duration_desc", label: isId ? "Durasi: Terlama" : "Duration: Longest" },
    { id: "title_asc", label: isId ? "Nama: A–Z" : "Name: A–Z" },
  ];

  const openCatalogWith = (opts?: {
    filters?: Filters;
    community?: string | null;
    coach?: string | null;
  }) => {
    const nextFilters = opts?.filters ?? EMPTY;
    setSelectedCoach(opts?.coach ?? null);
    setSelectedCommunity(opts?.community ?? null);
    setApplied(nextFilters);
    setSortOpen(false);
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
              menuActions={profileMenuActions}
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
            <div ref={sortMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSortOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={sortOpen}
                className={`shrink-0 h-9 px-3 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition ${
                  sortBy !== "recommended"
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{isId ? "Urutkan" : "Sort by"}</span>
              </button>

              {sortOpen && (
                <div
                  role="menu"
                  aria-label={isId ? "Urutkan program" : "Sort programs"}
                  className="dashboard-nav-boxed absolute right-0 top-[calc(100%+0.5rem)] w-52 rounded-2xl bg-white border border-zinc-200/90 shadow-xl py-1.5 z-[70] animate-in fade-in zoom-in-95 duration-150"
                >
                  {sortOptions.map((opt) => {
                    const active = sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => {
                          setSortBy(opt.id);
                          setSortOpen(false);
                          setPage(1);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-geometric flex items-center justify-between gap-2 transition ${
                          active
                            ? "font-semibold text-zinc-950 bg-zinc-100/80"
                            : "font-medium text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
                {/* SECTION 1: EXPLORE ALL PROGRAMS + COMPACT SPORTS CATEGORY SWIPE */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-all-heading" className="space-y-3.5">
                  <h1
                    id="explore-all-heading"
                    className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950 leading-tight"
                  >
                    Explore All Programs
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
                {/* SECTION 2: FULL ONLINE PROGRAMS — WIDE BANNER CARDS             */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-online-heading" className="space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2
                        id="explore-online-heading"
                        className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950"
                      >
                        Full Online Programs
                      </h2>
                      <button
                        type="button"
                        onClick={() =>
                          openCatalogWith({ filters: { ...EMPTY, format: ["ONLINE"] } })
                        }
                        className="shrink-0 h-8 px-3 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/90 text-xs font-geometric font-medium text-zinc-900 inline-flex items-center gap-1 active:scale-95 transition cursor-pointer"
                      >
                        <span>{isId ? "Lihat Semua" : "See All"}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
                    </div>
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
                            className="w-[300px] sm:w-[344px] h-[168px] sm:h-[186px] shrink-0 snap-start rounded-2xl skeleton-block p-4 flex flex-col justify-end gap-2"
                          >
                            <div className="h-4 w-3/4 rounded-md bg-zinc-300/70" />
                            <div className="h-3.5 w-1/3 rounded-md bg-zinc-300/60" />
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {onlinePrograms.slice(0, 5).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onViewDetails(p.id)}
                            className="group relative w-[300px] sm:w-[344px] h-[168px] sm:h-[186px] shrink-0 snap-start rounded-2xl overflow-hidden bg-zinc-200 text-left active:scale-[0.98] transition cursor-pointer"
                          >
                            <Image
                              src={p.coverImage || "/test.webp"}
                              alt={p.title}
                              fill
                              sizes="(max-width: 640px) 300px, 344px"
                              unoptimized={!!p.coverImage && /^https?:/i.test(p.coverImage)}
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

                            {/* Top Badges: Full Online, Commitment Time, Sport Category */}
                            <div className="absolute top-3 inset-x-3.5 flex flex-wrap items-center gap-1.5 z-10">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase bg-white text-zinc-950 shadow-xs">
                                Full Online
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                                {p.dailyCommitment || `${p.durationDays}d`}
                              </span>
                              {p.category && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                                  {p.category}
                                </span>
                              )}
                            </div>

                            <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex flex-col justify-end gap-0.5">
                              <h3 className="text-sm sm:text-base font-geometric font-semibold text-white leading-snug line-clamp-1">
                                {p.title}
                              </h3>
                              <span className="text-xs font-mono font-medium text-white/90">
                                {p.price > 0 ? formatIdr(p.price) : t.common.free}
                              </span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </section>

                {/* =============================================================== */}
                {/* SECTION 3: HYBRID PROGRAMS — WIDE BANNER CARDS                  */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-hybrid-heading" className="space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2
                        id="explore-hybrid-heading"
                        className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950"
                      >
                        Hybrid Programs
                      </h2>
                      <button
                        type="button"
                        onClick={() =>
                          openCatalogWith({ filters: { ...EMPTY, format: ["HYBRID"] } })
                        }
                        className="shrink-0 h-8 px-3 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/90 text-xs font-geometric font-medium text-zinc-900 inline-flex items-center gap-1 active:scale-95 transition cursor-pointer"
                      >
                        <span>{isId ? "Lihat Semua" : "See All"}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
                    </div>
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
                            className="w-[300px] sm:w-[344px] h-[168px] sm:h-[186px] shrink-0 snap-start rounded-2xl skeleton-block p-4 flex flex-col justify-end gap-2"
                          >
                            <div className="h-4 w-3/4 rounded-md bg-zinc-300/70" />
                            <div className="h-3.5 w-1/3 rounded-md bg-zinc-300/60" />
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {hybridPrograms.slice(0, 5).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onViewDetails(p.id)}
                            className="group relative w-[300px] sm:w-[344px] h-[168px] sm:h-[186px] shrink-0 snap-start rounded-2xl overflow-hidden bg-zinc-200 text-left active:scale-[0.98] transition cursor-pointer"
                          >
                            <Image
                              src={p.coverImage || "/pic.webp"}
                              alt={p.title}
                              fill
                              sizes="(max-width: 640px) 300px, 344px"
                              unoptimized={!!p.coverImage && /^https?:/i.test(p.coverImage)}
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

                            {/* Top Badges: Hybrid, City/Location, Sport Category */}
                            <div className="absolute top-3 inset-x-3.5 flex flex-wrap items-center gap-1.5 z-10">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase bg-white text-zinc-950 shadow-xs">
                                Hybrid
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                                {p.city || "Onsite"}
                              </span>
                              {p.category && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                                  {p.category}
                                </span>
                              )}
                            </div>

                            <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex flex-col justify-end gap-0.5">
                              <h3 className="text-sm sm:text-base font-geometric font-semibold text-white leading-snug line-clamp-1">
                                {p.title}
                              </h3>
                              <span className="text-xs font-mono font-medium text-white/90">
                                {p.price > 0 ? formatIdr(p.price) : t.common.free}
                              </span>
                            </div>
                          </button>
                        ))}
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
      <div className="w-full space-y-3.5">
        <PullToRefreshBanner
          pullDistance={pullDistance}
          refreshing={refreshing && state.status === "ready"}
        />

        {/* FORMAT FILTER STRIP: ALL / FULL ONLINE / HYBRID */}
        <div
          role="group"
          aria-label={isId ? "Filter format program" : "Filter program format"}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pt-1 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {(
            [
              { id: "ALL", label: isId ? "Semua" : "All" },
              { id: "ONLINE", label: "Full Online" },
              { id: "HYBRID", label: "Hybrid" },
            ] as const
          ).map((fmt) => {
            const isSelected =
              fmt.id === "ALL"
                ? applied.format.length === 0
                : applied.format.includes(fmt.id);
            return (
              <button
                key={fmt.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  const nextFormat =
                    fmt.id === "ALL" ? [] : isSelected ? [] : [fmt.id];
                  setApplied((f) => ({ ...f, format: nextFormat }));
                  setPage(1);
                }}
                className={`shrink-0 h-8 px-4 rounded-full text-xs font-geometric font-medium transition focus:outline-none ${
                  isSelected
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-white/30"
                }`}
              >
                {fmt.label}
              </button>
            );
          })}
        </div>

        {/* SPORTS CATEGORY FILTER STRIP */}
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          <button
            type="button"
            onClick={() => {
              setApplied((f) => ({ ...f, category: [] }));
              setSelectedCommunity(null);
              setPage(1);
            }}
            className={`shrink-0 h-8 px-4 rounded-full text-xs font-geometric font-medium transition focus:outline-none ${
              applied.category.length === 0
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-white/30"
            }`}
          >
            {isId ? "Semua Kategori" : "All Categories"}
          </button>
          {sportsCategoriesWithCounts.map((cat) => {
            const isSelected = applied.category.some(
              (c) => c.toLowerCase() === cat.name.toLowerCase()
            );
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => {
                  const nextCats = isSelected ? [] : [cat.name];
                  setApplied((f) => ({ ...f, category: nextCats }));
                  setSelectedCommunity(null);
                  setPage(1);
                }}
                className={`shrink-0 h-8 px-4 rounded-full text-xs font-geometric font-medium transition focus:outline-none ${
                  isSelected
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-white/30"
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* DYNAMIC COMMUNITY FILTER STRIP (CLEAN PILLS, NO "COMMUNITY:" PREFIX) */}
        {availableCommunitiesForFilter.length > 0 && (
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedCommunity(null);
                setPage(1);
              }}
              className={`shrink-0 h-7 px-3 rounded-full text-xs font-geometric font-medium transition focus:outline-none ${
                !selectedCommunity
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950"
              }`}
            >
              {isId ? "Semua Komunitas" : "All Communities"}
            </button>
            {availableCommunitiesForFilter.map((comm) => {
              const isSelected = selectedCommunity?.toLowerCase() === comm.name.toLowerCase();
              return (
                <button
                  key={comm.name}
                  type="button"
                  onClick={() => {
                    setSelectedCommunity(isSelected ? null : comm.name);
                    setPage(1);
                  }}
                  className={`shrink-0 h-7 pl-1.5 pr-3 rounded-full inline-flex items-center gap-1.5 text-xs font-geometric font-medium transition focus:outline-none ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                      : "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/15"
                  }`}
                >
                  {comm.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comm.logo}
                      alt={comm.name}
                      className="w-4 h-4 rounded-full object-cover shrink-0 bg-white"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-zinc-300 text-zinc-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                      {communityMonogram(comm.name)}
                    </span>
                  )}
                  <span className="whitespace-nowrap">{comm.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {selectedCoach && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCoach(null);
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 transition hover:bg-zinc-200 dark:hover:bg-white/20"
            >
              {t.explore.coachPrefix}: {selectedCoach} <X className="w-3 h-3 text-zinc-400" />
            </button>
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
                className="h-[188px] sm:h-[200px] rounded-2xl overflow-hidden skeleton-block p-4 flex flex-col justify-end gap-2"
              >
                <div className="h-4 w-3/4 rounded-md bg-zinc-300/70" />
                <div className="h-3.5 w-1/3 rounded-md bg-zinc-300/60" />
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
                    setSortBy("recommended");
                  }}
                  className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase"
                >
                  {t.common.clearAll}
                </button>
              ) : undefined
            }
          />
        )}

        {state.status === "ready" && visible.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visible.map((p) => {
                const isOnline = p.locationType === "ONLINE";

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onViewDetails(p.id)}
                    className="group relative w-full h-[188px] sm:h-[200px] rounded-2xl overflow-hidden bg-zinc-200 text-left active:scale-[0.98] transition cursor-pointer"
                  >
                    <Image
                      src={p.coverImage || (isOnline ? "/test.webp" : "/pic.webp")}
                      alt={p.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      unoptimized={!!p.coverImage && /^https?:/i.test(p.coverImage)}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

                    {/* Top Badges: Format, Commitment/City, Sport Category */}
                    <div className="absolute top-3 inset-x-3.5 flex flex-wrap items-center gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase bg-white text-zinc-950 shadow-xs">
                        {isOnline ? "Full Online" : "Hybrid"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                        {isOnline
                          ? p.dailyCommitment || `${p.durationDays}d`
                          : p.city || "Onsite"}
                      </span>
                      {p.category && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                          {p.category}
                        </span>
                      )}
                    </div>

                    {/* Bottom Content: Title & Price */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex flex-col justify-end gap-0.5">
                      <h3 className="text-sm sm:text-base font-geometric font-semibold text-white leading-snug line-clamp-1">
                        {p.title}
                      </h3>
                      <span className="text-xs sm:text-sm font-mono font-medium text-white/95">
                        {p.price > 0 ? formatIdr(p.price) : t.common.free}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {pages > 1 && (
              <nav aria-label="Program pages" className="flex items-center justify-center gap-1.5 pt-2">
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
