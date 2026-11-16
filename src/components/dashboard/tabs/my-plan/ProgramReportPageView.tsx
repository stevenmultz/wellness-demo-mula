"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { wellnessSubmitCohortSupportRequest } from "@/wellness/actions/support";
import { HeaderBackButton } from "../shared";

const ISSUE_OPTIONS = [
  "Coach / Guidance Concern",
  "App Bug / Broken Code",
  "Video or Content Glitch",
  "Curriculum or Exercise Difficulty",
  "Audio or Sound Playback Error",
  "Payment / Access Inquiries",
  "Other Plan Issue",
];

const QUIT_OPTIONS = [
  "Schedule / Time Conflict",
  "Injury or Medical Reason",
  "Curriculum Intensity Not a Good Fit",
  "Switching to Another Plan",
  "Personal / Other Reason",
];

export function ProgramReportPageView({
  programId,
  programTitle,
  communityLink: _communityLink,
  onClose,
}: {
  programId?: string;
  programTitle?: string;
  communityLink?: string | null;
  onClose: () => void;
}) {
  void _communityLink;
  const [activeTab, setActiveTab] = useState<"issue" | "quit">("issue");
  const [issueType, setIssueType] = useState<string>(ISSUE_OPTIONS[0]);
  const [quitReason, setQuitReason] = useState<string>(QUIT_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [submittedDone, setSubmittedDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!programId) {
      setSubmitError("Missing active cohort program ID.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await wellnessSubmitCohortSupportRequest({
        programId,
        requestType: activeTab === "quit" ? "QUIT_COHORT" : "REPORT_ISSUE",
        reasonCode: activeTab === "quit" ? quitReason : issueType,
        note: note.trim(),
      });
      if (res.success) {
        setSubmittedDone(true);
        setNote("");
      } else {
        setSubmitError(res.message || "Could not submit your request. Please try again.");
      }
    } catch {
      setSubmitError("Connection error while submitting your request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[85] bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto animate-in fade-in duration-150"
    >
      <header
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className="sticky top-0 z-10 w-full bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center">
          <HeaderBackButton onClick={onClose} ariaLabel="Back to My Plan" />
        </div>
      </header>

      <main
        className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
      >
        {submittedDone ? (
          <div className="rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#141414] p-7 sm:p-9 text-center space-y-6 mt-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 text-zinc-950 dark:text-white flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                {activeTab === "quit" ? "Withdrawal Under Review" : "Report Received"}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-sm mx-auto">
                {activeTab === "quit"
                  ? "Your withdrawal request has been received. Our concierge support will review your plan status and reach out within 24 hours."
                  : "Thank you for sharing this with us. Our team has logged your report and is reviewing the issue."}
              </p>
            </div>
            <div className="pt-1 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => setSubmittedDone(false)}
                className="h-11 px-5 rounded-2xl border border-zinc-200 dark:border-white/15 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
              >
                Submit Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-6 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs sm:text-sm font-medium active:scale-[0.98] transition"
              >
                Back to My Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2 pb-5 border-b border-zinc-200/80 dark:border-white/10">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                {programTitle || "Plan Support"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.15]">
                How can we help you?
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Submit a technical or curriculum report, or request a withdrawal from this plan.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Support request type"
              className="rounded-xl p-1 bg-zinc-200/80 dark:bg-white/10 grid grid-cols-2 gap-1 text-xs font-semibold"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "issue"}
                onClick={() => setActiveTab("issue")}
                className={`h-9 px-3 rounded-lg transition ${
                  activeTab === "issue"
                    ? "bg-white dark:bg-[#141414] text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                Report an Issue
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "quit"}
                onClick={() => setActiveTab("quit")}
                className={`h-9 px-3 rounded-lg transition ${
                  activeTab === "quit"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                }`}
              >
                Quit Plan
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                  {activeTab === "quit" ? "Reason for Withdrawing" : "Issue Category"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(activeTab === "quit" ? QUIT_OPTIONS : ISSUE_OPTIONS).map((opt) => {
                    const isSelected =
                      activeTab === "quit" ? quitReason === opt : issueType === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          activeTab === "quit" ? setQuitReason(opt) : setIssueType(opt)
                        }
                        className={`text-left px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-medium transition border ${
                          isSelected
                            ? activeTab === "quit"
                              ? "bg-red-600 text-white border-red-600 shadow-xs"
                              : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                            : "bg-white dark:bg-[#141414] border-zinc-200 dark:border-white/15 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="plan-report-details"
                  className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block"
                >
                  {activeTab === "quit"
                    ? "Additional Context (Optional)"
                    : "Details & Description"}
                </label>
                <textarea
                  id="plan-report-details"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    activeTab === "quit"
                      ? "Let us know how we can assist or why you need to leave..."
                      : "Describe the issue clearly (e.g., coach concern, broken video player, or exercise guidance)..."
                  }
                  className="w-full text-base sm:text-sm rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] p-4 text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-950 dark:focus:border-white transition resize-none"
                  required={activeTab === "issue"}
                />
              </div>

              {activeTab === "quit" && (
                <div className="border-l-2 border-zinc-300 dark:border-white/25 pl-3.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    Need a temporary pause instead?
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    You can pause your schedule and resume when your routine clears up without losing your logged history.
                  </p>
                </div>
              )}

              {submitError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (activeTab === "issue" && !note.trim())}
                className={`w-full h-12 rounded-2xl text-sm font-medium disabled:opacity-40 transition active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 ${
                  activeTab === "quit"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90"
                }`}
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <span>
                    {activeTab === "quit" ? "Submit Withdrawal Request" : "Submit Report"}
                  </span>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>,
    document.body
  );
}
