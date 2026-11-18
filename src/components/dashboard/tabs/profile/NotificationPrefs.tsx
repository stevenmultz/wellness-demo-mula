"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { Bell, Mail, Smartphone, Users } from "lucide-react";
import { usePushNotifications } from "../usePushNotifications";

const PREFS_STORAGE_KEY = "wellness_notif_prefs_v1";
const PREFS_CHANGE_EVENT = "wellness:notif-prefs-change";

interface NotificationCategoryPrefs {
  dailyReminders: boolean;
  communityUpdates: boolean;
  weeklyDigest: boolean;
}

const DEFAULT_PREFS: NotificationCategoryPrefs = {
  dailyReminders: true,
  communityUpdates: true,
  weeklyDigest: true,
};

const DEFAULT_PREFS_SERIALIZED = JSON.stringify(DEFAULT_PREFS);

function readStoredPrefsSerialized(): string {
  try {
    return window.localStorage.getItem(PREFS_STORAGE_KEY) ?? DEFAULT_PREFS_SERIALIZED;
  } catch {
    return DEFAULT_PREFS_SERIALIZED;
  }
}

function subscribePrefs(onStoreChange: () => void): () => void {
  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(PREFS_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PREFS_CHANGE_EVENT, onChange);
  };
}

function parsePrefs(serialized: string): NotificationCategoryPrefs {
  try {
    const parsed = JSON.parse(serialized) as Partial<NotificationCategoryPrefs>;
    return {
      dailyReminders: typeof parsed.dailyReminders === "boolean" ? parsed.dailyReminders : true,
      communityUpdates: typeof parsed.communityUpdates === "boolean" ? parsed.communityUpdates : true,
      weeklyDigest: typeof parsed.weeklyDigest === "boolean" ? parsed.weeklyDigest : true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function PreferenceSwitchRow({
  icon,
  iconTone = "muted",
  title,
  description,
  checked,
  disabled = false,
  onToggle,
}: {
  icon: ReactNode;
  iconTone?: "primary" | "muted";
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            iconTone === "primary"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white">
            {title}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        aria-checked={checked}
        aria-label={title}
        role="switch"
        className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
          checked ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white dark:bg-zinc-950 shadow-sm transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function NotificationPrefs() {
  const push = usePushNotifications();
  const isOn = push.status === "on";
  const serializedPrefs = useSyncExternalStore(
    subscribePrefs,
    readStoredPrefsSerialized,
    () => DEFAULT_PREFS_SERIALIZED
  );
  const prefs = parsePrefs(serializedPrefs);

  const togglePref = useCallback(
    (key: keyof NotificationCategoryPrefs) => {
      const current = parsePrefs(readStoredPrefsSerialized());
      const next = { ...current, [key]: !current[key] };
      try {
        window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(PREFS_CHANGE_EVENT));
      } catch {
        // Ignore storage quota / private mode failures
      }
    },
    []
  );

  const handleTogglePush = () => {
    if (push.busy) return;
    if (isOn) {
      push.disable();
    } else {
      push.enable();
    }
  };

  const pushFeedback = push.error || push.notice || push.unsupportedReason;

  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 divide-y divide-zinc-200/70 dark:divide-white/10 overflow-hidden">
        <PreferenceSwitchRow
          icon={<Bell className="w-4 h-4" />}
          iconTone="primary"
          title="Push Notifications"
          description="Instant device alerts for daily tasks"
          checked={isOn}
          disabled={push.busy || push.status === "unsupported" || push.status === "denied"}
          onToggle={handleTogglePush}
        />
        <PreferenceSwitchRow
          icon={<Smartphone className="w-4 h-4" />}
          title="Daily Task Reminders"
          description="Morning cue for training and check-in"
          checked={prefs.dailyReminders}
          onToggle={() => togglePref("dailyReminders")}
        />
        <PreferenceSwitchRow
          icon={<Users className="w-4 h-4" />}
          title="Cohort & Meetup Alerts"
          description="Broadcasts for scheduled connects"
          checked={prefs.communityUpdates}
          onToggle={() => togglePref("communityUpdates")}
        />
        <PreferenceSwitchRow
          icon={<Mail className="w-4 h-4" />}
          title="Weekly Performance Digest"
          description="Summary of completion rates and streak"
          checked={prefs.weeklyDigest}
          onToggle={() => togglePref("weeklyDigest")}
        />
      </div>
      {pushFeedback && (
        <p
          role="status"
          className={`px-3 text-[11px] leading-relaxed ${
            push.error
              ? "text-rose-600 dark:text-rose-400"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {pushFeedback}
        </p>
      )}
    </div>
  );
}
