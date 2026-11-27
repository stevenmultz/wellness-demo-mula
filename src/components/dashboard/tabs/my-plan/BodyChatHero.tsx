"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
const LEAVE_MS = 240;

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

const POKE_REACTIONS_EN = ["Ouchh! Btw, ", "Heyy! Also, ", "Boop! Oh, "];
const POKE_REACTIONS_ID = ["Aduh! Btw, ", "Eits! Oh iya, ", "Hehe! Terus, "];

function formatPokeMessage(reaction: string, message: string): string {
  if (!message) return reaction.trim();
  const first = message.charAt(0);
  const next = message.charAt(1);
  // Keep "I" or acronyms uppercase; lowercase normal sentence starters after "Btw, "
  const shouldLower =
    first >= "A" &&
    first <= "Z" &&
    !(first === "I" && (next === " " || next === "'")) &&
    !(next >= "A" && next <= "Z");
  const body = shouldLower ? first.toLowerCase() + message.slice(1) : message;
  return `${reaction}${body}`;
}

/**
 * Minimalist Buddy: pure round head shape + two eyes only (no mouth, no blush).
 * Built with pure HTML rounded-full layers (instead of SVG inner <g> animations)
 * so iOS/Android GPU compositors animate cached layer textures with zero CPU re-rasterization.
 */
const BuddyCharacter = memo(function BuddyCharacter() {
  return (
    <div className="buddy-bob relative w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] flex items-center justify-center select-none" aria-hidden="true">
      <div
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{ backgroundColor: "#18181b" }}
      >
        <div className="buddy-look flex items-center justify-center">
          <div className="buddy-blink flex items-center justify-center gap-[18px] sm:gap-[22px]">
            <span
              className="block w-[9px] h-[12.5px] sm:w-[10px] sm:h-[14px] rounded-full"
              style={{ backgroundColor: "#ffffff" }}
            />
            <span
              className="block w-[9px] h-[12.5px] sm:w-[10px] sm:h-[14px] rounded-full"
              style={{ backgroundColor: "#ffffff" }}
            />
          </div>
        </div>
      </div>
    </div>
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
  const [pokeIndex, setPokeIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const avatarSlotRef = useRef<HTMLDivElement | null>(null);
  const prevAvatarLeftRef = useRef<number | null>(null);
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

  // Pause CSS animations whenever Buddy scrolls off-screen OR tab/PWA is backgrounded (zero idle battery drain).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let inViewport = true;
    const syncPaused = () => {
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      el.dataset.paused = !inViewport || hidden ? "true" : "false";
    };
    syncPaused();

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        inViewport = entry.isIntersecting;
        syncPaused();
      });
      io.observe(el);
    }
    document.addEventListener("visibilitychange", syncPaused);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", syncPaused);
    };
  }, []);

  const actionable = signals.filter((s) => s.action !== "none");
  const passive = signals.find((s) => s.action === "none") ?? null;
  const tapQueue = actionable.length > 0 ? actionable : signals;
  const quiet = now < quietUntil;

  const autoActive = quiet
    ? null
    : (actionable.find((s) => (snooze[s.id]?.until ?? 0) <= now) ?? null);
  const autoShown: BodySignal | null = autoActive ?? (quiet ? null : passive);

  const pokedSignal =
    pokeIndex !== null && tapQueue.length > 0
      ? tapQueue[pokeIndex % tapQueue.length]
      : null;
  const shown: BodySignal | null = pokedSignal ?? autoShown;
  const isPokedMessage = Boolean(pokedSignal);
  const hasSpeech = Boolean(shown);

  // FLIP transform glide when switching between centered (idle) and speaking (left):
  // Zero continuous layout thrashing (unlike max-width transitions) — pure GPU translate3d.
  useLayoutEffect(() => {
    const el = avatarSlotRef.current;
    if (!el || typeof window === "undefined") return;
    const newLeft = el.getBoundingClientRect().left;
    const prevLeft = prevAvatarLeftRef.current;
    prevAvatarLeftRef.current = newLeft;

    if (prevLeft === null) return;
    const deltaX = prevLeft - newLeft;
    if (Math.abs(deltaX) < 1) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    el.style.transition = "none";
    el.style.transform = `translate3d(${deltaX}px, 0, 0)`;
    const raf = window.requestAnimationFrame(() => {
      el.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = "translate3d(0, 0, 0)";
    });
    return () => window.cancelAnimationFrame(raf);
  }, [hasSpeech]);

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

  // Smooth fade/slide-in per message or poke step (opacity + transform only).
  const shownId = shown ? `${shown.id}:${pokeIndex ?? "auto"}` : null;
  useEffect(() => {
    setEntered(false);
    if (!shownId) return;
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [shownId]);

  const handlePoke = useCallback(() => {
    setHopCount((c) => c + 1);
    if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    setLeaving(false);
    setQuietUntil(0);
    setNow(Date.now());
    if (tapQueue.length === 0) return;

    setPokeIndex((prev) => {
      if (prev !== null) return (prev + 1) % tapQueue.length;
      if (autoShown) {
        const curIdx = tapQueue.findIndex((s) => s.id === autoShown.id);
        if (curIdx >= 0 && tapQueue.length > 1) return (curIdx + 1) % tapQueue.length;
      }
      return 0;
    });
  }, [tapQueue, autoShown]);

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
        setPokeIndex(null);
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

  const canAnswer = Boolean(shown && shown.action !== "none" && !isFeatureLocked);
  const bubbleVisible = Boolean(shown && entered && !leaving);

  const reactions = isId ? POKE_REACTIONS_ID : POKE_REACTIONS_EN;
  const displayMessage = shown
    ? isPokedMessage
      ? formatPokeMessage(reactions[(Math.max(1, hopCount) - 1) % reactions.length], shown.message)
      : shown.message
    : "";

  return (
    <section
      ref={rootRef}
      className="buddy w-full flex items-center justify-center min-h-[148px] sm:min-h-[168px] py-5 sm:py-6 px-1"
    >
      {/* Free-standing character: centered when idle, glides smoothly via GPU FLIP transform when speaking */}
      <div ref={avatarSlotRef} className="shrink-0 p-1">
        <button
          type="button"
          onClick={handlePoke}
          aria-label={isId ? "Sapa teman" : "Say hi"}
          className="block cursor-pointer outline-none active:scale-95 transition-transform duration-150"
        >
          <div key={hopCount} className={hopCount > 0 ? "buddy-hop" : ""}>
            <BuddyCharacter />
          </div>
        </button>
      </div>

      {/* Speech: pure opacity + translate3d transition (no max-width/margin layout thrashing) */}
      {shown && (
        <div
          key={shownId ?? shown.id}
          role="status"
          aria-live="polite"
          className={`flex-1 max-w-[480px] min-w-0 ml-4 sm:ml-5 rounded-2xl rounded-bl-sm bg-zinc-200/70 dark:bg-white/[0.07] px-4 py-3.5 space-y-2.5 transition-[opacity,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            bubbleVisible
              ? "opacity-100 translate-x-0 scale-100"
              : "opacity-0 -translate-x-2 scale-[0.98] pointer-events-none"
          }`}
        >
          <p className="text-xs sm:text-sm font-geometric font-semibold text-zinc-950 dark:text-white leading-snug">
            {displayMessage}
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
      )}
    </section>
  );
}
