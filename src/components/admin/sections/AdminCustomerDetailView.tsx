"use client";

import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  KeyRound,
  Layers,
  Mail,
  MapPin,
  MessageCircle,
  Smartphone,
  Trash2,
} from "lucide-react";
import { wellnessAdminUpdateUserRole } from "@/wellness/actions/admin";
import type { MasterDataPayload } from "@/wellness/actions/master";
import type {
  AdminFeedbackMessage,
  AdminUserItem,
} from "../adminTypes";
import { AdminCustomerProgramsTab } from "./AdminCustomerProgramsTab";
import { AdminCustomerProfileTab } from "./AdminCustomerProfileTab";

type CustomerTabKey = "overview" | "responses" | "profile" | "notes";

interface AdminCustomerDetailViewProps {
  u: AdminUserItem;
  currentAdminId: string;
  masterData: MasterDataPayload;
  setUsers: Dispatch<SetStateAction<AdminUserItem[]>>;
  setInspectingUserHealth: Dispatch<SetStateAction<AdminUserItem | null>>;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
  isSuperadminUser: boolean;
  userActionLoading: string | null;
  setUserActionLoading: (val: string | null) => void;
  customerModalTab: CustomerTabKey;
  switchCustomerTab: (tab: CustomerTabKey) => void;
  closeCustomerDetail: () => void;
  handleResetPassword: (user: AdminUserItem) => void;
  handleToggleUserStatus: (user: AdminUserItem) => void;
  handleDeleteUser: (user: AdminUserItem) => void;
  selectedCustomerProgramId: string | null;
  setSelectedCustomerProgramId: (id: string | null) => void;
  customerResponseStatusFilter: "ALL" | "COMPLETED" | "PENDING";
  setCustomerResponseStatusFilter: (val: "ALL" | "COMPLETED" | "PENDING") => void;
  customerResponseSearch: string;
  setCustomerResponseSearch: (val: string) => void;
  expandedResponseIds: Record<string, boolean>;
  setExpandedResponseIds: Dispatch<SetStateAction<Record<string, boolean>>>;
}

export function AdminCustomerDetailView({
  u,
  currentAdminId,
  masterData,
  setUsers,
  setInspectingUserHealth,
  setFeedback,
  isSuperadminUser,
  userActionLoading,
  setUserActionLoading,
  customerModalTab,
  switchCustomerTab,
  closeCustomerDetail,
  handleResetPassword,
  handleToggleUserStatus,
  handleDeleteUser,
  selectedCustomerProgramId,
  setSelectedCustomerProgramId,
  customerResponseStatusFilter,
  setCustomerResponseStatusFilter,
  customerResponseSearch,
  setCustomerResponseSearch,
  expandedResponseIds,
  setExpandedResponseIds,
}: AdminCustomerDetailViewProps) {
  const router = useRouter();
  const enrollments = u.enrollments || [];
  const dayProgress = u.dayProgress || [];
  const completedDaysCount = dayProgress.filter((p) => p.isCompleted).length;

  const cleanPhone = u.phone ? u.phone.replace(/[^0-9]/g, "") : "";
  const waNumber = cleanPhone.startsWith("08")
    ? "62" + cleanPhone.slice(1)
    : cleanPhone.startsWith("62")
    ? cleanPhone
    : cleanPhone;
  const waUrl = waNumber ? `https://wa.me/${waNumber}` : null;

  const activeCustomerTab =
    customerModalTab === "responses" ? "overview" : customerModalTab === "profile" ? "profile" : "overview";

// Selected program for drill-down responses
const selectedEnrollment = selectedCustomerProgramId
  ? enrollments.find((e) => e.program?.id === selectedCustomerProgramId)
  : null;
const selectedProgram = selectedEnrollment?.program || null;

return (
  <div className="space-y-5">
    {/* Customer Detail Header Summary Widget */}
    <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
        <button
          type="button"
          onClick={closeCustomerDetail}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to Customers
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
              u.status === "ACTIVE"
                ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                u.status === "ACTIVE" ? "bg-zinc-500" : "bg-red-500"
              }`}
            />
            <span>{u.status}</span>
          </span>

          <span className="inline-flex items-center px-2 py-1 rounded-xl text-xs font-mono font-semibold uppercase bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
            {u.role}
          </span>

          {/* WhatsApp Quick Link */}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 text-xs font-semibold border border-zinc-500/20 transition flex items-center gap-1.5"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          )}

          {/* Reset Password */}
          <button
            type="button"
            onClick={() => handleResetPassword(u)}
            disabled={userActionLoading === u.id}
            className="px-3 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
            <span>Reset Password</span>
          </button>

          {u.id !== currentAdminId && u.role !== "SUPERADMIN" && (
            <>
              {isSuperadminUser && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={u.role}
                    disabled={userActionLoading === u.id}
                    onChange={async (e) => {
                      const nextRole = e.target.value as "USER" | "COACH" | "PARTNER_ADMIN";
                      setUserActionLoading(u.id);
                      try {
                        const res = await wellnessAdminUpdateUserRole(u.id, nextRole, {
                          organizationId: nextRole === "PARTNER_ADMIN" ? (u.organizationId ?? null) : null,
                          coachProfileId: nextRole === "COACH" ? (u.coachProfileId ?? null) : null,
                        });
                        if (res.success) {
                          setUsers((prev) =>
                            prev.map((item) =>
                              item.id === u.id ? { ...item, role: nextRole } : item
                            )
                          );
                          setInspectingUserHealth((prev) =>
                            prev && prev.id === u.id ? { ...prev, role: nextRole } : prev
                          );
                          setFeedback({ type: "success", text: `Updated role to ${nextRole}.` });
                          router.refresh();
                        } else {
                          setFeedback({ type: "error", text: res.message || "Failed to update role." });
                        }
                      } finally {
                        setUserActionLoading(null);
                      }
                    }}
                    aria-label="User Role"
                    className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  >
                    <option value="USER">Role: USER</option>
                    <option value="COACH">Role: COACH</option>
                    <option value="PARTNER_ADMIN">Role: PARTNER_ADMIN</option>
                  </select>

                  {u.role === "COACH" && (
                    <select
                      value={u.coachProfileId || ""}
                      disabled={userActionLoading === u.id}
                      onChange={async (e) => {
                        const nextCoachId = e.target.value || null;
                        setUserActionLoading(u.id);
                        try {
                          const res = await wellnessAdminUpdateUserRole(u.id, "COACH", {
                            coachProfileId: nextCoachId,
                          });
                          if (res.success) {
                            setUsers((prev) =>
                              prev.map((item) =>
                                item.id === u.id ? { ...item, coachProfileId: nextCoachId } : item
                              )
                            );
                            setInspectingUserHealth((prev) =>
                              prev && prev.id === u.id ? { ...prev, coachProfileId: nextCoachId } : prev
                            );
                            setFeedback({ type: "success", text: "Linked Coach profile updated." });
                          } else {
                            setFeedback({ type: "error", text: res.message || "Failed to link coach profile." });
                          }
                        } finally {
                          setUserActionLoading(null);
                        }
                      }}
                      aria-label="Linked Coach Profile"
                      className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    >
                      <option value="">Link Coach Profile...</option>
                      {masterData.coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {u.role === "PARTNER_ADMIN" && (
                    <select
                      value={u.organizationId || ""}
                      disabled={userActionLoading === u.id}
                      onChange={async (e) => {
                        const nextOrgId = e.target.value || null;
                        setUserActionLoading(u.id);
                        try {
                          const res = await wellnessAdminUpdateUserRole(u.id, "PARTNER_ADMIN", {
                            organizationId: nextOrgId,
                          });
                          if (res.success) {
                            setUsers((prev) =>
                              prev.map((item) =>
                                item.id === u.id ? { ...item, organizationId: nextOrgId } : item
                              )
                            );
                            setInspectingUserHealth((prev) =>
                              prev && prev.id === u.id ? { ...prev, organizationId: nextOrgId } : prev
                            );
                            setFeedback({ type: "success", text: "Linked Organization updated." });
                          } else {
                            setFeedback({ type: "error", text: res.message || "Failed to link organization." });
                          }
                        } finally {
                          setUserActionLoading(null);
                        }
                      }}
                      aria-label="Linked Organization"
                      className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    >
                      <option value="">Link Organization...</option>
                      {(masterData.organizations || []).map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleToggleUserStatus(u)}
                disabled={userActionLoading === u.id}
                className="px-2.5 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-medium flex items-center gap-1 transition"
                title={u.status === "ACTIVE" ? "Suspend user" : "Activate user"}
              >
                <Ban className="w-3 h-3 text-zinc-500" />
                <span>{u.status === "ACTIVE" ? "Suspend" : "Activate"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteUser(u)}
                disabled={userActionLoading === u.id}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-zinc-200/70 dark:border-white/10"
                title="Delete customer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Persona Profile Row */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-base flex items-center justify-center shadow-xs shrink-0 font-geometric">
          {u.fullName
            ? u.fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            : "CU"}
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-geometric font-bold text-zinc-900 dark:text-white truncate">
              {u.fullName}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
              ID: {u.id}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-zinc-400" />
              <span>{u.email}</span>
            </span>

            {u.phone && (
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-zinc-400" />
                <span>{u.phone}</span>
              </span>
            )}

            {u.occupation && (
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-zinc-400" />
                <span>{u.occupation}</span>
              </span>
            )}

            {(u.city || u.province) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-zinc-400" />
                <span>{[u.city, u.province].filter(Boolean).join(", ")}</span>
              </span>
            )}

            <span className="text-zinc-400 font-mono text-[11px]">
              Joined {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* 4-Column Metric Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
            Programs Enrolled
          </span>
          <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
            {enrollments.length} <span className="text-xs font-normal text-zinc-500">({enrollments.filter((e) => e.status === "ACTIVE").length} active)</span>
          </p>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
            Daily Check-Ins
          </span>
          <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
            {completedDaysCount} <span className="text-xs font-normal text-zinc-500">of {dayProgress.length} done</span>
          </p>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
            Location
          </span>
          <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5 truncate">
            {u.city || "—"}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
            Account Status
          </span>
          <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
            {u.status}
          </p>
        </div>
      </div>
    </div>

    {/* Simplified Navigation Option Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {/* 1. PROGRAMS (Enrolled & Daily Responses Drill-Down) */}
      <button
        type="button"
        onClick={() => switchCustomerTab("overview")}
        className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
          activeCustomerTab === "overview"
            ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-xs ring-1 ring-zinc-900/10 dark:ring-white/10"
            : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              activeCustomerTab === "overview"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-zinc-900 dark:text-white block font-geometric truncate">
              Programs &amp; Responses
            </span>
            <span className="text-[10px] text-zinc-400 block font-mono truncate">
              {enrollments.length} enrolled • {dayProgress.length} check-ins
            </span>
          </div>
        </div>
      </button>

      {/* 2. PERSONAL PROFILE */}
      <button
        type="button"
        onClick={() => switchCustomerTab("profile")}
        className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
          activeCustomerTab === "profile"
            ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-xs ring-1 ring-zinc-900/10 dark:ring-white/10"
            : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              activeCustomerTab === "profile"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-zinc-900 dark:text-white block font-geometric truncate">
              Personal Profile
            </span>
            <span className="text-[10px] text-zinc-400 block font-mono truncate">
              Contact, address &amp; emergency info
            </span>
          </div>
        </div>
      </button>
    </div>

    {/* Sub-view Content Container */}
    <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-5">
      {activeCustomerTab === "overview" && (
        <AdminCustomerProgramsTab
          u={u}
          selectedCustomerProgramId={selectedCustomerProgramId}
          setSelectedCustomerProgramId={setSelectedCustomerProgramId}
          customerResponseStatusFilter={customerResponseStatusFilter}
          setCustomerResponseStatusFilter={setCustomerResponseStatusFilter}
          customerResponseSearch={customerResponseSearch}
          setCustomerResponseSearch={setCustomerResponseSearch}
          expandedResponseIds={expandedResponseIds}
          setExpandedResponseIds={setExpandedResponseIds}
        />
      )}

      {activeCustomerTab === "profile" && <AdminCustomerProfileTab u={u} />}
    </div>
  </div>
  );
}
