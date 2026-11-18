"use client";

import {
  Activity,
  Ban,
  Calendar,
  ChevronDown,
  KeyRound,
  Mail,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { formatDate } from "../adminUtils";
import { PaginationBar } from "../AdminFormPickers";
import type { AdminUserItem } from "../adminTypes";

interface AdminCustomersListProps {
  users: AdminUserItem[];
  filteredMembers: AdminUserItem[];
  paginatedMembers: AdminUserItem[];
  memberSearch: string;
  setMemberSearch: (val: string) => void;
  memberFilter: "ALL" | "ACTIVE" | "PENDING" | "SUSPENDED" | "SUPERADMIN";
  setMemberFilter: (val: "ALL" | "ACTIVE" | "PENDING" | "SUSPENDED" | "SUPERADMIN") => void;
  memberSort: "NEWEST" | "OLDEST" | "NAME_ASC" | "NAME_DESC" | "ENROLLMENTS_DESC";
  setMemberSort: (val: "NEWEST" | "OLDEST" | "NAME_ASC" | "NAME_DESC" | "ENROLLMENTS_DESC") => void;
  setMemberPage: (page: number) => void;
  safeMemberPage: number;
  totalMemberPages: number;
  memberPageSize: number;
  currentAdminId: string;
  isSuperadminUser?: boolean;
  userActionLoading: string | null;
  openCustomerDetail: (
    u: AdminUserItem,
    tab?: "overview" | "responses" | "profile" | "notes"
  ) => void;
  handleResetPassword: (user: AdminUserItem) => void;
  handleToggleUserStatus: (user: AdminUserItem) => void;
  handleDeleteUser: (user: AdminUserItem) => void;
}

export function AdminCustomersList({
  users,
  filteredMembers,
  paginatedMembers,
  memberSearch,
  setMemberSearch,
  memberFilter,
  setMemberFilter,
  memberSort,
  setMemberSort,
  setMemberPage,
  safeMemberPage,
  totalMemberPages,
  memberPageSize: MEMBER_PAGE_SIZE,
  currentAdminId,
  isSuperadminUser = false,
  userActionLoading,
  openCustomerDetail,
  handleResetPassword,
  handleToggleUserStatus,
  handleDeleteUser,
}: AdminCustomersListProps) {
  return (
    <div className="space-y-6">
      {/* TOP WIDGET: Search & Filters Toolbar */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
        {/* Row 1: Search Bar (Left) side-by-side with Total Customers Badge (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value);
                setMemberPage(1);
              }}
              placeholder="Search customers by name, email, or phone..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition"
            />
            {memberSearch && (
              <button
                type="button"
                onClick={() => {
                  setMemberSearch("");
                  setMemberPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>{users.length} Registered</span>
          </div>
        </div>

        {/* Row 2: Filter Pills + Sort Dropdown - Symmetrically Balanced */}
        <div className="pt-3.5 border-t border-zinc-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono">
          {/* Status Filter Group */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "ALL", label: `All (${users.length})` },
              { key: "ACTIVE", label: "Active" },
              { key: "PENDING", label: "Pending" },
              { key: "SUSPENDED", label: "Suspended" },
              ...(isSuperadminUser ? [{ key: "SUPERADMIN", label: "Superadmin" }] : []),
            ].map((tab) => {
              const isSelected = memberFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setMemberFilter(tab.key as any);
                    setMemberPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                      : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <select
              value={memberSort}
              onChange={(e) => {
                setMemberSort(e.target.value as any);
                setMemberPage(1);
              }}
              className="pl-9 pr-8 py-2 h-[37px] rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200/80 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-sans font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer appearance-none transition"
            >
              <option value="NEWEST" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Newest Registered</option>
              <option value="OLDEST" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Oldest Registered</option>
              <option value="NAME_ASC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (A - Z)</option>
              <option value="NAME_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (Z - A)</option>
              <option value="ENROLLMENTS_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Most Programs</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* BOTTOM WIDGET: Customers Directory Header + Cards + Pagination */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Customers Directory ({filteredMembers.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
            Page {safeMemberPage} of {totalMemberPages}
          </span>
        </div>

        {paginatedMembers.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-14 text-center border border-zinc-200/80 dark:border-white/10 shadow-xs">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No customers found matching the selected filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedMembers.map((m, idx) => {
              const isSuperadmin = m.role === "SUPERADMIN";
              const defaultCustomerCovers = [
                "/coach.webp",
                "/coach2.webp",
                "/coach3.webp",
                "/pic.webp",
                "/test.webp",
                "/image.webp",
              ];
              const fallbackCover = defaultCustomerCovers[idx % defaultCustomerCovers.length];
              const coverSrc = fallbackCover;
              const customerAge = m.age;

              return (
                <div
                  key={m.id}
                  className={`relative rounded-3xl overflow-hidden min-h-[190px] sm:min-h-[210px] flex flex-col justify-between p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-sm group hover:border-zinc-400 dark:hover:border-white/25 transition-all duration-300 ${
                    isSuperadmin ? "bg-zinc-950" : ""
                  }`}
                >
                  {/* BACKGROUND IMAGE FOR CUSTOMERS (SUPERADMIN HAS NO IMAGE) */}
                  {!isSuperadmin ? (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-zinc-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverSrc}
                        alt={m.fullName}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                        className="w-full h-full object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 pointer-events-none bg-zinc-950 border border-zinc-800" />
                  )}

                  {/* TOP ROW: Joined Date & Superadmin Badge */}
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 font-mono">
                    <div className="flex items-center gap-2">
                      {isSuperadmin && (
                        <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded-full bg-white text-zinc-950 font-bold border border-white shadow-sm flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3 text-zinc-950" />
                          <span>Superadmin</span>
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-semibold border border-white/20 shadow-sm flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-zinc-300" />
                        <span>Joined {formatDate(m.createdAt)}</span>
                      </span>
                    </div>

                    {m.status === "SUSPENDED" && (
                      <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-red-300 font-semibold border border-red-500/30 shadow-sm">
                        Suspended
                      </span>
                    )}
                  </div>

                  {/* MIDDLE: Customer Name & Age */}
                  <div className="relative z-10 py-3 my-auto space-y-1">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-geometric font-semibold text-white tracking-tight drop-shadow-md leading-snug">
                        {m.fullName}
                      </h3>
                      {customerAge ? (
                        <span className="text-xs sm:text-sm font-mono text-zinc-300 font-normal drop-shadow-sm">
                          • {customerAge} yrs {m.city ? `• ${m.city}` : ""}
                        </span>
                      ) : m.city ? (
                        <span className="text-xs sm:text-sm font-mono text-zinc-300 font-normal drop-shadow-sm">
                          • {m.city}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* BOTTOM ROW: Clean Floating Bar (Email & Phone Number + Action Buttons) */}
                  <div className="relative z-10 p-2.5 sm:p-3 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs shadow-lg">
                    {/* Left: Email & Phone Number */}
                    <div className="flex flex-wrap items-center gap-2.5 text-white">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs text-white font-medium truncate max-w-[150px] sm:max-w-none">{m.email}</span>
                      </div>

                      <span className="text-zinc-600 hidden sm:inline">•</span>

                      <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                        <Smartphone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{m.phone || "—"}</span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openCustomerDetail(m)}
                        className="px-2.5 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm hover:scale-[1.02] duration-150"
                        title="View customer detail"
                      >
                        <Activity className="w-3.5 h-3.5 shrink-0" />
                        <span>Detail</span>
                      </button>

                      {isSuperadminUser && m.id !== currentAdminId && !isSuperadmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(m)}
                            disabled={userActionLoading === m.id}
                            className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-white/15 text-zinc-200 text-xs font-medium border border-white/15 flex items-center gap-1 transition"
                            title="Reset password"
                          >
                            <KeyRound className="w-3 h-3 shrink-0" />
                            <span className="hidden sm:inline">Reset</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(m)}
                            disabled={userActionLoading === m.id}
                            className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-white/15 text-zinc-200 text-xs font-medium border border-white/15 flex items-center gap-1 transition"
                            title={m.status === "ACTIVE" ? "Suspend user" : "Activate user"}
                          >
                            <Ban className="w-3 h-3 shrink-0" />
                            <span>{m.status === "ACTIVE" ? "Suspend" : "Activate"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(m)}
                            disabled={userActionLoading === m.id}
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-red-300 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 flex items-center justify-center transition"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <PaginationBar
          currentPage={safeMemberPage}
          totalPages={totalMemberPages}
          totalItems={filteredMembers.length}
          pageSize={MEMBER_PAGE_SIZE}
          onPageChange={setMemberPage}
          itemLabel="customers"
        />
      </div>

    </div>
  );
}
