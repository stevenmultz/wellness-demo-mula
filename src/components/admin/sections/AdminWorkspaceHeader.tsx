"use client";

import { AlertCircle, CheckCircle2, HardDrive } from "lucide-react";
import type { MasterDataPayload } from "@/wellness/actions/master";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { calculateProgramMemoryFootprint, formatByteSize } from "@/wellness/utils/timeline";
import type {
  AdminBreadcrumbItem,
  AdminFeedbackMessage,
  AdminMenuKey,
  AdminPendingEnrollmentItem,
  AdminProgram,
  AdminUserItem,
} from "../adminTypes";

interface AdminWorkspaceHeaderProps {
  breadcrumbItems: AdminBreadcrumbItem[];
  activeMenu: AdminMenuKey;
  isCreatingProgram: boolean;
  selectedProgram: AdminProgram | null;
  programs: AdminProgram[];
  users: AdminUserItem[];
  pendingEnrollments: AdminPendingEnrollmentItem[];
  approvedEnrollmentsCount: number;
  approvedRevenue: number;
  pendingRevenue: number;
  liveProgramsCount: number;
  draftProgramsCount: number;
  totalProgramsMemoryBytes: number;
  masterData: MasterDataPayload;
  activeUsersCount: number;
  suspendedUsersCount: number;
  enrolledUsersCount: number;
  isSuperadminUser: boolean;
  currentAdminRole: string;
  feedback: AdminFeedbackMessage | null;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
}

export function AdminWorkspaceHeader({
  breadcrumbItems,
  activeMenu,
  isCreatingProgram,
  selectedProgram,
  programs,
  users,
  pendingEnrollments,
  approvedEnrollmentsCount,
  approvedRevenue,
  pendingRevenue,
  liveProgramsCount,
  draftProgramsCount,
  totalProgramsMemoryBytes,
  masterData,
  activeUsersCount,
  suspendedUsersCount,
  enrolledUsersCount,
  isSuperadminUser,
  currentAdminRole,
  feedback,
  setFeedback,
}: AdminWorkspaceHeaderProps) {
  const { t } = useLocale();
  const approvedEnrollments = { length: approvedEnrollmentsCount };
  void calculateProgramMemoryFootprint;

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-wrap font-mono text-[11px] text-zinc-500 dark:text-zinc-400 -mt-2">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-zinc-300 dark:text-zinc-700 select-none">/</span>
              )}
              {isLast ? (
                <span className="text-zinc-900 dark:text-white font-medium">
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  disabled={!item.onClick}
                  className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors disabled:pointer-events-none"
                >
                  {item.label}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* CONTEXTUAL TOP WIDGETS (Compact 4-column strip, only shown on primary menu views) */}
      {!(activeMenu === "programs" && (isCreatingProgram || Boolean(selectedProgram))) && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {activeMenu === "dashboard" && (
          <>
            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Total Programs
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {programs.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Total Customers
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {users.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Pending Approvals
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {pendingEnrollments.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Verified Revenue
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white font-mono mt-0.5 truncate">
                Rp {approvedRevenue.toLocaleString("id-ID")}
              </div>
            </div>
          </>
        )}

        {activeMenu === "programs" && (
          <>
            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Total Programs
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {programs.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Published Programs
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {liveProgramsCount}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Draft Programs
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {draftProgramsCount}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Total Memory Footprint
                </span>
                <HardDrive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight font-mono text-zinc-900 dark:text-white mt-0.5 truncate">
                {formatByteSize(totalProgramsMemoryBytes)}
              </div>
            </div>
          </>
        )}

        {activeMenu === "master" && (
          <>
            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Master Coaches
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {masterData.coaches.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Target Audiences
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {masterData.targetAudiences.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Categories
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {masterData.categories.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Active Programs
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {programs.length}
              </div>
            </div>
          </>
        )}

        {activeMenu === "members" && (
          <>
            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Total Customers
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {users.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Active Standing
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-0.5">
                {activeUsersCount}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Suspended Accounts
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-400 mt-0.5">
                {suspendedUsersCount}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Enrolled Customers
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {enrolledUsersCount}
              </div>
            </div>
          </>
        )}

        {activeMenu === "payments" && (
          <>
            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Pending Approvals
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {pendingEnrollments.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Approved Orders
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                {approvedEnrollments.length}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Settled Revenue
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white font-mono mt-0.5 truncate">
                Rp {approvedRevenue.toLocaleString("id-ID")}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                Pending Volume
              </span>
              <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                Rp {pendingRevenue.toLocaleString("id-ID")}
              </div>
            </div>
          </>
        )}
      </section>
      )}

      {/* Scoped Role Banner for Coaches / Partner Admins */}
      {!isSuperadminUser && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
          <span className="font-medium">
            {t.admin.scopedModeBanner} ({currentAdminRole})
          </span>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl px-5 py-3.5 text-xs flex items-center justify-between gap-3 border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <span className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-zinc-800 dark:text-zinc-200 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] text-zinc-400 hover:text-zinc-900 dark:hover:text-white whitespace-nowrap"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
