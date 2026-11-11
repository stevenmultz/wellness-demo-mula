"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { wellnessChangePassword, wellnessUpdateHealthProfile, wellnessUpdateProfile } from "@/wellness/actions/account";
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
  | "body"
  | "health"
  | "fitness"
  | "nutrition"
  | "lifestyle"
  | "goals"
  | "security"
  | "notifications"
  | "privacy"
  | "account";

const inputCls =
  "w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white transition";

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
      className={`text-xs px-3.5 py-2.5 rounded-xl border font-mono ${
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
  contact: "Contact Information",
  emergency: "Emergency Contact",
  body: "Body & Measurements",
  health: "Health Background",
  fitness: "Fitness Profile",
  nutrition: "Nutrition Profile",
  lifestyle: "Lifestyle Habits",
  goals: "Goals & Preferences",
  security: "Login & Security",
  notifications: "Notification Preferences",
  privacy: "Privacy Settings",
  account: "Account Management",
};

const SUBTITLES: Record<View, string> = {
  basic: "Manage your personal identity and profile avatar.",
  contact: "Update your phone number and residential address.",
  emergency: "Provide a trusted contact for urgent situations.",
  body: "Track your physical measurements and progress photos.",
  health: "Share your medical notes, mood, and baseline energy.",
  fitness: "Record your current activity level and routine confidence.",
  nutrition: "Log your dietary preferences, allergies, and meal habits.",
  lifestyle: "Set your typical sleep schedule and daily occupation.",
  goals: "Define your personal wellness outcomes and coaching rhythm.",
  security: "Update your account password to keep your profile secure.",
  notifications: "Control daily check-in reminders on this device.",
  privacy: "Review your account membership details and status.",
  account: "Sign out of your session or permanently remove your account.",
};

export function ProfileTab({
  user,
  health,
  headerVisible,
  onLogout,
  onDeleteAccount,
}: {
  user: ProfileUser;
  health: HealthProfileData;
  headerVisible: boolean;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
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
  const [healthForm, setHealthForm] = useState<HealthProfileData>({
    photoFrontUrl: health.photoFrontUrl || null,
    photoSideUrl: health.photoSideUrl || null,
    photoBackUrl: health.photoBackUrl || null,
    weightKg: health.weightKg ?? null,
    heightCm: health.heightCm ?? null,
    waistCm: health.waistCm ?? null,
    chestCm: health.chestCm ?? null,
    hipsCm: health.hipsCm ?? null,
    dietType: health.dietType || "",
    foodAllergies: health.foodAllergies || "",
    injuriesOrConditions: health.injuriesOrConditions || "",
    primaryGoal: health.primaryGoal || "",
    currentMood: health.currentMood || "",
    energyLevel: health.energyLevel ?? null,
    routineConfidence: health.routineConfidence ?? null,
    workoutFrequency: health.workoutFrequency || "",
    averageBedtime: health.averageBedtime || "",
    averageWakeTime: health.averageWakeTime || "",
    sleepQualityNotes: health.sleepQualityNotes || "",
    eatingPatterns: health.eatingPatterns || "",
  });
  const [saving, setSaving] = useState(false);
  const [photoUploadingKey, setPhotoUploadingKey] = useState<"front" | "side" | "back" | null>(null);
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
  const healthPct = percent([
    healthForm.weightKg,
    healthForm.heightCm,
    healthForm.waistCm,
    healthForm.chestCm,
    healthForm.hipsCm,
    healthForm.injuriesOrConditions,
    healthForm.dietType,
    healthForm.foodAllergies,
    healthForm.workoutFrequency,
    healthForm.primaryGoal,
    healthForm.averageBedtime,
    healthForm.averageWakeTime,
    healthForm.eatingPatterns,
    healthForm.currentMood,
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
      setMsg({ type: "success", text: "Changes saved." });
      router.refresh();
    } catch {
      setMsg({ type: "error", text: "Connection error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const saveHealth = async () => {
    setMsg(null);
    setSaving(true);
    try {
      const res = await wellnessUpdateHealthProfile({
        ...healthForm,
        weightKg: healthForm.weightKg ? Number(healthForm.weightKg) : null,
        heightCm: healthForm.heightCm ? Number(healthForm.heightCm) : null,
        waistCm: healthForm.waistCm ? Number(healthForm.waistCm) : null,
        chestCm: healthForm.chestCm ? Number(healthForm.chestCm) : null,
        hipsCm: healthForm.hipsCm ? Number(healthForm.hipsCm) : null,
        energyLevel: healthForm.energyLevel ? Number(healthForm.energyLevel) : null,
        routineConfidence: healthForm.routineConfidence ? Number(healthForm.routineConfidence) : null,
      });
      if (!res.success) {
        setMsg({ type: "error", text: res.message || "Failed to save." });
        return;
      }
      setMsg({ type: "success", text: "Changes saved." });
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
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setMsg({ type: "error", text: "Please choose a JPEG, PNG, or WebP image." });
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeToAvatar(file);
      const res = await fetch("/api/profile/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
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

  const uploadBodyPhoto = async (key: "front" | "side" | "back", file: File) => {
    setPhotoUploadingKey(key);
    setMsg(null);
    try {
      const dataUrl = await resizeToAvatar(file, 1080);
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, type: key }) });
      const data = await res.json();
      if (!data.success || !data.url) throw new Error(data.message || "Upload failed.");
      const field = key === "front" ? "photoFrontUrl" : key === "side" ? "photoSideUrl" : "photoBackUrl";
      setHealthForm((h) => ({ ...h, [field]: data.url }));
      setMsg({ type: "success", text: "Photo uploaded. Click Save Changes to keep it." });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setPhotoUploadingKey(null);
    }
  };

  const labelSpanCls = "block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5";

  const num = (key: keyof HealthProfileData, label: string, placeholder: string) => (
    <label className="block min-w-0">
      <span className={labelSpanCls}>{label}</span>
      <input
        inputMode="decimal"
        placeholder={placeholder}
        value={healthForm[key] ?? ""}
        onChange={(e) => setHealthForm((h) => ({ ...h, [key]: e.target.value === "" ? null : Number(e.target.value) }))}
        className={inputCls}
      />
    </label>
  );

  const text = (key: keyof HealthProfileData, label: string, placeholder: string, area = false) => (
    <label className="block min-w-0">
      <span className={labelSpanCls}>{label}</span>
      {area ? (
        <textarea
          placeholder={placeholder}
          value={String(healthForm[key] || "")}
          onChange={(e) => setHealthForm((h) => ({ ...h, [key]: e.target.value }))}
          rows={3}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          placeholder={placeholder}
          value={String(healthForm[key] || "")}
          onChange={(e) => setHealthForm((h) => ({ ...h, [key]: e.target.value }))}
          className={inputCls}
        />
      )}
    </label>
  );

  const menu = useMemo(
    () => [
      {
        title: "Personal Information",
        pct: personalPct,
        items: [
          ["basic", "Basic Information"],
          ["contact", "Contact Information"],
          ["emergency", "Emergency Contact"],
        ] as const,
      },
      {
        title: "Health & Lifestyle Profile",
        pct: healthPct,
        items: [
          ["body", "Body & Measurements"],
          ["health", "Health Background"],
          ["fitness", "Fitness Profile"],
          ["nutrition", "Nutrition Profile"],
          ["lifestyle", "Lifestyle Habits"],
          ["goals", "Goals & Preferences"],
        ] as const,
      },
      {
        title: "Account Settings",
        pct: null,
        items: [
          ["security", "Login & Security"],
          ["notifications", "Notification Preferences"],
          ["privacy", "Privacy Settings"],
          ["account", "Account Management"],
        ] as const,
      },
    ],
    [personalPct, healthPct]
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                {form.fullName || "Member Profile"}
              </p>
              <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </FloatingHeader>

      {!view && (
        <div className="space-y-6 max-w-2xl mx-auto">
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
              <div className="rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/10 overflow-hidden">
                {group.items.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMsg(null);
                      setView(id);
                    }}
                    className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition"
                  >
                    <span>{label}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
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

          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-6 space-y-5">
            {/* Clean Section Header */}
            <div className="pb-3 border-b border-zinc-100 dark:border-white/10 space-y-0.5">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                {TITLES[view]}
              </h2>
              <p className="text-xs text-zinc-500">{SUBTITLES[view]}</p>
            </div>

            {view === "basic" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white">Profile Picture</p>
                      <p className="text-[11px] text-zinc-500">JPEG, PNG, or WebP image</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => fileRef.current?.click()}
                    className="h-9 px-3.5 rounded-full border border-zinc-300 dark:border-white/20 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 shrink-0 hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95"
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

                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveProfile} />
                </div>
              </div>
            )}

            {view === "contact" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <label className="block min-w-0">
                    <span className={labelSpanCls}>Email Address</span>
                    <input
                      value={user.email}
                      disabled
                      className={`${inputCls} opacity-60 cursor-not-allowed`}
                    />
                  </label>

                  <label className="block min-w-0">
                    <span className={labelSpanCls}>Phone Number</span>
                    <input
                      type="tel"
                      placeholder="Enter your phone number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                </div>

                <label className="block min-w-0">
                  <span className={labelSpanCls}>Residential Address</span>
                  <textarea
                    placeholder="Enter your full street address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <label className="block min-w-0">
                    <span className={labelSpanCls}>City</span>
                    <input
                      placeholder="Enter your city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className={inputCls}
                    />
                  </label>

                  <label className="block min-w-0">
                    <span className={labelSpanCls}>Province</span>
                    <input
                      placeholder="Enter your province"
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

            {view === "emergency" && (
              <div className="space-y-4">
                <label className="block min-w-0">
                  <span className={labelSpanCls}>Emergency Contact Name</span>
                  <input
                    placeholder="Enter emergency contact full name"
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className="block min-w-0">
                  <span className={labelSpanCls}>Emergency Contact Phone Number</span>
                  <input
                    type="tel"
                    placeholder="Enter emergency contact phone number"
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

            {view === "body" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  {num("heightCm", "Height (cm)", "Enter height in cm")}
                  {num("weightKg", "Weight (kg)", "Enter weight in kg")}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {num("waistCm", "Waist (cm)", "Enter waist")}
                  {num("chestCm", "Chest (cm)", "Enter chest")}
                  {num("hipsCm", "Hips (cm)", "Enter hips")}
                </div>

                <div className="space-y-2 pt-1">
                  <span className={labelSpanCls}>Body Posture & Progress Photos</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(["front", "side", "back"] as const).map((key) => {
                      const field =
                        key === "front"
                          ? "photoFrontUrl"
                          : key === "side"
                            ? "photoSideUrl"
                            : "photoBackUrl";
                      const currentUrl = healthForm[field];
                      const isUploading = photoUploadingKey === key;

                      return (
                        <label
                          key={key}
                          className="cursor-pointer rounded-xl border border-dashed border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-white/5 p-2.5 flex flex-col items-center justify-center gap-1.5 text-center hover:border-zinc-500 transition overflow-hidden"
                        >
                          {currentUrl ? (
                            <div className="w-full aspect-square rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={currentUrl} alt={key} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-full aspect-square rounded-lg bg-zinc-100 dark:bg-white/5 flex flex-col items-center justify-center gap-1 text-zinc-400">
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Camera className="w-4 h-4" />
                              )}
                              <span className="text-[10px] font-medium">Upload</span>
                            </div>
                          )}
                          <span className="text-[11px] font-semibold capitalize text-zinc-700 dark:text-zinc-300">
                            {key} View
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) =>
                              e.target.files?.[0] && uploadBodyPhoto(key, e.target.files[0])
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveHealth} />
                </div>
              </div>
            )}

            {view === "health" && (
              <div className="space-y-4">
                {text(
                  "injuriesOrConditions",
                  "Medical History & Physical Conditions",
                  "Enter any past injuries, joint sensitivities, or medical notes",
                  true
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {text("currentMood", "Current Mood", "Enter your current mood")}
                  {num("energyLevel", "Daily Energy Level (1–10)", "Enter a score from 1 to 10")}
                </div>
                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveHealth} />
                </div>
              </div>
            )}

            {view === "fitness" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {text(
                    "workoutFrequency",
                    "Current Activity Level",
                    "Enter your weekly workout frequency"
                  )}
                  {num(
                    "routineConfidence",
                    "Routine Confidence (1–5)",
                    "Enter a score from 1 to 5"
                  )}
                </div>
                {text(
                  "primaryGoal",
                  "Primary Fitness Goals",
                  "Enter your main physical and movement goals",
                  true
                )}
                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveHealth} />
                </div>
              </div>
            )}

            {view === "nutrition" && (
              <div className="space-y-4">
                {text(
                  "dietType",
                  "Dietary Preferences",
                  "Enter your preferred diet approach"
                )}
                {text(
                  "foodAllergies",
                  "Food Allergies & Restrictions",
                  "Enter any food allergies or intolerances",
                  true
                )}
                {text(
                  "eatingPatterns",
                  "Daily Eating Patterns",
                  "Enter your typical meal timing and hydration habits",
                  true
                )}
                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveHealth} />
                </div>
              </div>
            )}

            {view === "lifestyle" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block min-w-0">
                    <span className={labelSpanCls}>Usual Bedtime</span>
                    <input
                      type="time"
                      value={String(healthForm.averageBedtime || "")}
                      onChange={(e) =>
                        setHealthForm((h) => ({ ...h, averageBedtime: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className={labelSpanCls}>Usual Wake Time</span>
                    <input
                      type="time"
                      value={String(healthForm.averageWakeTime || "")}
                      onChange={(e) =>
                        setHealthForm((h) => ({ ...h, averageWakeTime: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </label>
                </div>

                {text(
                  "sleepQualityNotes",
                  "Sleep Habits & Recovery Notes",
                  "Enter notes about your sleep quality and evening wind-down routine",
                  true
                )}

                <label className="block min-w-0">
                  <span className={labelSpanCls}>Daily Occupation</span>
                  <input
                    placeholder="Enter your current occupation or daily role"
                    value={form.occupation}
                    onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save
                    busy={saving}
                    onClick={async () => {
                      await saveHealth();
                      await saveProfile();
                    }}
                  />
                </div>
              </div>
            )}

            {view === "goals" && (
              <div className="space-y-4">
                {text(
                  "primaryGoal",
                  "Personal Wellness Goals",
                  "Enter the long-term outcomes you want to achieve",
                  true
                )}
                {text(
                  "workoutFrequency",
                  "Preferred Activity Rhythm",
                  "Enter your preferred training schedule and pace"
                )}
                {text(
                  "currentMood",
                  "Desired Coaching Style",
                  "Enter how you would like your coaching experience to feel"
                )}
                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                  <Save busy={saving} onClick={saveHealth} />
                </div>
              </div>
            )}

            {view === "security" && (
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
                        ? { type: "success", text: "Password updated." }
                        : { type: "error", text: res.message || "Failed to update password." }
                    );
                    if (res.success)
                      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
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
                    className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2 active:scale-95 transition"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            )}

            {view === "notifications" && <NotificationPrefs />}

            {view === "privacy" && (
              <div className="space-y-3">
                <dl className="rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] divide-y divide-zinc-200/60 dark:divide-white/10 text-xs">
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
              </div>
            )}

            {view === "account" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white flex items-center justify-between transition"
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
                  className="w-full px-4 py-3.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-950/40 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 flex items-center justify-between transition"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account Permanently</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
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
      className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95 transition shadow-sm"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      <span>Save Changes</span>
    </button>
  );
}

function NotificationPrefs() {
  const push = usePushNotifications();
  const isOn = push.status === "on";
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">
              Push Notifications ({isOn ? "Enabled" : "Disabled"})
            </p>
            <p className="text-[11px] text-zinc-500">
              Daily reminders follow program schedule in WIB (UTC+7).
            </p>
          </div>
        </div>
        {(push.status === "on" || push.status === "off" || push.status === "checking") && (
          <button
            type="button"
            disabled={push.busy || push.status === "checking"}
            onClick={isOn ? push.disable : push.enable}
            className="h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider shrink-0 disabled:opacity-50 active:scale-95 transition"
          >
            {isOn ? "Turn Off" : "Turn On"}
          </button>
        )}
      </div>
      {push.status === "denied" && (
        <p className="text-xs text-red-600">
          Notifications are blocked in your browser settings. Please allow notifications for this site to enable reminders.
        </p>
      )}
      {push.error && <p className="text-xs text-red-600">{push.error}</p>}
    </div>
  );
}
