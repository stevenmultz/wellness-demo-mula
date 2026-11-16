"use client";

import { CheckCircle2, Loader2, Search } from "lucide-react";
import { PaginationBar } from "../AdminFormPickers";
import type { AdminPendingEnrollmentItem } from "../adminTypes";

interface AdminPaymentsViewProps {
  qrisSearch: string;
  setQrisSearch: (val: string) => void;
  setQrisPage: (page: number) => void;
  pendingEnrollmentsCount: number;
  paginatedQris: AdminPendingEnrollmentItem[];
  filteredQrisCount: number;
  safeQrisPage: number;
  totalQrisPages: number;
  qrisPageSize: number;
  approvingId: string | null;
  handleApprovePayment: (enrollmentId: string) => void;
}

export function AdminPaymentsView({
  qrisSearch,
  setQrisSearch,
  setQrisPage,
  pendingEnrollmentsCount,
  paginatedQris,
  filteredQrisCount,
  safeQrisPage,
  totalQrisPages,
  qrisPageSize: QRIS_PAGE_SIZE,
  approvingId,
  handleApprovePayment,
}: AdminPaymentsViewProps) {
  const pendingEnrollments = { length: pendingEnrollmentsCount };
  const filteredQris = { length: filteredQrisCount };

  return (
    <div className="space-y-6">
      {/* Search Widget */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 border border-zinc-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={qrisSearch}
            onChange={(e) => {
              setQrisSearch(e.target.value);
              setQrisPage(1);
            }}
            placeholder="Search payments by customer or program..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        <span className="text-xs text-zinc-400 whitespace-nowrap">
          <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{pendingEnrollments.length}</span> pending verification
        </span>
      </div>

      {/* Payments List Widget */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
            Pending QRIS Payments
          </h2>
        </div>

        {paginatedQris.length === 0 ? (
          <div className="p-14 text-center space-y-2">
            <CheckCircle2 className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">
              All caught up
            </p>
            <p className="text-xs text-zinc-400">
              There are no pending payments requiring admin review.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {paginatedQris.map((item) => (
              <div
                key={item.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {item.userFullName}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {item.userEmail}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    {item.programTitle} •{" "}
                    <strong className="font-mono font-semibold text-zinc-900 dark:text-white">
                      Rp {item.amountPaid.toLocaleString("id-ID")}
                    </strong>
                  </p>
                  {item.paymentRef && (
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Ref: {item.paymentRef}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleApprovePayment(item.id)}
                  disabled={approvingId === item.id}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs hover:opacity-90 transition disabled:opacity-50"
                >
                  {approvingId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Approve Payment</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <PaginationBar
          currentPage={safeQrisPage}
          totalPages={totalQrisPages}
          totalItems={filteredQris.length}
          pageSize={QRIS_PAGE_SIZE}
          onPageChange={setQrisPage}
          itemLabel="payments"
        />
      </div>
    </div>
  );
}
