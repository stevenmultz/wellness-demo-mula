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

/** Buddy: a cute round mascot (static SVG, no continuous animation). */
const BuddyCharacter = memo(function BuddyCharacter({
  mood,
}: {
  mood: "attention" | "positive" | "neutral";
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-28 sm:h-32 w-auto select-none"
      aria-hidden="true"
    >
      {/* Sprout on top */}
      <path
        d="M60 30 C60 22 59 18 57 14"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-emerald-600 dark:stroke-emerald-400"
      />
      <path
        d="M58 16 C50 8 40 12 42 20 C50 22 55 20 58 16 Z"
        className="fill-emerald-500 dark:fill-emerald-400"
      />
      <path
        d="M58 16 C64 6 76 8 74 17 C67 20 61 19 58 16 Z"
        className="fill-emerald-600 dark:fill-emerald-500"
      />
      {/* Little arms (waving up when happy) */}
      <ellipse
        cx="16"
        cy={mood === "positive" ? 68 : 86}
        rx="9"
        ry="13"
        transform={`rotate(${mood === "positive" ? 28 : 12} 16 ${mood === "positive" ? 68 : 86})`}
        className="fill-zinc-800 dark:fill-zinc-100"
      />
      <ellipse
        cx="104"
        cy={mood === "positive" ? 68 : 86}
        rx="9"
        ry="13"
        transform={`rotate(${mood === "positive" ? -28 : -12} 104 ${mood === "positive" ? 68 : 86})`}
        className="fill-zinc-800 dark:fill-zinc-100"
      />
      {/* Round body (cut at the bottom edge of the card) */}
      <path
        d="M60 28 C92 28 108 52 108 82 C108 104 98 120 98 120 L22 120 C22 120 12 104 12 82 C12 52 28 28 60 28 Z"
        className="fill-zinc-900 dark:fill-white"
      />
      {/* Belly highlight */}
      <ellipse cx="60" cy="102" rx="26" ry="16" className="fill-white/10 dark:fill-zinc-900/10" />
      {/* Big sparkly eyes */}
      <g>
        <ellipse cx="44" cy="64" rx="9" ry="10.5" className="fill-white dark:fill-zinc-900" />
        <ellipse cx="76" cy="64" rx="9" ry="10.5" className="fill-white dark:fill-zinc-900" />
        <circle cx="46" cy="66" r="5.2" className="fill-zinc-900 dark:fill-white" />
        <circle cx="74" cy="66" r="5.2" className="fill-zinc-900 dark:fill-white" />
        <circle cx="48" cy="63.5" r="1.8" className="fill-white dark:fill-zinc-900" />
        <circle cx="76" cy="63.5" r="1.8" className="fill-white dark:fill-zinc-900" />
      </g>
      {/* Blush */}
      <ellipse cx="30" cy="80" rx="6" ry="3.6" fill="#fb7185" fillOpacity="0.55" />
      <ellipse cx="90" cy="80" rx="6" ry="3.6" fill="#fb7185" fillOpacity="0.55" />
      {/* Mouth */}
      {mood === "positive" ? (
        <path d="M51 79 Q60 92 69 79 Z" className="fill-white dark:fill-zinc-900" />
      ) : mood === "attention" ? (
        <ellipse cx="60" cy="84" rx="4" ry="4.6" className="fill-white dark:fill-zinc-900" />
      ) : (
        <path
          d="M52 82 Q60 89 68 82"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-white dark:stroke-zinc-900"
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
    <section className="w-full space-y-2.5">
      <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950 dark:text-white leading-tight">
        Buddy
      </h2>
      <div className="relative w-full rounded-3xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 min-h-[170px] sm:min-h-[190px] px-4 sm:px-6 pt-4 sm:pt-5 overflow-hidden">
      <div className="w-full grid grid-cols-[104px_1fr] sm:grid-cols-[128px_1fr] gap-3 sm:gap-4 items-end">
        <div className="flex items-end justify-center self-end">
          <BuddyCharacter mood={mood} />
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
            <p className="text-lg leading-none text-zinc-400 dark:text-zinc-500 tracking-widest" aria-hidden="true">
              …
            </p>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
