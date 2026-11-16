"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  Check,
  Layers,
  MapPin,
  MessageSquareQuote,
  Search,
  X,
} from "lucide-react";
import type { AdminUserItem } from "../adminTypes";
import { AdminCustomerResponseItem } from "./AdminCustomerResponseItem";

interface AdminCustomerProgramsTabProps {
  u: AdminUserItem;
  selectedCustomerProgramId: string | null;
  setSelectedCustomerProgramId: (id: string | null) => void;
  customerResponseStatusFilter: "ALL" | "COMPLETED" | "PENDING";
  setCustomerResponseStatusFilter: (val: "ALL" | "COMPLETED" | "PENDING") => void;
  customerResponseSearch: string;
  setCustomerResponseSearch: (val: string) => void;
  expandedResponseIds: Record<string, boolean>;
  setExpandedResponseIds: Dispatch<SetStateAction<Record<string, boolean>>>;
}

export function AdminCustomerProgramsTab({
  u,
  selectedCustomerProgramId,
  setSelectedCustomerProgramId,
  customerResponseStatusFilter,
  setCustomerResponseStatusFilter,
  customerResponseSearch,
  setCustomerResponseSearch,
  expandedResponseIds,
  setExpandedResponseIds,
}: AdminCustomerProgramsTabProps) {
  const enrollments = u.enrollments || [];
  const dayProgress = u.dayProgress || [];
  const selectedEnrollment = selectedCustomerProgramId
    ? enrollments.find((e) => e.program?.id === selectedCustomerProgramId)
    : null;
  const selectedProgram = selectedEnrollment?.program || null;

if (!selectedCustomerProgramId) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>Enrolled Programs ({enrollments.length})</span>
        </h4>
        <span className="text-[11px] text-zinc-400">
          Click a program to inspect daily check-ins
        </span>
      </div>

      {enrollments.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/5 space-y-1">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            No Programs Enrolled
          </p>
          <p className="text-[11px] text-zinc-400">
            This customer is not enrolled in any program yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((e) => {
            const totalDays = e.program?._count?.days || 0;
            const cohortProgress = dayProgress.filter(
              (p) => p.programDay?.programId === e.program?.id
            );
            const doneDays = cohortProgress.filter((p) => p.isCompleted).length;
            const pct = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;

            return (
              <div
                key={e.id}
                onClick={() => setSelectedCustomerProgramId(e.program?.id || null)}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5 space-y-3 cursor-pointer hover:border-zinc-300 dark:hover:border-white/20 transition group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-white group-hover:underline">
                        {e.program?.title || "Program"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                          e.status === "ACTIVE"
                            ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                            : e.status === "PENDING"
                            ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                            : "bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {e.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                        {e.attendanceMode || e.program?.locationType || "ONLINE"}
                      </span>
                    </div>
                    {e.program?.locationType === "ONSITE" && e.program?.venueAddress && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span>{e.program.venueAddress}{e.program.city ? `, ${e.program.city}` : ""}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                      IDR {(e.program?.price || 0).toLocaleString("id-ID")}
                    </span>
                    <p className="text-[10px] font-mono text-zinc-400">
                      Ref: {e.paymentReference || "Manual"}
                    </p>
                  </div>
                </div>

                {/* Curriculum Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      Curriculum Progress
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      {doneDays} of {totalDays} days ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-900 dark:bg-white transition-all duration-300"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-zinc-200/40 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                    <span>Enrolled: {e.paidAt ? new Date(e.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                    <span>Valid Until: {e.validUntil ? new Date(e.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Indefinite"}</span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white group-hover:translate-x-0.5 transition">
                    <MessageSquareQuote className="w-3.5 h-3.5 text-zinc-400" />
                    <span>View Daily Responses ({doneDays} logged) &rarr;</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// View 2: Daily Responses Drill-Down for Selected Program
const programResponses = dayProgress.filter(
  (p) => p.programDay?.programId === selectedCustomerProgramId
);

const filteredResponses = programResponses.filter((p) => {
  if (customerResponseStatusFilter === "COMPLETED" && !p.isCompleted) return false;
  if (customerResponseStatusFilter === "PENDING" && p.isCompleted) return false;
  if (customerResponseSearch.trim()) {
    const q = customerResponseSearch.toLowerCase();
    const dayTitle = (p.programDay?.title || "").toLowerCase();
    const refText = (p.dailyReflection || "").toLowerCase();
    const wNotes = (p.workoutNotes || "").toLowerCase();
    const mNotes = (p.mealNotes || "").toLowerCase();
    const routine = (p.selectedWorkout || "").toLowerCase();
    if (
      !dayTitle.includes(q) &&
      !refText.includes(q) &&
      !wNotes.includes(q) &&
      !mNotes.includes(q) &&
      !routine.includes(q)
    ) {
      return false;
    }
  }
  return true;
});

const sortedResponses = filteredResponses.slice().sort((a, b) => {
  const dDiff = (b.programDay?.dayNumber || 0) - (a.programDay?.dayNumber || 0);
  if (dDiff !== 0) return dDiff;
  return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
});

const allExpanded = sortedResponses.length > 0 && sortedResponses.every((p) => expandedResponseIds[p.id]);

const toggleExpandAll = () => {
  if (allExpanded) {
    setExpandedResponseIds({});
  } else {
    const next: Record<string, boolean> = {};
    sortedResponses.forEach((p) => {
      next[p.id] = true;
    });
    setExpandedResponseIds(next);
  }
};

return (
  <div className="space-y-4">
    {/* Drill-down Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
      <button
        type="button"
        onClick={() => setSelectedCustomerProgramId(null)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to Enrolled Programs
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-zinc-900 dark:text-white font-geometric">
          {selectedProgram?.title || "Program"}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
          {programResponses.filter((p) => p.isCompleted).length} of {programResponses.length} check-ins
        </span>
      </div>
    </div>

    {/* Filter Toolbar */}
    <div className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl p-0.5 border border-zinc-200/80 dark:border-white/10 text-xs">
          {(["ALL", "COMPLETED", "PENDING"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setCustomerResponseStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                customerResponseStatusFilter === st
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {st === "ALL" ? "All" : st === "COMPLETED" ? "Completed" : "In Progress"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={customerResponseSearch}
            onChange={(e) => setCustomerResponseSearch(e.target.value)}
            placeholder="Search reflections, notes..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
          />
          {customerResponseSearch && (
            <button
              type="button"
              onClick={() => setCustomerResponseSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {sortedResponses.length > 0 && (
          <button
            type="button"
            onClick={toggleExpandAll}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0"
          >
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        )}
      </div>
    </div>

    {/* Responses List */}
    {sortedResponses.length === 0 ? (
      <div className="py-12 px-6 text-center space-y-2 bg-zinc-50 dark:bg-white/[0.02] rounded-2xl border border-zinc-200/80 dark:border-white/5">
        <MessageSquareQuote className="w-8 h-8 text-zinc-400 mx-auto opacity-40" />
        <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          No Check-In Responses Found
        </h4>
        <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
          {programResponses.length === 0
            ? "This customer has not recorded any check-ins for this program yet."
            : "No responses match the active filter criteria."}
        </p>
      </div>
      ) : (
        <div className="space-y-2.5">
          {sortedResponses.map((sub) => (
            <AdminCustomerResponseItem
              key={sub.id}
              sub={sub}
              expandedResponseIds={expandedResponseIds}
              setExpandedResponseIds={setExpandedResponseIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}
