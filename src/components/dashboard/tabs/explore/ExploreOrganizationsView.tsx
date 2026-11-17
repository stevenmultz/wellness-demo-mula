"use client";

import { useMemo } from "react";
import { ArrowRight, BadgeCheck, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { EmptyState, LoadingState, PullToRefreshBanner } from "../shared";
import { type ExploreProgram } from "./exploreFilters";

const ORG_PAGE_SIZE = 8;

export interface ExploreOrganization {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  isVerified: boolean;
}

interface OrganizationEntry extends ExploreOrganization {
  programCount: number;
  freeCount: number;
}

export function ExploreOrganizationsView({
  organizations,
  catalog,
  orgSearch,
  onResetSearch,
  orgPage,
  onChangeOrgPage,
  onSelectOrganization,
  pullDistance,
  refreshing,
  loadStatus,
}: {
  organizations: ExploreOrganization[];
  catalog: ExploreProgram[];
  orgSearch: string;
  onResetSearch: () => void;
  orgPage: number;
  onChangeOrgPage: (page: number) => void;
  onSelectOrganization: (name: string) => void;
  pullDistance: number;
  refreshing: boolean;
  loadStatus: "loading" | "error" | "ready";
}) {
  const { t } = useLocale();
  const entries = useMemo<OrganizationEntry[]>(() => {
    const map = new Map<string, OrganizationEntry>();

    for (const org of organizations) {
      const key = org.name.trim().toLowerCase();
      if (!key) continue;
      map.set(key, {
        ...org,
        programCount: 0,
        freeCount: 0,
      });
    }

    for (const prog of catalog) {
      const orgName = prog.organizationName?.trim();
      if (!orgName) continue;
      const key = orgName.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.programCount += 1;
        if (prog.price <= 0) existing.freeCount += 1;
        if (!existing.logoUrl && prog.organizationLogo) {
          existing.logoUrl = prog.organizationLogo;
        }
      } else {
        map.set(key, {
          id: `catalog-${key}`,
          name: orgName,
          tagline: null,
          logoUrl: prog.organizationLogo ?? null,
          websiteUrl: null,
          isVerified: Boolean(prog.organizationVerified),
          programCount: 1,
          freeCount: prog.price <= 0 ? 1 : 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.programCount !== a.programCount) return b.programCount - a.programCount;
      return a.name.localeCompare(b.name);
    });
  }, [organizations, catalog]);

  const filtered = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.tagline ? o.tagline.toLowerCase().includes(q) : false),
    );
  }, [entries, orgSearch]);

  const pages = Math.max(1, Math.ceil(filtered.length / ORG_PAGE_SIZE));
  const safePage = Math.min(orgPage, pages);
  const pageItems = filtered.slice(
    (safePage - 1) * ORG_PAGE_SIZE,
    safePage * ORG_PAGE_SIZE,
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
            {t.explore.communitiesHeading}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.explore.communitiesSub}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          {filtered.length}{" "}
          {filtered.length === 1
            ? t.explore.communitySingular
            : t.explore.communityPlural}
        </span>
      </div>

      {loadStatus === "loading" ? (
        <LoadingState label={t.explore.loadingPlans} />
      ) : pageItems.length === 0 ? (
        <EmptyState
          title={t.explore.noCommunitiesTitle}
          description={
            orgSearch.trim()
              ? `${t.explore.noCommunitiesSearchPrefix} "${orgSearch.trim()}".`
              : t.explore.noCommunitiesDesc
          }
          action={
            orgSearch.trim() ? (
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
            {pageItems.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => onSelectOrganization(org.name)}
                  className="w-full text-left rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#141414] border border-zinc-200/90 dark:border-white/15 hover:border-zinc-400 dark:hover:border-white/30 shadow-xs transition flex flex-col justify-between gap-3.5 h-full group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/10 shrink-0 flex items-center justify-center">
                      {org.logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                          {org.name}
                        </h3>
                        {org.isVerified && (
                          <BadgeCheck
                            className="w-4 h-4 text-zinc-950 dark:text-white shrink-0"
                            aria-label="Verified organization"
                          />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {org.tagline || t.explore.defaultCommunityTagline}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                      <span>
                        {org.programCount}{" "}
                        {org.programCount === 1
                          ? t.explore.planSingular
                          : t.explore.planPlural}
                      </span>
                      {org.freeCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white text-[10px] font-semibold">
                          {org.freeCount} {t.explore.freeTag}
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 font-geometric font-medium text-zinc-950 dark:text-white">
                      <span>{t.explore.viewPlans}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label="Community pages" className="flex items-center justify-center gap-1.5 pt-2">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => onChangeOrgPage(safePage - 1)}
                className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs disabled:opacity-40 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t.common.previous}
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-current={n === safePage ? "page" : undefined}
                  onClick={() => onChangeOrgPage(n)}
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
                onClick={() => onChangeOrgPage(safePage + 1)}
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
