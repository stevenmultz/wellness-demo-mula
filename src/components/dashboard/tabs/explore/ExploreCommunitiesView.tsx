"use client";

import { ArrowRight, BadgeCheck, Building2, Globe, MapPin } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { EmptyState, PullToRefreshBanner } from "../shared";
import { splitCoachTokens, type ExploreProgram, type LoadState } from "./exploreFilters";

export interface ExploreCommunityItem {
  name: string;
  logo: string | null;
  verified: boolean;
  totalPlans: number;
  onlineCount: number;
  hybridCount: number;
  cities: string[];
  coaches: string[];
}

export function buildExploreCommunities(catalog: ExploreProgram[]): ExploreCommunityItem[] {
  const map = new Map<
    string,
    {
      name: string;
      logo: string | null;
      verified: boolean;
      totalPlans: number;
      onlineCount: number;
      hybridCount: number;
      cities: Set<string>;
      coaches: Set<string>;
    }
  >();

  for (const p of catalog) {
    const rawName = (p.organizationName || "").trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    let entry = map.get(key);
    if (!entry) {
      entry = {
        name: rawName,
        logo: p.organizationLogo || null,
        verified: Boolean(p.organizationVerified),
        totalPlans: 0,
        onlineCount: 0,
        hybridCount: 0,
        cities: new Set<string>(),
        coaches: new Set<string>(),
      };
      map.set(key, entry);
    }
    entry.totalPlans += 1;
    if (p.locationType === "ONLINE") {
      entry.onlineCount += 1;
    } else {
      entry.hybridCount += 1;
    }
    if (!entry.logo && p.organizationLogo) entry.logo = p.organizationLogo;
    if (p.organizationVerified) entry.verified = true;
    if (p.city && p.city.trim()) entry.cities.add(p.city.trim());
    for (const c of splitCoachTokens(p.coachName)) {
      entry.coaches.add(c);
    }
  }

  return Array.from(map.values())
    .map((e) => ({
      name: e.name,
      logo: e.logo,
      verified: e.verified,
      totalPlans: e.totalPlans,
      onlineCount: e.onlineCount,
      hybridCount: e.hybridCount,
      cities: Array.from(e.cities),
      coaches: Array.from(e.coaches),
    }))
    .sort((a, b) => b.totalPlans - a.totalPlans || a.name.localeCompare(b.name));
}

interface ExploreCommunitiesViewProps {
  communities: ExploreCommunityItem[];
  search: string;
  onResetSearch: () => void;
  onSelectCommunity: (name: string) => void;
  pullDistance: number;
  refreshing: boolean;
  loadStatus: LoadState["status"];
}

export function ExploreCommunitiesView({
  communities,
  search,
  onResetSearch,
  onSelectCommunity,
  pullDistance,
  refreshing,
  loadStatus,
}: ExploreCommunitiesViewProps) {
  const { locale, t } = useLocale();
  const isId = locale === "id";
  const q = search.trim().toLowerCase();
  const filtered = q
    ? communities.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.cities.some((city) => city.toLowerCase().includes(q))
      )
    : communities;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pt-2 pb-10">
      <PullToRefreshBanner
        pullDistance={pullDistance}
        refreshing={refreshing && loadStatus === "ready"}
      />

      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-500 block">
          {isId ? "Komunitas & Partner Resmi" : "Verified Communities & Partners"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950">
          {isId ? "Jelajahi Komunitas" : "Explore Community"}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-xl">
          {isId
            ? "Pilih komunitas atau studio partner untuk melihat seluruh program Online maupun Hybrid yang mereka selenggarakan."
            : "Pick a wellness community or partner studio to view all Online and Hybrid programs they host."}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={isId ? "Komunitas tidak ditemukan" : "No communities found"}
          description={
            q
              ? isId
                ? "Coba kata kunci atau kota lain."
                : "Try a different community name or city."
              : isId
                ? "Belum ada komunitas partner yang aktif saat ini."
                : "No active partner communities are available right now."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filtered.map((comm) => (
            <button
              key={comm.name}
              type="button"
              onClick={() => onSelectCommunity(comm.name)}
              className="group p-5 rounded-2xl bg-white border border-zinc-200/85 hover:border-zinc-400 text-left flex flex-col justify-between gap-4 shadow-2xs transition active:scale-[0.99] cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-zinc-100 border border-zinc-200/80 overflow-hidden flex items-center justify-center shrink-0">
                      {comm.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comm.logo}
                          alt={comm.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950 truncate">
                          {comm.name}
                        </h2>
                        {comm.verified && (
                          <BadgeCheck
                            className="w-4 h-4 text-zinc-900 shrink-0"
                            aria-label="Verified community"
                          />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 block">
                        {comm.totalPlans}{" "}
                        {comm.totalPlans === 1 ? t.explore.planSingular : t.explore.planPlural}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0 mt-1" />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {comm.onlineCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                      <Globe className="w-3 h-3 text-zinc-500" />
                      <span>
                        {comm.onlineCount} Online
                      </span>
                    </span>
                  )}
                  {comm.hybridCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      <span>
                        {comm.hybridCount} Hybrid
                      </span>
                    </span>
                  )}
                  {comm.cities.slice(0, 2).map((city) => (
                    <span
                      key={city}
                      className="px-2.5 py-1 rounded-full border border-zinc-200 text-zinc-600"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </div>

              {comm.coaches.length > 0 && (
                <p className="text-[11px] text-zinc-500 line-clamp-1 pt-2.5 border-t border-zinc-100">
                  Coach: {comm.coaches.join(", ")}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
