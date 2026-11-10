"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ChevronRight, Loader2, LogOut, Trash2, User as UserIcon } from "lucide-react";
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
  "w-full px-3.5 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-300 dark:border-white/15 text-base sm:text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-600";

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
    setSaving(true);
    setMsg(null);
    try {
      const dataUrl = await resizeToAvatar(file, 1080);
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, type: key }) });
      const data = await res.json();
      if (!data.success || !data.url) throw new Error(data.message || "Upload failed.");
      const field = key === "front" ? "photoFrontUrl" : key === "side" ? "photoSideUrl" : "photoBackUrl";
      setHealthForm((h) => ({ ...h, [field]: data.url }));
      setMsg({ type: "success", text: "Photo uploaded. Save changes to keep it." });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setSaving(false);
    }
  };

  const num = (key: keyof HealthProfileData, label: string) => (
    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
      {label}
      <input
        inputMode="decimal"
        value={healthForm[key] ?? ""}
        onChange={(e) => setHealthForm((h) => ({ ...h, [key]: e.target.value === "" ? null : Number(e.target.value) }))}
        className={`${inputCls} mt-1.5`}
      />
    </label>
  );

  const text = (key: keyof HealthProfileData, label: string, area = false) => (
    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
      {label}
      {area ? (
        <textarea value={String(healthForm[key] || "")} onChange={(e) => setHealthForm((h) => ({ ...h, [key]: e.target.value }))} rows={4} className={`${inputCls} mt-1.5`} />
      ) : (
        <input value={String(healthForm[key] || "")} onChange={(e) => setHealthForm((h) => ({ ...h, [key]: e.target.value }))} className={`${inputCls} mt-1.5`} />
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
          <button type="button" onClick={() => { setView(null); setMsg(null); }} className="inline-flex items-center gap-1.5 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> {TITLES[view]}
          </button>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </div>
            <span className="text-sm truncate">{user.email}</span>
          </div>
        )}
      </FloatingHeader>

      {!view && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {menu.map((group) => (
            <section key={group.title} className="space-y-2">
              <div className="px-1 flex items-center justify-between">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500">{group.title}</h2>
                {group.pct !== null && <span className="text-[11px] font-semibold text-zinc-500">{group.pct}%</span>}
              </div>
              <div className="rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/10 overflow-hidden">
                {group.items.map(([id, label]) => (
                  <button key={id} type="button" onClick={() => { setMsg(null); setView(id); }} className="w-full px-5 py-4 flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
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
          {view === "basic" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <button type="button" disabled={avatarBusy} onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-full border text-xs inline-flex items-center gap-1.5">
                  {avatarBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />} Profile picture
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0])} />
              </div>
              <label className="block text-xs font-semibold">Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">Date of birth<input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">Gender
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={`${inputCls} mt-1.5`}>
                  <option value="">Not specified</option>
                  {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <Save busy={saving} onClick={saveProfile} />
            </div>
          )}
          {view === "contact" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold">Email address<input value={user.email} disabled className={`${inputCls} mt-1.5 opacity-70`} /></label>
              <label className="block text-xs font-semibold">Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">Address<textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">Province<input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <Save busy={saving} onClick={saveProfile} />
            </div>
          )}
          {view === "emergency" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold">Contact person<input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">Emergency phone number<input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <Save busy={saving} onClick={saveProfile} />
            </div>
          )}
          {view === "body" && (
            <div className="space-y-3">
              {num("heightCm", "Height (cm)")}
              {num("weightKg", "Weight (kg)")}
              {num("waistCm", "Waist (cm)")}
              {num("chestCm", "Chest (cm)")}
              {num("hipsCm", "Hips (cm)")}
              <div className="grid grid-cols-3 gap-2">
                {(["front", "side", "back"] as const).map((key) => (
                  <label key={key} className="text-[11px] text-center">
                    <span className="block capitalize mb-1">{key}</span>
                    <input type="file" accept="image/*" className="text-[10px]" onChange={(e) => e.target.files?.[0] && uploadBodyPhoto(key, e.target.files[0])} />
                  </label>
                ))}
              </div>
              <Save busy={saving} onClick={saveHealth} />
            </div>
          )}
          {view === "health" && (
            <div className="space-y-3">
              {text("injuriesOrConditions", "Medical history and conditions", true)}
              {text("currentMood", "Current mood")}
              {num("energyLevel", "Energy level (1–10)")}
              <Save busy={saving} onClick={saveHealth} />
            </div>
          )}
          {view === "fitness" && (
            <div className="space-y-3">
              {text("workoutFrequency", "Current activity level")}
              {num("routineConfidence", "Routine confidence (1–5)")}
              {text("primaryGoal", "Fitness goals", true)}
              <Save busy={saving} onClick={saveHealth} />
            </div>
          )}
          {view === "nutrition" && (
            <div className="space-y-3">
              {text("dietType", "Dietary preferences")}
              {text("foodAllergies", "Allergies and restrictions", true)}
              {text("eatingPatterns", "Eating patterns", true)}
              <Save busy={saving} onClick={saveHealth} />
            </div>
          )}
          {view === "lifestyle" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold">Usual bedtime<input type="time" value={String(healthForm.averageBedtime || "")} onChange={(e) => setHealthForm((h) => ({ ...h, averageBedtime: e.target.value }))} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">Usual wake time<input type="time" value={String(healthForm.averageWakeTime || "")} onChange={(e) => setHealthForm((h) => ({ ...h, averageWakeTime: e.target.value }))} className={`${inputCls} mt-1.5`} /></label>
              {text("sleepQualityNotes", "Sleep habits", true)}
              <label className="block text-xs font-semibold">Daily occupation<input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <Save busy={saving} onClick={async () => { await saveHealth(); await saveProfile(); }} />
            </div>
          )}
          {view === "goals" && (
            <div className="space-y-3">
              {text("primaryGoal", "Personal goals", true)}
              {text("workoutFrequency", "Preferred activity rhythm")}
              {text("currentMood", "How you want coaching to feel")}
              <Save busy={saving} onClick={saveHealth} />
            </div>
          )}
          {view === "security" && (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setMsg(null);
                setSaving(true);
                try {
                  const res = await wellnessChangePassword(pw);
                  setMsg(res.success ? { type: "success", text: "Password updated." } : { type: "error", text: res.message || "Failed to update password." });
                  if (res.success) setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
                } finally {
                  setSaving(false);
                }
              }}
            >
              <label className="block text-xs font-semibold">Current password<input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">New password<input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <label className="block text-xs font-semibold">Confirm new password<input type="password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} className={`${inputCls} mt-1.5`} /></label>
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-50">Save changes</button>
            </form>
          )}
          {view === "notifications" && <NotificationPrefs />}
          {view === "privacy" && (
            <dl className="rounded-3xl border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/10 text-sm">
              <div className="px-4 py-3 flex justify-between gap-3"><dt className="text-zinc-500">Email</dt><dd>{user.email}</dd></div>
              <div className="px-4 py-3 flex justify-between gap-3"><dt className="text-zinc-500">Account status</dt><dd className="capitalize">{user.status.toLowerCase()}</dd></div>
              <div className="px-4 py-3 flex justify-between gap-3"><dt className="text-zinc-500">Member since</dt><dd>{formatDateWib(user.createdAt)}</dd></div>
            </dl>
          )}
          {view === "account" && (
            <div className="space-y-2">
              <button type="button" onClick={onLogout} className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 text-sm flex items-center gap-2"><LogOut className="w-4 h-4" /> Logout</button>
              <button type="button" onClick={onDeleteAccount} className="w-full px-4 py-3 rounded-2xl border border-red-200 text-red-600 text-sm flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete account</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Save({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2">
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save changes
    </button>
  );
}

function NotificationPrefs() {
  const push = usePushNotifications();
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">Notifications are {push.status === "on" ? "on" : "off"} for this device.</p>
      <p className="text-xs text-zinc-500">Message and delivery time follow the program schedule in WIB (Asia/Jakarta).</p>
      {(push.status === "on" || push.status === "off" || push.status === "checking") && (
        <button type="button" disabled={push.busy || push.status === "checking"} onClick={push.status === "on" ? push.disable : push.enable} className="px-4 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase">
          {push.status === "on" ? "Turn Off Notification" : "Turn On Notification"}
        </button>
      )}
      {push.status === "denied" && <p className="text-xs text-red-600">Notifications are blocked in the browser settings.</p>}
      {push.error && <p className="text-xs text-red-600">{push.error}</p>}
    </div>
  );
}
