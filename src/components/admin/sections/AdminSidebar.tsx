"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  Globe,
  Layers,
  LayoutDashboard,
  LogOut,
  QrCode,
  Tag,
  UserCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { SidebarDefaultDateTimeWidget } from "../AdminFormPickers";
import type { AdminFeedbackMessage, AdminMenuKey, AdminProgram, AdminUserItem } from "../adminTypes";

interface AdminSidebarProps {
  activeMenu: AdminMenuKey;
  setActiveMenu: (menu: AdminMenuKey) => void;
  setSelectedProgramId: (id: string | null) => void;
  setIsCreatingProgram: (val: boolean) => void;
  setInspectingUserHealth: (u: AdminUserItem | null) => void;
  setMasterTab: (
    tab: "coaches" | "organizations" | "categories" | "equipment" | "commitments"
  ) => void;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
  currentAdmin?: AdminUserItem;
  currentAdminRole: string;
  isSuperadminUser: boolean;
  programs: AdminProgram[];
  handleSignOut: () => void;
}

export function AdminSidebar({
  activeMenu,
  setActiveMenu,
  setSelectedProgramId,
  setIsCreatingProgram,
  setInspectingUserHealth,
  setMasterTab,
  setFeedback,
  currentAdmin,
  currentAdminRole,
  isSuperadminUser,
  programs,
  handleSignOut,
}: AdminSidebarProps) {
  const router = useRouter();
  const { t } = useLocale();

  return (
  <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-white/10 flex flex-col justify-between p-6 z-30">
    <div className="space-y-7">
      {/* Brand Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <Link href="/" className="group inline-block">
              <h1>
                <BrandLogo size="sm" />
              </h1>
            </Link>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-normal">
              {currentAdmin?.fullName || "Sanctuary Admin"}
            </p>
            {!isSuperadminUser && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {currentAdminRole}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>

        {/* Default Time, Date & Location Reference Card */}
        <SidebarDefaultDateTimeWidget />
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1">
        <button
          type="button"
          onClick={() => {
            setActiveMenu("dashboard");
            setSelectedProgramId(null);
            setIsCreatingProgram(false);
            setFeedback(null);
            router.push("/admin");
          }}
          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
            activeMenu === "dashboard"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>{t.admin.dashboard}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMenu("programs");
            setSelectedProgramId(null);
            setIsCreatingProgram(false);
            setFeedback(null);
            router.push("/admin/programs");
          }}
          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
            activeMenu === "programs"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 shrink-0" />
            <span>{t.admin.programs}</span>
          </span>
        </button>

        {isSuperadminUser && (
          <button
            type="button"
            onClick={() => {
              setActiveMenu("master");
              setMasterTab("coaches");
              setSelectedProgramId(null);
              setIsCreatingProgram(false);
              setFeedback(null);
              router.push("/admin/directories?tab=coaches");
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
              activeMenu === "master"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Tag className="w-4 h-4 shrink-0" />
              <span>{t.admin.directories}</span>
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setActiveMenu("members");
            setSelectedProgramId(null);
            setIsCreatingProgram(false);
            setInspectingUserHealth(null);
            setFeedback(null);
            router.push("/admin/customers");
          }}
          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
            activeMenu === "members"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Users className="w-4 h-4 shrink-0" />
            <span>{t.admin.customers}</span>
          </span>
        </button>

        {currentAdminRole === "PARTNER_ADMIN" && (
          <button
            type="button"
            onClick={() => {
              setActiveMenu("community");
              setSelectedProgramId(null);
              setIsCreatingProgram(false);
              setFeedback(null);
              router.push("/admin/community");
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
              activeMenu === "community"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Community Profile</span>
            </span>
          </button>
        )}

        {(isSuperadminUser || currentAdminRole === "PARTNER_ADMIN") && (
          <button
            type="button"
            onClick={() => {
              setActiveMenu("team");
              setSelectedProgramId(null);
              setIsCreatingProgram(false);
              setFeedback(null);
              router.push("/admin/team");
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
              activeMenu === "team"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>{isSuperadminUser ? "Communities & Team" : "Coaches & Team"}</span>
            </span>
          </button>
        )}

        {isSuperadminUser && (
          <button
            type="button"
            onClick={() => {
              setActiveMenu("payments");
              setSelectedProgramId(null);
              setIsCreatingProgram(false);
              setFeedback(null);
              router.push("/admin/payments");
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
              activeMenu === "payments"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <QrCode className="w-4 h-4 shrink-0" />
              <span>{t.admin.payments}</span>
            </span>
          </button>
        )}
      </nav>
    </div>

    {/* Bottom Actions */}
    <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10 space-y-1">
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center justify-between transition"
      >
        <span className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>Public Website</span>
        </span>
        <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
      </Link>

      <Link
        href="/dashboard"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center justify-between transition"
      >
        <span className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>Member View</span>
        </span>
        <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
      </Link>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2 transition"
      >
        <LogOut className="w-3.5 h-3.5 shrink-0" />
        <span>Sign Out</span>
      </button>
    </div>
  </aside>
  );
}
