"use client";

import { useLocale } from "@/wellness/i18n/LocaleContext";
import { EmptyState, PullToRefreshBanner } from "../shared";
import { splitCoachTokens, type ExploreProgram, type LoadState } from "./exploreFilters";

export function communityMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "Z";
}

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
    <div className="w-full space-y-6 pt-2 pb-10">
      <PullToRefreshBanner
        pullDistance={pullDistance}
        refreshing={refreshing && loadStatus === "ready"}
      />

      <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950">
        Explore Community
      </h1>

      {loadStatus === "loading" ? (
        <div
          role="status"
          aria-label={t.explore.loadingPlans}
          className="grid grid-cols-4 sm:grid-cols-6 gap-3"
        >
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-2xl skeleton-block"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {filtered.map((comm) => (
            <button
              key={comm.name}
              type="button"
              onClick={() => onSelectCommunity(comm.name)}
              aria-label={comm.name}
              title={comm.name}
              className="aspect-square p-3 rounded-2xl bg-white hover:bg-zinc-100 flex items-center justify-center overflow-hidden transition active:scale-[0.97] cursor-pointer"
            >
              {comm.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comm.logo}
                  alt={comm.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-base sm:text-lg font-geometric font-bold tracking-wider text-zinc-900">
                  {communityMonogram(comm.name)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
