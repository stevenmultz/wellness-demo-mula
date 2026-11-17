"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { BodyProgressWidget, type BodyMetricPoint } from "./BodyProgressWidget";
import {
  ArrowRight,
  Camera,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";
import { wellnessUpdateProfile } from "@/wellness/actions/account";
import { calculateAgeFromDob } from "@/wellness/validators/auth";
import {
  BrandWordmark,
  FloatingHeader,
  HeaderBackButton,
  HeaderProfileButton,
} from "./shared";
import type { UserProfile } from "../types";
import {
  Banner,
  ProfileSectionView,
  type Msg,
  type PasswordFormState,
  type ProfileView,
} from "./profile/ProfileSectionForms";

export type ProfileUser = UserProfile;

function filled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function percent(values: unknown[]) {
  if (!values.length) return 0;
  return Math.round((values.filter(filled).length / values.length) * 100);
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

export function ProfileTab({
  user,
  bodyMetricLogs = [],
  headerVisible,
  viewMode,
  onChangeViewMode,
  onLogout,
  onDeleteAccount,
}: {
  user: ProfileUser;
  bodyMetricLogs?: BodyMetricPoint[];
  headerVisible: boolean;
  viewMode?: "intro" | "menu";
  onChangeViewMode?: (next: "intro" | "menu") => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [internalMode, setInternalMode] = useState<"intro" | "menu">("intro");
  const mode = viewMode ?? internalMode;
  const [view, setView] = useState<ProfileView | null>(null);
  useEffect(() => {
    if (viewMode === "intro") {
      setView(null);
      setMsg(null);
    }
  }, [viewMode]);
  const setMode = (next: "intro" | "menu") => {
    setInternalMode(next);
    onChangeViewMode?.(next);
    setView(null);
    setMsg(null);
    window.scrollTo({ top: 0 });
  };
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
  const [pw, setPw] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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
      platform: BRAND.platform,
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
          ["share_progress", "Share Progress", "Share read-only progress or view shared plans"],
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
      <FloatingHeader visible={headerVisible} transparent={!view && mode === "intro"}>
        {view ? (
          <HeaderBackButton
            onClick={() => {
              setView(null);
              setMsg(null);
            }}
          />
        ) : mode === "intro" ? (
          <>
            <BrandWordmark light />
            <HeaderProfileButton
              avatarUrl={avatarUrl}
              fullName={form.fullName || user.fullName}
              onClick={() => setMode("menu")}
            />
          </>
        ) : (
          <HeaderBackButton
            onClick={() => setMode("intro")}
            ariaLabel="Back to Profile overview"
          />
        )}
      </FloatingHeader>

      {!view && mode === "intro" && (
        <div className="relative flex-1 flex flex-col">
          {/* True Full-Viewport Background Image */}
          <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/coach3.webp"
              alt=""
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25" />
          </div>

          <div
            style={{ minHeight: "100dvh" }}
            className="relative z-10 w-full flex-1 flex flex-col justify-end gap-8 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="space-y-6 max-w-md">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-px bg-white/50" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
                    Account
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-geometric font-light tracking-tight text-white leading-[1.08] drop-shadow-xs">
                  Profile &amp; Settings
                </h1>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed max-w-sm">
                  Manage your personal details, security credentials, and account preferences.
                </p>
              </div>

              <div className="w-10 h-px bg-white/30" />

              <div>
                <button
                  type="button"
                  onClick={() => setMode("menu")}
                  className="group py-1 text-white hover:text-white/85 text-sm sm:text-base font-geometric font-medium inline-flex items-center gap-2.5 active:scale-95 transition drop-shadow-xs"
                >
                  <span>Open Profile &amp; Settings</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!view && mode === "menu" && (
        <div className="profile-detail-scope space-y-6 max-w-2xl w-full mx-auto pt-2 pb-10">
          {/* Top Profile Image Banner */}
          <section className="overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-200/80 dark:border-white/10 shadow-sm relative">
            <div className="relative aspect-[16/8] sm:aspect-[21/9] min-h-[180px] sm:min-h-[210px] w-full flex items-end">
              {/* Background Cover Image */}
              <div className="absolute inset-0 z-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/image.webp"
                  alt=""
                  className="w-full h-full object-cover opacity-55 scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
              </div>

              {/* Top Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-medium tracking-[0.02em] text-white inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>Active Member</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-mono text-zinc-300">
                  Joined {new Date(user.createdAt).getFullYear()}
                </span>
              </div>

              {/* Profile Photo & Identity Banner Content */}
              <div className="relative z-10 p-5 sm:p-6 w-full flex items-end justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar with Camera Quick Upload */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-zinc-800 border border-white/40 shadow-2xl flex items-center justify-center">
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
                      className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/20 shadow-md flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:scale-105 active:scale-95 transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Name, email, occupation */}
                  <div className="min-w-0 text-white drop-shadow-sm space-y-0.5">
                    <h1 className="text-lg sm:text-xl font-geometric font-medium tracking-tight truncate leading-snug">
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
                  className="shrink-0 hidden sm:inline-flex px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-[11px] font-geometric font-medium tracking-wider uppercase transition active:scale-95"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </section>

          {/* App Language Switcher */}
          <section className="space-y-2">
            <div className="px-1">
              <h2 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                {t.profile.languageTitle}
              </h2>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-geometric font-medium text-zinc-950 dark:text-white">
                  {t.common.languageLabel}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t.profile.languageDesc}
                </p>
              </div>
              <LocaleToggle className="shrink-0" />
            </div>
          </section>

          {/* Body Metric History Summary */}
          {bodyMetricLogs.length > 0 && (
            <section className="space-y-2">
              <BodyProgressWidget logs={bodyMetricLogs} />
            </section>
          )}

          {/* Settings Menus */}
          {menu.map((group) => (
            <section key={group.title} className="space-y-2">
              <div className="px-1 flex items-center justify-between">
                <h2 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                  {group.title}
                </h2>
                {group.pct !== null && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    {group.pct}% Complete
                  </span>
                )}
              </div>
              <div className="rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 divide-y divide-zinc-200/70 dark:divide-white/10 overflow-hidden">
                {group.items.map(([id, label, desc]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMsg(null);
                      setView(id);
                    }}
                    className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-4 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-geometric font-medium text-zinc-950 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition">
                        {label}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{desc}</p>
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
        <ProfileSectionView
          view={view}
          user={user}
          avatarUrl={avatarUrl}
          avatarBusy={avatarBusy}
          fileRef={fileRef}
          onPickAvatar={onPickAvatar}
          form={form}
          setForm={setForm}
          saving={saving}
          setSaving={setSaving}
          saveProfile={saveProfile}
          pw={pw}
          setPw={setPw}
          msg={msg}
          setMsg={setMsg}
          handleExportData={handleExportData}
          handleClearCache={handleClearCache}
          onLogout={onLogout}
          onDeleteAccount={onDeleteAccount}
        />
      )}
    </>
  );
}
