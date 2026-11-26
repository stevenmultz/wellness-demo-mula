"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { BodySignal } from "./myPlanUtils";

interface SnoozeEntry {
  until: number;
  count: number;
}
type SnoozeMap = Record<string, SnoozeEntry>;

const FIRST_SNOOZE_MS = 35 * 60 * 1000;
const REPEAT_SNOOZE_MS = 2 * 60 * 60 * 1000;
const NEXT_MESSAGE_GAP_MS = 6 * 1000;

function wibDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function loadSnooze(key: string): SnoozeMap {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SnoozeMap) : {};
  } catch {
    return {};
  }
}

function saveSnooze(key: string, map: SnoozeMap) {
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* storage unavailable: snooze lives in memory only */
  }
}

/** Half-body character: static SVG, no continuous animation. */
const HalfBodyCharacter = memo(function HalfBodyCharacter({
  mood,
}: {
  mood: "attention" | "positive" | "neutral";
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-28 sm:h-32 w-auto text-zinc-900 dark:text-white select-none"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Shoulders + torso (cut at waist) */}
      <path d="M12 120 C12 88 30 66 60 66 C90 66 108 88 108 120 Z" />
      {/* Neck */}
      <rect x="52" y="52" width="16" height="18" rx="6" />
      {/* Head */}
      <circle cx="60" cy="32" r="23" />
      {/* Face */}
      <g className="fill-[#ececea] dark:fill-zinc-900">
        <circle cx="51" cy="30" r="2.6" />
        <circle cx="69" cy="30" r="2.6" />
      </g>
      {mood === "attention" ? (
        <path
          d="M53 43 Q60 40 67 43"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          className="stroke-[#ececea] dark:stroke-zinc-900"
        />
      ) : (
        <path
          d="M52 41 Q60 49 68 41"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          className="stroke-[#ececea] dark:stroke-zinc-900"
        />
      )}
    </svg>
  );
});

export function BodyChatHero({
  signals,
  isId,
  isFeatureLocked,
  onAccept,
}: {
  signals: BodySignal[];
  isId: boolean;
  isFeatureLocked: boolean;
  onAccept: (signal: BodySignal) => void;
}) {
  const storageKey = useMemo(() => `body-chat:${wibDateKey()}`, []);
  const [snooze, setSnooze] = useState<SnoozeMap>({});
  const [quietUntil, setQuietUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setSnooze(loadSnooze(storageKey));
    setNow(Date.now());
  }, [storageKey]);

  const actionable = signals.filter((s) => s.action !== "none");
  const passive = signals.find((s) => s.action === "none") ?? null;

  const active =
    now < quietUntil
      ? null
      : (actionable.find((s) => (snooze[s.id]?.until ?? 0) <= now) ?? null);
  const shown: BodySignal | null = active ?? (actionable.length === 0 ? passive : null);

  // One timeout to the next moment something can change; paused while tab is hidden.
  useEffect(() => {
    const candidates: number[] = [];
    if (quietUntil > now) candidates.push(quietUntil);
    for (const s of actionable) {
      const until = snooze[s.id]?.until ?? 0;
      if (until > now) candidates.push(until);
    }
    if (candidates.length === 0) return;
    const delay = Math.max(250, Math.min(...candidates) - now);
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snooze, quietUntil, now, signals]);

  // Single fade/slide-in per message (opacity + transform only).
  const shownId = shown?.id ?? null;
  useEffect(() => {
    setEntered(false);
    if (!shownId) return;
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [shownId]);

  const handleLater = useCallback(() => {
    if (!shown) return;
    const t = Date.now();
    const prev = snooze[shown.id];
    const next: SnoozeMap = {
      ...snooze,
      [shown.id]: {
        count: (prev?.count ?? 0) + 1,
        until: t + ((prev?.count ?? 0) >= 1 ? REPEAT_SNOOZE_MS : FIRST_SNOOZE_MS),
      },
    };
    setSnooze(next);
    saveSnooze(storageKey, next);
    setQuietUntil(t + NEXT_MESSAGE_GAP_MS);
    setNow(t);
  }, [shown, snooze, storageKey]);

  const handleOkay = useCallback(() => {
    if (!shown) return;
    onAccept(shown);
    // Short snooze so the same nudge does not instantly reappear while the user acts.
    const t = Date.now();
    const next: SnoozeMap = {
      ...snooze,
      [shown.id]: { count: snooze[shown.id]?.count ?? 0, until: t + FIRST_SNOOZE_MS },
    };
    setSnooze(next);
    saveSnooze(storageKey, next);
    setQuietUntil(t + NEXT_MESSAGE_GAP_MS);
    setNow(t);
  }, [shown, snooze, storageKey, onAccept]);

  const mood = shown?.tone ?? "neutral";
  const canAnswer = Boolean(shown && shown.action !== "none" && !isFeatureLocked);

  return (
    <section className="relative w-full rounded-3xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 min-h-[170px] sm:min-h-[190px] px-4 sm:px-6 pt-4 sm:pt-5 overflow-hidden">
      <div className="w-full grid grid-cols-[104px_1fr] sm:grid-cols-[128px_1fr] gap-3 sm:gap-4 items-end">
        <div className="flex items-end justify-center self-end">
          <HalfBodyCharacter mood={mood} />
        </div>

        <div className="min-w-0 self-center pb-4 sm:pb-5 min-h-[104px] flex items-center">
          {shown ? (
            <div
              key={shown.id}
              className={`relative w-full rounded-2xl rounded-bl-md bg-white/90 dark:bg-zinc-900/75 border border-zinc-200/70 dark:border-white/10 px-3.5 py-3 shadow-xs space-y-3 transition duration-200 motion-reduce:transition-none ${
                entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="text-xs sm:text-sm font-geometric font-semibold text-zinc-950 dark:text-white leading-snug">
                {shown.message}
              </p>

              {canAnswer && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOkay}
                    className="h-8 px-4 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold hover:opacity-90 transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Oke" : "Okay"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLater}
                    className="h-8 px-4 rounded-full bg-zinc-200/80 dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-[11px] font-semibold hover:bg-zinc-300/70 dark:hover:bg-white/[0.14] transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Nanti" : "Later"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              {isId ? "Dengarkan tubuhmu…" : "Listen to your body…"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
