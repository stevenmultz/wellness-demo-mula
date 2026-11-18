"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Ban,
  Building2,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import {
  wellnessCreatePartnerCoachAccount,
  wellnessGetAdminTeamData,
  wellnessResetPartnerCoachPassword,
  wellnessSuperadminCreatePartnerAdmin,
  wellnessTogglePartnerCoachStatus,
  wellnessUpdatePartnerCoachProfile,
  type AdminTeamCoachItem,
  type AdminTeamPayload,
} from "@/wellness/actions/partner-team";
import type { AdminFeedbackMessage } from "../adminTypes";

interface AdminTeamViewProps {
  currentAdminRole: string;
  currentAdminOrgId?: string | null;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
}

export function AdminTeamView({
  currentAdminRole,
  currentAdminOrgId = null,
  setFeedback,
}: AdminTeamViewProps) {
  const isSuperadmin = currentAdminRole === "SUPERADMIN";
  const isPartnerAdmin = currentAdminRole === "PARTNER_ADMIN";

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<AdminTeamPayload | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // One-time credential notice after creating or resetting a staff account
  const [credentialBanner, setCredentialBanner] = useState<{
    roleLabel: string;
    name: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);

  // Create Partner Admin modal state (Superadmin only)
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerOrgMode, setPartnerOrgMode] = useState<"existing" | "new">("existing");
  const [partnerOrgId, setPartnerOrgId] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgTagline, setNewOrgTagline] = useState("");
  const [partnerFullName, setPartnerFullName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [savingPartner, setSavingPartner] = useState(false);

  // Create Coach modal state (Superadmin or Partner Admin)
  const [coachModalOpen, setCoachModalOpen] = useState(false);
  const [coachFullName, setCoachFullName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPhone, setCoachPhone] = useState("");
  const [coachTitle, setCoachTitle] = useState("");
  const [coachOrgId, setCoachOrgId] = useState("");
  const [savingCoach, setSavingCoach] = useState(false);

  // Edit Coach profile modal state
  const [editingCoach, setEditingCoach] = useState<AdminTeamCoachItem | null>(null);
  const [editCoachName, setEditCoachName] = useState("");
  const [editCoachTitle, setEditCoachTitle] = useState("");
  const [savingCoachEdit, setSavingCoachEdit] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await wellnessGetAdminTeamData();
      if (res.success && res.data) {
        setTeam(res.data);
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to load team accounts." });
      }
    } finally {
      setLoading(false);
    }
  }, [setFeedback]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const handleCreatePartnerAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSuperadmin) return;
    setSavingPartner(true);
    try {
      const res = await wellnessSuperadminCreatePartnerAdmin({
        fullName: partnerFullName,
        email: partnerEmail,
        phone: partnerPhone || null,
        organizationId: partnerOrgMode === "existing" ? partnerOrgId : null,
        newOrganizationName: partnerOrgMode === "new" ? newOrgName : null,
        newOrganizationTagline: partnerOrgMode === "new" ? newOrgTagline : null,
      });
      if (!res.success || !res.data) {
        setFeedback({ type: "error", text: res.message || "Failed to create Community Admin." });
        return;
      }
      setCredentialBanner({
        roleLabel: `Community Admin (${res.data.user.organizationName || "Community"})`,
        name: res.data.user.fullName,
        email: res.data.user.email,
        temporaryPassword: res.data.temporaryPassword,
      });
      setPartnerModalOpen(false);
      setPartnerFullName("");
      setPartnerEmail("");
      setPartnerPhone("");
      setNewOrgName("");
      setNewOrgTagline("");
      setFeedback({ type: "success", text: res.message || "Community Admin created." });
      await loadTeam();
    } finally {
      setSavingPartner(false);
    }
  };

  const handleCreateCoach = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSuperadmin && !isPartnerAdmin) return;
    setSavingCoach(true);
    try {
      const res = await wellnessCreatePartnerCoachAccount({
        fullName: coachFullName,
        email: coachEmail,
        phone: coachPhone || null,
        coachTitle,
        organizationId: isSuperadmin ? coachOrgId || null : undefined,
      });
      if (!res.success || !res.data) {
        setFeedback({ type: "error", text: res.message || "Failed to create Coach account." });
        return;
      }
      setCredentialBanner({
        roleLabel: `Coach${res.data.coach.organizationName ? ` (${res.data.coach.organizationName})` : ""}`,
        name: res.data.coach.fullName,
        email: res.data.coach.email,
        temporaryPassword: res.data.temporaryPassword,
      });
      setCoachModalOpen(false);
      setCoachFullName("");
      setCoachEmail("");
      setCoachPhone("");
      setCoachTitle("");
      setCoachOrgId("");
      setFeedback({ type: "success", text: res.message || "Coach account created." });
      await loadTeam();
    } finally {
      setSavingCoach(false);
    }
  };

  const handleToggleCoachStatus = async (c: AdminTeamCoachItem) => {
    setActionUserId(c.id);
    try {
      const nextStatus = c.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const res = await wellnessTogglePartnerCoachStatus(c.id, nextStatus);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Coach status updated." });
        await loadTeam();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update Coach status." });
      }
    } finally {
      setActionUserId(null);
    }
  };

  const handleResetCoachPassword = async (c: AdminTeamCoachItem) => {
    setActionUserId(c.id);
    try {
      const res = await wellnessResetPartnerCoachPassword(c.id);
      if (res.success && res.data) {
        setCredentialBanner({
          roleLabel: "Coach Password Reset",
          name: c.fullName,
          email: c.email,
          temporaryPassword: res.data.temporaryPassword,
        });
        setFeedback({ type: "success", text: res.message || "Password reset." });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to reset password." });
      }
    } finally {
      setActionUserId(null);
    }
  };

  const handleSaveCoachProfileEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCoach?.coachProfileId) return;
    setSavingCoachEdit(true);
    try {
      const res = await wellnessUpdatePartnerCoachProfile({
        coachProfileId: editingCoach.coachProfileId,
        name: editCoachName,
        title: editCoachTitle,
      });
      if (res.success) {
        setEditingCoach(null);
        setFeedback({ type: "success", text: res.message || "Coach profile updated." });
        await loadTeam();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update coach profile." });
      }
    } finally {
      setSavingCoachEdit(false);
    }
  };

  if (loading && !team) {
    return (
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-12 border border-zinc-200/80 dark:border-white/10 text-center text-xs text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
        Loading team accounts...
      </div>
    );
  }

  const partnerUnlinked = isPartnerAdmin && !currentAdminOrgId;

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-mono font-semibold text-zinc-400 block">
            {isSuperadmin ? "Platform Access Delegation" : "Community Organization Team"}
          </span>
          <h2 className="text-xl font-geometric font-light tracking-tight text-zinc-900 dark:text-white">
            {isSuperadmin
              ? "Communities, Community Admins & Coaches"
              : `${team?.callerOrganizationName || "Community"} — Coaches`}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isSuperadmin
              ? "Only Superadmin can create Community Admins. Community Admins manage Coaches locked strictly to their own community."
              : "Create and manage Coach accounts scoped exclusively to your community."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperadmin && (
            <button
              type="button"
              onClick={() => {
                setPartnerOrgId(team?.organizations[0]?.id || "");
                setPartnerOrgMode(team?.organizations.length ? "existing" : "new");
                setPartnerModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Community Admin</span>
            </button>
          )}

          {!partnerUnlinked && (
            <button
              type="button"
              onClick={() => {
                setCoachOrgId(isSuperadmin ? "" : currentAdminOrgId || "");
                setCoachModalOpen(true);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                isSuperadmin
                  ? "border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                  : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs hover:opacity-90"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Coach</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning if Community Admin has no linked organization */}
      {partnerUnlinked && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 p-5 text-xs text-amber-900 dark:text-amber-200">
          Your Community Admin account has not been linked to a Community yet. Contact the Superadmin to assign your community before creating Coaches.
        </div>
      )}

      {/* One-time generated credentials banner */}
      {credentialBanner && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{credentialBanner.roleLabel} — Credentials Ready</span>
            </div>
            <p className="text-emerald-800 dark:text-emerald-300">
              <strong>{credentialBanner.name}</strong> ({credentialBanner.email})
            </p>
            <p className="font-mono text-emerald-950 dark:text-emerald-100 bg-white/80 dark:bg-black/30 px-2.5 py-1 rounded-lg inline-block border border-emerald-200 dark:border-emerald-800">
              Temp Password: {credentialBanner.temporaryPassword}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Share this temporary password securely. An email setup link was also dispatched if email delivery is configured.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `Email: ${credentialBanner.email}\nPassword: ${credentialBanner.temporaryPassword}`
                );
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <button
              type="button"
              onClick={() => setCredentialBanner(null)}
              className="p-1.5 rounded-xl text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SUPERADMIN ONLY: Community Admins Directory */}
      {isSuperadmin && (
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Community Admins ({team?.partnerAdmins.length ?? 0})
              </h3>
            </div>
          </div>

          {(team?.partnerAdmins.length ?? 0) === 0 ? (
            <div className="p-10 text-center text-xs text-zinc-500">
              No Community Admin accounts created yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/5">
              {team!.partnerAdmins.map((pa) => (
                <div
                  key={pa.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                        {pa.fullName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                        {pa.organizationName || "Unlinked Organization"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                          pa.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-500/10 text-red-600 dark:text-red-300"
                        }`}
                      >
                        {pa.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono truncate">
                      {pa.email} {pa.phone ? `• ${pa.phone}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                    COMMUNITY_ADMIN
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coaches Directory (Scoped to organization for PARTNER_ADMIN, all for SUPERADMIN) */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              Coaches ({team?.coaches.length ?? 0})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            {isSuperadmin ? "All Organizations" : "Organization Scoped"}
          </span>
        </div>

        {(team?.coaches.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500">
            No Coach accounts found in this scope yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {team!.coaches.map((c) => (
              <div
                key={c.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                      {c.coachName || c.fullName}
                    </span>
                    {c.coachTitle && (
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        • {c.coachTitle}
                      </span>
                    )}
                    {c.organizationName && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                        {c.organizationName}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                        c.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-500/10 text-red-600 dark:text-red-300"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono truncate">
                    {c.email} {c.phone ? `• ${c.phone}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {c.coachProfileId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCoach(c);
                        setEditCoachName(c.coachName || c.fullName);
                        setEditCoachTitle(c.coachTitle || "");
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Profile</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionUserId === c.id}
                    onClick={() => void handleResetCoachPassword(c)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Reset Password</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionUserId === c.id}
                    onClick={() => void handleToggleCoachStatus(c)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <Ban className="w-3 h-3" />
                    <span>{c.status === "ACTIVE" ? "Suspend" : "Activate"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Community Admin (Superadmin Only) */}
      {isSuperadmin && partnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-zinc-500" />
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Create Community Admin
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPartnerModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePartnerAdmin} className="space-y-3">
              <div className="flex gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setPartnerOrgMode("existing")}
                  className={`flex-1 py-1.5 rounded-lg border ${
                    partnerOrgMode === "existing"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white"
                      : "border-zinc-200 dark:border-white/15 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  Existing Community
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerOrgMode("new")}
                  className={`flex-1 py-1.5 rounded-lg border ${
                    partnerOrgMode === "new"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white"
                      : "border-zinc-200 dark:border-white/15 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  + New Community
                </button>
              </div>

              {partnerOrgMode === "existing" ? (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                    Community Organization *
                  </label>
                  <select
                    required
                    value={partnerOrgId}
                    onChange={(e) => setPartnerOrgId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                  >
                    <option value="">Select community...</option>
                    {(team?.organizations || []).map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                      New Community Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="e.g. Senopati Pilates Studio"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                      Tagline (optional)
                    </label>
                    <input
                      type="text"
                      value={newOrgTagline}
                      onChange={(e) => setNewOrgTagline(e.target.value)}
                      placeholder="e.g. Boutique Reformer & Mobility Club"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={partnerFullName}
                  onChange={(e) => setPartnerFullName(e.target.value)}
                  placeholder="e.g. Nadia Kusuma"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="community-admin@studio.com"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="text"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="+62..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPartner}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-50"
                >
                  {savingPartner ? "Creating..." : "Create Community Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Coach Account (Superadmin or Partner Admin) */}
      {coachModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-zinc-500" />
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Create Coach Account
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setCoachModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoach} className="space-y-3">
              {isSuperadmin && (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                    Community Organization (optional)
                  </label>
                  <select
                    value={coachOrgId}
                    onChange={(e) => setCoachOrgId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                  >
                    <option value="">ZERA Platform (Independent Coach)</option>
                    {(team?.organizations || []).map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Coach Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={coachFullName}
                  onChange={(e) => setCoachFullName(e.target.value)}
                  placeholder="e.g. Coach Raka Pratama"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Specialization / Title *
                </label>
                <input
                  type="text"
                  required
                  value={coachTitle}
                  onChange={(e) => setCoachTitle(e.target.value)}
                  placeholder="e.g. Tennis & Conditioning Coach"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  placeholder="coach@studio.com"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="text"
                  value={coachPhone}
                  onChange={(e) => setCoachPhone(e.target.value)}
                  placeholder="+62..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCoachModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCoach}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-50"
                >
                  {savingCoach ? "Creating..." : "Create Coach"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Coach Profile */}
      {editingCoach && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Edit Coach Profile
              </h4>
              <button
                type="button"
                onClick={() => setEditingCoach(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoachProfileEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Coach Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCoachName}
                  onChange={(e) => setEditCoachName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Specialization / Title *
                </label>
                <input
                  type="text"
                  required
                  value={editCoachTitle}
                  onChange={(e) => setEditCoachTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCoach(null)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCoachEdit}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-50"
                >
                  {savingCoachEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
