"use client";

import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { serializeTermsChapters } from "@/wellness/utils/json";
import { ProgramTermsChapterBuilder } from "../AdminFormBuilders";
import {
  getProgramSectionStats,
  getSectionBadgeClass,
  getSectionCardClass,
  getSectionHeaderClass,
  renderSectionProgressBadge,
} from "../adminUtils";
import type { ProgramFormSharedProps } from "./ProgramFormCoreSections";

export function ProgramFormLogisticsSections({
  mode,
  form,
  setForm,
  expandedSections,
  onToggleSection,
  isLocked,
}: ProgramFormSharedProps) {
  const sec5Stats = getProgramSectionStats(5, form);
  const sec6Stats = getProgramSectionStats(6, form);
  const sec7Stats = getProgramSectionStats(7, form);
  const sec8Stats = getProgramSectionStats(8, form);

  return (
    <>
      {/* SECTION 5: ATTENDANCE MODE & LOCATION (ODD) */}
      <div className={getSectionCardClass(5, expandedSections[5])}>
        <button
          type="button"
          onClick={() => onToggleSection(5)}
          className={getSectionHeaderClass(5)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={getSectionBadgeClass(5)}>5</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Attendance Mode &amp; Location
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Delivery format (Online, On-Site studio, or Hybrid) and default location
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {renderSectionProgressBadge(sec5Stats.filled, sec5Stats.total)}
            <div className="p-1 rounded-lg text-zinc-400">
              {expandedSections[5] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {expandedSections[5] && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
            <div className="grid sm:grid-cols-3 gap-3 pt-3">
              {[
                { key: "ONLINE", label: "Online" },
                { key: "ONSITE", label: "On-Site" },
                { key: "HYBRID", label: "Online + Onsite" },
              ].map((locMode) => (
                <button
                  key={locMode.key}
                  type="button"
                  disabled={isLocked}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      locationType: locMode.key as "ONLINE" | "ONSITE" | "HYBRID",
                    }))
                  }
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                    form.locationType === locMode.key
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs border-transparent"
                      : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {locMode.label}
                </button>
              ))}
            </div>

            {form.locationType === "ONLINE" ? (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-500/10 text-zinc-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Virtual Online Delivery Selected
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    No physical venue or city address is required for 100% online programs. Sessions take place virtually via daily video links and community access.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    City / Region *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={form.city}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, city: e.target.value }))
                    }
                    placeholder="Enter city"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Studio Physical Venue Address *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={form.venueAddress}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, venueAddress: e.target.value }))
                    }
                    placeholder="Enter venue address"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 6: PRICING & QUOTA (EVEN) */}
      <div className={getSectionCardClass(6, expandedSections[6])}>
        <button
          type="button"
          onClick={() => onToggleSection(6)}
          className={getSectionHeaderClass(6)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={getSectionBadgeClass(6)}>6</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                {mode === "create"
                  ? "Pricing & Quota"
                  : "Pricing & Participant Quota"}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {mode === "create"
                  ? "Tuition structure, promotional discount, and participant seat cap"
                  : "Enrollment capacity, base price, and optional discount incentive"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {renderSectionProgressBadge(sec6Stats.filled, sec6Stats.total)}
            <div className="p-1 rounded-lg text-zinc-400">
              {expandedSections[6] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {expandedSections[6] && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Participant Capacity (Seats) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  disabled={isLocked}
                  value={form.maxQuota}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      maxQuota: Number(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Actual Tuition (IDR) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  disabled={isLocked}
                  value={mode === "create" ? form.actualPrice || "" : form.actualPrice}
                  onChange={(e) => {
                    const actual = Number(e.target.value) || 0;
                    const disc = Number(form.discountPercentage) || 0;
                    setForm((p) => ({
                      ...p,
                      actualPrice: actual,
                      price: Math.max(0, Math.round(actual * (1 - disc / 100))),
                    }));
                  }}
                  placeholder="Enter actual tuition..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Discount (5% Multiples)
                </label>
                <select
                  disabled={isLocked}
                  value={form.discountPercentage}
                  onChange={(e) => {
                    const disc = Number(e.target.value) || 0;
                    const actual = Number(form.actualPrice) || 0;
                    setForm((p) => ({
                      ...p,
                      discountPercentage: disc,
                      price: Math.max(0, Math.round(actual * (1 - disc / 100))),
                    }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((pct) => (
                    <option key={pct} value={pct} className="bg-white dark:bg-zinc-900">
                      {pct === 0 ? "0% (No Discount)" : `${pct}% Off`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Final Calculated Tuition
                </label>
                <div className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                  <span>
                    {form.price === 0 && mode === "edit"
                      ? "Free"
                      : `Rp ${form.price.toLocaleString("id-ID")}`}
                  </span>
                  {form.discountPercentage > 0 && (
                    <span className="text-[10px] text-zinc-400 font-normal">
                      -{form.discountPercentage}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 7: COMMUNITY CHANNEL LINK (ODD) */}
      <div className={getSectionCardClass(7, expandedSections[7])}>
        <button
          type="button"
          onClick={() => onToggleSection(7)}
          className={getSectionHeaderClass(7)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={getSectionBadgeClass(7)}>7</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Community Channel / Group URL
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Private group link for enrolled members (WhatsApp, Telegram, Discord, etc.)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {renderSectionProgressBadge(sec7Stats.filled, sec7Stats.total)}
            <div className="p-1 rounded-lg text-zinc-400">
              {expandedSections[7] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {expandedSections[7] && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
            <div className="space-y-2 pt-3">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Community Channel / Group URL
              </label>
              <input
                type="url"
                disabled={isLocked}
                value={form.communityLink}
                onChange={(e) =>
                  setForm((p) => ({ ...p, communityLink: e.target.value }))
                }
                placeholder="Enter community link (WhatsApp, Discord, Slack, etc.)..."
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 8: TERMS & CONDITIONS (EVEN) */}
      <div className={getSectionCardClass(8, expandedSections[8])}>
        <button
          type="button"
          onClick={() => onToggleSection(8)}
          className={getSectionHeaderClass(8)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={getSectionBadgeClass(8)}>8</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Terms &amp; Conditions
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Program rules, health disclaimer, and enrollment terms
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {renderSectionProgressBadge(sec8Stats.filled, sec8Stats.total)}
            <div className="p-1 rounded-lg text-zinc-400">
              {expandedSections[8] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {expandedSections[8] && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60">
            <ProgramTermsChapterBuilder
              disabled={isLocked}
              chapters={form.termsChapters}
              onChange={(nextChapters) => {
                const serialized = serializeTermsChapters(nextChapters);
                const flattened = nextChapters.flatMap((c) => c.clauses);
                setForm((p) => ({
                  ...p,
                  termsType: "CUSTOM",
                  termsChapters: nextChapters,
                  termsList: flattened,
                  customTerms: serialized,
                }));
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
