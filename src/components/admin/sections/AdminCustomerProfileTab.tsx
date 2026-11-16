"use client";

import { Camera, ExternalLink, Lock, Scale, Smartphone, Users } from "lucide-react";
import { safeMediaUrl } from "@/wellness/utils/url-safety";
import type { AdminCustomerHealthProfile, AdminUserItem } from "../adminTypes";

interface AdminCustomerProfileTabProps {
  u: AdminUserItem;
  profile: AdminCustomerHealthProfile | null | undefined;
  activeWeight: number | null | undefined;
  activeHeight: number | null | undefined;
  bmiValue: string | null;
  bmiCategory: string | null;
}

export function AdminCustomerProfileTab({
  u,
  profile,
  activeWeight,
  activeHeight,
  bmiValue,
  bmiCategory,
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
      <span>1. Personal Information</span>
    </h4>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Age</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
          {u.age ? `${u.age} years old` : profile?.age ? `${profile.age} years old` : "—"}
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

  {/* Section 2: General Health & Nutrition */}
  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-white/10">
    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
      <Scale className="w-3.5 h-3.5" />
      <span>2. General Health &amp; Nutrition</span>
    </h4>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {/* Diet Style */}
      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Diet Style</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
          {profile?.dietType || profile?.eatingPatterns || "Standard Balanced"}
        </span>
      </div>

      {/* Height */}
      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Height</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white font-mono">
          {profile?.heightCm ? `${profile.heightCm} cm` : "—"}
        </span>
      </div>

      {/* Weight */}
      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Weight</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white font-mono">
          {profile?.weightKg ? `${profile.weightKg} kg` : "—"}
        </span>
      </div>

      {/* BMI */}
      <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">Calculated BMI</span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white font-mono">
          {bmiValue ? `${bmiValue} (${bmiCategory || "Normal"})` : "—"}
        </span>
      </div>
    </div>

    {/* Primary Wellness Goal */}
    <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
      <span className="text-[10px] font-mono uppercase text-zinc-400 block">
        Primary Wellness Goal
      </span>
      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
        {profile?.primaryGoal || "No specific goal specified"}
      </p>
    </div>

    {/* Food Allergies */}
    <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1.5">
      <span className="text-[10px] font-mono uppercase text-zinc-400 block">
        Food Allergies &amp; Dietary Intolerances
      </span>
      {profile?.foodAllergies ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {profile.foodAllergies
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
            .map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-500/20"
              >
                ⚠️ {tag}
              </span>
            ))}
        </div>
      ) : (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          No food allergies reported
        </span>
      )}
    </div>

    {/* Physical Limitations / Injuries */}
    <div
      className={`p-3.5 rounded-xl border space-y-1.5 ${
        profile?.injuriesOrConditions
          ? "bg-zinc-500/5 dark:bg-zinc-500/10 border-zinc-500/20"
          : "bg-zinc-50/70 dark:bg-white/5 border-zinc-200/70 dark:border-white/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block">
          Physical Limitations &amp; Health Conditions
        </span>
        {profile?.injuriesOrConditions && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 font-semibold">
            Movement Alert
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
        {profile?.injuriesOrConditions || "No physical limitations or health conditions reported"}
      </p>
    </div>

    {/* Baseline Posture Photos (If provided) */}
    {(profile?.photoFrontUrl || profile?.photoSideUrl || profile?.photoBackUrl) && (
      <div className="space-y-2 pt-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
          Baseline Posture Photos
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Front View", url: profile?.photoFrontUrl },
            { label: "Side View", url: profile?.photoSideUrl },
            { label: "Back View", url: profile?.photoBackUrl },
          ].map(({ label, url }) => (
            <div
              key={label}
              className="group relative rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-white/5 overflow-hidden flex flex-col items-center justify-center min-h-[170px]"
            >
              {(() => {
                const safeUrl = safeMediaUrl(url);
                return safeUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={safeUrl}
                    alt={label}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-44 object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-white">
                    <span className="text-xs font-medium font-geometric">{label}</span>
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="p-3 text-center space-y-1 text-zinc-400">
                  <Camera className="w-5 h-5 mx-auto opacity-30 mb-0.5" />
                  <p className="text-xs font-medium text-zinc-500">{label}</p>
                  <p className="text-[10px] text-zinc-400">Not uploaded</p>
                </div>
              );
              })()}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>
  );
}
