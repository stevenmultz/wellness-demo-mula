"use client";

import { AlertCircle, ArrowRight, Globe, Loader2, Lock, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { safeMediaUrl } from "@/wellness/utils/url-safety";
import type { AdminLightboxData, AdminProgram, AdminPublishModalState } from "../adminTypes";

interface AdminModalsProps {
  publishModal: AdminPublishModalState | null;
  setPublishModal: (val: AdminPublishModalState | null) => void;
  selectedProgram: AdminProgram | null;
  publishingId: string | null;
  setProgramDetailTab: (tab: "info" | "schedule" | "responses") => void;
  handleSelectDay: (prog: AdminProgram, dayNum: number) => void;
  handleTogglePublish: (prog: AdminProgram, forceState?: boolean) => void;
  lightboxData: AdminLightboxData | null;
  setLightboxData: (val: AdminLightboxData | null) => void;
}

export function AdminModals({
  publishModal,
  setPublishModal,
  selectedProgram,
  publishingId,
  setProgramDetailTab,
  handleSelectDay,
  handleTogglePublish,
  lightboxData,
  setLightboxData,
}: AdminModalsProps) {
  return (
    <>
    {publishModal?.isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-white/10 p-6 sm:p-8 text-zinc-900 dark:text-zinc-100">
          {publishModal.mode === "ERROR" ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">
                    Publication Guard • Incomplete
                  </span>
                  <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    Cannot Publish Program
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    To protect paying customers and maintain strict program integrity, all parameters and daily routines must be 100% completed before publishing.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-2">
                <h4 className="text-xs font-semibold text-red-800 dark:text-red-300">
                  Validation Requirements ({publishModal.errorList?.length || 0}):
                </h4>
                <ul className="space-y-1.5 text-xs text-red-700 dark:text-red-300">
                  {publishModal.errorList?.map((err, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPublishModal(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition"
                >
                  Close &amp; Fix Issues
                </button>

                {publishModal.missingDays && publishModal.missingDays.length > 0 && selectedProgram && (
                  <button
                    type="button"
                    onClick={() => {
                      setPublishModal(null);
                      setProgramDetailTab("schedule");
                      handleSelectDay(selectedProgram, publishModal.missingDays![0]);
                    }}
                    className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-1.5 shadow-xs hover:opacity-90 transition"
                  >
                    <span>Fill Day {publishModal.missingDays[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Strict Launch Guard
                  </span>
                  <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    Confirm Program Launch &amp; Lock
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Are you sure you want to activate and publish this program?
                  </p>
                </div>
              </div>

              {selectedProgram && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/10">
                    <span className="text-zinc-500">Program Title:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white line-clamp-1 max-w-[200px]">
                      {selectedProgram.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Schedule Status:</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      All <span className="font-mono">{selectedProgram.durationDays}</span> Days Complete
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Tuition Price:</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                      Rp {selectedProgram.price.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Max Capacity:</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                      {selectedProgram.maxQuota} Seats
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />
                <p className="leading-relaxed">
                  <strong className="text-zinc-900 dark:text-white font-medium">Immutability Notice:</strong> Once published, Program Information and pricing will be locked to prevent discrepancies with what customers paid for.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPublishModal(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={publishingId === selectedProgram?.id}
                  onClick={() => {
                    if (selectedProgram) handleTogglePublish(selectedProgram, true);
                  }}
                  className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium transition flex items-center gap-2 shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {publishingId === selectedProgram?.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Confirm &amp; Launch Program</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* ================================================================= */}
    {/* LIGHTBOX / FULL-SIZE PHOTO COMPARISON MODAL                       */}
    {/* ================================================================= */}
    {lightboxData && (
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        onClick={() => setLightboxData(null)}
      >
        <div
          className="bg-white dark:bg-zinc-950 rounded-2xl max-w-4xl w-full border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Progress Photo Comparison</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 font-normal text-zinc-600 dark:text-zinc-400">
                  Day {lightboxData.dayNumber}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Member: <strong className="text-zinc-700 dark:text-zinc-300">{lightboxData.memberName}</strong>
                {lightboxData.dateStr && ` • ${lightboxData.dateStr}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLightboxData(null)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Images Grid */}
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 overflow-y-auto">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                Before Photo
              </span>
              <div className="aspect-4/3 rounded-xl overflow-hidden bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center">
                {safeMediaUrl(lightboxData.beforeUrl) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={safeMediaUrl(lightboxData.beforeUrl)!}
                    alt="Before"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-zinc-400">No before photo recorded</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                After Photo
              </span>
              <div className="aspect-4/3 rounded-xl overflow-hidden bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center">
                {safeMediaUrl(lightboxData.afterUrl) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={safeMediaUrl(lightboxData.afterUrl)!}
                    alt="After"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-zinc-400">No after photo recorded</span>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-zinc-100 dark:border-white/10 flex justify-end">
            <button
              type="button"
              onClick={() => setLightboxData(null)}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
