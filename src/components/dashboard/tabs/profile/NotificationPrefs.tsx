"use client";

import { useState, type ReactNode } from "react";
import { Bell, Mail, Smartphone, Users } from "lucide-react";
import { usePushNotifications } from "../usePushNotifications";

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
    <div className="rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 divide-y divide-zinc-200/70 dark:divide-white/10 overflow-hidden">
      <PreferenceSwitchRow
        icon={<Bell className="w-4 h-4" />}
        iconTone="primary"
        title="Push Notifications"
        description="Instant device alerts for daily tasks"
        checked={isOn}
        disabled={push.busy}
        onToggle={handleTogglePush}
      />
      <PreferenceSwitchRow
        icon={<Smartphone className="w-4 h-4" />}
        title="Daily Task Reminders"
        description="Morning cue for training and check-in"
        checked={dailyReminders}
        onToggle={() => setDailyReminders((v) => !v)}
      />
      <PreferenceSwitchRow
        icon={<Users className="w-4 h-4" />}
        title="Cohort & Meetup Alerts"
        description="Broadcasts for scheduled connects"
        checked={communityUpdates}
        onToggle={() => setCommunityUpdates((v) => !v)}
      />
      <PreferenceSwitchRow
        icon={<Mail className="w-4 h-4" />}
        title="Weekly Performance Digest"
        description="Summary of completion rates and streak"
        checked={weeklyDigest}
        onToggle={() => setWeeklyDigest((v) => !v)}
      />
    </div>
  );
}
