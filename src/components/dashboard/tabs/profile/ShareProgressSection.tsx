"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Lock,
  Mail,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  wellnessCreateProgressShare,
  wellnessGetShareProgressOverview,
  wellnessRemoveIncomingShare,
  wellnessRevokeProgressShare,
  type IncomingSharedProgressItem,
  type OutgoingShareItem,
} from "@/wellness/actions/share-progress";
import type { Msg } from "./ProfileSectionForms";

export function ShareProgressSection({
  setMsg,
}: {
  setMsg: React.Dispatch<React.SetStateAction<Msg>>;
}) {
  const [loading, setLoading] = useState(true);
  const [outgoing, setOutgoing] = useState<OutgoingShareItem[]>([]);
  const [incoming, setIncoming] = useState<IncomingSharedProgressItem[]>([]);

  const [viewerEmail, setViewerEmail] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await wellnessGetShareProgressOverview();
      if (res.success && res.data) {
        setOutgoing(res.data.outgoing);
        setIncoming(res.data.incoming);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleShare = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      const res = await wellnessCreateProgressShare({
        viewerEmail,
        label: label.trim() || null,
      });
      if (!res.success) {
        setMsg({ type: "error", text: res.message || "Failed to share progress." });
        return;
      }
      setViewerEmail("");
      setLabel("");
      setMsg({ type: "success", text: res.message || "Progress shared (read-only)." });
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    setMsg(null);
    setBusyId(shareId);
    try {
      const res = await wellnessRevokeProgressShare(shareId);
      if (res.success) {
        setOutgoing((prev) => prev.filter((item) => item.id !== shareId));
        setMsg({ type: "success", text: res.message || "Access revoked." });
      } else {
        setMsg({ type: "error", text: res.message || "Failed to revoke access." });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveIncoming = async (shareId: string) => {
    setMsg(null);
    setBusyId(shareId);
    try {
      const res = await wellnessRemoveIncomingShare(shareId);
      if (res.success) {
        setIncoming((prev) => prev.filter((item) => item.shareId !== shareId));
        if (expandedShareId === shareId) setExpandedShareId(null);
        setMsg({ type: "success", text: res.message || "Removed." });
      } else {
        setMsg({ type: "error", text: res.message || "Failed to remove entry." });
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
        <Lock className="w-4 h-4 shrink-0 text-zinc-500 mt-0.5" />
        <p className="leading-relaxed">
          Recipients only see your <strong>read-only program progress</strong> (workouts, meals, sleep, and completion rate) after signing in with their verified email. Payments and private profile details are never shared.
        </p>
      </div>

      {/* Share My Progress Form */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-geometric font-medium text-zinc-950 dark:text-white">
            Share My Progress
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Invite family, a partner, or a mentor to monitor your daily consistency.
          </p>
        </div>

        <form onSubmit={handleShare} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2 relative">
              <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={viewerEmail}
                onChange={(e) => setViewerEmail(e.target.value)}
                placeholder="Recipient email (e.g. parent@gmail.com)"
                className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-xs text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white transition"
              />
            </div>
            <input
              type="text"
              maxLength={40}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-xs text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-geometric font-medium inline-flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Grant Read-Only Access</span>
          </button>
        </form>

        {/* Outgoing Active Shares */}
        <div className="pt-3 border-t border-zinc-100 dark:border-white/10 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
            People Who Can View Your Progress ({outgoing.length})
          </span>

          {loading ? (
            <p className="text-xs text-zinc-400 py-2">Loading...</p>
          ) : outgoing.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 py-1">
              You haven&apos;t shared your progress with anyone yet.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/10">
              {outgoing.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-zinc-950 dark:text-white truncate">
                        {item.viewerName || item.viewerEmail}
                      </span>
                      {item.label && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                          {item.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-zinc-400 truncate">{item.viewerEmail}</p>
                  </div>

                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void handleRevoke(item.id)}
                    className="px-3 py-1.5 rounded-full border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-[11px] font-medium hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1 shrink-0 disabled:opacity-50 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Revoke</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incoming Shares: Shared With Me (Read-Only) */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-geometric font-medium text-zinc-950 dark:text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-zinc-500" />
              <span>Shared With Me ({incoming.length})</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              View read-only progress shared with your account.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 text-[10px] font-mono uppercase text-zinc-600 dark:text-zinc-300">
            Read-Only
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-400 py-2">Loading...</p>
        ) : incoming.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 py-1">
            No one has shared their progress with your email yet.
          </p>
        ) : (
          <div className="space-y-3">
            {incoming.map((share) => {
              const isOpen = expandedShareId === share.shareId;
              return (
                <div
                  key={share.shareId}
                  className="rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.02] overflow-hidden"
                >
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white truncate">
                          {share.ownerName}
                        </span>
                        {share.label && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-white/10 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                            {share.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {share.programs.length} active plan{share.programs.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedShareId(isOpen ? null : share.shareId)}
                        className="px-3 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        <span>{isOpen ? "Hide" : "View"}</span>
                        {isOpen ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={busyId === share.shareId}
                        onClick={() => void handleRemoveIncoming(share.shareId)}
                        title="Remove from my list"
                        className="p-1.5 rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-3.5 pb-4 pt-2 border-t border-zinc-200/70 dark:border-white/10 space-y-3">
                      {share.programs.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-2">
                          No active programs to display right now.
                        </p>
                      ) : (
                        share.programs.map((prog) => {
                          const pct =
                            prog.durationDays > 0
                              ? Math.min(100, Math.round((prog.completedDaysCount / prog.durationDays) * 100))
                              : 0;

                          return (
                            <div
                              key={prog.programId}
                              className="rounded-xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 p-3.5 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white truncate">
                                    {prog.programTitle}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {prog.category} • {prog.coachName}
                                  </p>
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-zinc-900 dark:text-white shrink-0">
                                  {prog.completedDaysCount}/{prog.durationDays} days ({pct}%)
                                </span>
                              </div>

                              <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-zinc-950 dark:bg-white transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-white/5">
                                {prog.days.map((d) => (
                                  <div
                                    key={d.dayNumber}
                                    className="py-2 flex items-center justify-between gap-3 text-[11px]"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                        Day {d.dayNumber}: {d.title}
                                      </p>
                                      <p className="text-zinc-500 dark:text-zinc-400 font-mono truncate">
                                        {[
                                          d.selectedWorkout,
                                          d.mealCompliance ? `Meal: ${d.mealCompliance}` : null,
                                          d.sleepDurationMinutes
                                            ? `Sleep: ${(d.sleepDurationMinutes / 60).toFixed(1)}h`
                                            : null,
                                          d.happinessRate ? `Mood: ${d.happinessRate}/5` : null,
                                        ]
                                          .filter(Boolean)
                                          .join(" • ") || d.dayType}
                                      </p>
                                    </div>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] shrink-0 ${
                                        d.isCompleted
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                          : "bg-zinc-100 dark:bg-white/10 text-zinc-500"
                                      }`}
                                    >
                                      {d.isCompleted && <CheckCircle2 className="w-3 h-3" />}
                                      <span>{d.isCompleted ? "Done" : "Pending"}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
