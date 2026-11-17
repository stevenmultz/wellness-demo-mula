"use client";

import type { ReactNode } from "react";
import { Compass } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { useLocale } from "@/wellness/i18n/LocaleContext";

export function MyPlanPageShell({
  eyebrow,
  title,
  subtitle,
  count,
  headerRight,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  count?: number;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl w-full mx-auto pt-2 pb-10 space-y-6">
      <header className="space-y-2 pb-4 border-b border-zinc-200/80 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-px bg-zinc-400 dark:bg-white/40" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {eyebrow}
            </span>
          </div>
          {headerRight ?? (
            typeof count === "number" ? (
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-200/80 dark:bg-white/10 text-[11px] font-mono tabular-nums text-zinc-700 dark:text-zinc-200">
                {count}
              </span>
            ) : null
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl">
          {subtitle}
        </p>
      </header>

      {children}
    </div>
  );
}

export function MyPlanPageEmpty({
  title,
  description,
  onExplore,
}: {
  title: string;
  description: string;
  onExplore: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="rounded-3xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 px-6 py-12 text-center space-y-4 shadow-2xs">
      <p className="text-sm font-geometric font-medium text-zinc-950 dark:text-white">
        {title}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
        {description}
      </p>
      <div className="pt-1">
        <button
          type="button"
          onClick={onExplore}
          className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-geometric font-semibold inline-flex items-center gap-2 active:scale-95 transition"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{t.myPlan.explorePlans}</span>
        </button>
      </div>
    </div>
  );
}

export function PlanCardMedia({
  coverImage,
  title,
  topLeftBadge,
  topRightBadge,
}: {
  coverImage?: string | null;
  title: string;
  topLeftBadge?: ReactNode;
  topRightBadge?: ReactNode;
}) {
  return (
    <div className="relative h-44 bg-zinc-200 dark:bg-zinc-900 overflow-hidden border-b border-zinc-200/70 dark:border-white/10">
      {coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt={title}
          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
          <BrandLogo size="sm" tone="light" className="opacity-70" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/25" />
      {(topLeftBadge || topRightBadge) && (
        <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between gap-2">
          <div>{topLeftBadge}</div>
          <div>{topRightBadge}</div>
        </div>
      )}
    </div>
  );
}
