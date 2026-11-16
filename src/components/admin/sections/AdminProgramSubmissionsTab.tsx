"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  MessageSquareQuote,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import type { ProgramSubmissionItem } from "@/wellness/actions/program";
import type { AdminLightboxData, AdminProgram } from "../adminTypes";
import { AdminSubmissionCard } from "./AdminSubmissionCard";

interface AdminProgramSubmissionsTabProps {
  selectedProgram: AdminProgram;
  programSubmissions: ProgramSubmissionItem[];
  filteredSubmissions: ProgramSubmissionItem[];
  submissionsLoading: boolean;
  submissionsError: string | null;
  submissionStats: {
    totalSubmissions: number;
    completedSubmissions: number;
    photoSubmissions: number;
    uniqueMembers: number;
  };
  submissionDayFilter: number | "ALL";
  setSubmissionDayFilter: (val: number | "ALL") => void;
  submissionMemberFilter: string;
  setSubmissionMemberFilter: (val: string) => void;
  submissionPhotosOnly: boolean;
  setSubmissionPhotosOnly: Dispatch<SetStateAction<boolean>>;
  submissionSearch: string;
  setSubmissionSearch: (val: string) => void;
  loadProgramSubmissions: (progId: string) => void;
  setLightboxData: (val: AdminLightboxData | null) => void;
}

export function AdminProgramSubmissionsTab({
  selectedProgram,
  programSubmissions,
  filteredSubmissions,
  submissionsLoading,
  submissionsError,
  submissionStats,
  submissionDayFilter,
  setSubmissionDayFilter,
  submissionMemberFilter,
  setSubmissionMemberFilter,
  submissionPhotosOnly,
  setSubmissionPhotosOnly,
  submissionSearch,
  setSubmissionSearch,
  loadProgramSubmissions,
  setLightboxData,
}: AdminProgramSubmissionsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Stats Overview (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Total Responses</span>
            <MessageSquareQuote className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">
            {submissionStats.totalSubmissions}
          </div>
          <p className="text-[11px] text-zinc-500">Across all curriculum days</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Completed Days</span>
            <CheckCircle2 className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">
            {submissionStats.completedSubmissions}
          </div>
          <p className="text-[11px] text-zinc-500">Fully validated routines</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Photo Logs</span>
            <Camera className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">
            {submissionStats.photoSubmissions}
          </div>
          <p className="text-[11px] text-zinc-500">Before &amp; After photo submissions</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Active Members</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">
            {submissionStats.uniqueMembers}
          </div>
          <p className="text-[11px] text-zinc-500">Distinct participants engaged</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Day Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-500">Day:</span>
              <select
                value={submissionDayFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSubmissionDayFilter(val === "ALL" ? "ALL" : parseInt(val, 10));
                }}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="ALL">All Days (1 - {selectedProgram.durationDays || 21})</option>
                {Array.from({ length: selectedProgram.durationDays || 21 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Member Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-500">Member:</span>
              <select
                value={submissionMemberFilter}
                onChange={(e) => setSubmissionMemberFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 max-w-[200px] truncate"
              >
                <option value="ALL">All Members</option>
                {Array.from(new Set(programSubmissions.map((s) => s.userId))).map((uid) => {
                  const match = programSubmissions.find((s) => s.userId === uid);
                  return (
                    <option key={uid} value={uid}>
                      {match?.userName || "Member"}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Photos Only Toggle */}
            <button
              type="button"
              onClick={() => setSubmissionPhotosOnly((p) => !p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
                submissionPhotosOnly
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                  : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:bg-zinc-100"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Photos Only</span>
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes, reflections, members..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                className="w-full pl-8.5 pr-8 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              {submissionSearch && (
                <button
                  type="button"
                  onClick={() => setSubmissionSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => loadProgramSubmissions(selectedProgram.id)}
              disabled={submissionsLoading}
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition"
              title="Refresh responses"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${submissionsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(submissionDayFilter !== "ALL" || submissionMemberFilter !== "ALL" || submissionPhotosOnly || submissionSearch) && (
          <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing <strong>{filteredSubmissions.length}</strong> of {programSubmissions.length} response(s)
            </span>
            <button
              type="button"
              onClick={() => {
                setSubmissionDayFilter("ALL");
                setSubmissionMemberFilter("ALL");
                setSubmissionPhotosOnly(false);
                setSubmissionSearch("");
              }}
              className="text-zinc-700 dark:text-zinc-300 hover:underline text-[11px]"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Content State: Loading, Error, Empty, or Feed */}
      {submissionsLoading ? (
        <div
          role="status"
          aria-label="Loading member submissions"
          className="p-6 space-y-4 bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10"
        >
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            <span>Loading member submissions...</span>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-zinc-200/70 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-4 w-36 skeleton-block" />
                <div className="h-4 w-20 skeleton-block" />
              </div>
              <div className="h-3.5 w-3/4 skeleton-block" />
              <div className="h-12 w-full skeleton-block" />
            </div>
            <div className="p-4 rounded-xl border border-zinc-200/70 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 skeleton-block" />
                <div className="h-4 w-20 skeleton-block" />
              </div>
              <div className="h-3.5 w-2/3 skeleton-block" />
              <div className="h-12 w-full skeleton-block" />
            </div>
          </div>
        </div>
      ) : submissionsError ? (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{submissionsError}</p>
            <button
              type="button"
              onClick={() => loadProgramSubmissions(selectedProgram.id)}
              className="mt-2 underline font-medium"
            >
              Retry loading responses
            </button>
          </div>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="py-16 px-6 text-center space-y-4 bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 mx-auto flex items-center justify-center text-zinc-400">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
              No Member Responses Found
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {programSubmissions.length === 0
                ? "No member inputs recorded yet for this program. Once active participants log workout completions, upload progress photos, or write daily reflections, they will appear here."
                : "No submissions match your active filters. Try adjusting your day or member filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => (
            <AdminSubmissionCard
              key={sub.id}
              sub={sub}
              setLightboxData={setLightboxData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
