"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDownUp, Calendar, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { getPublicBadgeMeta, PublicProgramBadge } from "@/wellness/utils/timeline";
import {
  EmptyState,
  ErrorState,
  FloatingHeader,
  LoadingState,
  formatDateWib,
  formatIdr,
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
  durationDays: number;
  locationType: string;
  city: string | null;
  seatsLeft: number;
  badge: string;
  canEnroll: boolean;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
}

type SortKey = "date" | "price";
type SortDir = "asc" | "desc";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; programs: ExploreProgram[] };

const SORT_DIR_LABEL: Record<SortKey, Record<SortDir, string>> = {
  date: { asc: "Earliest first", desc: "Latest first" },
  price: { asc: "Lowest price", desc: "Highest price" },
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition active:scale-95 ${
        active
          ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white"
          : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500 dark:bg-white/5 dark:text-zinc-300 dark:border-white/15"
      }`}
    >
      {children}
    </button>
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
  const [comingSoon, setComingSoon] = useState(false);
  const [openRegistration, setOpenRegistration] = useState(false);
  const [sort, setSort] = useState<SortKey>("date");
  const [dir, setDir] = useState<SortDir>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setState({ status: "loading" });
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (comingSoon) params.set("comingSoon", "1");
        if (openRegistration) params.set("openRegistration", "1");
        params.set("sort", sort);
        params.set("dir", dir);

        const res = await fetch(`/api/explore/programs?${params.toString()}`, {
          signal,
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load programs.");
        }
        setState({ status: "ready", programs: json.programs as ExploreProgram[] });
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load programs.",
        });
      }
    },
    [debouncedSearch, comingSoon, openRegistration, sort, dir]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, reloadKey]);

  const activeFilterCount = (comingSoon ? 1 : 0) + (openRegistration ? 1 : 0);
  const hasQueryOrFilter = !!debouncedSearch || activeFilterCount > 0;

  const resetAll = () => {
    setSearch("");
    setComingSoon(false);
    setOpenRegistration(false);
    setSort("date");
    setDir("asc");
  };

  return (
    <>
      {/* HEADER: search bar + filter dropdown */}
      <FloatingHeader visible={headerVisible}>
        <div className="relative w-full">
          <div className="flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 px-3.5 py-2">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setFiltersOpen(true)}
              onClick={() => setFiltersOpen(true)}
              placeholder="Search programs by name"
              aria-label="Search programs by name"
              maxLength={100}
              className="w-full bg-transparent outline-none text-xs text-zinc-950 dark:text-white placeholder:text-zinc-500"
            />
            {activeFilterCount > 0 && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
            <button
              type="button"
              aria-label={filtersOpen ? "Close filters" : "Open filters"}
              onClick={() => setFiltersOpen((v) => !v)}
              className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              {filtersOpen ? <X className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
            </button>
          </div>

          {filtersOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)} />
              <div className="absolute left-0 right-0 top-full mt-3 z-50 rounded-2xl bg-white dark:bg-[#0c0c10] border border-zinc-200 dark:border-white/15 p-4 shadow-2xl space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500">
                    Filter
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={comingSoon} onClick={() => setComingSoon((v) => !v)}>
                      Coming Soon
                    </Chip>
                    <Chip active={openRegistration} onClick={() => setOpenRegistration((v) => !v)}>
                      Open Registration
                    </Chip>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 flex items-center gap-1.5">
                    <ArrowDownUp className="w-3 h-3" /> Sort By
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      active={sort === "date"}
                      onClick={() => {
                        setSort("date");
                        setDir("asc");
                      }}
                    >
                      Date
                    </Chip>
                    <Chip
                      active={sort === "price"}
                      onClick={() => {
                        setSort("price");
                        setDir("asc");
                      }}
                    >
                      Price
                    </Chip>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
                    className="text-[11px] text-zinc-600 dark:text-zinc-300 underline underline-offset-2"
                  >
                    {SORT_DIR_LABEL[sort][dir]} — tap to reverse
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white pt-3"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="mt-3 px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase tracking-wider"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </FloatingHeader>

      {/* CONTENT: program list only */}
      <div className="space-y-3 font-mono">
        {state.status === "loading" && <LoadingState label="Loading programs..." />}

        {state.status === "error" && (
          <ErrorState message={state.message} onRetry={() => setReloadKey((k) => k + 1)} />
        )}

        {state.status === "ready" && state.programs.length === 0 && (
          <EmptyState
            title={hasQueryOrFilter ? "No programs match your search" : "No programs available yet"}
            description={
              hasQueryOrFilter
                ? "Try a different name or clear your filters."
                : "New programs will show up here as soon as they are published."
            }
            action={
              hasQueryOrFilter ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase tracking-wider"
                >
                  Clear search & filters
                </button>
              ) : undefined
            }
          />
        )}

        {state.status === "ready" && state.programs.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {state.programs.map((p) => {
              const meta = getPublicBadgeMeta(p.badge as PublicProgramBadge);
              const isActive = p.enrollmentStatus === "ACTIVE";
              const isPending = p.enrollmentStatus === "PENDING";
              return (
                <li
                  key={p.id}
                  className="rounded-3xl overflow-hidden bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col"
                >
                  <div className="relative h-36 bg-zinc-200 dark:bg-zinc-800">
                    <Image
                      src={p.coverImage || "/image.jpg"}
                      alt={p.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      unoptimized={!!p.coverImage && /^https?:/i.test(p.coverImage)}
                      className="object-cover"
                    />
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur ${meta.colorClass}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold uppercase tracking-tight text-zinc-950 dark:text-white line-clamp-2">
                        {p.title}
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Coach {p.coachName} • {p.durationDays} days
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {formatDateWib(p.startDate)} – {formatDateWib(p.endDate)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {p.locationType === "ONLINE" ? "Online" : p.city || p.locationType}
                      </p>
                    </div>

                    <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-zinc-950 dark:text-white">
                        {p.price > 0 ? formatIdr(p.price) : "Free"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewDetails(p.id)}
                          className="px-3.5 py-1.5 rounded-full border border-zinc-300 dark:border-white/20 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                        >
                          View
                        </button>
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => onOpenPlan(p.id)}
                            className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider"
                          >
                            Open
                          </button>
                        ) : isPending && p.canEnroll ? (
                          <button
                            type="button"
                            disabled={registeringId === p.id}
                            onClick={() => onRegister(p.id)}
                            className="px-3.5 py-1.5 rounded-full bg-amber-500 text-zinc-950 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
                          >
                            Pay now
                          </button>
                        ) : p.canEnroll ? (
                          <button
                            type="button"
                            disabled={registeringId === p.id}
                            onClick={() => onRegister(p.id)}
                            className="px-3.5 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
                          >
                            {registeringId === p.id ? "..." : "Register"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
