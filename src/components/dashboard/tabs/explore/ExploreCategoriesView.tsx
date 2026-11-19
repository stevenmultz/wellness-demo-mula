"use client";

import { ArrowRight } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { EmptyState, PullToRefreshBanner } from "../shared";
import type { LoadState } from "./exploreFilters";

export interface SportCategoryItem {
  name: string;
  count: number;
  onlineCount: number;
  hybridCount: number;
}

const SPORT_TAGLINES: Record<string, { en: string; id: string }> = {
  pilates: { en: "Core stability & alignment", id: "Stabilitas core & postur" },
  yoga: { en: "Flow, mobility & breath", id: "Fleksibilitas, flow & napas" },
  volleyball: { en: "Jump power & court drills", id: "Lompatan & kelincahan lapangan" },
  badminton: { en: "Footwork & smash speed", id: "Footwork & kecepatan smash" },
  tennis: { en: "Serve mechanics & rally", id: "Teknik servis & rally" },
  padel: { en: "Glass play & court agility", id: "Kelincahan & taktik padel" },
  boxing: { en: "Guard, rhythm & cardio", id: "Teknik pukulan, footwork & kardio" },
  "muay thai": { en: "Striking & clinch power", id: "Kekuatan striking & conditioning" },
  workout: { en: "Strength & metabolic circuit", id: "Kekuatan otot & kebugaran harian" },
  running: { en: "Cadence, pace & endurance", id: "Ritme lari, pace & daya tahan" },
};

export function getSportTagline(name: string, isId: boolean): string {
  const entry = SPORT_TAGLINES[name.trim().toLowerCase()];
  if (!entry) return isId ? "Program latihan terstruktur" : "Structured training plans";
  return isId ? entry.id : entry.en;
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
    <div className="space-y-6 max-w-3xl mx-auto pt-2 pb-10">
      <PullToRefreshBanner
        pullDistance={pullDistance}
        refreshing={refreshing && loadStatus === "ready"}
      />

      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-500 block">
          {isId ? "Semua Cabang Olahraga" : "All Sports Categories"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950">
          {isId ? "Sports Category" : "Sports Category"}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-xl">
          {isId
            ? "Pilih cabang olahraga favorit Anda untuk melihat program Online maupun Hybrid yang tersedia."
            : "Choose a sport to browse available Full Online and Hybrid training plans."}
        </p>
      </div>

      {filtered.length === 0 ? (
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
              className="group p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200/85 hover:border-zinc-400 text-left flex flex-col justify-between gap-4 shadow-2xs transition active:scale-[0.99] cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    {cat.count} {cat.count === 1 ? t.explore.planSingular : t.explore.planPlural}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
                <h2 className="text-base font-geometric font-semibold text-zinc-950">
                  {cat.name}
                </h2>
                <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                  {getSportTagline(cat.name, isId)}
                </p>
              </div>

              {(cat.onlineCount > 0 || cat.hybridCount > 0) && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-100">
                  {cat.onlineCount > 0 && <span>{cat.onlineCount} Online</span>}
                  {cat.onlineCount > 0 && cat.hybridCount > 0 && <span>·</span>}
                  {cat.hybridCount > 0 && <span>{cat.hybridCount} Hybrid</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
