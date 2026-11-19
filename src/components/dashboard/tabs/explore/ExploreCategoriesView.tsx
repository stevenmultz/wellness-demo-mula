"use client";

import { useLocale } from "@/wellness/i18n/LocaleContext";
import { EmptyState, PullToRefreshBanner } from "../shared";
import type { LoadState } from "./exploreFilters";

export interface SportCategoryItem {
  name: string;
  count: number;
  onlineCount: number;
  hybridCount: number;
}

interface ExploreCategoriesViewProps {
  categories: SportCategoryItem[];
  search: string;
  onResetSearch: () => void;
  onSelectCategory: (name: string) => void;
  pullDistance: number;
  refreshing: boolean;
  loadStatus: LoadState["status"];
}

export function ExploreCategoriesView({
  categories,
  search,
  onResetSearch,
  onSelectCategory,
  pullDistance,
  refreshing,
  loadStatus,
}: ExploreCategoriesViewProps) {
  const { locale, t } = useLocale();
  const isId = locale === "id";
  const q = search.trim().toLowerCase();
  const filtered = q
    ? categories.filter((c) => c.name.toLowerCase().includes(q))
    : categories;

  return (
    <div className="w-full space-y-6 pt-2 pb-10">
      <PullToRefreshBanner
        pullDistance={pullDistance}
        refreshing={refreshing && loadStatus === "ready"}
      />

      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-500 block">
          {isId ? "Semua Cabang Olahraga" : "All Sports Categories"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950">
          Sports Category
        </h1>
      </div>

      {loadStatus === "loading" ? (
        <div
          role="status"
          aria-label={t.explore.loadingPlans}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[56px] rounded-2xl skeleton-block"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={isId ? "Cabang olahraga tidak ditemukan" : "No sports found"}
          description={
            isId
              ? "Coba cari nama olahraga lain."
              : "Try searching with another sport name."
          }
          action={
            q ? (
              <button
                type="button"
                onClick={onResetSearch}
                className="px-5 py-2.5 rounded-full bg-zinc-950 text-white text-xs font-semibold"
              >
                {t.common.clearSearch}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className="h-[56px] p-4 rounded-2xl bg-white hover:bg-zinc-100 flex items-center justify-center text-center transition active:scale-[0.98] cursor-pointer"
            >
              <span className="text-sm font-geometric font-semibold text-zinc-950 truncate">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
