"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, PullToRefreshBanner } from "../shared";
import type { ExploreProgram, LoadState } from "./exploreFilters";

interface ExploreCoachesViewProps {
  availableCoaches: Array<{ name: string; avatar: string }>;
  catalog: ExploreProgram[];
  coachSearch: string;
  onResetSearch: () => void;
  coachPage: number;
  onChangeCoachPage: (page: number) => void;
  onSelectCoach: (name: string) => void;
  pullDistance: number;
  refreshing: boolean;
  loadStatus: LoadState["status"];
}

const COACH_PAGE_SIZE = 8;

export function ExploreCoachesView({
  availableCoaches,
  catalog,
  coachSearch,
  onResetSearch,
  coachPage,
  onChangeCoachPage,
  onSelectCoach,
  pullDistance,
  refreshing,
  loadStatus,
}: ExploreCoachesViewProps) {
  const query = coachSearch.trim().toLowerCase();
  const filteredCoaches = query
    ? availableCoaches.filter((c) => c.name.toLowerCase().includes(query))
    : availableCoaches;
  const coachPages = Math.max(1, Math.ceil(filteredCoaches.length / COACH_PAGE_SIZE));
  const safeCoachPage = Math.min(coachPage, coachPages);
  const paginatedCoaches = filteredCoaches.slice(
    (safeCoachPage - 1) * COACH_PAGE_SIZE,
    safeCoachPage * COACH_PAGE_SIZE
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto pt-2">
      <PullToRefreshBanner
        pullDistance={pullDistance}
        refreshing={refreshing && loadStatus === "ready"}
      />

      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
          Plan Faculty &amp; Coaches
        </h1>
      </div>

      {filteredCoaches.length === 0 ? (
        <EmptyState
          title="No coaches found"
          description="No coaches match that name right now."
          action={
            <button
              type="button"
              onClick={onResetSearch}
              className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold"
            >
              Clear Search
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {paginatedCoaches.map(({ name, avatar }) => {
              const count = catalog.filter(
                (p) => p.coachName.trim().toLowerCase() === name.toLowerCase()
              ).length;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelectCoach(name)}
                  className="group relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-zinc-900 text-left transition active:scale-[0.99]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatar}
                    alt={name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 space-y-0.5">
                    <h2 className="text-xs sm:text-sm font-geometric font-medium text-white leading-snug line-clamp-1">
                      {name}
                    </h2>
                    <span className="text-[10px] font-mono text-white/75 block">
                      {count} {count === 1 ? "Plan" : "Plans"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {coachPages > 1 && (
            <nav aria-label="Coach pages" className="flex items-center justify-center gap-1.5 pt-2">
              <button
                type="button"
                disabled={safeCoachPage === 1}
                onClick={() => onChangeCoachPage(safeCoachPage - 1)}
                className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs disabled:opacity-40 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              {Array.from({ length: coachPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-current={n === safeCoachPage ? "page" : undefined}
                  onClick={() => onChangeCoachPage(n)}
                  className={`w-9 h-9 rounded-full text-xs font-semibold ${
                    n === safeCoachPage
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "border border-zinc-200 dark:border-white/15"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={safeCoachPage === coachPages}
                onClick={() => onChangeCoachPage(safeCoachPage + 1)}
                className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs disabled:opacity-40 inline-flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
