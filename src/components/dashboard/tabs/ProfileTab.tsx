"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Download,
  KeyRound,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { wellnessChangePassword, wellnessUpdateProfile } from "@/wellness/actions/account";
import { GENDER_OPTIONS, calculateAgeFromDob } from "@/wellness/validators/auth";
import { usePushNotifications } from "./usePushNotifications";
import { FloatingHeader, formatDateWib } from "./shared";

export interface ProfileUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status: string;
  createdAt: Date | string;
}

export interface HealthProfileData {
  photoFrontUrl?: string | null;
  photoSideUrl?: string | null;
  photoBackUrl?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  hipsCm?: number | null;
  dietType?: string | null;
  foodAllergies?: string | null;
  injuriesOrConditions?: string | null;
  primaryGoal?: string | null;
  currentMood?: string | null;
  energyLevel?: number | null;
  routineConfidence?: number | null;
  workoutFrequency?: string | null;
  averageBedtime?: string | null;
  averageWakeTime?: string | null;
  sleepQualityNotes?: string | null;
  eatingPatterns?: string | null;
}

type Msg = { type: "success" | "error"; text: string } | null;
type View =
  | "basic"
  | "contact"
  | "emergency"
  | "security"
  | "notifications"
  | "privacy"
  | "account";

const inputCls =
  "w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-[2px] bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white transition";

const labelSpanCls = "block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5";

function filled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function percent(values: unknown[]) {
  if (!values.length) return 0;
  return Math.round((values.filter(filled).length / values.length) * 100);
}

function Banner({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      role={msg.type === "error" ? "alert" : "status"}
      className={`text-xs px-3.5 py-2.5 rounded-[2px] border font-mono ${
        msg.type === "error"
          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40"
          : "bg-zinc-900/5 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-zinc-100 dark:border-white/20"
      }`}
    >
      {msg.text}
    </p>
  );
}

function resizeToAvatar(file: File, size = 384): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("This file is not a valid image."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Image processing is not supported."));
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const TITLES: Record<View, string> = {
  basic: "Basic Information",
  contact: "Contact Details",
  emergency: "Emergency Contact",
  security: "Login & Security",
  notifications: "Notification Preferences",
  privacy: "Privacy & Data Export",
  account: "Account & Support",
};

const SUBTITLES: Record<View, string> = {
  basic: "Manage your personal identity, date of birth, and avatar.",
  contact: "Keep your phone number and residential address updated.",
  emergency: "Designated point of contact for safety and cohort escalations.",
  security: "Update your account password, credentials, and authentication security.",
  notifications: "Configure push alerts, training reminders, and cohort updates.",
  privacy: "Review verification status, export your account data, and clear local cache.",
  account: "Concierge support, active session management, and account deletion.",
};

export function ProfileTab({
  user,
  health: _health,
  headerVisible,
  onLogout,
  onDeleteAccount,
}: {
  user: ProfileUser;
  health?: HealthProfileData | null;
  headerVisible: boolean;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  void _health;
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: user.fullName || "",
    phone: user.phone || "",
    dateOfBirth: user.dateOfBirth || "",
    gender: user.gender || "",
    occupation: user.occupation || "",
    address: user.address || "",
    city: user.city || "",
    province: user.province || "",
    emergencyContactName: user.emergencyContactName || "",
    emergencyContactPhone: user.emergencyContactPhone || "",
  });

  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const personalPct = percent([
    form.fullName,
    form.dateOfBirth,
    form.gender,
    avatarUrl,
    user.email,
    form.phone,
    form.address,
    form.emergencyContactName,
    form.emergencyContactPhone,
  ]);

  const saveProfile = async () => {
    setMsg(null);
    const name = form.fullName.trim();
    if (name.length < 3) return setMsg({ type: "error", text: "Full name must be at least 3 characters." });
    if (form.dateOfBirth) {
      const age = calculateAgeFromDob(form.dateOfBirth);
      if (age < 10 || age > 120) return setMsg({ type: "error", text: "Enter a realistic date of birth." });
    }
    setSaving(true);
    try {
      const res = await wellnessUpdateProfile({
        fullName: name,
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || "",
        gender: form.gender || "",
        occupation: form.occupation.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
      });
      if (!res.success) {
        setMsg({ type: "error", text: res.message || "Failed to save." });
        return;
      }
      setMsg({ type: "success", text: "Changes saved successfully." });
      router.refresh();
    } catch {
      setMsg({ type: "error", text: "Connection error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setMsg(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return setMsg({ type: "error", text: "Please choose a JPEG, PNG, or WebP image." });
    }
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeToAvatar(file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || "Upload failed.");
      setAvatarUrl(json.avatarUrl);
      setMsg({ type: "success", text: "Profile picture updated." });
      router.refresh();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleExportData = () => {
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        fullName: form.fullName,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        occupation: form.occupation,
        address: form.address,
        city: form.city,
        province: form.province,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        status: user.status,
        createdAt: user.createdAt,
      },
      exportedAt: new Date().toISOString(),
      platform: "BMS Wellness PWA",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness-profile-${user.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ type: "success", text: "Profile data archive exported successfully." });
  };

  const handleClearCache = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      try {
        localStorage.removeItem("wellness_cached_feed");
        sessionStorage.clear();
      } catch {
        // ignore
      }
      setMsg({ type: "success", text: "Local cache and temporary storage successfully cleared." });
    } catch {
      setMsg({ type: "error", text: "Failed to clear browser cache." });
    }
  };

  const menu = useMemo(
    () => [
      {
        title: "Personal Information",
        pct: personalPct,
        items: [
          ["basic", "Basic Information", "Full name, date of birth, gender, and avatar"],
          ["contact", "Contact Details", "Phone number, email, and living address"],
          ["emergency", "Emergency Contact", "Primary contact for urgent cohort matters"],
        ] as const,
      },
      {
        title: "Account & Security",
        pct: null,
        items: [
          ["security", "Login & Security", "Password credentials and active session info"],
          ["notifications", "Notification Preferences", "Push alerts, reminders, and cohort updates"],
        ] as const,
      },
      {
        title: "Data & Management",
        pct: null,
        items: [
          ["privacy", "Privacy & Data Export", "Data export, account verification, and cache"],
          ["account", "Account & Support", "Concierge support, sign out, and deletion"],
        ] as const,
      },
    ],
    [personalPct]
  );

  return (
    <>
      <FloatingHeader visible={headerVisible}>
        {view ? (
          <button
            type="button"
            onClick={() => {
              setView(null);
              setMsg(null);
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{TITLES[view]}</span>
          </button>
        ) : (
          <div className="flex items-center justify-between w-full min-w-0">
            <span className="font-geometric font-semibold text-xs tracking-[0.2em] uppercase text-zinc-950 dark:text-white">
              Profile & Settings
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[180px] sm:max-w-xs">
                {form.fullName || user.email}
              </span>
            </div>
          </div>
        )}
      </FloatingHeader>

      {!view && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Top Profile Image Banner */}
          <section className="overflow-hidden rounded-[2px] sm:rounded-[2px] bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-sm relative">
            <div className="relative aspect-[16/7] sm:aspect-[21/9] min-h-[170px] sm:min-h-[200px] w-full flex items-end">
              {/* Background Cover Image with atmospheric luxury dark overlay */}
              <div className="absolute inset-0 z-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/image.webp"
                  alt=""
                  className="w-full h-full object-cover opacity-60 scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/35" />
              </div>

              {/* Top Badges */}
              <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10 pointer-events-none">
                <span className="px-2.5 py-1 rounded-[2px] bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono font-semibold uppercase tracking-wider text-white inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active Member</span>
                </span>
                <span className="px-2.5 py-1 rounded-[2px] bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-zinc-300">
                  Joined {new Date(user.createdAt).getFullYear()}
                </span>
              </div>

              {/* Profile Photo & Identity Banner Content */}
              <div className="relative z-10 p-4 sm:p-6 w-full flex items-end justify-between gap-4">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  {/* Avatar with Camera Quick Upload */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[2px] overflow-hidden bg-zinc-800 border-2 border-white/90 dark:border-white/20 shadow-2xl flex items-center justify-center">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={form.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-8 h-8 text-white/60" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setView("basic");
                        setTimeout(() => fileRef.current?.click(), 150);
                      }}
                      title="Update profile picture"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-[2px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/20 shadow-md flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:scale-105 active:scale-95 transition"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Name, email, occupation */}
                  <div className="min-w-0 text-white drop-shadow-sm space-y-0.5">
                    <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate leading-snug">
                      {form.fullName || "Member Profile"}
                    </h1>
                    <p className="text-xs text-white/80 font-mono truncate">{user.email}</p>
                    {form.occupation && (
                      <p className="text-[11px] text-zinc-300 truncate">{form.occupation}</p>
                    )}
                  </div>
                </div>

                {/* Edit Profile Quick Button */}
                <button
                  type="button"
                  onClick={() => {
                    setMsg(null);
                    setView("basic");
                  }}
                  className="shrink-0 hidden sm:inline-flex px-3.5 py-1.5 rounded-[2px] bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 text-white text-xs font-semibold tracking-wide uppercase transition active:scale-95"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </section>

          {/* Settings Menus */}
          {menu.map((group) => (
            <section key={group.title} className="space-y-2">
              <div className="px-1 flex items-center justify-between">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.18em] font-semibold text-zinc-500">
                  {group.title}
                </h2>
                {group.pct !== null && (
                  <span className="text-[11px] font-mono font-semibold text-zinc-500">
                    {group.pct}% Complete
                  </span>
                )}
              </div>
              <div className="rounded-[2px] bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/10 overflow-hidden">
                {group.items.map(([id, label, desc]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMsg(null);
                      setView(id);
                    }}
                    className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition">
                        {label}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view && (
        <div className="max-w-xl mx-auto space-y-4">
          <Banner msg={msg} />

          <div className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] p-4 sm:p-6 space-y-5">
            {/* Clean Section Header */}
            <div className="pb-3 border-b border-zinc-100 dark:border-white/10 space-y-0.5">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                {TITLES[view]}
              </h2>
              <p className="text-xs text-zinc-500">{SUBTITLES[view]}</p>
            </div>

            {/* 1. BASIC INFORMATION */}
            {view === "basic" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-[2px] bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-[2px] overflow-hidden bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white">Profile Picture</p>
                      <p className="text-[11px] text-zinc-500">JPEG, PNG, or WebP</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => fileRef.current?.click()}
                    className="h-9 px-3.5 rounded-[2px] border border-zinc-300 dark:border-white/20 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 shrink-0 hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95"
                  >
                    {avatarBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
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

                <label className="block min-w-0">
                  <span className={labelSpanCls}>Full Name</span>
                  <input
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveProfile} />
                </div>
              </div>
            )}

            {/* 2. CONTACT DETAILS */}
            {view === "contact" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-[2px] bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-zinc-500">Registered Email</p>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-mono font-medium">
                    Verified
                  </span>
                </div>

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveProfile} />
                </div>
              </div>
            )}

            {/* 3. EMERGENCY CONTACT */}
            {view === "emergency" && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">
                  Provide an emergency contact for escalations during in-person events or urgent health inquiries.
                </p>

                <label className="block min-w-0">
                  <span className={labelSpanCls}>Emergency Contact Name</span>
                  <input
                    placeholder="e.g. Jane Doe (Spouse)"
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveProfile} />
                </div>
              </div>
            )}

            {/* 4. LOGIN & SECURITY */}
            {view === "security" && (
              <div className="space-y-5">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                  <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-10 px-5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2 active:scale-95 transition"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>

                <div className="p-4 rounded-[2px] bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-950 dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Session & Credential Security</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Your session is protected with end-to-end encrypted HTTP cookies and JSON Web Tokens. Passwords are salted and hashed using industry-standard bcrypt protocols.
                  </p>
                </div>
              </div>
            )}

            {/* 5. NOTIFICATION PREFERENCES */}
            {view === "notifications" && <NotificationPrefs />}

            {/* 6. PRIVACY & DATA EXPORT */}
            {view === "privacy" && (
              <div className="space-y-4">
                <dl className="rounded-[2px] border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] divide-y divide-zinc-200/60 dark:divide-white/10 text-xs">
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <dt className="text-zinc-500">Registered Email</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-white truncate">{user.email}</dd>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <dt className="text-zinc-500">Account Status</dt>
                    <dd className="inline-flex items-center gap-1.5 font-semibold capitalize text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{user.status.toLowerCase()}</span>
                    </dd>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <dt className="text-zinc-500">Member Since</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-white">
                      {formatDateWib(user.createdAt)}
                    </dd>
                  </div>
                </dl>

                <div className="p-4 rounded-[2px] border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-950 dark:text-white">
                      Export Wellness Account Data
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Download a complete machine-readable JSON archive of your personal profile, contacts, and account metadata.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="h-9 px-4 rounded-[2px] border border-zinc-300 dark:border-white/20 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Data (.json)</span>
                  </button>
                </div>

                <div className="p-4 rounded-[2px] border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-950 dark:text-white">
                      Local Storage & Cache Manager
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Clear temporary offline cached images and sessions to free local storage on this device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="h-9 px-4 rounded-[2px] border border-zinc-300 dark:border-white/20 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Local Cache</span>
                  </button>
                </div>
              </div>
            )}

            {/* 7. ACCOUNT MANAGEMENT & SUPPORT */}
            {view === "account" && (
              <div className="space-y-4">
                {/* Concierge Support Card */}
                <div className="p-4 rounded-[2px] border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <h3 className="text-xs font-semibold text-zinc-950 dark:text-white">
                      Concierge & Technical Support
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Have questions regarding your cohort schedule, exercises, or account access? Our concierge team is standing by to help.
                  </p>
                  <a
                    href="mailto:support@wellness.com?subject=Wellness%20Account%20Inquiry"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white underline hover:opacity-80"
                  >
                    <span>Contact Concierge Desk</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full px-4 py-3.5 rounded-[2px] border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white flex items-center justify-between transition"
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
                    className="w-full px-4 py-3.5 rounded-[2px] border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-950/40 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 flex items-center justify-between transition"
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
      )}
    </>
  );
}

function Save({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="h-10 px-5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95 transition shadow-sm"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      <span>Save Changes</span>
    </button>
  );
}

function NotificationPrefs() {
  const push = usePushNotifications();
  const isOn = push.status === "on";
  const [dailyReminders, setDailyReminders] = useState(true);
  const [communityUpdates, setCommunityUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const handleTogglePush = () => {
    if (push.busy) return;
    if (isOn) {
      push.disable();
    } else {
      push.enable();
    }
  };

  return (
    <div className="space-y-4">
      {/* Push Notifications Toggle */}
      <div className="p-4 rounded-[2px] bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[2px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">Push Notifications</p>
            <p className="text-[11px] text-zinc-500">Instant device alerts for daily tasks</p>
          </div>
        </div>
        <button
          type="button"
          disabled={push.busy}
          onClick={handleTogglePush}
          aria-checked={isOn}
          role="switch"
          className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
            isOn ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
          } ${push.busy ? "opacity-50" : ""}`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white dark:bg-zinc-950 shadow-sm transition-transform duration-200 ease-in-out ${
              isOn ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Routine Reminders */}
      <div className="p-4 rounded-[2px] bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">Daily Task Reminders</p>
            <p className="text-[11px] text-zinc-500">Morning cue for training and check-in</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDailyReminders((v) => !v)}
          aria-checked={dailyReminders}
          role="switch"
          className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
            dailyReminders ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white dark:bg-zinc-950 shadow-sm transition-transform duration-200 ease-in-out ${
              dailyReminders ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Cohort Community Announcements */}
      <div className="p-4 rounded-[2px] bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">Cohort & Meetup Alerts</p>
            <p className="text-[11px] text-zinc-500">Broadcasts for scheduled connects</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCommunityUpdates((v) => !v)}
          aria-checked={communityUpdates}
          role="switch"
          className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
            communityUpdates ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white dark:bg-zinc-950 shadow-sm transition-transform duration-200 ease-in-out ${
              communityUpdates ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Weekly Progress Digest */}
      <div className="p-4 rounded-[2px] bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">Weekly Performance Digest</p>
            <p className="text-[11px] text-zinc-500">Summary of completion rates and streak</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWeeklyDigest((v) => !v)}
          aria-checked={weeklyDigest}
          role="switch"
          className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
            weeklyDigest ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white dark:bg-zinc-950 shadow-sm transition-transform duration-200 ease-in-out ${
              weeklyDigest ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
