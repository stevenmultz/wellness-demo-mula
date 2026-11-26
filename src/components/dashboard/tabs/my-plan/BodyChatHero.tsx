"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BodySignal } from "./myPlanUtils";

interface SnoozeEntry {
  until: number;
  count: number;
}
type SnoozeMap = Record<string, SnoozeEntry>;

const FIRST_SNOOZE_MS = 35 * 60 * 1000;
const REPEAT_SNOOZE_MS = 2 * 60 * 60 * 1000;
const DISMISS_MS = 12 * 60 * 60 * 1000;
const NEXT_MESSAGE_GAP_MS = 6 * 1000;
const LEAVE_MS = 220;

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

type Mood = "attention" | "positive" | "neutral";

/** Simple round buddy. Static SVG; motion is CSS transform-only (see globals.css). */
const BuddyCharacter = memo(function BuddyCharacter({ mood }: { mood: Mood }) {
  const fillBody = "fill-zinc-900 dark:fill-white";
  const fillFace = "fill-white dark:fill-zinc-900";
  const strokeFace = "stroke-white dark:stroke-zinc-900";
  return (
    <svg viewBox="0 0 100 100" className="h-24 sm:h-28 w-auto select-none" aria-hidden="true">
      <g className="buddy-bob">
        {/* Feet */}
        <ellipse cx="34" cy="93" rx="9" ry="5" className={fillBody} />
        <ellipse cx="66" cy="93" rx="9" ry="5" className={fillBody} />
        {/* Body */}
        <path
          d="M50 6 C78 6 93 28 93 54 C93 78 77 91 50 91 C23 91 7 78 7 54 C7 28 22 6 50 6 Z"
          className={fillBody}
        />
        {/* Eyes (look around + blink) */}
        <g className="buddy-look">
          <g className="buddy-blink">
            <ellipse cx="35" cy="50" rx="5" ry="6.5" className={fillFace} />
            <ellipse cx="65" cy="50" rx="5" ry="6.5" className={fillFace} />
          </g>
        </g>
        {/* Blush */}
        <ellipse cx="24" cy="66" rx="5.5" ry="3.2" fill="#fb7185" fillOpacity="0.55" />
        <ellipse cx="76" cy="66" rx="5.5" ry="3.2" fill="#fb7185" fillOpacity="0.55" />
        {/* Mouths crossfade by mood */}
        <path
          d="M42 66 Q50 76 58 66 Z"
          className={`${fillFace} transition-opacity duration-200 ${mood === "positive" ? "opacity-100" : "opacity-0"}`}
        />
        <ellipse
          cx="50"
          cy="70"
          rx="3.6"
          ry="4.2"
          className={`${fillFace} transition-opacity duration-200 ${mood === "attention" ? "opacity-100" : "opacity-0"}`}
        />
        <path
          d="M43 67 Q50 73 57 67"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={`${strokeFace} transition-opacity duration-200 ${mood === "neutral" ? "opacity-100" : "opacity-0"}`}
        />
      </g>
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
  const [leaving, setLeaving] = useState(false);
  const [hopCount, setHopCount] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSnooze(loadSnooze(storageKey));
    setNow(Date.now());
  }, [storageKey]);

  useEffect(
    () => () => {
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    },
    []
  );

  // Pause CSS animations when the buddy is off-screen (no re-render involved).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting ? "false" : "true";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const actionable = signals.filter((s) => s.action !== "none");
  const passive = signals.find((s) => s.action === "none") ?? null;
  const quiet = now < quietUntil;

  const active = quiet
    ? null
    : (actionable.find((s) => (snooze[s.id]?.until ?? 0) <= now) ?? null);
  const shown: BodySignal | null = active ?? (quiet ? null : passive);

  // One timeout to the next moment something can change; re-synced when tab becomes visible.
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

  // Smooth fade/slide-in per message (opacity + transform only).
  const shownId = shown?.id ?? null;
  useEffect(() => {
    setEntered(false);
    if (!shownId) return;
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [shownId]);

  const commitSnooze = useCallback(
    (id: string, ms: number, bumpCount: boolean) => {
      // Let the bubble fade out first, then apply state.
      setLeaving(true);
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = window.setTimeout(() => {
        const t = Date.now();
        setSnooze((prev) => {
          const count = (prev[id]?.count ?? 0) + (bumpCount ? 1 : 0);
          const next: SnoozeMap = { ...prev, [id]: { count, until: t + ms } };
          saveSnooze(storageKey, next);
          return next;
        });
        setQuietUntil(t + NEXT_MESSAGE_GAP_MS);
        setNow(t);
        setLeaving(false);
      }, LEAVE_MS);
    },
    [storageKey]
  );

  const handleLater = useCallback(() => {
    if (!shown) return;
    const count = snooze[shown.id]?.count ?? 0;
    commitSnooze(shown.id, count >= 1 ? REPEAT_SNOOZE_MS : FIRST_SNOOZE_MS, true);
  }, [shown, snooze, commitSnooze]);

  const handleOkay = useCallback(() => {
    if (!shown) return;
    if (shown.action !== "info") onAccept(shown);
    const long = shown.action === "info" || shown.action === "program";
    commitSnooze(shown.id, long ? DISMISS_MS : FIRST_SNOOZE_MS, false);
  }, [shown, onAccept, commitSnooze]);

  const mood: Mood = shown?.tone ?? "neutral";
  const canAnswer = Boolean(shown && shown.action !== "none" && !isFeatureLocked);

  return (
    <section ref={rootRef} className="buddy w-full flex items-end gap-3 sm:gap-4 min-h-[112px]">
      {/* Free-standing character (tap to make it hop) */}
      <div key={shownId ?? "idle"} className={`shrink-0 ${shownId ? "buddy-pop" : ""}`}>
        <button
          type="button"
          onClick={() => setHopCount((c) => c + 1)}
          aria-label={isId ? "Sapa teman" : "Say hi"}
          className="block cursor-pointer outline-none active:scale-95 transition-transform"
        >
          <div key={hopCount} className={hopCount > 0 ? "buddy-hop" : ""}>
            <BuddyCharacter mood={mood} />
          </div>
        </button>
      </div>

      {/* Speech: soft tinted bubble, no border */}
      <div className="min-w-0 flex-1 pb-3 min-h-[84px] flex items-center">
        {shown ? (
          <div
            key={shown.id}
            role="status"
            aria-live="polite"
            className={`relative w-full rounded-2xl rounded-bl-sm bg-zinc-200/70 dark:bg-white/[0.07] px-3.5 py-3 space-y-2.5 transition duration-200 motion-reduce:transition-none ${
              entered && !leaving ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
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
                  className="h-8 px-4 rounded-full bg-zinc-300/70 dark:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 text-[11px] font-semibold hover:bg-zinc-300 dark:hover:bg-white/[0.16] transition active:scale-95 cursor-pointer"
                >
                  {isId ? "Nanti" : "Later"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
