"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { getPublicBadgeMeta, PublicProgramBadge } from "@/wellness/utils/timeline";
import { EmptyState, ErrorState, FloatingHeader, LoadingState, formatDateWib, formatIdr } from "./shared";

interface ExploreProgram {
  id: string;
  title: string;
  coverImage: string | null;
  coachName: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  price: number;
  durationDays: number;
  locationType: string;
  city: string | null;
  seatsLeft: number;
  badge: string;
  canEnroll: boolean;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
  difficultyLevel: string;
  category: string;
  recommendedFor: string;
  dailyCommitment: string | null;
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
const PRICE_OPTIONS = ["Free", "Paid"] as const;
const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced", "All Levels"] as const;
const SCHEDULE_OPTIONS = ["Flexible Schedule", "Fixed Schedule"] as const;

type Filters = {
  format: string[];
  intensity: string[];
  category: string[];
  duration: string[];
  price: string[];
  priceMin: string;
  priceMax: string;
  experience: string[];
  schedule: string[];
};

const EMPTY: Filters = {
  format: [],
  intensity: [],
  category: [],
  duration: [],
  price: [],
  priceMin: "",
  priceMax: "",
  experience: [],
  schedule: [],
};

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
    f.schedule.length +
    (f.priceMin || f.priceMax ? 1 : 0)
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
  const wantsFree = f.price.includes("Free");
  const wantsPaid = f.price.includes("Paid");
  if ((wantsFree || wantsPaid) && !(wantsFree && program.price <= 0) && !(wantsPaid && program.price > 0)) return false;
  const min = f.priceMin ? Number(f.priceMin) : null;
  const max = f.priceMax ? Number(f.priceMax) : null;
  if (min !== null && !Number.isNaN(min) && program.price < min) return false;
  if (max !== null && !Number.isNaN(max) && program.price > max) return false;
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
    <fieldset className="space-y-2">
      <legend className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
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

export function ExplorePlanTab({
  headerVisible,
  onRegister,
  onViewDetails,
  onOpenPlan,
  registeringId,
}: {
  headerVisible: boolean;
  onRegister: (programId: string) => void;
  onViewDetails: (programId: string) => void;
  onOpenPlan: (programId: string) => void;
  registeringId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, applied]);

  const load = useCallback(async (signal: AbortSignal) => {
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/explore/programs?${params.toString()}`, { signal, cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load programs.");
      setState({ status: "ready", programs: json.programs as ExploreProgram[] });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load programs." });
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, reloadKey]);

  const catalog = state.status === "ready" ? state.programs : [];
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

  const filtered = catalog.filter((p) => matches(p, applied));
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

  const removeChip = (key: keyof Filters, value?: string) => {
    setApplied((f) => {
      if (key === "priceMin" || key === "priceMax") return { ...f, priceMin: "", priceMax: "" };
      const list = f[key];
      if (!Array.isArray(list) || !value) return f;
      return { ...f, [key]: list.filter((v) => v !== value) };
    });
    setPage(1);
  };

  const chips: { key: keyof Filters; value: string; label: string }[] = [
    ...applied.format.map((value) => ({ key: "format" as const, value, label: FORMAT_OPTIONS.find((o) => o.id === value)?.label || value })),
    ...applied.intensity.map((value) => ({ key: "intensity" as const, value, label: value })),
    ...applied.category.map((value) => ({ key: "category" as const, value, label: value })),
    ...applied.duration.map((value) => ({ key: "duration" as const, value, label: value })),
    ...applied.price.map((value) => ({ key: "price" as const, value, label: value })),
    ...applied.experience.map((value) => ({ key: "experience" as const, value, label: value })),
    ...applied.schedule.map((value) => ({ key: "schedule" as const, value, label: value })),
    ...(applied.priceMin || applied.priceMax
      ? [{ key: "priceMin" as const, value: "range", label: `${applied.priceMin || "0"}–${applied.priceMax || "any"}` }]
      : []),
  ];

  return (
    <>
      <FloatingHeader visible={headerVisible}>
        <div className="relative w-full flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 px-3.5 h-11">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="search"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search programs"
              aria-label="Search programs"
              maxLength={100}
              className="w-full bg-transparent outline-none text-base text-zinc-950 dark:text-white placeholder:text-zinc-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setDraft(applied);
              setFiltersOpen((v) => !v);
            }}
            className="shrink-0 h-11 px-3.5 rounded-full border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/10 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {activeCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-bold inline-flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <>
              <button type="button" aria-label="Close filters" className="fixed inset-0 z-40 bg-black/40 md:bg-transparent" onClick={() => setFiltersOpen(false)} />
              <div className="fixed inset-x-0 bottom-0 z-50 max-h-[86vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-[#0c0c10] border border-zinc-200 dark:border-white/15 p-5 pb-8 shadow-2xl space-y-4 md:absolute md:inset-x-0 md:bottom-auto md:top-full md:mt-2 md:max-h-[70vh] md:rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Filters</p>
                  <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
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
                  <div className="space-y-2">
                    <ChipGroup label="Price range" options={PRICE_OPTIONS} selected={draft.price} onToggle={(v) => toggle("price", v)} />
                    <div className="grid grid-cols-2 gap-2">
                      <input inputMode="numeric" placeholder="Min price" value={draft.priceMin} onChange={(e) => setDraft((f) => ({ ...f, priceMin: e.target.value.replace(/[^\d]/g, "") }))} className="h-11 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent px-3 text-base" />
                      <input inputMode="numeric" placeholder="Max price" value={draft.priceMax} onChange={(e) => setDraft((f) => ({ ...f, priceMax: e.target.value.replace(/[^\d]/g, "") }))} className="h-11 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent px-3 text-base" />
                    </div>
                  </div>
                )}
                <ChipGroup label="Experience level" options={supported.experience} selected={draft.experience} onToggle={(v) => toggle("experience", v)} />
                <ChipGroup label="Schedule" options={supported.schedule} selected={draft.schedule} onToggle={(v) => toggle("schedule", v)} />
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(EMPTY);
                      setApplied(EMPTY);
                      setPage(1);
                    }}
                    className="text-xs font-semibold text-zinc-500"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApplied(draft);
                      setPage(1);
                      setFiltersOpen(false);
                    }}
                    className="px-4 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase tracking-wider"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </FloatingHeader>

      <div className="space-y-3">
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button key={`${chip.key}-${chip.value}`} type="button" onClick={() => removeChip(chip.key, chip.value)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-[11px]">
                {chip.label} <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {state.status === "loading" && <LoadingState label="Loading programs..." />}
        {state.status === "error" && <ErrorState message={state.message} onRetry={() => setReloadKey((k) => k + 1)} />}
        {state.status === "ready" && filtered.length === 0 && (
          <EmptyState
            title={debouncedSearch || activeCount ? "No programs match" : "No programs available yet"}
            description={debouncedSearch || activeCount ? "Try another search or clear filters." : "New programs will show up here when they are published."}
            action={
              activeCount || debouncedSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setApplied(EMPTY);
                    setDraft(EMPTY);
                  }}
                  className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase"
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
                return (
                  <li key={p.id} className="rounded-3xl overflow-hidden bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col">
                    <div className="relative h-40 bg-zinc-200 dark:bg-zinc-800">
                      <Image src={p.coverImage || "/image.jpg"} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" unoptimized={!!p.coverImage && /^https?:/i.test(p.coverImage)} className="object-cover" />
                      <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur ${meta.colorClass}`}>{meta.label}</span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-950 dark:text-white line-clamp-2">{p.title}</h3>
                        <p className="text-[11px] text-zinc-500 mt-1">Coach {p.coachName} · {p.durationDays} days · {intensityOf(p.difficultyLevel)}</p>
                      </div>
                      <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                        <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDateWib(p.startDate)} – {formatDateWib(p.endDate)}</p>
                        <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{p.locationType === "ONLINE" ? "Online" : p.city || p.locationType}</p>
                      </div>
                      <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between gap-2">
                        <span className="text-base font-semibold">{p.price > 0 ? formatIdr(p.price) : "Free"}</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => onViewDetails(p.id)} className="px-3.5 py-1.5 rounded-full border border-zinc-300 dark:border-white/20 text-[11px] font-semibold">View</button>
                          {p.enrollmentStatus === "ACTIVE" ? (
                            <button type="button" onClick={() => onOpenPlan(p.id)} className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase">Open</button>
                          ) : p.canEnroll ? (
                            <button type="button" disabled={registeringId === p.id} onClick={() => onRegister(p.id)} className="px-3.5 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase disabled:opacity-50">
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
