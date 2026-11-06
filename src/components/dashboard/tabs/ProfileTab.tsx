"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  HeartPulse,
  Loader2,
  LogOut,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { wellnessChangePassword, wellnessUpdateProfile } from "@/wellness/actions/account";
import { GENDER_OPTIONS, calculateAgeFromDob } from "@/wellness/validators/auth";
import { FloatingHeader, formatDateWib } from "./shared";

export interface ProfileUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  dateOfBirth?: string | null; // YYYY-MM-DD
  avatarUrl?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  status: string;
  createdAt: Date | string;
}

type Msg = { type: "success" | "error"; text: string } | null;

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-300 dark:border-white/15 text-xs text-zinc-950 dark:text-white outline-none focus:border-zinc-600 dark:focus:border-white/50";

function Avatar({ src, label, size }: { src?: string | null; label: string; size: string }) {
  return (
    <div
      className={`${size} rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-white/20 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Profile picture" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-semibold uppercase text-zinc-700 dark:text-zinc-200">
          {label.charAt(0) || <UserIcon className="w-4 h-4" />}
        </span>
      )}
    </div>
  );
}

function FieldError({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-1 text-[11px] text-red-600 dark:text-red-400">
      {text}
    </p>
  ) : null;
}

function Banner({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      role={msg.type === "error" ? "alert" : "status"}
      className={`text-xs px-3 py-2 rounded-xl ${
        msg.type === "error"
          ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
      }`}
    >
      {msg.text}
    </p>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm divide-y divide-zinc-100 dark:divide-white/10 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  open,
  onToggle,
  danger,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  open?: boolean;
  onToggle: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={children ? !!open : undefined}
        className={`w-full px-5 py-4 flex items-center justify-between gap-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/5 transition ${
          danger ? "text-red-600 dark:text-red-400" : "text-zinc-950 dark:text-white"
        }`}
      >
        <span className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{label}</span>
        </span>
        {children && (
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && children && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

/** Downscale + center-crop to a small square JPEG so uploads stay tiny. */
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

type OpenPanel = "account" | "password" | "personal" | null;

export function ProfileTab({
  user,
  headerVisible,
  onLogout,
  onOpenHealthProfile,
  onDeleteAccount,
}: {
  user: ProfileUser;
  headerVisible: boolean;
  onLogout: () => void;
  onOpenHealthProfile: () => void;
  onDeleteAccount: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<OpenPanel>("personal");
  const toggle = (p: Exclude<OpenPanel, null>) => setOpen((cur) => (cur === p ? null : p));

  /* ---------------- avatar ---------------- */
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarMsg(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setAvatarMsg({ type: "error", text: "Please choose a JPEG, PNG, or WebP image." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarMsg({ type: "error", text: "Image is too large. Choose a file under 10 MB." });
      return;
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
      setAvatarMsg({ type: "success", text: "Profile picture updated." });
      router.refresh();
    } catch (err) {
      setAvatarMsg({ type: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onRemoveAvatar = async () => {
    setAvatarBusy(true);
    setAvatarMsg(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to remove picture.");
      setAvatarUrl(null);
      router.refresh();
    } catch (err) {
      setAvatarMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to remove picture." });
    } finally {
      setAvatarBusy(false);
    }
  };

  /* ---------------- personal information ---------------- */
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    phone: user.phone || "",
    dateOfBirth: user.dateOfBirth || "",
    gender: user.gender || "",
    address: user.address || "",
    city: user.city || "",
    province: user.province || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<Msg>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    const name = form.fullName.trim();
    if (name.length < 3) e.fullName = "Full name must be at least 3 characters.";
    else if (name.length > 60) e.fullName = "Full name cannot exceed 60 characters.";

    const phone = form.phone.trim();
    if (phone) {
      if (!/^[0-9+\s-]*$/.test(phone)) e.phone = "Phone may only contain digits, +, spaces, or hyphens.";
      else if (phone.length < 10 || phone.length > 18) e.phone = "Phone number must be 10–18 characters.";
    }

    if (form.dateOfBirth) {
      const dob = new Date(`${form.dateOfBirth}T00:00:00Z`);
      if (isNaN(dob.getTime())) e.dateOfBirth = "Enter a valid date.";
      else {
        const age = calculateAgeFromDob(form.dateOfBirth);
        if (dob.getTime() > Date.now() || age < 10) e.dateOfBirth = "You must be at least 10 years old.";
        else if (age > 120) e.dateOfBirth = "Enter a realistic date of birth.";
      }
    }
    if (form.gender && !(GENDER_OPTIONS as readonly string[]).includes(form.gender)) {
      e.gender = "Choose one of the listed options.";
    }
    if (form.address.length > 255) e.address = "Address cannot exceed 255 characters.";
    if (form.city.length > 100) e.city = "City cannot exceed 100 characters.";
    if (form.province.length > 100) e.province = "Province cannot exceed 100 characters.";
    return e;
  };

  const onSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaveMsg(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      const res = await wellnessUpdateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || "",
        gender: form.gender || "",
        address: form.address.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
      });
      if (res.success) {
        setSaveMsg({ type: "success", text: "Personal information saved." });
        router.refresh();
      } else {
        const serverErrors: Record<string, string> = {};
        Object.entries(res.errors ?? {}).forEach(([k, v]) => {
          if (v?.[0]) serverErrors[k] = v[0];
        });
        setErrors(serverErrors);
        setSaveMsg({ type: "error", text: res.message || "Failed to save." });
      }
    } catch {
      setSaveMsg({ type: "error", text: "Connection error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- change password ---------------- */
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  const onChangePassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setPwMsg(null);
    if (!pw.currentPassword) return setPwMsg({ type: "error", text: "Enter your current password." });
    if (pw.newPassword.length < 8 || !/[A-Z]/.test(pw.newPassword) || !/\d/.test(pw.newPassword)) {
      return setPwMsg({
        type: "error",
        text: "New password needs at least 8 characters, 1 uppercase letter and 1 number.",
      });
    }
    if (pw.newPassword !== pw.confirmPassword) {
      return setPwMsg({ type: "error", text: "New passwords do not match." });
    }
    if (pw.newPassword === pw.currentPassword) {
      return setPwMsg({ type: "error", text: "New password must differ from the current one." });
    }
    setPwBusy(true);
    try {
      const res = await wellnessChangePassword(pw);
      if (res.success) {
        setPwMsg({ type: "success", text: "Password updated. Other devices were signed out." });
        setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPwMsg({ type: "error", text: res.message || "Failed to update password." });
      }
    } catch {
      setPwMsg({ type: "error", text: "Connection error. Please try again." });
    } finally {
      setPwBusy(false);
    }
  };

  const label = (text: string, htmlFor: string) => (
    <label htmlFor={htmlFor} className="block mb-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
      {text}
    </label>
  );

  return (
    <>
      {/* HEADER: profile picture + email only */}
      <FloatingHeader visible={headerVisible}>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={avatarUrl} label={user.fullName || user.email} size="w-9 h-9" />
          <span className="text-xs sm:text-sm font-medium text-zinc-950 dark:text-white truncate">
            {user.email}
          </span>
        </div>
      </FloatingHeader>

      <div className="space-y-6 font-mono max-w-2xl mx-auto">
        <Group title="Account Settings">
          <Row
            icon={<UserIcon className="w-4 h-4" />}
            label="Account information"
            open={open === "account"}
            onToggle={() => toggle("account")}
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              <dt className="text-zinc-500">Email</dt>
              <dd className="text-zinc-950 dark:text-white break-all">{user.email}</dd>
              <dt className="text-zinc-500">Status</dt>
              <dd className="text-zinc-950 dark:text-white capitalize">{user.status.toLowerCase()}</dd>
              <dt className="text-zinc-500">Member since</dt>
              <dd className="text-zinc-950 dark:text-white">{formatDateWib(user.createdAt)}</dd>
            </dl>
          </Row>

          <Row
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Change password"
            open={open === "password"}
            onToggle={() => toggle("password")}
          >
            <form onSubmit={onChangePassword} className="space-y-3" noValidate>
              <div>
                {label("Current password", "pw-current")}
                <input
                  id="pw-current"
                  type="password"
                  autoComplete="current-password"
                  value={pw.currentPassword}
                  onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                {label("New password", "pw-new")}
                <input
                  id="pw-new"
                  type="password"
                  autoComplete="new-password"
                  value={pw.newPassword}
                  onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                {label("Confirm new password", "pw-confirm")}
                <input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={pw.confirmPassword}
                  onChange={(e) => setPw((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <Banner msg={pwMsg} />
              <button
                type="submit"
                disabled={pwBusy}
                className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
              >
                {pwBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Update password
              </button>
            </form>
          </Row>

          <Row icon={<LogOut className="w-4 h-4" />} label="Logout" onToggle={onLogout} />
        </Group>

        <Group title="Personal Information">
          <Row
            icon={<UserIcon className="w-4 h-4" />}
            label="Edit personal information"
            open={open === "personal"}
            onToggle={() => toggle("personal")}
          >
            <form onSubmit={onSave} className="space-y-4" noValidate>
              <div className="flex items-center gap-4">
                <Avatar src={avatarUrl} label={user.fullName || user.email} size="w-16 h-16" />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => fileRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-full border border-zinc-300 dark:border-white/20 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {avatarBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {avatarUrl ? "Change picture" : "Upload picture"}
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        disabled={avatarBusy}
                        onClick={onRemoveAvatar}
                        className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-red-600 dark:text-red-400 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">JPEG, PNG or WebP. Cropped to a square automatically.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => onPickAvatar(e.target.files?.[0])}
                  />
                </div>
              </div>
              <Banner msg={avatarMsg} />

              <div>
                {label("Full name", "pi-name")}
                <input
                  id="pi-name"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  autoComplete="name"
                  maxLength={60}
                  className={inputCls}
                />
                <FieldError text={errors.fullName} />
              </div>

              <div>
                {label("Phone number", "pi-phone")}
                <input
                  id="pi-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  autoComplete="tel"
                  maxLength={18}
                  placeholder="+62 812 3456 7890"
                  className={inputCls}
                />
                <FieldError text={errors.phone} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {label("Date of birth", "pi-dob")}
                  <input
                    id="pi-dob"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className={inputCls}
                  />
                  <FieldError text={errors.dateOfBirth} />
                </div>
                <div>
                  {label("Gender (optional)", "pi-gender")}
                  <select
                    id="pi-gender"
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Not specified</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <FieldError text={errors.gender} />
                </div>
              </div>

              <div>
                {label("Address", "pi-address")}
                <textarea
                  id="pi-address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  autoComplete="street-address"
                  rows={2}
                  maxLength={255}
                  className={inputCls}
                />
                <FieldError text={errors.address} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {label("City", "pi-city")}
                  <input
                    id="pi-city"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    autoComplete="address-level2"
                    maxLength={100}
                    className={inputCls}
                  />
                  <FieldError text={errors.city} />
                </div>
                <div>
                  {label("Province", "pi-province")}
                  <input
                    id="pi-province"
                    value={form.province}
                    onChange={(e) => set("province", e.target.value)}
                    autoComplete="address-level1"
                    maxLength={100}
                    className={inputCls}
                  />
                  <FieldError text={errors.province} />
                </div>
              </div>

              <Banner msg={saveMsg} />
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save changes
              </button>
            </form>
          </Row>

          <Row
            icon={<HeartPulse className="w-4 h-4" />}
            label="Health & lifestyle profile"
            onToggle={onOpenHealthProfile}
          />
          <Row
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete account"
            danger
            onToggle={onDeleteAccount}
          />
        </Group>
      </div>
    </>
  );
}
