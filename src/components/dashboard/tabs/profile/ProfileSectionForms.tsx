"use client";

import type { RefObject } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  Download,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { wellnessChangePassword } from "@/wellness/actions/account";
import { GENDER_OPTIONS } from "@/wellness/validators/auth";
import { formatDateWib } from "../shared";
import { NotificationPrefs } from "./NotificationPrefs";
import { ShareProgressSection } from "./ShareProgressSection";

export type Msg = { type: "success" | "error"; text: string } | null;
export type ProfileView =
  | "basic"
  | "contact"
  | "emergency"
  | "security"
  | "notifications"
  | "share_progress"
  | "privacy"
  | "account";

export interface ProfileFormState {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const inputCls =
  "w-full h-11 sm:h-12 min-w-0 max-w-full box-border px-3.5 rounded-xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-950 dark:focus:border-white transition";
const labelSpanCls =
  "block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5";

export const PROFILE_TITLES: Record<ProfileView, string> = {
  basic: "Basic Information",
  contact: "Contact Details",
  emergency: "Emergency Contact",
  security: "Login & Security",
  notifications: "Notification Preferences",
  share_progress: "Share Progress",
  privacy: "Privacy & Data Export",
  account: "Account & Support",
};

export const PROFILE_SUBTITLES: Record<ProfileView, string> = {
  basic: "Manage your personal identity, date of birth, and avatar.",
  contact: "Keep your phone number and residential address updated.",
  emergency: "Designated point of contact for safety and cohort escalations.",
  security: "Update your account password, credentials, and authentication security.",
  notifications: "Configure push alerts, training reminders, and cohort updates.",
  share_progress: "Grant read-only progress access or view progress shared with you.",
  privacy: "Review verification status, export your account data, and clear local cache.",
  account: "Concierge support, active session management, and account deletion.",
};

export function Banner({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      role={msg.type === "error" ? "alert" : "status"}
      className={`text-xs px-4 py-3 rounded-2xl border font-mono ${
        msg.type === "error"
          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40"
          : "bg-zinc-900/5 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-zinc-100 dark:border-white/20"
      }`}
    >
      {msg.text}
    </p>
  );
}

function SaveButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="h-10 px-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-geometric font-medium disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95 transition"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      <span>Save Changes</span>
    </button>
  );
}

interface ProfileSectionViewProps {
  view: ProfileView;
  user: {
    email: string;
    status: string;
    createdAt: Date | string;
  };
  avatarUrl: string | null;
  avatarBusy: boolean;
  fileRef: RefObject<HTMLInputElement>;
  onPickAvatar: (file: File | undefined) => void;
  form: ProfileFormState;
  setForm: React.Dispatch<React.SetStateAction<ProfileFormState>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  saveProfile: () => Promise<void>;
  pw: PasswordFormState;
  setPw: React.Dispatch<React.SetStateAction<PasswordFormState>>;
  msg: Msg;
  setMsg: React.Dispatch<React.SetStateAction<Msg>>;
  handleExportData: () => void;
  handleClearCache: () => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export function ProfileSectionView({
  view,
  user,
  avatarUrl,
  avatarBusy,
  fileRef,
  onPickAvatar,
  form,
  setForm,
  saving,
  setSaving,
  saveProfile,
  pw,
  setPw,
  msg,
  setMsg,
  handleExportData,
  handleClearCache,
  onLogout,
  onDeleteAccount,
}: ProfileSectionViewProps) {
  return (
    <div className="profile-detail-scope max-w-xl w-full mx-auto space-y-6 pt-2 pb-12">
      <div className="space-y-1.5 pb-4 border-b border-zinc-200/80 dark:border-white/10">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
          Account Settings
        </span>
        <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
          {PROFILE_TITLES[view]}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {PROFILE_SUBTITLES[view]}
        </p>
      </div>

      <Banner msg={msg} />

      <div className="space-y-6">
        {view === "basic" && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white">
                    Profile Picture
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    JPEG, PNG, or WebP
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => fileRef.current?.click()}
                className="h-9 px-4 rounded-full border border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/5 text-xs font-geometric font-medium text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 shrink-0 hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95"
              >
                {avatarBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>Upload</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onPickAvatar(e.target.files?.[0])}
              />
            </div>

            <div className="space-y-4">
              <label className="block min-w-0">
                <span className={labelSpanCls}>Full Name</span>
                <input
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className={inputCls}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block min-w-0">
                  <span className={labelSpanCls}>Date of Birth</span>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className="block min-w-0">
                  <span className={labelSpanCls}>Gender</span>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select your gender</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block min-w-0">
                <span className={labelSpanCls}>Occupation</span>
                <input
                  placeholder="e.g. Software Engineer, Designer, Entrepreneur"
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  className={inputCls}
                />
              </label>
            </div>

            <div className="pt-4 border-t border-zinc-200/80 dark:border-white/10 flex justify-end">
              <SaveButton busy={saving} onClick={saveProfile} />
            </div>
          </div>
        )}

        {view === "contact" && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Registered Email
                  </p>
                  <p className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 dark:bg-white/10 dark:text-zinc-200 text-[10px] font-mono">
                Verified
              </span>
            </div>

            <div className="space-y-4">
              <label className="block min-w-0">
                <span className={labelSpanCls}>Phone Number</span>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+62 812-3456-7890"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                />
              </label>

              <label className="block min-w-0">
                <span className={labelSpanCls}>Street Address</span>
                <input
                  placeholder="e.g. Jl. Senopati No. 12"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={inputCls}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block min-w-0">
                  <span className={labelSpanCls}>City</span>
                  <input
                    placeholder="Jakarta Selatan"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className="block min-w-0">
                  <span className={labelSpanCls}>Province / State</span>
                  <input
                    placeholder="DKI Jakarta"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200/80 dark:border-white/10 flex justify-end">
              <SaveButton busy={saving} onClick={saveProfile} />
            </div>
          </div>
        )}

        {view === "emergency" && (
          <div className="space-y-5">
            <div className="space-y-4">
              <label className="block min-w-0">
                <span className={labelSpanCls}>Emergency Contact Name</span>
                <input
                  placeholder="e.g. Jane Doe (Spouse)"
                  value={form.emergencyContactName}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactName: e.target.value })
                  }
                  className={inputCls}
                />
              </label>

              <label className="block min-w-0">
                <span className={labelSpanCls}>Emergency Contact Phone</span>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+62 811-2233-4455"
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactPhone: e.target.value })
                  }
                  className={inputCls}
                />
              </label>
            </div>

            <div className="pt-4 border-t border-zinc-200/80 dark:border-white/10 flex justify-end">
              <SaveButton busy={saving} onClick={saveProfile} />
            </div>
          </div>
        )}

        {view === "security" && (
          <div className="space-y-6">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setMsg(null);
                setSaving(true);
                try {
                  const res = await wellnessChangePassword(pw);
                  setMsg(
                    res.success
                      ? { type: "success", text: "Password successfully updated." }
                      : { type: "error", text: res.message || "Failed to update password." }
                  );
                  if (res.success) {
                    setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }
                } finally {
                  setSaving(false);
                }
              }}
            >
              <label className="block min-w-0">
                <span className={labelSpanCls}>Current Password</span>
                <input
                  type="password"
                  placeholder="Enter your current password"
                  value={pw.currentPassword}
                  onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                  className={inputCls}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block min-w-0">
                  <span className={labelSpanCls}>New Password</span>
                  <input
                    type="password"
                    placeholder="Enter your new password"
                    value={pw.newPassword}
                    onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className="block min-w-0">
                  <span className={labelSpanCls}>Confirm New Password</span>
                  <input
                    type="password"
                    placeholder="Re-enter your new password"
                    value={pw.confirmPassword}
                    onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-200/80 dark:border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-geometric font-medium disabled:opacity-50 inline-flex items-center gap-2 active:scale-95 transition"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-geometric font-medium text-zinc-950 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
                <span>Session &amp; Credential Security</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Your session is protected with end-to-end encrypted HTTP cookies and JSON Web Tokens. Passwords are salted and hashed using industry-standard bcrypt protocols.
              </p>
            </div>
          </div>
        )}

        {view === "notifications" && <NotificationPrefs />}

        {view === "share_progress" && <ShareProgressSection setMsg={setMsg} />}

        {view === "privacy" && (
          <div className="space-y-4">
            <dl className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#141414] divide-y divide-zinc-200/70 dark:divide-white/10 text-xs overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <dt className="text-zinc-500 dark:text-zinc-400">Registered Email</dt>
                <dd className="font-medium text-zinc-950 dark:text-white truncate">
                  {user.email}
                </dd>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <dt className="text-zinc-500 dark:text-zinc-400">Account Status</dt>
                <dd className="inline-flex items-center gap-1.5 font-medium capitalize text-zinc-950 dark:text-zinc-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{user.status.toLowerCase()}</span>
                </dd>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <dt className="text-zinc-500 dark:text-zinc-400">Member Since</dt>
                <dd className="font-medium text-zinc-950 dark:text-white">
                  {formatDateWib(user.createdAt)}
                </dd>
              </div>
            </dl>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#141414] divide-y divide-zinc-200/70 dark:divide-white/10 overflow-hidden">
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white">
                    Export Wellness Account Data
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Download a complete machine-readable JSON archive of your personal profile, contacts, and account metadata.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="h-9 px-4 rounded-full border border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/5 text-xs font-geometric font-medium text-zinc-900 dark:text-white inline-flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Data (.json)</span>
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white">
                    Local Storage &amp; Cache Manager
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Clear temporary offline cached images and sessions to free local storage on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="h-9 px-4 rounded-full border border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/5 text-xs font-geometric font-medium text-zinc-900 dark:text-white inline-flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Local Cache</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "account" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#141414] space-y-2.5">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <h3 className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white">
                  Concierge &amp; Technical Support
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Have questions regarding your cohort schedule, exercises, or account access? Our concierge team is standing by to help.
              </p>
              <a
                href="mailto:support@wellness.com?subject=Wellness%20Account%20Inquiry"
                className="inline-flex items-center gap-1.5 text-xs font-geometric font-medium text-zinc-950 dark:text-white underline hover:opacity-80"
              >
                <span>Contact Concierge Desk</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#141414] divide-y divide-zinc-200/70 dark:divide-white/10 overflow-hidden">
              <button
                type="button"
                onClick={onLogout}
                className="w-full px-4 sm:px-5 py-4 hover:bg-zinc-50 dark:hover:bg-white/[0.03] text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white flex items-center justify-between transition"
              >
                <span className="inline-flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 text-zinc-500" />
                  <span>Sign Out of Account</span>
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={onDeleteAccount}
                className="w-full px-4 sm:px-5 py-4 hover:bg-red-50/60 dark:hover:bg-red-950/20 text-xs sm:text-sm font-geometric font-medium text-red-600 dark:text-red-400 flex items-center justify-between transition"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account Permanently</span>
                </span>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
