"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
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

type PromoBannerAction = "catalog" | "communities" | "online";

const EXPLORE_PROMO_BANNERS: ReadonlyArray<{
  id: string;
  tagEn: string;
  tagId: string;
  titleEn: string;
  titleId: string;
  subtitleEn: string;
  subtitleId: string;
  image: string;
  action: PromoBannerAction;
}> = [
  {
    id: "promo-early-bird",
    tagEn: "Promo",
    tagId: "Promo",
    titleEn: "Early Bird Cohort Pass",
    titleId: "Promo Early Bird Cohort",
    subtitleEn: "Save on upcoming hybrid & online training batches.",
    subtitleId: "Hemat untuk pendaftaran batch hybrid & online terbaru.",
    image: "/image.webp",
    action: "catalog",
  },
  {
    id: "news-community-partners",
    tagEn: "News",
    tagId: "Berita",
    titleEn: "New Verified Community Partners",
    titleId: "Partner Komunitas & Studio Baru",
    subtitleEn: "Explore newly joined studios, clubs, and coaching hubs.",
    subtitleId: "Jelajahi studio, klub, dan komunitas terbaru di zera.id.",
    image: "/pic.webp",
    action: "communities",
  },
  {
    id: "highlight-online-training",
    tagEn: "Highlight",
    tagId: "Sorotan",
    titleEn: "Flexible Online Programs",
    titleId: "Program Online Fleksibel",
    subtitleEn: "Train anytime with structured daily movement & recovery.",
    subtitleId: "Latihan kapan saja dengan panduan gerak & pemulihan harian.",
    image: "/test.webp",
    action: "online",
  },
];

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
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<
    "type" | "sports" | "community" | "city" | null
  >(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
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
  }, [debouncedSearch, applied, selectedCoach, selectedCommunity, selectedCity, sortBy]);

  useEffect(() => {
    if (!sortOpen && !openFilterMenu) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (sortOpen && sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setSortOpen(false);
      }
      if (openFilterMenu && filterBarRef.current && !filterBarRef.current.contains(target)) {
        setOpenFilterMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSortOpen(false);
        setOpenFilterMenu(null);
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [sortOpen, openFilterMenu]);

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
  const hybridCities = useMemo(() => {
    const cityMap = new Map<string, { name: string; count: number }>();
    for (const p of hybridPrograms) {
      const rawCity = (p.city || "").trim();
      if (!rawCity) continue;
      const key = rawCity.toLowerCase();
      const existing = cityMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        cityMap.set(key, { name: rawCity, count: 1 });
      }
    }
    return Array.from(cityMap.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );
  }, [hybridPrograms]);
  const isIntroLoading = state.status === "loading";
  const isOnlineTypeSelected =
    applied.format.length === 1 && applied.format[0] === "ONLINE";

  const availableCommunitiesForFilter = useMemo(() => {
    const scopedPrograms = catalog.filter((p) => {
      if (applied.format.length > 0 && !applied.format.includes(p.locationType)) {
        return false;
      }
      if (applied.category.length > 0) {
        const selectedCatLower = applied.category.map((c) => c.toLowerCase());
        if (!categoriesOf(p).some((c) => selectedCatLower.includes(c.toLowerCase()))) {
          return false;
        }
      }
      if (!isOnlineTypeSelected && selectedCity) {
        if ((p.city || "").trim().toLowerCase() !== selectedCity.trim().toLowerCase()) {
          return false;
        }
      }
      return true;
    });
    return buildExploreCommunities(scopedPrograms);
  }, [catalog, applied.category, applied.format, isOnlineTypeSelected, selectedCity]);

  const availableCitiesForFilter = useMemo(() => {
    const cityMap = new Map<string, string>();
    for (const p of catalog) {
      if (applied.format.length > 0 && !applied.format.includes(p.locationType)) {
        continue;
      }
      if (applied.category.length > 0) {
        const selectedCatLower = applied.category.map((c) => c.toLowerCase());
        if (!categoriesOf(p).some((c) => selectedCatLower.includes(c.toLowerCase()))) {
          continue;
        }
      }
      const rawCity = (p.city || "").trim();
      if (!rawCity) continue;
      const key = rawCity.toLowerCase();
      if (!cityMap.has(key)) cityMap.set(key, rawCity);
    }
    return Array.from(cityMap.values()).sort((a, b) => a.localeCompare(b));
  }, [catalog, applied.category, applied.format]);

  const coachScopedCatalog = useMemo(() => {
    let list = catalog;
    if (selectedCommunity) {
      list = list.filter(
        (p) =>
          (p.organizationName || "").trim().toLowerCase() ===
          selectedCommunity.trim().toLowerCase()
      );
    }
    if (selectedCity) {
      list = list.filter(
        (p) => (p.city || "").trim().toLowerCase() === selectedCity.trim().toLowerCase()
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
  }, [catalog, selectedCoach, selectedCommunity, selectedCity]);

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
  const hasAnyCatalogFilter = Boolean(
    activeCount || selectedCommunity || selectedCity || selectedCoach
  );

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
    city?: string | null;
  }) => {
    const nextFilters = opts?.filters ?? EMPTY;
    const isNextOnlineOnly =
      nextFilters.format.length === 1 && nextFilters.format[0] === "ONLINE";
    setSelectedCoach(opts?.coach ?? null);
    setSelectedCommunity(opts?.community ?? null);
    setSelectedCity(isNextOnlineOnly ? null : opts?.city ?? null);
    setApplied(nextFilters);
    setSortOpen(false);
    setOpenFilterMenu(null);
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
                  <div className="flex items-center justify-between gap-3">
                    <h1
                      id="explore-all-heading"
                      className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950 leading-tight"
                    >
                      Explore All Programs
                    </h1>
                    <button
                      type="button"
                      onClick={() => openCatalogWith()}
                      aria-label={isId ? "Lihat semua program" : "See all programs"}
                      title={isId ? "Lihat semua program" : "See all programs"}
                      className="shrink-0 w-9 h-9 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/90 text-zinc-900 inline-flex items-center justify-center active:scale-95 transition cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

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
                {/* SECTION 2: ONLINE PROGRAMS — WIDE BANNER CARDS                  */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-online-heading" className="space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <h2
                      id="explore-online-heading"
                      className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950"
                    >
                      Online Programs
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        openCatalogWith({ filters: { ...EMPTY, format: ["ONLINE"] } })
                      }
                      aria-label={
                        isId ? "Lihat semua Online Programs" : "See all Online Programs"
                      }
                      title={
                        isId ? "Lihat semua Online Programs" : "See all Online Programs"
                      }
                      className="shrink-0 w-8 h-8 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/90 text-zinc-900 inline-flex items-center justify-center active:scale-95 transition cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
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

                            {/* Top Badges: Online + Sport Category */}
                            <div className="absolute top-3 inset-x-3.5 flex flex-wrap items-center gap-1.5 z-10">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase bg-white text-zinc-950 shadow-xs">
                                Online
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
                      aria-label={
                        isId ? "Lihat semua Hybrid Programs" : "See all Hybrid Programs"
                      }
                      title={
                        isId ? "Lihat semua Hybrid Programs" : "See all Hybrid Programs"
                      }
                      className="shrink-0 w-8 h-8 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/90 text-zinc-900 inline-flex items-center justify-center active:scale-95 transition cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
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

                            {/* Top Badges: Hybrid + Sport Category */}
                            <div className="absolute top-3 inset-x-3.5 flex flex-wrap items-center gap-1.5 z-10">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase bg-white text-zinc-950 shadow-xs">
                                Hybrid
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
                {/* SECTION 4: HYBRID PROGRAMS AVAILABLE CITIES                     */}
                {/* =============================================================== */}
                {(isIntroLoading || hybridCities.length > 0) && (
                  <section aria-labelledby="explore-hybrid-cities-heading" className="space-y-3">
                    <h2
                      id="explore-hybrid-cities-heading"
                      className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950"
                    >
                      {isId ? "Hybrid Tersedia di Kota" : "Hybrid Available In"}
                    </h2>
                    <div
                      className="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 scroll-px-4 sm:scroll-px-0 scroll-smooth"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {isIntroLoading ? (
                        <>
                          {Array.from({ length: 4 }).map((_, idx) => (
                            <div
                              key={idx}
                              aria-hidden="true"
                              className="w-[126px] h-10 shrink-0 snap-start rounded-xl skeleton-block"
                            />
                          ))}
                        </>
                      ) : (
                        hybridCities.map((city) => (
                          <button
                            key={city.name}
                            type="button"
                            onClick={() =>
                              openCatalogWith({
                                filters: { ...EMPTY, format: ["HYBRID"] },
                                city: city.name,
                              })
                            }
                            className="h-10 px-3.5 shrink-0 snap-start rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200/80 inline-flex items-center gap-2 active:scale-[0.98] transition cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="text-xs sm:text-sm font-geometric font-semibold text-zinc-950 whitespace-nowrap">
                              {city.name}
                            </span>
                            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
                              {city.count}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </section>
                )}

                {/* =============================================================== */}
                {/* SECTION 5: COMMUNITY PARTNERS (FULL-BLEED LOGO BOXES)           */}
                {/* =============================================================== */}
                <section aria-labelledby="explore-community-heading" className="space-y-3.5">
                  <h2
                    id="explore-community-heading"
                    className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950"
                  >
                    Community Partners
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
                            style={
                              comm.logo
                                ? {
                                    backgroundImage: `url("${comm.logo.replace(/"/g, '\\"')}")`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundRepeat: "no-repeat",
                                  }
                                : undefined
                            }
                            className={`relative w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] shrink-0 snap-start rounded-2xl overflow-hidden flex items-center justify-center active:scale-[0.97] transition cursor-pointer ${
                              comm.logo
                                ? "bg-zinc-200"
                                : "bg-zinc-900 text-white hover:bg-zinc-800"
                            }`}
                          >
                            {!comm.logo && (
                              <span className="text-base sm:text-lg font-geometric font-bold tracking-wider">
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

                {/* =============================================================== */}
                {/* SECTION 6: 3 STACKED PROMO / NEWS BANNERS (NO SECTION HEADING)  */}
                {/* =============================================================== */}
                <section
                  aria-label={isId ? "Promo dan Berita" : "Promotions and News"}
                  className="space-y-3"
                >
                  {isIntroLoading ? (
                    <>
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                          key={idx}
                          aria-hidden="true"
                          className="w-full h-[136px] sm:h-[164px] rounded-2xl skeleton-block"
                        />
                      ))}
                    </>
                  ) : (
                    EXPLORE_PROMO_BANNERS.map((banner) => (
                      <button
                        key={banner.id}
                        type="button"
                        onClick={() => {
                          if (banner.action === "communities") {
                            setCommunitySearch("");
                            setMode("communities");
                          } else if (banner.action === "online") {
                            openCatalogWith({ filters: { ...EMPTY, format: ["ONLINE"] } });
                          } else {
                            openCatalogWith();
                          }
                        }}
                        className="group relative w-full h-[136px] sm:h-[164px] rounded-2xl overflow-hidden bg-zinc-900 text-left block active:scale-[0.99] transition cursor-pointer"
                      >
                        <Image
                          src={banner.image}
                          alt={isId ? banner.titleId : banner.titleEn}
                          fill
                          sizes="(max-width: 640px) 100vw, 960px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />

                        <div className="relative z-10 h-full p-4 sm:p-5 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/95 text-zinc-950 text-[10px] font-mono font-semibold uppercase tracking-wider">
                              {isId ? banner.tagId : banner.tagEn}
                            </span>
                            <span className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white inline-flex items-center justify-center group-hover:bg-white/25 transition">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          </div>

                          <div className="space-y-0.5 max-w-md">
                            <h3 className="text-base sm:text-lg font-geometric font-semibold text-white leading-snug line-clamp-1">
                              {isId ? banner.titleId : banner.titleEn}
                            </h3>
                            <p className="text-xs text-white/80 line-clamp-1">
                              {isId ? banner.subtitleId : banner.subtitleEn}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
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

        {/* COMPACT DROPDOWN FILTER BAR: TYPE, SPORTS, CITY (IF NOT ONLINE), COMMUNITY */}
        <div
          ref={filterBarRef}
          role="group"
          aria-label={isId ? "Filter program" : "Filter programs"}
          className="flex flex-wrap items-center gap-2 pt-1"
        >
          {/* 1. BY TYPE DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenFilterMenu((prev) => (prev === "type" ? null : "type"))
              }
              aria-haspopup="menu"
              aria-expanded={openFilterMenu === "type"}
              className={`h-8 px-3 rounded-full border text-xs font-geometric font-medium inline-flex items-center gap-1.5 transition active:scale-95 ${
                applied.format.length > 0
                  ? "bg-zinc-950 text-white border-zinc-950"
                  : "bg-white text-zinc-700 border-zinc-200/90 hover:border-zinc-400"
              }`}
            >
              <span>
                {applied.format[0] === "ONLINE"
                  ? "Online"
                  : applied.format[0] === "HYBRID"
                    ? "Hybrid"
                    : isId
                      ? "Tipe"
                      : "Type"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${
                  openFilterMenu === "type" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openFilterMenu === "type" && (
              <div
                role="menu"
                aria-label={isId ? "Filter berdasarkan tipe" : "Filter by type"}
                className="dashboard-nav-boxed absolute left-0 top-[calc(100%+0.4rem)] min-w-[168px] rounded-2xl bg-white border border-zinc-200/90 shadow-xl py-1.5 z-[70] animate-in fade-in zoom-in-95 duration-150"
              >
                {(
                  [
                    { id: "ALL", label: isId ? "Semua Tipe" : "All Types" },
                    { id: "ONLINE", label: "Online" },
                    { id: "HYBRID", label: "Hybrid" },
                  ] as const
                ).map((opt) => {
                  const active =
                    opt.id === "ALL"
                      ? applied.format.length === 0
                      : applied.format.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        setApplied((f) => ({
                          ...f,
                          format: opt.id === "ALL" ? [] : [opt.id],
                        }));
                        if (opt.id === "ONLINE") {
                          setSelectedCity(null);
                        }
                        setOpenFilterMenu(null);
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

          {/* 2. BY SPORTS DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenFilterMenu((prev) => (prev === "sports" ? null : "sports"))
              }
              aria-haspopup="menu"
              aria-expanded={openFilterMenu === "sports"}
              className={`h-8 px-3 rounded-full border text-xs font-geometric font-medium inline-flex items-center gap-1.5 transition active:scale-95 ${
                applied.category.length > 0
                  ? "bg-zinc-950 text-white border-zinc-950"
                  : "bg-white text-zinc-700 border-zinc-200/90 hover:border-zinc-400"
              }`}
            >
              <span className="max-w-[120px] truncate">
                {applied.category[0] || (isId ? "Olahraga" : "Sports")}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${
                  openFilterMenu === "sports" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openFilterMenu === "sports" && (
              <div
                role="menu"
                aria-label={isId ? "Filter berdasarkan olahraga" : "Filter by sports"}
                className="dashboard-nav-boxed absolute left-0 top-[calc(100%+0.4rem)] min-w-[184px] max-h-64 overflow-y-auto rounded-2xl bg-white border border-zinc-200/90 shadow-xl py-1.5 z-[70] animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={applied.category.length === 0}
                  onClick={() => {
                    setApplied((f) => ({ ...f, category: [] }));
                    setSelectedCommunity(null);
                    setOpenFilterMenu(null);
                    setPage(1);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-geometric flex items-center justify-between gap-2 transition ${
                    applied.category.length === 0
                      ? "font-semibold text-zinc-950 bg-zinc-100/80"
                      : "font-medium text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <span>{isId ? "Semua Olahraga" : "All Sports"}</span>
                  {applied.category.length === 0 && (
                    <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                  )}
                </button>
                {sportsCategoriesWithCounts.map((cat) => {
                  const active = applied.category.some(
                    (c) => c.toLowerCase() === cat.name.toLowerCase()
                  );
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        setApplied((f) => ({ ...f, category: [cat.name] }));
                        setSelectedCommunity(null);
                        setOpenFilterMenu(null);
                        setPage(1);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-geometric flex items-center justify-between gap-2 transition ${
                        active
                          ? "font-semibold text-zinc-950 bg-zinc-100/80"
                          : "font-medium text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {active && <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. BY CITY DROPDOWN (hidden when Type is Online) */}
          {!isOnlineTypeSelected && (
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenFilterMenu((prev) => (prev === "city" ? null : "city"))
                }
                aria-haspopup="menu"
                aria-expanded={openFilterMenu === "city"}
                className={`h-8 px-3 rounded-full border text-xs font-geometric font-medium inline-flex items-center gap-1.5 transition active:scale-95 ${
                  selectedCity
                    ? "bg-zinc-950 text-white border-zinc-950"
                    : "bg-white text-zinc-700 border-zinc-200/90 hover:border-zinc-400"
                }`}
              >
                <span className="max-w-[120px] truncate">
                  {selectedCity || (isId ? "Kota" : "City")}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${
                    openFilterMenu === "city" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openFilterMenu === "city" && (
                <div
                  role="menu"
                  aria-label={isId ? "Filter berdasarkan kota" : "Filter by city"}
                  className="dashboard-nav-boxed absolute left-0 top-[calc(100%+0.4rem)] min-w-[184px] max-h-64 overflow-y-auto rounded-2xl bg-white border border-zinc-200/90 shadow-xl py-1.5 z-[70] animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={!selectedCity}
                    onClick={() => {
                      setSelectedCity(null);
                      setOpenFilterMenu(null);
                      setPage(1);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-geometric flex items-center justify-between gap-2 transition ${
                      !selectedCity
                        ? "font-semibold text-zinc-950 bg-zinc-100/80"
                        : "font-medium text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span>{isId ? "Semua Kota" : "All Cities"}</span>
                    {!selectedCity && (
                      <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                    )}
                  </button>
                  {availableCitiesForFilter.length === 0 ? (
                    <p className="px-3.5 py-2 text-[11px] text-zinc-400">
                      {isId ? "Tidak ada kota tersedia" : "No cities available"}
                    </p>
                  ) : (
                    availableCitiesForFilter.map((cityName) => {
                      const active =
                        selectedCity?.toLowerCase() === cityName.toLowerCase();
                      return (
                        <button
                          key={cityName}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            setSelectedCity(cityName);
                            setOpenFilterMenu(null);
                            setPage(1);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs font-geometric flex items-center justify-between gap-2 transition ${
                            active
                              ? "font-semibold text-zinc-950 bg-zinc-100/80"
                              : "font-medium text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          <span className="truncate">{cityName}</span>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. BY COMMUNITY DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenFilterMenu((prev) =>
                  prev === "community" ? null : "community"
                )
              }
              aria-haspopup="menu"
              aria-expanded={openFilterMenu === "community"}
              className={`h-8 px-3 rounded-full border text-xs font-geometric font-medium inline-flex items-center gap-1.5 transition active:scale-95 ${
                selectedCommunity
                  ? "bg-zinc-950 text-white border-zinc-950"
                  : "bg-white text-zinc-700 border-zinc-200/90 hover:border-zinc-400"
              }`}
            >
              <span className="max-w-[130px] truncate">
                {selectedCommunity || (isId ? "Komunitas" : "Community")}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${
                  openFilterMenu === "community" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openFilterMenu === "community" && (
              <div
                role="menu"
                aria-label={isId ? "Filter berdasarkan komunitas" : "Filter by community"}
                className="dashboard-nav-boxed absolute right-0 sm:left-0 sm:right-auto top-[calc(100%+0.4rem)] min-w-[208px] max-w-[250px] max-h-64 overflow-y-auto rounded-2xl bg-white border border-zinc-200/90 shadow-xl py-1.5 z-[70] animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={!selectedCommunity}
                  onClick={() => {
                    setSelectedCommunity(null);
                    setOpenFilterMenu(null);
                    setPage(1);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-geometric flex items-center justify-between gap-2 transition ${
                    !selectedCommunity
                      ? "font-semibold text-zinc-950 bg-zinc-100/80"
                      : "font-medium text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <span>{isId ? "Semua Komunitas" : "All Communities"}</span>
                  {!selectedCommunity && (
                    <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                  )}
                </button>
                {availableCommunitiesForFilter.map((comm) => {
                  const active =
                    selectedCommunity?.toLowerCase() === comm.name.toLowerCase();
                  return (
                    <button
                      key={comm.name}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        setSelectedCommunity(comm.name);
                        setOpenFilterMenu(null);
                        setPage(1);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-geometric flex items-center justify-between gap-2 transition ${
                        active
                          ? "font-semibold text-zinc-950 bg-zinc-100/80"
                          : "font-medium text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        {comm.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={comm.logo}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover shrink-0 bg-zinc-100"
                          />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                            {communityMonogram(comm.name)}
                          </span>
                        )}
                        <span className="truncate">{comm.name}</span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-zinc-950 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {hasAnyCatalogFilter && (
            <button
              type="button"
              onClick={() => {
                setApplied(EMPTY);
                setSelectedCommunity(null);
                setSelectedCity(null);
                setSelectedCoach(null);
                setOpenFilterMenu(null);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-full text-xs font-geometric font-medium text-zinc-500 hover:text-zinc-950 inline-flex items-center gap-1 transition"
            >
              <X className="w-3 h-3" />
              <span>{t.common.reset}</span>
            </button>
          )}
        </div>

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
              debouncedSearch || hasAnyCatalogFilter
                ? t.explore.noPlansMatch
                : t.explore.noPlansYet
            }
            description={
              debouncedSearch || hasAnyCatalogFilter
                ? t.explore.noPlansMatchDesc
                : t.explore.noPlansYetDesc
            }
            action={
              hasAnyCatalogFilter || debouncedSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCoach(null);
                    setSelectedCommunity(null);
                    setSelectedCity(null);
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

                    {/* Top Badges: Online / Hybrid + Sport Category */}
                    <div className="absolute top-3 inset-x-3.5 flex flex-wrap items-center gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase bg-white text-zinc-950 shadow-xs">
                        {isOnline ? "Online" : "Hybrid"}
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
