"use client";

import { useMemo } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { EmptyState, LoadingState, PullToRefreshBanner } from "../shared";
import { categoriesOf, type ExploreProgram } from "./exploreFilters";

const CATEGORY_PAGE_SIZE = 10;

export interface ExploreCategory {
  id: string;
  name: string;
}

interface CategoryEntry {
  id: string;
  name: string;
  programCount: number;
  freeCount: number;
}

export function ExploreCategoriesView({
  categories,
  catalog,
  categorySearch,
  onResetSearch,
  categoryPage,
  onChangeCategoryPage,
  onSelectCategory,
  pullDistance,
  refreshing,
  loadStatus,
}: {
  categories: ExploreCategory[];
  catalog: ExploreProgram[];
  categorySearch: string;
  onResetSearch: () => void;
  categoryPage: number;
  onChangeCategoryPage: (page: number) => void;
  onSelectCategory: (name: string) => void;
  pullDistance: number;
  refreshing: boolean;
  loadStatus: "loading" | "error" | "ready";
}) {
  const { t } = useLocale();

  const entries = useMemo<CategoryEntry[]>(() => {
    const map = new Map<string, CategoryEntry>();

    for (const cat of categories) {
      const name = cat.name.trim();
      const key = name.toLowerCase();
      if (!key) continue;
      map.set(key, {
        id: cat.id,
        name,
        programCount: 0,
        freeCount: 0,
      });
    }

    for (const prog of catalog) {
      for (const catName of categoriesOf(prog)) {
        const key = catName.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.programCount += 1;
          if (prog.price <= 0) existing.freeCount += 1;
        } else {
          map.set(key, {
            id: `catalog-${key}`,
            name: catName,
            programCount: 1,
            freeCount: prog.price <= 0 ? 1 : 0,
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.programCount !== a.programCount) return b.programCount - a.programCount;
      return a.name.localeCompare(b.name);
    });
  }, [categories, catalog]);

  const filtered = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((c) => c.name.toLowerCase().includes(q));
  }, [entries, categorySearch]);

  const pages = Math.max(1, Math.ceil(filtered.length / CATEGORY_PAGE_SIZE));
  const safePage = Math.min(categoryPage, pages);
  const pageItems = filtered.slice(
    (safePage - 1) * CATEGORY_PAGE_SIZE,
    safePage * CATEGORY_PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      <PullToRefreshBanner
        pullDistance={pullDistance}
        refreshing={refreshing && loadStatus === "ready"}
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h2 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950 dark:text-white tracking-tight">
            {t.explore.categoriesHeading}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.explore.categoriesSub}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          {filtered.length}{" "}
          {filtered.length === 1
            ? t.explore.categorySingular
            : t.explore.categoryPlural}
        </span>
      </div>

      {loadStatus === "loading" ? (
        <LoadingState label={t.explore.loadingPlans} />
      ) : pageItems.length === 0 ? (
        <EmptyState
          title={t.explore.noCategoriesTitle}
          description={
            categorySearch.trim()
              ? `${t.explore.noCategoriesSearchPrefix} "${categorySearch.trim()}".`
              : t.explore.noCategoriesDesc
          }
          action={
            categorySearch.trim() ? (
              <button
                type="button"
                onClick={onResetSearch}
                className="mt-1 px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold"
              >
                {t.common.clearSearch}
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {pageItems.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.name)}
                  className="w-full text-left rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#141414] border border-zinc-200/90 dark:border-white/15 hover:border-zinc-400 dark:hover:border-white/30 shadow-xs transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/10 shrink-0 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>
                          {cat.programCount}{" "}
                          {cat.programCount === 1
                            ? t.explore.planSingular
                            : t.explore.planPlural}
                        </span>
                        {cat.freeCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white text-[10px] font-semibold">
                            {cat.freeCount} {t.explore.freeTag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-geometric font-medium text-zinc-950 dark:text-white">
                    <span>{t.explore.viewPlans}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav
              aria-label="Category pages"
              className="flex items-center justify-center gap-1.5 pt-2"
            >
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => onChangeCategoryPage(safePage - 1)}
                className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs disabled:opacity-40 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t.common.previous}
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-current={n === safePage ? "page" : undefined}
                  onClick={() => onChangeCategoryPage(n)}
                  className={`w-9 h-9 rounded-full text-xs font-semibold ${
                    n === safePage
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "border border-zinc-200 dark:border-white/15"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage === pages}
                onClick={() => onChangeCategoryPage(safePage + 1)}
                className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs disabled:opacity-40 inline-flex items-center gap-1"
              >
                {t.common.next} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
