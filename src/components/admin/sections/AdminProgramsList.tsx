"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Copy,
  HardDrive,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import {
  resolveProgramStatus,
  calculateProgramMemoryFootprint,
  type ProgramDatabaseStatus,
} from "@/wellness/utils/timeline";
import { isProgramHeaderComplete } from "@/wellness/validators/program";
import { formatDate, isDayFilled } from "../adminUtils";
import { PaginationBar } from "../AdminFormPickers";
import type { AdminProgram } from "../adminTypes";

type ProgramSortKey =
  | "NEWEST"
  | "OLDEST"
  | "TITLE_ASC"
  | "TITLE_DESC"
  | "MEMORY_DESC"
  | "MEMORY_ASC"
  | "PRICE_DESC"
  | "PRICE_ASC";

interface AdminProgramsListProps {
  programs: AdminProgram[];
  filteredPrograms: AdminProgram[];
  paginatedPrograms: AdminProgram[];
  programSearch: string;
  setProgramSearch: (val: string) => void;
  programFilter: "ALL" | ProgramDatabaseStatus;
  setProgramFilter: (val: "ALL" | ProgramDatabaseStatus) => void;
  programSort: ProgramSortKey;
  setProgramSort: (val: ProgramSortKey) => void;
  setProgramPage: (page: number) => void;
  safeProgramPage: number;
  totalProgramPages: number;
  programPageSize: number;
  resetCreateForm: () => void;
  setIsCreatingProgram: (val: boolean) => void;
  setSelectedProgramId: (id: string | null) => void;
  isSuperadminUser?: boolean;
  canManagePrograms?: boolean;
  duplicatingId?: string | null;
  handleDuplicateProgram?: (prog: AdminProgram, asNextBatch?: boolean) => void;
  openProgramDetail: (
    prog: AdminProgram,
    defaultDay?: number,
    defaultTab?: "info" | "schedule" | "responses"
  ) => void;
}

export function AdminProgramsList({
  programs,
  filteredPrograms,
  paginatedPrograms,
  programSearch,
  setProgramSearch,
  programFilter,
  setProgramFilter,
  programSort,
  setProgramSort,
  setProgramPage,
  safeProgramPage,
  totalProgramPages,
  programPageSize,
  resetCreateForm,
  setIsCreatingProgram,
  setSelectedProgramId,
  isSuperadminUser = false,
  canManagePrograms = false,
  duplicatingId = null,
  handleDuplicateProgram,
  openProgramDetail,
}: AdminProgramsListProps) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      {/* MIDDLE WIDGET: Search & New Program (Top Row) + Filters (Bottom Row - Stacked) */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
        {/* Row 1: Search Bar (Left) side-by-side with New Program Button (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={programSearch}
              onChange={(e) => {
                setProgramSearch(e.target.value);
                setProgramPage(1);
              }}
              placeholder="Search programs by title or coach..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition"
            />
            {programSearch && (
              <button
                type="button"
                onClick={() => {
                  setProgramSearch("");
                  setProgramPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {canManagePrograms && (
            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setIsCreatingProgram(true);
                setSelectedProgramId(null);
                router.push("/admin/programs/new");
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap shadow-xs hover:opacity-90 transition shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>New Program</span>
            </button>
          )}
        </div>

        {/* Row 2: Filters (Status Pills & Sort) - Visually Balanced */}
        <div className="pt-3.5 border-t border-zinc-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono">
          {/* Status Filter Group */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: "ALL", label: `All (${programs.length})` },
                { key: "DRAFT", label: "Draft" },
                { key: "REVIEW", label: "Review" },
                { key: "PUBLISH", label: "Publish" },
                { key: "DONE", label: "Done" },
                { key: "ARCHIVE", label: "Archive" },
              ] as const
            ).map((tab) => {
              const isSelected = programFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setProgramFilter(tab.key);
                    setProgramPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                      : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sort By Dropdown - Symmetrically styled with status pills */}
          <div className="relative inline-flex items-center shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <select
              value={programSort}
              onChange={(e) => {
                setProgramSort(e.target.value as ProgramSortKey);
                setProgramPage(1);
              }}
              className="pl-9 pr-8 py-2 h-[37px] rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200/80 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-sans font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer appearance-none transition"
            >
              <option value="NEWEST" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Newest Date</option>
              <option value="OLDEST" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Oldest Date</option>
              <option value="TITLE_ASC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Title (A - Z)</option>
              <option value="TITLE_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Title (Z - A)</option>
              <option value="MEMORY_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Memory (Largest First)</option>
              <option value="MEMORY_ASC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Memory (Smallest First)</option>
              <option value="PRICE_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Price (High to Low)</option>
              <option value="PRICE_ASC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Price (Low to High)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* BOTTOM WIDGET: Programs Directory Header + Cards + Pagination */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Programs Directory ({filteredPrograms.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
            Page {safeProgramPage} of {totalProgramPages}
          </span>
        </div>

        {paginatedPrograms.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-14 text-center border border-zinc-200/80 dark:border-white/10 shadow-xs">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No programs found matching the selected filter.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {paginatedPrograms.map((prog, idx) => {
              const isOnlineProg = (prog.locationType || "ONLINE") === "ONLINE";
              const targetDays = isOnlineProg
                ? Math.max(1, prog.days.length)
                : prog.durationDays || 21;
              let filledCount = 0;
              if (isOnlineProg) {
                filledCount = prog.days.filter((x) => isDayFilled(x)).length;
              } else {
                for (let d = 1; d <= targetDays; d++) {
                  const dayObj = prog.days.find((x) => x.dayNumber === d);
                  if (isDayFilled(dayObj)) filledCount++;
                }
              }

              const headerCheck = isProgramHeaderComplete(prog);
              const isCurriculumComplete = isOnlineProg
                ? prog.days.length >= 1 && filledCount === prog.days.length
                : filledCount === targetDays;
              const statusRes = resolveProgramStatus({
                isPublished: prog.isPublished,
                status: prog.status,
                locationType: prog.locationType,
                startDate: prog.startDate,
                endDate: prog.endDate,
                registrationOpenDate: prog.registrationOpenDate,
                registrationDeadline: prog.registrationDeadline,
                maxQuota: prog.maxQuota,
                enrolledCount: prog.activeSubscribers,
                headerComplete: headerCheck.isComplete,
                curriculumComplete: isCurriculumComplete,
              });

              const progMemory = calculateProgramMemoryFootprint(prog);

              const defaultCovers = [
                "/test.webp",
                "/pic.webp",
                "/image.webp",
                "/coach.webp",
                "/coach2.webp",
              ];
              const coverSrc =
                prog.coverImage && prog.coverImage.trim().length > 0
                  ? prog.coverImage
                  : defaultCovers[idx % defaultCovers.length];

              const isResponseDisabled =
                statusRes.dbStatus === "DRAFT" || statusRes.dbStatus === "OPEN";

              return (
                <div
                  key={prog.id}
                  className="relative rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-white/10 shadow-lg group hover:border-zinc-400 dark:hover:border-white/25 transition-all duration-300 min-h-[190px] sm:min-h-[210px] flex flex-col justify-between p-5 sm:p-6"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverSrc}
                      alt={prog.title}
                      className="w-full h-full object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    {/* Subtle Bottom & Top Scrim for Text Legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 pointer-events-none" />
                  </div>

                  {/* TOP ROW: DB Status Badge + Dynamic Public Condition Badge (Left) & Memory Footprint (Right) */}
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 font-mono">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Authoritative DB Status Badge */}
                      <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-semibold border border-white/20 shadow-sm">
                        {statusRes.dbStatus}
                      </span>

                      {/* Dynamic Public Condition Badge (Only when PUBLISH) - Strict Monochrome */}
                      {statusRes.dbStatus === "PUBLISH" && statusRes.publicBadge ? (
                        <span
                          className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 font-semibold border backdrop-blur-md shadow-sm bg-white/10 border-white/25 text-white"
                          title={statusRes.badgeSublabel}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>{statusRes.publicBadge}</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Right: Memory Footprint - Monochrome */}
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-zinc-300 border border-white/20 shadow-sm"
                        title={`Entire program payload footprint: ${progMemory.bytes.toLocaleString()} bytes across ${progMemory.daysCount} days`}
                      >
                        <HardDrive className="w-3 h-3 text-zinc-400" />
                        <span>{progMemory.formatted}</span>
                      </span>
                    </div>
                  </div>

                  {/* MIDDLE: Compact Program Title + Schedule Dates */}
                  <div className="relative z-10 py-3 my-auto space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {prog.batchNumber ? (
                        <span className="px-2 py-0.5 rounded bg-white text-zinc-950 text-[10px] font-mono font-bold uppercase shadow-xs">
                          Batch {prog.batchNumber}
                        </span>
                      ) : null}
                      {prog.organizationCache && (
                        <span className="px-2 py-0.5 rounded bg-black/50 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/90">
                          {prog.organizationCache}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-geometric font-semibold text-white tracking-tight drop-shadow-md leading-snug line-clamp-2 max-w-2xl">
                      {prog.title}
                    </h3>
                    {isOnlineProg ? (
                      <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] drop-shadow-sm">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>Full Online · Anytime Access ({prog.days.length} Modules)</span>
                      </div>
                    ) : prog.startDate && prog.endDate ? (
                      <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] drop-shadow-sm">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>
                          {formatDate(prog.startDate)} &ndash; {formatDate(prog.endDate)}
                        </span>
                      </div>
                    ) : prog.startDate ? (
                      <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] drop-shadow-sm">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>Starts {formatDate(prog.startDate)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* BOTTOM ROW: Clean Floating Bar (Price + Capacity + Action Buttons) */}
                  <div className="relative z-10 p-2.5 sm:p-3 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-lg">
                    {/* Left: Minimal Icon & Values - Strict Monochrome */}
                    <div className="flex items-center gap-3 text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm tracking-tight">
                          Rp {prog.price.toLocaleString("id-ID")}
                        </span>
                        {prog.discountPercentage && prog.discountPercentage > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="line-through text-zinc-400 text-[11px] font-mono">
                              Rp{" "}
                              {(prog.actualPrice && prog.actualPrice > prog.price
                                ? prog.actualPrice
                                : Math.round(prog.price / (1 - prog.discountPercentage / 100))
                              ).toLocaleString("id-ID")}
                            </span>
                            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/25">
                              -{prog.discountPercentage}%
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <span className="text-zinc-600">•</span>

                      <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                        <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>
                          {prog.activeSubscribers}/{prog.maxQuota}
                          {(prog.minQuota ?? 1) > 1 ? ` (Min ${prog.minQuota})` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {canManagePrograms && handleDuplicateProgram && (
                        <button
                          type="button"
                          disabled={duplicatingId === prog.id}
                          onClick={() => handleDuplicateProgram(prog, true)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200 hover:text-white text-xs font-medium inline-flex items-center gap-1 transition"
                          title={isOnlineProg ? "Duplicate Program" : "Create Next Batch"}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">
                            {duplicatingId === prog.id ? "..." : isOnlineProg ? "Duplicate" : "Next Batch"}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isResponseDisabled}
                        onClick={() => {
                          if (!isResponseDisabled) {
                            openProgramDetail(prog, undefined, "responses");
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition backdrop-blur-md shadow-xs ${
                          isResponseDisabled
                            ? "bg-white/5 border-white/10 text-zinc-500 cursor-not-allowed opacity-40"
                            : "bg-white/10 hover:bg-white/20 border-white/20 text-zinc-200 hover:text-white"
                        }`}
                        title={
                          isResponseDisabled
                            ? "Responses unavailable in Draft/Open state"
                            : `View responses (${prog.submissionCount ?? 0})`
                        }
                      >
                        View Response
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openProgramDetail(
                            prog,
                            undefined,
                            !canManagePrograms && !isResponseDisabled ? "responses" : "info"
                          )
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm hover:scale-[1.02] duration-150"
                      >
                        <span>{canManagePrograms ? "Manage" : "Monitor"}</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <PaginationBar
          currentPage={safeProgramPage}
          totalPages={totalProgramPages}
          totalItems={filteredPrograms.length}
          pageSize={programPageSize}
          onPageChange={setProgramPage}
          itemLabel="programs"
        />
      </div>
    </div>
  );
}
