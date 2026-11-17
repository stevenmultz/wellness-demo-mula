"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Layers, Loader2, Plus, QrCode, Users } from "lucide-react";
import { isDayFilled } from "../adminUtils";
import type { AdminMenuKey, AdminPendingEnrollmentItem, AdminProgram, AdminUserItem } from "../adminTypes";

interface AdminDashboardOverviewProps {
  programs: AdminProgram[];
  users: AdminUserItem[];
  pendingEnrollments: AdminPendingEnrollmentItem[];
  approvingId: string | null;
  isSuperadminUser?: boolean;
  setActiveMenu: (menu: AdminMenuKey) => void;
  setSelectedProgramId: (id: string | null) => void;
  setIsCreatingProgram: (val: boolean) => void;
  resetCreateForm: () => void;
  openProgramDetail: (prog: AdminProgram, defaultDay?: number) => void;
  handleApprovePayment: (enrollmentId: string) => void;
}

export function AdminDashboardOverview({
  programs,
  users,
  pendingEnrollments,
  approvingId,
  isSuperadminUser = false,
  setActiveMenu,
  setSelectedProgramId,
  setIsCreatingProgram,
  resetCreateForm,
  openProgramDetail,
  handleApprovePayment,
}: AdminDashboardOverviewProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Quick Actions & Welcome Bar */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 block">
            Operations Cockpit
          </span>
          <h2 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-zinc-900 dark:text-white">
            Platform Overview
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
            Monitor live programs, verify member payments, and review customer standings in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveMenu("programs");
              setSelectedProgramId(null);
              resetCreateForm();
              setIsCreatingProgram(true);
              router.push("/admin/programs/new");
            }}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-1.5 transition hover:opacity-90 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>New Program</span>
          </button>

          {isSuperadminUser && (
            <button
              type="button"
              onClick={() => {
                setActiveMenu("payments");
                router.push("/admin/payments");
              }}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition hover:bg-zinc-100 dark:hover:bg-white/10 whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span>Pending Payments ({pendingEnrollments.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Programs Health & (for Superadmin) Pending Approvals */}
      <div className={`grid ${isSuperadminUser ? "lg:grid-cols-2" : ""} gap-6`}>
        {/* Left Column: Programs Directory Snapshot */}
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Active Programs ({programs.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveMenu("programs");
                router.push("/admin/programs");
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1"
            >
              View Directory <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-white/5 flex-1">
            {programs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No programs created yet.
              </div>
            ) : (
              programs.slice(0, 4).map((prog) => {
                const targetDays = prog.durationDays || 21;
                let filledCount = 0;
                for (let d = 1; d <= targetDays; d++) {
                  if (isDayFilled(prog.days.find((x) => x.dayNumber === d))) filledCount++;
                }
                const pct = Math.min(100, Math.round((filledCount / targetDays) * 100));

                return (
                  <div
                    key={prog.id}
                    onClick={() => {
                      setActiveMenu("programs");
                      openProgramDetail(prog);
                    }}
                    className="p-4 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] cursor-pointer transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            prog.isPublished
                              ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-white/20 font-medium"
                              : "bg-zinc-50 text-zinc-500 border-zinc-200 dark:border-white/10"
                          }`}
                        >
                          {prog.isPublished ? "Published" : "Draft"}
                        </span>
                        <span className="text-[11px] text-zinc-500 truncate">
                          {prog.coachName}
                        </span>
                      </div>
                      <h4 className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                        {prog.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                        <span>{filledCount}/{targetDays} days ({pct}%)</span>
                        <span>•</span>
                        <span>{prog.durationDays} Days</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                        Rp {prog.price.toLocaleString("id-ID")}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Pending Payment Approvals (Superadmin Only) */}
        {isSuperadminUser && (
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Payment Queue ({pendingEnrollments.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveMenu("payments");
                router.push("/admin/payments");
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-white/5 flex-1">
            {pendingEnrollments.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mx-auto" />
                <p className="text-xs font-medium text-zinc-900 dark:text-white">
                  All payments verified
                </p>
                <p className="text-[11px] text-zinc-400">
                  Zero pending customer transactions.
                </p>
              </div>
            ) : (
              pendingEnrollments.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {item.userFullName}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {item.programTitle}
                    </p>
                    <p className="text-[11px] font-mono font-medium text-zinc-900 dark:text-white">
                      Rp {item.amountPaid.toLocaleString("id-ID")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApprovePayment(item.id)}
                    disabled={approvingId === item.id}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium flex items-center gap-1 shrink-0 whitespace-nowrap shadow-xs hover:opacity-90 transition"
                  >
                    {approvingId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-zinc-200 dark:text-zinc-800" />
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        )}
      </div>

      {/* Customers Overview Snapshot */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              Recent Customer Accounts
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveMenu("members");
              router.push("/admin/customers");
            }}
            className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1"
          >
            Manage All Customers ({users.length}) <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-white/5">
          {users.slice(0, 5).map((u) => (
            <div
              key={u.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {u.fullName}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                      u.status === "ACTIVE"
                        ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate">
                  {u.email} • {u.phone || "No phone"}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  {u.enrollments.length} Program{u.enrollments.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
