"use client";

import { useState, useEffect } from "react";
import { wellnessConfirmQrisPayment, wellnessEnrollProgram } from "@/wellness/actions/account";
import {
  X,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Video,
} from "lucide-react";

export interface QrisInvoiceData {
  id: string;
  programId: string;
  programTitle: string;
  price: number;
  status: string;
  attendanceMode?: string;
  paymentReference: string | null;
  invoiceExpiresAt: Date | string | null;
  locationType?: string | null;
  venueAddress?: string | null;
}

interface QrisCheckoutModalProps {
  isOpen: boolean;
  invoice: QrisInvoiceData | null;
  onClose: () => void;
  onSuccess: (programId: string) => void;
  programLocationType?: string | null;
  programVenue?: string | null;
  programTerms?: string[];
}

export function QrisCheckoutModal({
  isOpen,
  invoice,
  onClose,
  onSuccess,
  programLocationType,
  programVenue,
  programTerms,
}: QrisCheckoutModalProps) {
  const [currentInvoice, setCurrentInvoice] = useState<QrisInvoiceData | null>(invoice);
  const [attendanceMode, setAttendanceMode] = useState<"IN_PERSON" | "VIRTUAL">(
    (invoice?.attendanceMode as "IN_PERSON" | "VIRTUAL") || "VIRTUAL"
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(900);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    setCurrentInvoice(invoice);
    if (invoice?.attendanceMode) {
      setAttendanceMode(invoice.attendanceMode as "IN_PERSON" | "VIRTUAL");
    }
    setErrorMsg(null);
    setPaidSuccess(false);
    setAgreedToTerms(false);
  }, [invoice]);

  useEffect(() => {
    if (!isOpen || !currentInvoice) return;

    const updateTimer = () => {
      if (!currentInvoice.invoiceExpiresAt) {
        setSecondsLeft(900);
        return;
      }
      const expiry = new Date(currentInvoice.invoiceExpiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [isOpen, currentInvoice]);

  if (!isOpen || !currentInvoice) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isExpired = secondsLeft <= 0;

  const handleModeChange = async (newMode: "IN_PERSON" | "VIRTUAL") => {
    setAttendanceMode(newMode);
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await wellnessEnrollProgram(currentInvoice.programId, newMode);
      if (res.success && res.data) {
        setCurrentInvoice(res.data);
      } else {
        setErrorMsg(res.message || "Could not update attendance preference.");
      }
    } catch {
      setErrorMsg("Unable to update attendance preference. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!agreedToTerms) {
      setErrorMsg("Please agree to the Program Terms & Conditions before confirming payment.");
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await wellnessConfirmQrisPayment(currentInvoice.id, agreedToTerms);
      if (res.success) {
        setPaidSuccess(true);
        setTimeout(() => {
          onSuccess(currentInvoice.programId);
        }, 900);
      } else {
        setErrorMsg(res.message || "Payment verification failed.");
      }
    } catch {
      setErrorMsg("Unable to verify payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateQris = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await wellnessEnrollProgram(currentInvoice.programId, attendanceMode);
      if (res.success && res.data) {
        setCurrentInvoice(res.data);
      } else {
        setErrorMsg(res.message || "Could not refresh QRIS code.");
      }
    } catch {
      setErrorMsg("Unable to refresh QRIS code. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const isHybridOrOnsite =
    programLocationType === "ONSITE" ||
    programLocationType === "HYBRID" ||
    currentInvoice.locationType === "ONSITE" ||
    currentInvoice.locationType === "HYBRID";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-[#0B0D10]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        data-lenis-prevent
        className="w-full max-w-md glass-panel rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col border border-zinc-200/70 dark:border-zinc-700/80"
      >
        {/* Header */}
        <div className="px-7 py-5 border-b border-zinc-200/70 dark:border-zinc-700/80 flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <span className="text-micro uppercase tracking-[0.24em] font-semibold text-zinc-400 dark:text-zinc-500 block font-mono">
              + BMS &bull; Tuition Settlement
            </span>
            <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 font-geometric">
              <QrCode className="w-4 h-4 text-zinc-400" />
              <span>QRIS Secure Checkout</span>
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close checkout dialog"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-7 space-y-5 overflow-y-auto">
          {/* Program & Fee Summary */}
          <div className="p-5 rounded-xl glass-panel-subtle space-y-3 border border-zinc-200/60 dark:border-zinc-700/70">
            <div className="flex items-center justify-between text-micro uppercase tracking-wider text-zinc-400">
              <span>Program Cohort</span>
              <span className="font-mono text-zinc-500">{currentInvoice.paymentReference}</span>
            </div>
            <h4 className="text-base font-light tracking-tight text-zinc-900 dark:text-zinc-100">
              {currentInvoice.programTitle}
            </h4>

            {/* Attendance Modality Selector (On-Site vs Virtual) */}
            {isHybridOrOnsite && (
              <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-700/70 space-y-2">
                <span className="text-micro uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block font-mono">
                  Attendance Modality:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange("IN_PERSON")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition font-mono ${
                      attendanceMode === "IN_PERSON"
                        ? "chrome-button shadow-sm"
                        : "graphite-button text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 opacity-70" />
                    <span>In-Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("VIRTUAL")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition font-mono ${
                      attendanceMode === "VIRTUAL"
                        ? "chrome-button shadow-sm"
                        : "graphite-button text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 opacity-70" />
                    <span>Virtual Stream</span>
                  </button>
                </div>
                {(programVenue || currentInvoice.venueAddress) && attendanceMode === "IN_PERSON" && (
                  <p className="text-micro text-zinc-500 dark:text-zinc-400 pt-0.5 font-mono">
                    Studio Location: {programVenue || currentInvoice.venueAddress}
                  </p>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-700/70 flex items-baseline justify-between font-mono">
              <span className="text-micro uppercase tracking-wider text-zinc-500">
                Total Tuition
              </span>
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Rp {currentInvoice.price.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* 15-Minute Countdown */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl glass-panel-subtle font-mono">
            <span className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" /> Payment Window (15 Mins)
            </span>
            <span
              className={`font-mono text-xs font-semibold ${
                isExpired
                  ? "text-red-600 dark:text-red-400"
                  : secondsLeft < 180
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {isExpired ? "EXPIRED" : formattedTime}
            </span>
          </div>

          {/* QRIS Visual Matrix */}
          <div className="relative mx-auto w-44 h-44 rounded-xl bg-white p-3.5 flex flex-col items-center justify-center border border-zinc-200 shadow-sm">
            <svg
              viewBox="0 0 100 100"
              className={`w-full h-full text-zinc-950 ${isExpired ? "opacity-20 blur-[2px]" : ""}`}
              fill="currentColor"
            >
              <path d="M5,5 h28 v28 h-28 z M10,10 v18 h18 v-18 z M14,14 h10 v10 h-10 z" />
              <path d="M67,5 h28 v28 h-28 z M72,10 v18 h18 v-18 z M76,14 h10 v10 h-10 z" />
              <path d="M5,67 h28 v28 h-28 z M10,72 v18 h18 v-18 z M14,76 h10 v10 h-10 z" />
              <rect x="38" y="8" width="6" height="6" />
              <rect x="48" y="8" width="12" height="6" />
              <rect x="38" y="18" width="10" height="6" />
              <rect x="54" y="18" width="6" height="12" />
              <rect x="38" y="28" width="12" height="6" />
              <rect x="8" y="38" width="12" height="6" />
              <rect x="26" y="38" width="18" height="6" />
              <rect x="50" y="38" width="12" height="6" />
              <rect x="68" y="38" width="10" height="6" />
              <rect x="84" y="38" width="10" height="6" />
              <rect x="8" y="48" width="6" height="12" />
              <rect x="20" y="48" width="12" height="6" />
              <rect x="38" y="44" width="24" height="12" />
              <rect x="68" y="48" width="12" height="6" />
              <rect x="86" y="48" width="8" height="12" />
              <rect x="20" y="58" width="14" height="6" />
              <rect x="68" y="58" width="14" height="6" />
              <rect x="38" y="62" width="10" height="10" />
              <rect x="54" y="64" width="8" height="8" />
              <rect x="38" y="76" width="16" height="6" />
              <rect x="60" y="76" width="12" height="6" />
              <rect x="78" y="70" width="16" height="12" />
              <rect x="38" y="86" width="8" height="8" />
              <rect x="52" y="86" width="18" height="8" />
              <rect x="76" y="86" width="18" height="8" />
            </svg>

            <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
              QRIS Instant Payment
            </span>

            {isExpired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-xs rounded-xl p-4 text-center">
                <p className="text-xs text-white font-medium mb-2">QR Code Expired</p>
                <button
                  type="button"
                  onClick={handleRegenerateQris}
                  disabled={isRefreshing}
                  className="px-3.5 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh QRIS
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Program Terms & Conditions Clickwrap Agreement */}
          {!paidSuccess && (
            <div className="p-4 rounded-xl glass-panel-subtle border border-zinc-200/70 dark:border-zinc-700/70 space-y-3 font-sans">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 dark:text-zinc-400">
                  Terms &amp; Conditions ({programTerms?.length || 4})
                </span>
                <span className="text-[10px] text-zinc-400">Required</span>
              </div>
              <ol className="max-h-28 overflow-y-auto pr-1 space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 list-decimal list-inside leading-relaxed">
                {(programTerms && programTerms.length > 0
                  ? programTerms
                  : [
                      "Participants confirm they are in good physical health and medically cleared to engage in daily movement protocols.",
                      "All program tuition fees are final, non-refundable, and non-transferable once enrollment is confirmed.",
                      "All video routines, nutrition protocols, and community materials are strictly for personal use by enrolled members.",
                      "Daily progress logs and checklists must be completed before the 23:59 daily cutoff time.",
                    ]
                ).map((term, idx) => (
                  <li key={idx} className="leading-snug">
                    {term}
                  </li>
                ))}
              </ol>
              <label className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/70 flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (e.target.checked && errorMsg?.includes("Terms & Conditions")) {
                      setErrorMsg(null);
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 accent-zinc-900 dark:accent-zinc-100 shrink-0"
                />
                <span className="text-[11px] text-zinc-700 dark:text-zinc-200 leading-snug">
                  I have read, understood, and agree to the{" "}
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Program Terms &amp; Conditions
                  </strong>{" "}
                  above.
                </span>
              </label>
            </div>
          )}

          {paidSuccess ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 font-medium font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Payment confirmed! Opening your program...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleVerifyPayment}
                disabled={isProcessing || isExpired}
                className="w-full py-3 rounded-xl chrome-button text-xs font-semibold tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirming Payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Confirm QRIS Payment
                  </>
                )}
              </button>
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
                Scan with any mobile banking or e-wallet app to complete enrollment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
