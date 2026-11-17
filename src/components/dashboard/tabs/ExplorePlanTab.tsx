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
import {
  BrandWordmark,
  EmptyState,
  ErrorState,
  FloatingHeader,
  HeaderBackButton,
  LoadingState,
  PullToRefreshBanner,
  formatDateWib,
  formatIdr,
  usePullToRefresh,
} from "./shared";
import {
  coachAvatarFor,
  computeSupportedFilterOptions,
  countActive,
  EMPTY,
  FORMAT_OPTIONS,
  intensityOf,
  matches,
  PAGE_SIZE,
  PRICE_BANDS,
  type ExploreProgram,
  type Filters,
  type LoadState,
} from "./explore/exploreFilters";
import { ExploreFilterDialog } from "./explore/ExploreFilterDialog";
import { ExploreCoachesView } from "./explore/ExploreCoachesView";

export function ExplorePlanTab({
  headerVisible,
  isActive = true,
  viewMode,
  onChangeViewMode,
  onRegister,
  onViewDetails,
  onOpenPlan: _onOpenPlan,
  registeringId,
}: {
  headerVisible: boolean;
  isActive?: boolean;
  viewMode?: "intro" | "catalog" | "coaches";
  onChangeViewMode?: (mode: "intro" | "catalog" | "coaches") => void;
  onRegister: (programId: string) => void;
  onViewDetails: (programId: string) => void;
  onOpenPlan: (programId: string) => void;
  registeringId: string | null;
}) {
  void _onOpenPlan;
  const [internalMode, setInternalMode] = useState<"intro" | "catalog" | "coaches">("intro");
  const mode = viewMode ?? internalMode;
  const setMode = (next: "intro" | "catalog" | "coaches") => {
    setInternalMode(next);
    onChangeViewMode?.(next);
    window.scrollTo({ top: 0 });
  };
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [coachSearch, setCoachSearch] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
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
  }, [debouncedSearch, applied, selectedCoach]);

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
  const supported = useMemo(() => computeSupportedFilterOptions(catalog), [catalog]);

  const availableCoaches = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach((p) => {
      if (p.coachName) {
        const name = p.coachName.trim();
        if (!map.has(name)) {
          map.set(name, coachAvatarFor(name));
        }
      }
    });
    if (!map.has("Julian Thorne")) map.set("Julian Thorne", "/coach.webp");
    if (!map.has("Dr. Marcus Vance")) map.set("Dr. Marcus Vance", "/coach2.webp");
    if (!map.has("Elena Rostova")) map.set("Elena Rostova", "/coach3.webp");
    return Array.from(map.entries()).map(([name, avatar]) => ({ name, avatar }));
  }, [catalog]);

  const filtered = catalog.filter((p) => {
    if (selectedCoach && p.coachName.trim().toLowerCase() !== selectedCoach.trim().toLowerCase()) {
      return false;
    }
    return matches(p, applied);
  });
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
    setApplied((f) => {
      const list = f[key as keyof Filters];
      if (!Array.isArray(list) || !value) return f;
      return { ...f, [key]: list.filter((v) => v !== value) };
    });
    setPage(1);
  };

  const chips: { key: string; value: string; label: string }[] = [
    ...(selectedCoach ? [{ key: "coach", value: selectedCoach, label: `Coach: ${selectedCoach}` }] : []),
    ...applied.format.map((value) => ({ key: "format", value, label: FORMAT_OPTIONS.find((o) => o.id === value)?.label || value })),
    ...applied.intensity.map((value) => ({ key: "intensity", value, label: value })),
    ...applied.category.map((value) => ({ key: "category", value, label: value })),
    ...applied.duration.map((value) => ({ key: "duration", value, label: value })),
    ...applied.price.map((value) => ({ key: "price", value, label: PRICE_BANDS.find((b) => b.id === value)?.label || value })),
    ...applied.experience.map((value) => ({ key: "experience", value, label: value })),
    ...applied.schedule.map((value) => ({ key: "schedule", value, label: value })),
  ];

  return (
    <>
      <FloatingHeader visible={headerVisible} transparent={mode === "intro"}>
        {mode === "intro" ? (
          <BrandWordmark light />
        ) : mode === "coaches" ? (
          <div className="w-full flex items-center gap-2">
            <HeaderBackButton
              onClick={() => setMode("intro")}
              ariaLabel="Back to Explore overview"
            />
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 px-3 h-9">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="search"
                inputMode="search"
                value={coachSearch}
                onChange={(e) => {
                  setCoachSearch(e.target.value);
                  setCoachPage(1);
                }}
                placeholder="Search coach name..."
                aria-label="Search coach name..."
                maxLength={100}
                className="w-full bg-transparent outline-none text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-xs placeholder:text-zinc-500"
              />
            </div>
          </div>
        ) : (
          <div className="relative w-full flex items-center gap-2">
            <HeaderBackButton
              onClick={() => setMode("intro")}
              ariaLabel="Back to Explore overview"
            />
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 px-3 h-9">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="search"
                inputMode="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plan or keyword..."
                aria-label="Search plan or keyword..."
                maxLength={100}
                className="w-full bg-transparent outline-none text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-xs placeholder:text-zinc-500"
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
                  ? "border-zinc-950 dark:border-white bg-zinc-100 dark:bg-white/20"
                  : "border-zinc-300 dark:border-white/15 bg-white dark:bg-white/10"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[9px] font-bold inline-flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        )}
      </FloatingHeader>

      {mode === "intro" ? (
        <div className="relative flex-1 flex flex-col">
          {/* True Full-Viewport Background Image */}
          <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image.webp"
              alt=""
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25" />
          </div>

          <div
            style={{ minHeight: "100dvh" }}
            className="relative z-10 w-full flex-1 flex flex-col justify-between gap-8 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
          >
            <div>
              <PullToRefreshBanner
                pullDistance={pullDistance}
                refreshing={refreshing && state.status === "ready"}
              />
            </div>

            <div className="space-y-6 max-w-md">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-px bg-white/50" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
                    Curated Plans
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-geometric font-light tracking-tight text-white leading-[1.08] drop-shadow-xs">
                  Explore All Plans
                </h1>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed max-w-sm">
                  Structured movement, whole-food nutrition, and circadian recovery plans led by certified longevity practitioners.
                </p>
              </div>

              <div className="w-10 h-px bg-white/30" />

              <div className="flex flex-col items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCoach(null);
                    setMode("catalog");
                  }}
                  className="group py-1 text-white hover:text-white/85 text-sm sm:text-base font-geometric font-medium inline-flex items-center gap-2.5 active:scale-95 transition drop-shadow-xs"
                >
                  <span>Browse All Plans</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCoachSearch("");
                    setCoachPage(1);
                    setMode("coaches");
                  }}
                  className="group py-1 text-white/75 hover:text-white text-xs sm:text-sm font-geometric font-normal inline-flex items-center gap-2 active:scale-95 transition drop-shadow-xs"
                >
                  <span>Explore All Coaches</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
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
        catalog={catalog}
        supported={supported}
        draft={draft}
        setDraft={setDraft}
        applied={applied}
        onToggle={toggle}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
          setPage(1);
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
            All Coaches
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
              <span>And more</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

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

        {state.status === "loading" && <LoadingState label="Loading plans..." />}
        {state.status === "error" && <ErrorState message={state.message} onRetry={() => setReloadKey((k) => k + 1)} />}
        {state.status === "ready" && filtered.length === 0 && (
          <EmptyState
            title={debouncedSearch || activeCount || selectedCoach ? "No plans match" : "No plans available yet"}
            description={
              debouncedSearch || activeCount || selectedCoach
                ? "Try another coach, search term, or clear filters."
                : "New plans will show up here when they are published."
            }
            action={
              activeCount || debouncedSearch || selectedCoach ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCoach(null);
                    setApplied(EMPTY);
                    setDraft(EMPTY);
                  }}
                  className="px-4 py-1.5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase"
                >
                  Clear all
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
                const locLabel = p.locationType === "ONLINE" ? "Online" : p.locationType === "HYBRID" ? "Hybrid" : "Onsite";
                const cityLabel = p.city || (p.locationType === "ONLINE" ? "Global" : null);
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
                          {p.organizationName && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">
                              {p.organizationName}
                            </span>
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
                                {formatDateWib(p.startDate)} – {formatDateWib(p.endDate)} · {p.durationDays}d
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
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-zinc-500 dark:text-zinc-400 shrink-0">Recommended</dt>
                              <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                                {p.recommendedFor || "All Levels"}
                              </dd>
                            </div>
                          </dl>

                          <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-zinc-200/80 dark:border-white/10 text-center">
                            <div className="rounded-lg bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 py-1.5 px-2">
                              <span className="block text-xs font-mono font-semibold tabular-nums text-zinc-950 dark:text-white">
                                {p.trainingDaysTotal ?? 0}
                              </span>
                              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">Training</span>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 py-1.5 px-2">
                              <span className="block text-xs font-mono font-semibold tabular-nums text-zinc-950 dark:text-white">
                                {p.connectDaysTotal ?? 0}
                              </span>
                              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">Connect</span>
                            </div>
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
                              {p.price > 0 ? formatIdr(p.price) : "Free"}
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
                            View
                          </button>
                          {p.canEnroll ? (
                            <button
                              type="button"
                              disabled={registeringId === p.id}
                              onClick={() => onRegister(p.id)}
                              className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase disabled:opacity-50 active:scale-95 transition hover:opacity-90"
                            >
                              {p.enrollmentStatus === "PENDING" ? "Pay now" : registeringId === p.id ? "..." : "Register"}
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
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" aria-current={n === safePage ? "page" : undefined} onClick={() => setPage(n)} className={`w-9 h-9 rounded-full text-xs font-semibold ${n === safePage ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "border border-zinc-200 dark:border-white/15"}`}>
                    {n}
                  </button>
                ))}
                <button type="button" disabled={safePage === pages} onClick={() => setPage(safePage + 1)} className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs disabled:opacity-40 inline-flex items-center gap-1">
                  Next <ChevronRight className="w-3.5 h-3.5" />
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
