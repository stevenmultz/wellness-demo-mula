"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Copy,
  FileEdit,
  Globe,
  Loader2,
  Lock,
  MessageSquareQuote,
  Trash2,
} from "lucide-react";
import { resolveProgramStatus } from "@/wellness/utils/timeline";
import { safeHttpUrl } from "@/wellness/utils/url-safety";
import { isProgramHeaderComplete } from "@/wellness/validators/program";
import { formatDate, isDayFilled, parseTagList } from "../adminUtils";
import type { AdminProgram } from "../adminTypes";

interface AdminProgramDetailViewProps {
  selectedProgram: AdminProgram;
  setSelectedProgramId: (id: string | null) => void;
  programDetailTab: "info" | "schedule" | "responses";
  setProgramDetailTab: (tab: "info" | "schedule" | "responses") => void;
  selectedDayNum: number;
  publishingId: string | null;
  duplicatingId: string | null;
  deletingProgId: string | null;
  handleInitiatePublish: (prog: AdminProgram) => void;
  handleDuplicateProgram: (prog: AdminProgram, asNextBatch?: boolean) => void;
  handleDeleteProgram: (prog: AdminProgram) => void;
  loadProgramSubmissions: (progId: string) => void;
  submissionsCount: number;
  children: ReactNode;
}

export function AdminProgramDetailView({
  selectedProgram,
  setSelectedProgramId,
  programDetailTab,
  setProgramDetailTab,
  selectedDayNum,
  publishingId,
  duplicatingId,
  deletingProgId,
  handleInitiatePublish,
  handleDuplicateProgram,
  handleDeleteProgram,
  loadProgramSubmissions,
  submissionsCount,
  children,
}: AdminProgramDetailViewProps) {
  const router = useRouter();
  const isOnlineProgram = (selectedProgram.locationType || "ONLINE") === "ONLINE";

  const targetDays = isOnlineProgram
    ? Math.max(1, selectedProgram.days.length)
    : selectedProgram.durationDays || 21;
  let filledCount = 0;
  if (isOnlineProgram) {
    filledCount = selectedProgram.days.filter((x) => isDayFilled(x)).length;
  } else {
    for (let d = 1; d <= targetDays; d++) {
      if (isDayFilled(selectedProgram.days.find((x) => x.dayNumber === d))) {
        filledCount++;
      }
    }
  }

  const headerCheck = isProgramHeaderComplete({
    title: selectedProgram.title,
    description: selectedProgram.description,
    difficultyLevel: selectedProgram.difficultyLevel,
    targetState: selectedProgram.targetState,
    methodology: selectedProgram.methodology,
    expectedBenefits: selectedProgram.expectedBenefits,
    category: selectedProgram.category,
    dailyCommitment: selectedProgram.dailyCommitment,
    coachName: selectedProgram.coachName,
    startDate: selectedProgram.startDate,
    endDate: selectedProgram.endDate,
    registrationDeadline: selectedProgram.registrationDeadline,
    locationType: selectedProgram.locationType,
    city: selectedProgram.city,
    venueAddress: selectedProgram.venueAddress,
    maxQuota: selectedProgram.maxQuota,
    price: selectedProgram.price,
    communityLink: selectedProgram.communityLink,
    termsList: selectedProgram.termsList,
    customTerms: selectedProgram.customTerms,
  });

  const isCurriculumComplete = isOnlineProgram
    ? selectedProgram.days.length >= 1 && filledCount === selectedProgram.days.length
    : filledCount === targetDays;
  const isReadyToPublish = headerCheck.isComplete && isCurriculumComplete;

  const statusRes = resolveProgramStatus({
    isPublished: selectedProgram.isPublished,
    status: selectedProgram.status,
    locationType: selectedProgram.locationType,
    startDate: selectedProgram.startDate,
    endDate: selectedProgram.endDate,
    registrationOpenDate: selectedProgram.registrationOpenDate,
    registrationDeadline: selectedProgram.registrationDeadline,
    maxQuota: selectedProgram.maxQuota,
    enrolledCount: selectedProgram.activeSubscribers,
    headerComplete: headerCheck.isComplete,
    curriculumComplete: isCurriculumComplete,
  });

  const attendanceLabel = isOnlineProgram
    ? "Full Online • Anytime Access"
    : `Hybrid (Online + Onsite) • ${selectedProgram.city || "Jakarta"}`;

  return (
    <div className="space-y-6">
      {/* Program Detail Header Summary Widget */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 sm:p-7 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-5">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              setSelectedProgramId(null);
              router.push("/admin/programs");
            }}
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to Programs
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Automated Dynamic Lifecycle Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${statusRes.colorClass}`}
                title={statusRes.badgeSublabel}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>{statusRes.badgeLabel}</span>
              </span>
            </div>

            {/* Publish / Unpublish Program Button */}
            {selectedProgram.isPublished ? (
              <button
                type="button"
                onClick={() => handleInitiatePublish(selectedProgram)}
                disabled={publishingId === selectedProgram.id}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 transition flex items-center gap-1.5"
                title="Unpublish program to return to review state"
              >
                {publishingId === selectedProgram.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <span>Unpublish Program</span>
              </button>
            ) : !isReadyToPublish ? (
              <button
                type="button"
                disabled
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-white/10 opacity-40 cursor-not-allowed flex items-center gap-1.5 shadow-none"
                title={
                  !headerCheck.isComplete
                    ? `Publish locked: Complete all 8 Program Header sections (${headerCheck.completedCount}/8 completed).`
                    : `Publish locked: Complete all ${targetDays} daily modules (${filledCount}/${targetDays} completed).`
                }
              >
                <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                <span>Publish Locked</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleInitiatePublish(selectedProgram)}
                disabled={publishingId === selectedProgram.id}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center gap-1.5 shadow-sm hover:scale-[1.02] duration-150"
                title="Validate completeness and launch program"
              >
                {publishingId === selectedProgram.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Publish Program</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDuplicateProgram(selectedProgram, true)}
              disabled={duplicatingId === selectedProgram.id}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 transition flex items-center gap-1.5"
              title="Duplicate header + curriculum as a fresh Draft (Next Batch)"
            >
              {duplicatingId === selectedProgram.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span>{isOnlineProgram ? "Duplicate Program" : "Create Next Batch"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDeleteProgram(selectedProgram)}
              disabled={deletingProgId === selectedProgram.id}
              className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-zinc-200/70 dark:border-white/10 hover:border-red-200 dark:hover:border-red-900/50"
              title="Delete Program"
            >
              {deletingProgId === selectedProgram.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Title, Badges & Synopsis */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-2xs">
                  DB: {statusRes.dbStatus}
                </span>

                {statusRes.dbStatus === "PUBLISH" && statusRes.publicBadge ? (
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-semibold border ${statusRes.colorClass}`}
                    title={statusRes.badgeSublabel}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span>Live: {statusRes.publicBadge}</span>
                  </span>
                ) : (
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-semibold border ${statusRes.colorClass}`}
                    title={statusRes.badgeSublabel}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{statusRes.badgeLabel}</span>
                  </span>
                )}

                {!selectedProgram.isPublished && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
                    {statusRes.authoringStatus === "CONCEPT"
                      ? `Header Incomplete (${headerCheck.completedCount}/8 points)`
                      : statusRes.authoringStatus === "DRAFT"
                      ? `Header Complete • Curriculum Day ${filledCount}/${targetDays}`
                      : "Review • Ready to Launch"}
                  </span>
                )}

                {parseTagList(selectedProgram.category || "Pilates").map(
                  (cat, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10"
                    >
                      {cat}
                    </span>
                  )
                )}

                <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
                  {attendanceLabel}
                </span>
                {selectedProgram.batchNumber ? (
                  <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                    Batch {selectedProgram.batchNumber}
                  </span>
                ) : null}
              </div>

              <h2 className="text-xl sm:text-2xl font-geometric font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug">
                {selectedProgram.title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                {selectedProgram.description}
              </p>
            </div>

            {safeHttpUrl(selectedProgram.communityLink) && (
              <a
                href={safeHttpUrl(selectedProgram.communityLink)!}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1.5 shrink-0 w-fit transition"
              >
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span>Community Group</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Clean 4-Column Executive Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Duration &amp; Dates
              </span>
              <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                {isOnlineProgram
                  ? `${selectedProgram.days.length} Modules (${filledCount}/${targetDays} filled)`
                  : `${selectedProgram.durationDays} Days (${filledCount}/${targetDays} filled)`}
              </p>
              <span className="text-[11px] text-zinc-500 block truncate">
                {isOnlineProgram || !selectedProgram.startDate
                  ? "Flexible · Anytime Access"
                  : `${formatDate(selectedProgram.startDate)} – ${formatDate(selectedProgram.endDate)}`}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Tuition Fee
              </span>
              <p className="text-xs sm:text-sm font-semibold font-mono text-zinc-900 dark:text-white">
                {selectedProgram.price === 0
                  ? "Free"
                  : `Rp ${selectedProgram.price.toLocaleString("id-ID")}`}
              </p>
              {selectedProgram.discountPercentage &&
              selectedProgram.discountPercentage > 0 ? (
                <span className="text-[11px] text-zinc-500 block truncate">
                  <span className="line-through">
                    Rp{" "}
                    {(
                      selectedProgram.actualPrice || selectedProgram.price
                    ).toLocaleString("id-ID")}
                  </span>{" "}
                  (-{selectedProgram.discountPercentage}%)
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500 block">
                  Standard tuition
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Assigned Coach
              </span>
              <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                {selectedProgram.coachName}
              </p>
              <span className="text-[11px] text-zinc-500 truncate block">
                {selectedProgram.coachTitle || "Lead Instructor"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Quota &amp; Registration
              </span>
              <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                {selectedProgram.maxQuota} Seats (
                {selectedProgram.activeSubscribers} active)
              </p>
              <span className="text-[11px] text-zinc-500 truncate block">
                {isOnlineProgram || !selectedProgram.registrationDeadline
                  ? "No deadline (Always open)"
                  : `Cutoff: ${formatDate(selectedProgram.registrationDeadline)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY 3 NAVIGATION OPTIONS: Program Header | Daily Management | Responses */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* OPTION 1: PROGRAM HEADER */}
        <button
          type="button"
          onClick={() => {
            setProgramDetailTab("info");
            router.push(
              `/admin/programs/${selectedProgram.id}?tab=info&day=${selectedDayNum}`
            );
          }}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 relative group ${
            programDetailTab === "info"
              ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/10 dark:ring-white/10 scale-[1.01]"
              : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  programDetailTab === "info"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200/70 dark:group-hover:bg-white/15"
                }`}
              >
                <FileEdit className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-geometric">
                  <span>Program Header</span>
                  {programDetailTab === "info" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  )}
                </h4>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                  Blueprint, Settings &amp; Terms
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-white/5 w-full">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Audit:{" "}
              <strong className="text-zinc-900 dark:text-white font-semibold">
                {headerCheck.completedCount}/8
              </strong>{" "}
              Points
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
              {headerCheck.isComplete
                ? "8/8 Complete"
                : `${8 - headerCheck.completedCount} Points Missing`}
            </span>
          </div>
        </button>

        {/* OPTION 2: DAILY MANAGEMENT */}
        <button
          type="button"
          onClick={() => {
            setProgramDetailTab("schedule");
            router.push(
              `/admin/programs/${selectedProgram.id}?tab=schedule&day=${selectedDayNum}`
            );
          }}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 relative group ${
            programDetailTab === "schedule"
              ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/10 dark:ring-white/10 scale-[1.01]"
              : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  programDetailTab === "schedule"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200/70 dark:group-hover:bg-white/15"
                }`}
              >
                <Calendar className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-geometric">
                  <span>Daily Management</span>
                  {programDetailTab === "schedule" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  )}
                </h4>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                  Day 1–{targetDays} Curriculum Modules
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-white/5 w-full">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Progress:{" "}
              <strong className="text-zinc-900 dark:text-white font-semibold">
                {filledCount}/{targetDays}
              </strong>{" "}
              Days
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
              {isCurriculumComplete
                ? "100% Ready"
                : `${targetDays - filledCount} Days Remaining`}
            </span>
          </div>
        </button>

        {/* OPTION 3: MEMBER RESPONSES */}
        <button
          type="button"
          onClick={() => {
            setProgramDetailTab("responses");
            router.push(
              `/admin/programs/${selectedProgram.id}?tab=responses&day=${selectedDayNum}`
            );
            loadProgramSubmissions(selectedProgram.id);
          }}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 relative group ${
            programDetailTab === "responses"
              ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/10 dark:ring-white/10 scale-[1.01]"
              : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  programDetailTab === "responses"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200/70 dark:group-hover:bg-white/15"
                }`}
              >
                <MessageSquareQuote className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-geometric">
                  <span>Responses</span>
                  {programDetailTab === "responses" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  )}
                </h4>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                  Member Accountability Logs
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-white/5 w-full">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Total Submissions
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 font-mono">
              {selectedProgram.submissionCount ?? submissionsCount} Submissions Logged
            </span>
          </div>
        </button>
      </div>

      {children}
    </div>
  );
}
