"use client";

import { Lock, Smartphone, Users } from "lucide-react";
import type { AdminUserItem } from "../adminTypes";

interface AdminCustomerProfileTabProps {
  u: AdminUserItem;
}

export function AdminCustomerProfileTab({
  u,
}: AdminCustomerProfileTabProps) {
  return (
<div className="space-y-6">
  {/* Read-Only Notice Banner */}
  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5 text-zinc-600 dark:text-zinc-400 text-xs flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <Lock className="w-4 h-4 shrink-0 text-zinc-400" />
      <span>
        This information is submitted directly by the customer and is strictly view-only for coaches and staff.
      </span>
    </div>
    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 shrink-0">
      Read-Only
    </span>
  </div>

  {/* Section 1: Personal Information */}
  <div className="space-y-3">
    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
      <Users className="w-3.5 h-3.5" />
      <span>Personal Information</span>
    </h4>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Age</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
          {u.age ? `${u.age} years old` : "—"}
        </span>
      </div>

      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Gender</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
          {u.gender || "—"}
        </span>
      </div>

      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 col-span-2">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Occupation</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
          {u.occupation || "Not specified"}
        </span>
      </div>
    </div>

    {/* Address & City */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 sm:col-span-2">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Street Address</span>
        <span className="text-xs font-semibold text-zinc-900 dark:text-white block mt-0.5">
          {u.address || "No address provided"}
        </span>
      </div>

      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">City &amp; Province</span>
        <span className="text-xs font-semibold text-zinc-900 dark:text-white block mt-0.5">
          {[u.city, u.province].filter(Boolean).join(", ") || "—"}
        </span>
      </div>
    </div>

    {/* Emergency Contact */}
    <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="space-y-0.5">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Emergency Contact</span>
        <span className="text-xs font-semibold text-zinc-900 dark:text-white">
          {u.emergencyContactName || "No emergency contact recorded"}
        </span>
      </div>
      {u.emergencyContactPhone && (
        <a
          href={`tel:${u.emergencyContactPhone.replace(/[^0-9+]/g, "")}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition w-fit"
        >
          <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
          <span>{u.emergencyContactPhone}</span>
        </a>
      )}
    </div>
  </div>
</div>
  );
}
