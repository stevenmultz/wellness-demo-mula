"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { getPublicBadgeMeta, PublicProgramBadge } from "@/wellness/utils/timeline";
import {
  EmptyState,
  ErrorState,
  FloatingHeader,
  LoadingState,
  PullToRefreshBanner,
  formatDateWib,
  formatIdr,
  usePullToRefresh,
} from "./shared";

interface ExploreProgram {
  id: string;
  title: string;
  coverImage: string | null;
  coachName: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  price: number;
  actualPrice?: number;
  discountPercentage?: number;
  durationDays: number;
  locationType: string;
  city: string | null;
  maxQuota?: number;
  seatsLeft: number;
  badge: string;
  canEnroll: boolean;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
  difficultyLevel: string;
  category: string;
  recommendedFor: string;
  dailyCommitment: string | null;
  trainingDaysTotal?: number;
  connectDaysTotal?: number;
  restDaysTotal?: number;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; programs: ExploreProgram[] };

const PAGE_SIZE = 8;

const FORMAT_OPTIONS = [
  { id: "ONLINE", label: "Full Online" },
  { id: "HYBRID", label: "Hybrid (Online + Onsite)" },
  { id: "ONSITE", label: "Full Onsite" },
] as const;

const INTENSITY_OPTIONS = ["Low", "Moderate", "High", "Very High"] as const;
const CATEGORY_OPTIONS = ["Fitness", "Nutrition", "Mental Wellness", "Lifestyle", "Personal Development"] as const;
const DURATION_OPTIONS = ["7 Days", "14 Days", "30 Days", "60 Days", "90 Days", "Custom Duration"] as const;
const PRICE_BANDS = [
  { id: "free", label: "Free" },
  { id: "u100", label: "Under Rp100.000" },
  { id: "100-300", label: "Rp100.000 – 300.000" },
  { id: "300-500", label: "Rp300.000 – 500.000" },
  { id: "500+", label: "Rp500.000+" },
] as const;
const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced", "All Levels"] as const;
const SCHEDULE_OPTIONS = ["Flexible Schedule", "Fixed Schedule"] as const;

type Filters = {
  format: string[];
  intensity: string[];
  category: string[];
  duration: string[];
  price: string[];
  experience: string[];
  schedule: string[];
};

const EMPTY: Filters = {
  format: [],
  intensity: [],
  category: [],
  duration: [],
  price: [],
  experience: [],
  schedule: [],
};

function priceBand(amount: number): string {
  if (amount <= 0) return "free";
  if (amount < 100000) return "u100";
  if (amount < 300000) return "100-300";
  if (amount < 500000) return "300-500";
  return "500+";
}

function intensityOf(level: string): (typeof INTENSITY_OPTIONS)[number] {
  const value = (level || "").toUpperCase();
  if (value.includes("HIGH")) return "Very High";
  if (value === "ADVANCED") return "High";
  if (value === "INTERMEDIATE") return "High";
  if (value === "MODERATE") return "Moderate";
  return "Low";
}

function experienceOf(program: ExploreProgram): string[] {
  const tags: string[] = [];
  const level = (program.difficultyLevel || "").toUpperCase();
  const text = `${program.recommendedFor || ""} ${program.difficultyLevel || ""}`.toLowerCase();
  if (text.includes("all level")) tags.push("All Levels");
  if (level === "BEGINNER" || text.includes("beginner")) tags.push("Beginner");
  if (level === "MODERATE" || level === "INTERMEDIATE" || text.includes("intermediate")) tags.push("Intermediate");
  if (level === "ADVANCED" || level.includes("HIGH") || text.includes("advanced")) tags.push("Advanced");
  return tags;
}

function categoriesOf(program: ExploreProgram): string[] {
  const raw = (program.category || "").toLowerCase();
  const hits: string[] = [];
  if (/fit|pilates|workout|strength|hiit|mobility|cardio/.test(raw)) hits.push("Fitness");
  if (/nutri|meal|diet|food/.test(raw)) hits.push("Nutrition");
  if (/mental|mind|meditat|stress/.test(raw)) hits.push("Mental Wellness");
  if (/lifestyle|habit|longevity|sleep/.test(raw)) hits.push("Lifestyle");
  if (/personal|develop|growth|career/.test(raw)) hits.push("Personal Development");
  return hits;
}

function durationOf(days: number): string {
  if (days === 7) return "7 Days";
  if (days === 14) return "14 Days";
  if (days === 30) return "30 Days";
  if (days === 60) return "60 Days";
  if (days === 90) return "90 Days";
  return "Custom Duration";
}

function scheduleOf(program: ExploreProgram): string | null {
  const text = `${program.dailyCommitment || ""} ${program.recommendedFor || ""}`.toLowerCase();
  if (text.includes("flex")) return "Flexible Schedule";
  if (text.includes("fixed")) return "Fixed Schedule";
  return null;
}

function countActive(f: Filters): number {
  return (
    f.format.length +
    f.intensity.length +
    f.category.length +
    f.duration.length +
    f.price.length +
    f.experience.length +
    f.schedule.length
  );
}

function matches(program: ExploreProgram, f: Filters): boolean {
  if (f.format.length && !f.format.includes(program.locationType)) return false;
  if (f.intensity.length && !f.intensity.includes(intensityOf(program.difficultyLevel))) return false;
  if (f.category.length && !categoriesOf(program).some((c) => f.category.includes(c))) return false;
  if (f.duration.length && !f.duration.includes(durationOf(program.durationDays))) return false;
  if (f.experience.length && !experienceOf(program).some((e) => f.experience.includes(e))) return false;
  if (f.schedule.length) {
    const s = scheduleOf(program);
    if (!s || !f.schedule.includes(s)) return false;
  }
  if (f.price.length && !f.price.includes(priceBand(program.price))) return false;
  return true;
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="space-y-2 rounded-[2px] border border-zinc-200 dark:border-white/10 p-3">
      <legend className="px-1 text-[11px] font-semibold text-zinc-950 dark:text-white">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition active:scale-95 ${
                on
                  ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950"
                  : "border-zinc-300 dark:border-white/15 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function coachAvatarFor(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("marcus") || n.includes("vance") || n.includes("nutri") || n.includes("dr.")) return "/coach2.webp";
  if (n.includes("elena") || n.includes("rostova") || n.includes("sleep") || n.includes("somatics")) return "/coach3.webp";
  return "/coach.webp";
}

export function ExplorePlanTab({
  headerVisible,
  isActive = true,
  onRegister,
  onViewDetails,
  onOpenPlan: _onOpenPlan,
  registeringId,
}: {
  headerVisible: boolean;
  isActive?: boolean;
  onRegister: (programId: string) => void;
  onViewDetails: (programId: string) => void;
  onOpenPlan: (programId: string) => void;
  registeringId: string | null;
}) {
  void _onOpenPlan;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [showAllCoaches, setShowAllCoaches] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
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
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load programs.");
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
  const supported = useMemo(() => {
    const formats = new Set(catalog.map((p) => p.locationType));
    const intensities = new Set(catalog.map((p) => intensityOf(p.difficultyLevel)));
    const categories = new Set(catalog.flatMap(categoriesOf));
    const durations = new Set(catalog.map((p) => durationOf(p.durationDays)));
    const experiences = new Set(catalog.flatMap(experienceOf));
    const schedules = new Set(catalog.map(scheduleOf).filter(Boolean) as string[]);
    return {
      format: FORMAT_OPTIONS.filter((o) => formats.has(o.id)),
      intensity: INTENSITY_OPTIONS.filter((o) => intensities.has(o)),
      category: CATEGORY_OPTIONS.filter((o) => categories.has(o)),
      duration: DURATION_OPTIONS.filter((o) => durations.has(o)),
      experience: EXPERIENCE_OPTIONS.filter((o) => experiences.has(o)),
      schedule: SCHEDULE_OPTIONS.filter((o) => schedules.has(o)),
      price: catalog.some((p) => p.price <= 0) || catalog.some((p) => p.price > 0),
    };
  }, [catalog]);

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

  const displayedCoaches = useMemo(() => {
    if (showAllCoaches) return availableCoaches;
    return availableCoaches.slice(0, 5);
  }, [availableCoaches, showAllCoaches]);

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
      <FloatingHeader visible={headerVisible}>
        <div className="relative w-full flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-[2px] bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 px-3 h-9">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="search"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search program or keyword..."
              aria-label="Search program or keyword..."
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
              <span className="min-w-4 h-4 px-1 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[9px] font-bold inline-flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </FloatingHeader>

      {filtersOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Filters">
            <style>{`
              @keyframes fx-fade { from { opacity: 0 } to { opacity: 1 } }
              @keyframes fx-sheet { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
              .fx-fade { animation: fx-fade .2s ease-out both }
              .fx-sheet { animation: fx-sheet .26s cubic-bezier(.2,.8,.2,1) both }
              @media (prefers-reduced-motion: reduce) { .fx-fade, .fx-sheet { animation: none } }
            `}</style>
            <button type="button" aria-label="Close filters" className="fx-fade absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setFiltersOpen(false)} />
            <div className="fx-sheet relative w-full md:max-w-lg max-h-[88vh] flex flex-col rounded-t-3xl md:rounded-[2px] bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/15 shadow-2xl font-sans">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white">Filters</p>
                  <p className="text-[11px] text-zinc-500">{countActive(draft) > 0 ? `${countActive(draft)} selected` : "Choose what you want to see"}</p>
                </div>
                <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close" className="w-9 h-9 rounded-[2px] hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
                {catalog.length === 0 && <p className="text-xs text-zinc-500">No programs loaded yet, so there are no options to filter.</p>}
                <ChipGroup
                  label="Program format"
                  options={supported.format.map((o) => o.label)}
                  selected={draft.format.map((id) => FORMAT_OPTIONS.find((o) => o.id === id)?.label || id)}
                  onToggle={(label) => {
                    const id = FORMAT_OPTIONS.find((o) => o.label === label)?.id;
                    if (id) toggle("format", id);
                  }}
                />
                <ChipGroup label="Intensity level" options={supported.intensity} selected={draft.intensity} onToggle={(v) => toggle("intensity", v)} />
                <ChipGroup label="Program category" options={supported.category} selected={draft.category} onToggle={(v) => toggle("category", v)} />
                <ChipGroup label="Program duration" options={supported.duration} selected={draft.duration} onToggle={(v) => toggle("duration", v)} />
                {supported.price && (
                  <ChipGroup
                    label="Price"
                    options={PRICE_BANDS.filter((b) => catalog.some((p) => priceBand(p.price) === b.id)).map((b) => b.label)}
                    selected={draft.price.map((id) => PRICE_BANDS.find((b) => b.id === id)?.label || id)}
                    onToggle={(label) => {
                      const id = PRICE_BANDS.find((b) => b.label === label)?.id;
                      if (id) toggle("price", id);
                    }}
                  />
                )}
                <ChipGroup label="Experience level" options={supported.experience} selected={draft.experience} onToggle={(v) => toggle("experience", v)} />
                <ChipGroup label="Schedule" options={supported.schedule} selected={draft.schedule} onToggle={(v) => toggle("schedule", v)} />
              </div>
              <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-100 dark:border-white/10">
                <button
                  type="button"
                  disabled={countActive(draft) === 0 && countActive(applied) === 0}
                  onClick={() => {
                    setDraft(EMPTY);
                    setApplied(EMPTY);
                    setPage(1);
                  }}
                  className="px-4 py-2.5 rounded-[2px] border border-zinc-300 dark:border-white/20 text-xs font-semibold disabled:opacity-40 active:scale-95 transition"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApplied(draft);
                    setPage(1);
                    setFiltersOpen(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider active:scale-95 transition"
                >
                  Apply · {catalog.filter((p) => matches(p, draft)).length} result{catalog.filter((p) => matches(p, draft)).length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className="space-y-4">
        <PullToRefreshBanner
          pullDistance={pullDistance}
          refreshing={refreshing && state.status === "ready"}
        />

        {/* COACH FILTER GALLERY */}
        <div className="pt-0.5 pb-1">
          {selectedCoach && (
            <div className="flex items-center justify-end px-1 pb-1.5">
              <button
                type="button"
                onClick={() => setSelectedCoach(null)}
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition"
              >
                Clear coach filter
              </button>
            </div>
          )}

          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            {/* All Coaches Pill */}
            <button
              type="button"
              onClick={() => setSelectedCoach(null)}
              className={`shrink-0 h-10 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition active:scale-95 border ${
                !selectedCoach
                  ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white shadow-xs"
                  : "bg-white dark:bg-[#121215] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5"
              }`}
            >
              <span className="w-5 h-5 rounded-[2px] bg-zinc-200 dark:bg-white/15 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                All
              </span>
              <span>All Coaches</span>
            </button>

            {displayedCoaches.map(({ name, avatar }) => {
              const isSelected = selectedCoach?.toLowerCase() === name.toLowerCase();
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedCoach(isSelected ? null : name)}
                  className={`shrink-0 h-10 pl-1.5 pr-4 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition active:scale-95 border ${
                    isSelected
                      ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white shadow-xs"
                      : "bg-white dark:bg-[#121215] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatar}
                    alt={name}
                    className="w-7 h-7 rounded-[2px] object-cover border border-white/20 shadow-2xs"
                  />
                  <span className="truncate">{name}</span>
                </button>
              );
            })}

            {availableCoaches.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllCoaches((prev) => !prev)}
                className="shrink-0 h-10 px-3.5 rounded-[2px] text-xs font-semibold inline-flex items-center gap-1.5 transition active:scale-95 border border-dashed border-zinc-300 dark:border-white/20 bg-zinc-50/70 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                {showAllCoaches ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                  </>
                ) : (
                  <>
                    <span>Show All Coaches</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                      {availableCoaches.length}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
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

        {state.status === "loading" && <LoadingState label="Loading programs..." />}
        {state.status === "error" && <ErrorState message={state.message} onRetry={() => setReloadKey((k) => k + 1)} />}
        {state.status === "ready" && filtered.length === 0 && (
          <EmptyState
            title={debouncedSearch || activeCount || selectedCoach ? "No programs match" : "No programs available yet"}
            description={
              debouncedSearch || activeCount || selectedCoach
                ? "Try another coach, search term, or clear filters."
                : "New programs will show up here when they are published."
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
              <nav aria-label="Program pages" className="flex items-center justify-center gap-1.5 pt-2">
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
  );
}
