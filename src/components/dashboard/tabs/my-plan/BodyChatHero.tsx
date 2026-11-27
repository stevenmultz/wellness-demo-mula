"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BodySignal } from "./myPlanUtils";

const TYPE_STEP_MS = 24;
const POKE_REVERT_MS = 2500;
/** 15-minute autonomous mood window (zero background polling needed) */
const SHAPE_WINDOW_MS = 15 * 60 * 1000;
/** Sparse autonomous whim range ONLY while actively viewing Buddy on-screen (45s - 90s) */
const WHIM_MIN_MS = 45_000;
const WHIM_MAX_MS = 90_000;

type BuddyShape = "circle" | "star" | "heart" | "octagon";
const BUDDY_SHAPES: readonly BuddyShape[] = ["circle", "star", "heart", "octagon"];

const POKE_LINES_EN = [
  "Ouch! Easy there — you pushed me!",
  "Aww! Hey, that tickles!",
  "Whoa! Almost squished me flat!",
  "Oof! Good thing I'm bouncy!",
  "Eep! Watch it, partner!",
] as const;

const POKE_LINES_ID = [
  "Ouch! Pelan-pelan dong mencetnya!",
  "Aww! Geli tau didorong gitu!",
  "Whoa! Aku hampir gepeng nih!",
  "Oof! Untung bentukku kenyal!",
  "Eits! Hati-hati dong, partner!",
] as const;

/**
 * Deterministic shape picker anchored to 15-minute clock windows.
 * Costs O(1) integer math and 0 timers — even if the app was closed,
 * Buddy naturally settles into a new shape when the time window shifts.
 */
function computeWindowShapeIdx(nowMs: number): number {
  const slot = Math.floor(nowMs / SHAPE_WINDOW_MS);
  const hashed = ((slot * 2654435761) >>> 0) % BUDDY_SHAPES.length;
  return hashed;
}

function wibDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function loadIntroSeen(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function saveIntroSeen(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

const SHAPE_EYE_LAYOUT: Record<
  BuddyShape,
  { top: string; gapClass: string; eyeClass: string }
> = {
  circle: {
    top: "43%",
    gapClass: "gap-[18px] sm:gap-[20px]",
    eyeClass: "w-[8px] h-[11.5px] sm:w-[9px] sm:h-[13px]",
  },
  octagon: {
    top: "43%",
    gapClass: "gap-[18px] sm:gap-[20px]",
    eyeClass: "w-[8px] h-[11.5px] sm:w-[9px] sm:h-[13px]",
  },
  heart: {
    top: "40.5%",
    gapClass: "gap-[16px] sm:gap-[18px]",
    eyeClass: "w-[7.5px] h-[10.5px] sm:w-[8.5px] sm:h-[12px]",
  },
  star: {
    top: "45%",
    gapClass: "gap-[14px] sm:gap-[16px]",
    eyeClass: "w-[7px] h-[10px] sm:w-[8px] sm:h-[11px]",
  },
};

/**
 * Pure simple geometric Buddy (Circle, Star, Heart, Octagon) in a strictly fixed frame.
 * Ultra-low power architecture:
 * - Static single-node <svg> silhouette (cached once as a tiny GPU bitmap, zero SVG re-rasterization).
 * - Outer div & eyes animate strictly via GPU compositor transforms (translate3d / scale3d).
 */
const BuddyCharacter = memo(function BuddyCharacter({
  shape,
  wincing,
}: {
  shape: BuddyShape;
  wincing: boolean;
}) {
  const eyeSpec = SHAPE_EYE_LAYOUT[shape];

  return (
    <div
      className="buddy-bob relative w-[84px] h-[84px] sm:w-[94px] sm:h-[94px] flex items-center justify-center select-none text-[#18181b] dark:text-zinc-100"
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full block" focusable="false">
        {shape === "circle" && <circle cx="50" cy="50" r="38" fill="currentColor" />}

        {shape === "star" && (
          <path
            d="M50 14 L60 36 L84 38.5 L66 55 L71.5 79 L50 66.5 L28.5 79 L34 55 L16 38.5 L40 36 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinejoin="round"
          />
        )}

        {shape === "heart" && (
          <path
            d="M50 83 C45 79 14 57 14 35.5 C14 22.5 24.5 14 36.5 14 C43.5 14 48 17.8 50 22 C52 17.8 56.5 14 63.5 14 C75.5 14 86 22.5 86 35.5 C86 57 55 79 50 83 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinejoin="round"
          />
        )}

        {shape === "octagon" && (
          <path
            d="M35 14 L65 14 L86 35 L86 65 L65 86 L35 86 L14 65 L14 35 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* GPU-composited eyes (squint briefly when pushed!) */}
      <div
        className="absolute inset-x-0 flex items-center justify-center pointer-events-none"
        style={{ top: eyeSpec.top }}
      >
        <div className="buddy-look flex items-center justify-center">
          <div
            className={`buddy-blink flex items-center justify-center transition-transform duration-150 ${eyeSpec.gapClass}`}
            style={wincing ? { transform: "scale3d(1.22, 0.22, 1)" } : undefined}
          >
            <span
              className={`block rounded-full bg-white dark:bg-zinc-950 ${eyeSpec.eyeClass}`}
            />
            <span
              className={`block rounded-full bg-white dark:bg-zinc-950 ${eyeSpec.eyeClass}`}
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
  const introStorageKey = useMemo(() => `buddy-intro:${wibDateKey()}`, []);
  const [introSeen, setIntroSeen] = useState(true);
  const [deckIdx, setDeckIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [entered, setEntered] = useState(false);

  // Autonomous shape state (NEVER mutated on user tap; changes only on Buddy's own timing)
  const [shapeIdx, setShapeIdx] = useState<number>(0);

  // One-shot GPU animation trigger ("push" on poke, "morph" on autonomous shape shift)
  const [animTrigger, setAnimTrigger] = useState<{
    kind: "none" | "push" | "morph";
    seq: number;
  }>({ kind: "none", seq: 0 });

  // Poke / push-in state ("Ouch!", "Aww!")
  const [pokeLineIdx, setPokeLineIdx] = useState<number | null>(null);
  const [wincing, setWincing] = useState(false);
  const [typedLen, setTypedLen] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const pokeRevertTimerRef = useRef<number | null>(null);
  const winceTimerRef = useRef<number | null>(null);
  const inViewportRef = useRef(true);
  const [isActivelyVisible, setIsActivelyVisible] = useState(true);
  const pokeSeqRef = useRef(0);

  useEffect(() => {
    setIntroSeen(loadIntroSeen(introStorageKey));
    setShapeIdx(computeWindowShapeIdx(Date.now()));
  }, [introStorageKey]);

  useEffect(
    () => () => {
      if (pokeRevertTimerRef.current) window.clearTimeout(pokeRevertTimerRef.current);
      if (winceTimerRef.current) window.clearTimeout(winceTimerRef.current);
    },
    []
  );

  // Visibility & viewport gate: pauses all CSS animations AND cancels autonomous timers when off-screen or backgrounded.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const syncVisibility = () => {
      const docHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      const active = inViewportRef.current && !docHidden;
      el.dataset.paused = active ? "false" : "true";
      setIsActivelyVisible(active);
      // When user returns to the app after time passed, check if the 15-min autonomous window shifted:
      if (active) {
        setShapeIdx((prev) => {
          const slotIdx = computeWindowShapeIdx(Date.now());
          return slotIdx !== prev ? slotIdx : prev;
        });
      }
    };
    syncVisibility();

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        inViewportRef.current = entry.isIntersecting;
        syncVisibility();
      });
      io.observe(el);
    }
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  // Sparse autonomous "whim" shape shift ONLY while actively visible on screen (1 lazy timeout every 45s-90s; 0 timers when hidden).
  useEffect(() => {
    if (!isActivelyVisible) return;
    let timerId: number | null = null;

    const scheduleNextWhim = () => {
      const delay =
        WHIM_MIN_MS + Math.floor(Math.random() * (WHIM_MAX_MS - WHIM_MIN_MS));
      timerId = window.setTimeout(() => {
        setShapeIdx((prev) => {
          const offset = 1 + Math.floor(Math.random() * (BUDDY_SHAPES.length - 1));
          return (prev + offset) % BUDDY_SHAPES.length;
        });
        setAnimTrigger((prev) => ({ kind: "morph", seq: prev.seq + 1 }));
        scheduleNextWhim();
      }, delay);
    };

    scheduleNextWhim();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [isActivelyVisible]);

  const introSignal: BodySignal = useMemo(
    () => ({
      id: "daily-intro",
      kind: "intro",
      action: "info",
      tone: "positive",
      message: isId
        ? "Hai partner! Siap jalanin hari ini bareng?"
        : "Hey partner! Ready to take on today together?",
      detail: isId
        ? "Kita satu tim hari ini! Aku bakal bantu ingetin tidur, minum, makan, langkah, dan program kita satu per satu."
        : "We're one team today! I'll keep track of our sleep, water, meals, steps, and workouts step by step.",
    }),
    [isId]
  );

  const deck: BodySignal[] = useMemo(() => {
    if (isFeatureLocked) return signals;
    return introSeen ? signals : [introSignal, ...signals];
  }, [isFeatureLocked, introSeen, introSignal, signals]);

  const shown: BodySignal | null =
    deck.length > 0 ? deck[deckIdx % deck.length] : null;

  const pokeLines = isId ? POKE_LINES_ID : POKE_LINES_EN;
  const activePokeText =
    pokeLineIdx !== null ? pokeLines[pokeLineIdx % pokeLines.length] : null;

  const fullText = useMemo(() => {
    if (activePokeText) return activePokeText;
    if (!shown) return "";
    if (expanded && shown.detail) return shown.detail;
    return shown.message;
  }, [activePokeText, shown, expanded]);

  // Game-style typewriter effect (~0.6-0.8s burst, then 0 timers active)
  useEffect(() => {
    if (!fullText) {
      setTypedLen(0);
      return;
    }
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const docHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    if (reducedMotion || docHidden || !inViewportRef.current) {
      setTypedLen(fullText.length);
      return;
    }

    setTypedLen(1);
    const stepSize = fullText.length > 68 ? 2 : 1;
    let cur = 1;
    let timerId: number | null = null;

    const tick = () => {
      cur = Math.min(fullText.length, cur + stepSize);
      setTypedLen(cur);
      if (cur < fullText.length) {
        timerId = window.setTimeout(tick, TYPE_STEP_MS);
      }
    };
    timerId = window.setTimeout(tick, TYPE_STEP_MS);

    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [fullText]);

  const cardRenderKey = shown
    ? `${shown.id}:${expanded ? "detail" : "msg"}`
    : null;

  useEffect(() => {
    setEntered(false);
    if (!cardRenderKey) return;
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [cardRenderKey]);

  const clearPokeReaction = useCallback(() => {
    if (pokeRevertTimerRef.current) {
      window.clearTimeout(pokeRevertTimerRef.current);
      pokeRevertTimerRef.current = null;
    }
    setPokeLineIdx(null);
  }, []);

  const markIntroDoneIfNeeded = useCallback(() => {
    if (!introSeen && shown?.id === "daily-intro") {
      setIntroSeen(true);
      saveIntroSeen(introStorageKey);
      return true;
    }
    return false;
  }, [introSeen, shown?.id, introStorageKey]);

  // Press Buddy: shrinks inward like pushed ("mengecil terdorong") + says "Ouch! / Aww!" WITHOUT changing shape!
  const handlePressBuddy = useCallback(() => {
    setAnimTrigger((prev) => ({ kind: "push", seq: prev.seq + 1 }));
    setWincing(true);
    if (winceTimerRef.current) window.clearTimeout(winceTimerRef.current);
    winceTimerRef.current = window.setTimeout(() => {
      setWincing(false);
    }, 320);

    const nextIdx = pokeSeqRef.current;
    pokeSeqRef.current += 1;
    setPokeLineIdx(nextIdx);

    if (pokeRevertTimerRef.current) window.clearTimeout(pokeRevertTimerRef.current);
    pokeRevertTimerRef.current = window.setTimeout(() => {
      setPokeLineIdx(null);
      pokeRevertTimerRef.current = null;
    }, POKE_REVERT_MS);
  }, []);

  const handleTellMeMore = useCallback(() => {
    if (!shown) return;
    clearPokeReaction();
    setExpanded(true);
  }, [shown, clearPokeReaction]);

  const handleAdvanceCard = useCallback(() => {
    clearPokeReaction();
    setExpanded(false);
    const removedIntro = markIntroDoneIfNeeded();
    if (removedIntro) {
      setDeckIdx(0);
    } else if (deck.length > 0) {
      setDeckIdx((prev) => (prev + 1) % deck.length);
    }
  }, [clearPokeReaction, markIntroDoneIfNeeded, deck.length]);

  const handleLetsGo = useCallback(() => {
    if (!shown || isFeatureLocked) return;
    clearPokeReaction();
    onAccept(shown);
    // Advance cleanly so next time Buddy shows the next item in rotation
    setExpanded(false);
    const removedIntro = markIntroDoneIfNeeded();
    if (removedIntro) {
      setDeckIdx(0);
    } else if (deck.length > 0) {
      setDeckIdx((prev) => (prev + 1) % deck.length);
    }
  }, [shown, isFeatureLocked, clearPokeReaction, onAccept, markIntroDoneIfNeeded, deck.length]);

  const activeShape = BUDDY_SHAPES[shapeIdx % BUDDY_SHAPES.length];
  const bubbleVisible = Boolean(shown && entered);
  const typedSlice = fullText.slice(0, typedLen);
  const untypedSlice = fullText.slice(typedLen);

  return (
    <section
      ref={rootRef}
      className="buddy w-full flex items-center justify-center min-h-[144px] sm:min-h-[160px] py-3.5 sm:py-4 px-1"
    >
      {/* Strictly Fixed Character Frame: shapes & push recoil never shift adjacent UI */}
      <div className="w-[96px] h-[96px] sm:w-[108px] sm:h-[108px] shrink-0 flex items-center justify-center overflow-hidden">
        <button
          type="button"
          onClick={handlePressBuddy}
          onPointerDown={() => setWincing(true)}
          onPointerUp={() => {
            if (!winceTimerRef.current) setWincing(false);
          }}
          onPointerCancel={() => setWincing(false)}
          aria-label={isId ? "Sentuh karakter Buddy" : "Poke Buddy"}
          className="w-full h-full flex items-center justify-center cursor-pointer outline-none select-none active:scale-[0.80] transition-transform duration-150 ease-out"
        >
          <div
            key={animTrigger.seq}
            className={
              animTrigger.kind === "push"
                ? "buddy-push"
                : animTrigger.kind === "morph"
                  ? "buddy-morph"
                  : ""
            }
          >
            <BuddyCharacter shape={activeShape} wincing={wincing} />
          </div>
        </button>
      </div>

      {/* Game-Style Typewriter Speech Bubble: strictly 2-button pairs (Tell me more / Next -> Let's go / Skip) */}
      {shown && (
        <div
          key={shown.id}
          role="status"
          aria-live="polite"
          className={`flex-1 max-w-[490px] min-w-0 ml-3.5 sm:ml-5 rounded-2xl rounded-bl-sm bg-zinc-200/75 dark:bg-white/[0.07] px-4 py-3.5 space-y-2.5 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            bubbleVisible
              ? "opacity-100 translate-x-0 scale-100"
              : "opacity-0 -translate-x-2 scale-[0.98] pointer-events-none"
          }`}
        >
          <p
            onClick={() => {
              if (typedLen < fullText.length) setTypedLen(fullText.length);
            }}
            aria-label={fullText}
            className="text-xs sm:text-sm font-geometric font-semibold text-zinc-950 dark:text-white leading-snug cursor-pointer select-none"
          >
            <span>{typedSlice}</span>
            <span className="opacity-0 select-none" aria-hidden="true">
              {untypedSlice}
            </span>
          </p>

          {!isFeatureLocked && (
            <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
              {!expanded ? (
                <>
                  <button
                    type="button"
                    onClick={handleTellMeMore}
                    className="h-7 px-3.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold hover:opacity-90 transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Info lanjut" : "Tell me more"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAdvanceCard}
                    className="h-7 px-3.5 rounded-full bg-zinc-300/80 dark:bg-white/[0.12] text-zinc-900 dark:text-zinc-100 text-[11px] font-semibold hover:bg-zinc-300 dark:hover:bg-white/[0.18] transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Lanjut" : "Next"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleLetsGo}
                    className="h-7 px-3.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold hover:opacity-90 transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Yuk mulai" : "Let's go"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAdvanceCard}
                    className="h-7 px-3.5 rounded-full bg-zinc-300/80 dark:bg-white/[0.12] text-zinc-900 dark:text-zinc-100 text-[11px] font-semibold hover:bg-zinc-300 dark:hover:bg-white/[0.18] transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Lewati" : "Skip"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
