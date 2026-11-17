"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Search, X } from "lucide-react";
import {
  wellnessAdminCancelBatchAndRefund,
  wellnessAdminGetRefundDashboardData,
  wellnessAdminRecordManualRefund,
  type AdminRefundTransactionItem,
  type UnderQuotaProgramItem,
} from "@/wellness/actions/refunds";
import { PaginationBar } from "../AdminFormPickers";
import type {
  AdminFeedbackMessage,
  AdminPendingEnrollmentItem,
  AdminSupportRequestItem,
} from "../adminTypes";

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
  setFeedback?: (fb: AdminFeedbackMessage | null) => void;
  supportRequests?: AdminSupportRequestItem[];
  resolvingSupportId?: string | null;
  onResolveSupportRequest?: (
    id: string,
    status: "IN_REVIEW" | "RESOLVED" | "REJECTED"
  ) => void;
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
  setFeedback,
  supportRequests = [],
  resolvingSupportId = null,
  onResolveSupportRequest,
}: AdminPaymentsViewProps) {
  const pendingEnrollments = { length: pendingEnrollmentsCount };
  const filteredQris = { length: filteredQrisCount };

  const [underQuotaPrograms, setUnderQuotaPrograms] = useState<UnderQuotaProgramItem[]>([]);
  const [refundTxs, setRefundTxs] = useState<AdminRefundTransactionItem[]>([]);
  const [refundLoading, setRefundLoading] = useState(true);

  // Batch cancel & refund modal
  const [cancellingProgram, setCancellingProgram] = useState<UnderQuotaProgramItem | null>(null);
  const [tryMidtransAuto, setTryMidtransAuto] = useState(true);
  const [batchAdminFee, setBatchAdminFee] = useState(0);
  const [batchReason, setBatchReason] = useState("Minimum participant quota not reached");
  const [batchBusy, setBatchBusy] = useState(false);

  // Single transaction manual/partial refund modal
  const [refundingTx, setRefundingTx] = useState<AdminRefundTransactionItem | null>(null);
  const [txAdminFee, setTxAdminFee] = useState(0);
  const [txRefundAmount, setTxRefundAmount] = useState(0);
  const [txRefundNote, setTxRefundNote] = useState("Manual refund processed");
  const [txBusy, setTxBusy] = useState(false);

  const loadRefundData = useCallback(async () => {
    setRefundLoading(true);
    try {
      const res = await wellnessAdminGetRefundDashboardData();
      if (res.success && res.data) {
        setUnderQuotaPrograms(res.data.underQuotaPrograms);
        setRefundTxs(res.data.transactions);
      }
    } finally {
      setRefundLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRefundData();
  }, [loadRefundData]);

  const handleBatchCancelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cancellingProgram) return;
    setBatchBusy(true);
    try {
      const res = await wellnessAdminCancelBatchAndRefund({
        programId: cancellingProgram.id,
        tryMidtransAutoRefund: tryMidtransAuto,
        adminFeeDeduction: Math.max(0, Number(batchAdminFee) || 0),
        reason: batchReason.trim(),
      });
      if (res.success) {
        setFeedback?.({ type: "success", text: res.message || "Batch cancelled and refunds queued." });
        setCancellingProgram(null);
        await loadRefundData();
      } else {
        setFeedback?.({ type: "error", text: res.message || "Failed to cancel batch." });
      }
    } finally {
      setBatchBusy(false);
    }
  };

  const handleManualRefundSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!refundingTx) return;
    setTxBusy(true);
    try {
      const res = await wellnessAdminRecordManualRefund({
        transactionId: refundingTx.id,
        refundAmount: Math.max(0, Number(txRefundAmount) || 0),
        adminFeeDeduction: Math.max(0, Number(txAdminFee) || 0),
        note: txRefundNote.trim(),
      });
      if (res.success) {
        setFeedback?.({ type: "success", text: res.message || "Refund recorded." });
        setRefundingTx(null);
        await loadRefundData();
      } else {
        setFeedback?.({ type: "error", text: res.message || "Failed to record refund." });
      }
    } finally {
      setTxBusy(false);
    }
  };

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

      {/* Under-Quota Cohorts & Batch Refund Action */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              Under-Quota Batches ({underQuotaPrograms.length})
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400">
            Active participants below minimum threshold
          </span>
        </div>

        {refundLoading ? (
          <div className="p-8 text-center text-xs text-zinc-400">Loading batch quota status...</div>
        ) : underQuotaPrograms.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            All published cohorts currently meet their minimum quota.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {underQuotaPrograms.map((prog) => (
              <div
                key={prog.id}
                className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                      {prog.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      {prog.activeSubscribers}/{prog.maxQuota} seats • Min {prog.minQuota}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-500">
                    {prog.price === 0 ? "Free" : `Rp ${prog.price.toLocaleString("id-ID")}`} • Cutoff{" "}
                    {new Date(prog.registrationDeadlineAt).toLocaleDateString("id-ID")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCancellingProgram(prog);
                    setTryMidtransAuto(true);
                    setBatchAdminFee(0);
                    setBatchReason(
                      `Minimum quota of ${prog.minQuota} participants was not reached (${prog.activeSubscribers} joined).`
                    );
                  }}
                  className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold shrink-0 transition"
                >
                  Cancel Batch &amp; Refund
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refund & Settled Transaction Ledger */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              Refund Queue &amp; Settled Ledger ({refundTxs.length})
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400">
            Supports partial refunds (net after admin fee)
          </span>
        </div>

        {refundLoading ? (
          <div className="p-8 text-center text-xs text-zinc-400">Loading transactions...</div>
        ) : refundTxs.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No paid or refunded transactions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {refundTxs.slice(0, 25).map((tx) => (
              <div
                key={tx.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      {tx.userFullName}
                    </span>
                    <span className="text-[11px] text-zinc-400">{tx.userEmail}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                        tx.status === "REFUND"
                          ? "bg-zinc-200 dark:bg-white/15 text-zinc-700 dark:text-zinc-200"
                          : tx.status === "REFUND_REQUESTED"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    {tx.programTitle} •{" "}
                    <strong className="font-mono">
                      Rp {tx.grossAmount.toLocaleString("id-ID")}
                    </strong>{" "}
                    <span className="text-[11px] font-mono text-zinc-400">({tx.orderId})</span>
                  </p>
                  {tx.status === "REFUND" && tx.refundAmount !== null && (
                    <p className="text-[11px] font-mono text-zinc-500">
                      Refunded: Rp {tx.refundAmount.toLocaleString("id-ID")}
                      {tx.refundFeeAmount ? ` (Admin fee deducted: Rp ${tx.refundFeeAmount.toLocaleString("id-ID")})` : ""}
                      {tx.refundReason ? ` • ${tx.refundReason}` : ""}
                    </p>
                  )}
                  {tx.status === "REFUND_REQUESTED" && tx.refundReason && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      {tx.refundReason}
                    </p>
                  )}
                </div>

                {tx.status !== "REFUND" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRefundingTx(tx);
                      const preFee = tx.refundFeeAmount ?? 0;
                      setTxAdminFee(preFee);
                      setTxRefundAmount(tx.refundAmount ?? Math.max(0, tx.grossAmount - preFee));
                      setTxRefundNote(tx.refundReason || "Manual / Midtrans MAP refund processed");
                    }}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/15 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/5 shrink-0 transition"
                  >
                    Record Refund
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cohort Support & Withdrawal Requests */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
            Cohort Support &amp; Withdrawal Requests ({supportRequests.length})
          </h2>
        </div>

        {supportRequests.length === 0 ? (
          <div className="p-10 text-center space-y-1">
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">
              No support requests
            </p>
            <p className="text-xs text-zinc-400">
              Member issue reports and withdrawal requests appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {supportRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                      {req.requestType === "QUIT_COHORT" ? "Withdraw" : "Issue"}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      {req.userFullName} ({req.userEmail})
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    <strong>{req.programTitle}</strong> • {req.reasonCode}
                  </p>
                  {req.note && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{req.note}</p>
                  )}
                </div>

                {onResolveSupportRequest && req.status !== "RESOLVED" && req.status !== "REJECTED" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={resolvingSupportId === req.id}
                      onClick={() => onResolveSupportRequest(req.id, "RESOLVED")}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      disabled={resolvingSupportId === req.id}
                      onClick={() => onResolveSupportRequest(req.id, "REJECTED")}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/15 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-50 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Cancel Under-Quota Batch & Queue Refunds */}
      {cancellingProgram && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Cancel Batch &amp; Process Refunds
              </h4>
              <button
                type="button"
                onClick={() => setCancellingProgram(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Cancelling <strong>{cancellingProgram.title}</strong> ({cancellingProgram.activeSubscribers}/{cancellingProgram.minQuota} min quota).
            </p>

            <form onSubmit={handleBatchCancelSubmit} className="space-y-3">
              <label className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tryMidtransAuto}
                  onChange={(e) => setTryMidtransAuto(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Attempt automatic Midtrans Refund API first (rejected items safely fall back to{" "}
                  <code>REFUND_REQUESTED</code> for manual transfer).
                </span>
              </label>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Admin Fee Deduction per Transaction (IDR, 0 = Full Refund)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={batchAdminFee}
                  onChange={(e) => setBatchAdminFee(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={batchReason}
                  onChange={(e) => setBatchReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingProgram(null)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={batchBusy}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {batchBusy ? "Processing..." : "Confirm Cancel & Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Manual / Partial Refund */}
      {refundingTx && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Record Refund ({refundingTx.orderId})
              </h4>
              <button
                type="button"
                onClick={() => setRefundingTx(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              {refundingTx.userFullName} • Paid{" "}
              <strong className="font-mono">
                Rp {refundingTx.grossAmount.toLocaleString("id-ID")}
              </strong>
            </p>

            <form onSubmit={handleManualRefundSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Admin Fee Deducted (IDR)
                </label>
                <input
                  type="number"
                  min={0}
                  max={refundingTx.grossAmount}
                  value={txAdminFee}
                  onChange={(e) => {
                    const fee = Math.min(refundingTx.grossAmount, Math.max(0, Number(e.target.value) || 0));
                    setTxAdminFee(fee);
                    setTxRefundAmount(Math.max(0, refundingTx.grossAmount - fee));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Net Amount Refunded to Member (IDR) *
                </label>
                <input
                  type="number"
                  min={0}
                  max={refundingTx.grossAmount}
                  required
                  value={txRefundAmount}
                  onChange={(e) => setTxRefundAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Refund Reference / Note *
                </label>
                <input
                  type="text"
                  required
                  value={txRefundNote}
                  onChange={(e) => setTxRefundNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundingTx(null)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txBusy}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-50"
                >
                  {txBusy ? "Saving..." : "Mark as Refunded"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
