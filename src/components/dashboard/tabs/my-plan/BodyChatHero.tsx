"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BodySignal } from "./myPlanUtils";

const LEAVE_MS = 220;
const TYPE_STEP_MS = 24;

type BodyForm = "orb" | "sixpack" | "flex" | "zen" | "star";
const BODY_FORMS: readonly BodyForm[] = ["orb", "sixpack", "flex", "zen", "star"];

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

const FORM_EYE_LAYOUT: Record<
  BodyForm,
  { top: string; gapClass: string; eyeClass: string }
> = {
  orb: {
    top: "44%",
    gapClass: "gap-[18px] sm:gap-[21px]",
    eyeClass: "w-[8.5px] h-[12px] sm:w-[9.5px] sm:h-[13.5px]",
  },
  sixpack: {
    top: "16.5%",
    gapClass: "gap-[8px] sm:gap-[9px]",
    eyeClass: "w-[4.5px] h-[6.5px] sm:w-[5px] sm:h-[7px]",
  },
  flex: {
    top: "23.5%",
    gapClass: "gap-[9px] sm:gap-[10px]",
    eyeClass: "w-[5px] h-[7px] sm:w-[5.5px] sm:h-[7.5px]",
  },
  zen: {
    top: "21.5%",
    gapClass: "gap-[8.5px] sm:gap-[9.5px]",
    eyeClass: "w-[4.5px] h-[6.5px] sm:w-[5px] sm:h-[7px]",
  },
  star: {
    top: "45%",
    gapClass: "gap-[13px] sm:gap-[15px]",
    eyeClass: "w-[6.5px] h-[9.5px] sm:w-[7.5px] sm:h-[10.5px]",
  },
};

/**
 * Interactive morphing Buddy inside a strictly fixed frame (never alters surrounding UI).
 * Architecture for ultra-low phone power:
 * - Static <svg> silhouette (zero inner CSS animations -> cached once as a single GPU bitmap).
 * - Outer HTML <div class="buddy-bob"> + overlaid HTML <div> eyes use ONLY GPU-composited translate3d / scale3d.
 */
const BuddyCharacter = memo(function BuddyCharacter({ form }: { form: BodyForm }) {
  const eyeSpec = FORM_EYE_LAYOUT[form];

  return (
    <div
      className="buddy-bob relative w-[86px] h-[86px] sm:w-[96px] sm:h-[96px] flex items-center justify-center select-none"
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full block" focusable="false">
        {form === "orb" && <circle cx="50" cy="52" r="38" fill="#18181b" />}

        {form === "sixpack" && (
          <>
            {/* Head + heroic shoulders + V-torso */}
            <circle cx="50" cy="22" r="15" fill="#18181b" />
            <circle cx="21" cy="51" r="10.5" fill="#18181b" />
            <circle cx="79" cy="51" r="10.5" fill="#18181b" />
            <rect x="21" y="38" width="58" height="54" rx="18" fill="#18181b" />
            {/* Subtle pec line */}
            <rect x="34" y="46" width="14" height="2.6" rx="1.3" fill="#f6f6f4" opacity="0.85" />
            <rect x="52" y="46" width="14" height="2.6" rx="1.3" fill="#f6f6f4" opacity="0.85" />
            {/* Chiseled 6-pack abs cutouts */}
            <rect x="38" y="53" width="10.5" height="7.8" rx="2.4" fill="#f6f6f4" />
            <rect x="51.5" y="53" width="10.5" height="7.8" rx="2.4" fill="#f6f6f4" />
            <rect x="38" y="63.2" width="10.5" height="7.8" rx="2.4" fill="#f6f6f4" />
            <rect x="51.5" y="63.2" width="10.5" height="7.8" rx="2.4" fill="#f6f6f4" />
            <rect x="38" y="73.4" width="10.5" height="7.8" rx="2.4" fill="#f6f6f4" />
            <rect x="51.5" y="73.4" width="10.5" height="7.8" rx="2.4" fill="#f6f6f4" />
          </>
        )}

        {form === "flex" && (
          <>
            {/* Double-bicep flex pose */}
            <circle cx="50" cy="29" r="16" fill="#18181b" />
            <rect x="30" y="46" width="40" height="45" rx="15" fill="#18181b" />
            <path
              d="M32 54 C18 54 12 44 14 27"
              stroke="#18181b"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="23" cy="45" r="7.2" fill="#18181b" />
            <circle cx="14" cy="24" r="6.2" fill="#18181b" />
            <path
              d="M68 54 C82 54 88 44 86 27"
              stroke="#18181b"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="77" cy="45" r="7.2" fill="#18181b" />
            <circle cx="86" cy="24" r="6.2" fill="#18181b" />
          </>
        )}

        {form === "zen" && (
          <>
            {/* Calm meditating lotus pose + floating aura orbs */}
            <circle cx="16" cy="34" r="3.8" fill="#18181b" />
            <circle cx="84" cy="34" r="3.8" fill="#18181b" />
            <circle cx="50" cy="27" r="15.5" fill="#18181b" />
            <ellipse cx="50" cy="55" rx="21" ry="16" fill="#18181b" />
            <ellipse cx="50" cy="73" rx="35" ry="14.5" fill="#18181b" />
          </>
        )}

        {form === "star" && (
          <path
            d="M50 13 L60 36 L85 38 L66 55 L72 80 L50 67 L28 80 L34 55 L15 38 L40 36 Z"
            fill="#18181b"
            stroke="#18181b"
            strokeWidth="11"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* GPU-only animated eyes overlaid at the active form's head position */}
      <div
        className="absolute inset-x-0 flex items-center justify-center pointer-events-none"
        style={{ top: eyeSpec.top }}
      >
        <div className="buddy-look flex items-center justify-center">
          <div className={`buddy-blink flex items-center justify-center ${eyeSpec.gapClass}`}>
            <span
              className={`block rounded-full ${eyeSpec.eyeClass}`}
              style={{ backgroundColor: "#ffffff" }}
            />
            <span
              className={`block rounded-full ${eyeSpec.eyeClass}`}
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
  const introStorageKey = useMemo(() => `buddy-intro:${wibDateKey()}`, []);
  const [introSeen, setIntroSeen] = useState(true);
  const [deckIdx, setDeckIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [thankedReply, setThankedReply] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [entered, setEntered] = useState(false);
  const [formIdx, setFormIdx] = useState(0);
  const [hopCount, setHopCount] = useState(0);
  const [typedLen, setTypedLen] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const avatarSlotRef = useRef<HTMLDivElement | null>(null);
  const prevAvatarLeftRef = useRef<number | null>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const inViewportRef = useRef(true);

  useEffect(() => {
    setIntroSeen(loadIntroSeen(introStorageKey));
  }, [introStorageKey]);

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
    const syncPaused = () => {
      const docHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      el.dataset.paused = !inViewportRef.current || docHidden ? "true" : "false";
    };
    syncPaused();

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        inViewportRef.current = entry.isIntersecting;
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

  const introSignal: BodySignal = useMemo(
    () => ({
      id: "daily-intro",
      kind: "intro",
      action: "info",
      tone: "positive",
      message: isId
        ? "Hai partner! Siap kita taklukkan hari ini bareng?"
        : "Hey partner! Ready to take on today together?",
      detail: isId
        ? "Kita satu tim! Tap tubuhku buat ubah wujud (bisa sixpack!), atau klik Lanjut buat cek task kita."
        : "We're one team! Tap my body to morph forms (even a sixpack!), or hit Next to check our tasks.",
    }),
    [isId]
  );

  const deck: BodySignal[] = useMemo(() => {
    if (isFeatureLocked) return signals;
    return introSeen ? signals : [introSignal, ...signals];
  }, [isFeatureLocked, introSeen, introSignal, signals]);

  const currentCard: BodySignal | null =
    deck.length > 0 ? deck[deckIdx % deck.length] : null;
  const shown: BodySignal | null = hidden ? null : currentCard;
  const hasSpeech = Boolean(shown);

  // FLIP transform glide when switching between centered (hidden) and speaking (left):
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

  const fullText = useMemo(() => {
    if (!shown) return "";
    if (thankedReply) {
      return isId
        ? "Sama-sama, partner! Kita selalu saling jaga."
        : "Anytime, partner! Always got our back.";
    }
    if (expanded && shown.detail) {
      return shown.detail;
    }
    return shown.message;
  }, [shown, thankedReply, expanded, isId]);

  // Game-style typewriter effect: runs ONLY for ~0.8s while typing short text, then 0 timers active!
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
    const stepSize = fullText.length > 64 ? 2 : 1;
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
    ? `${shown.id}:${expanded ? "detail" : "msg"}:${thankedReply ? "thx" : "0"}`
    : null;

  useEffect(() => {
    setEntered(false);
    if (!cardRenderKey) return;
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [cardRenderKey]);

  const markIntroDoneIfNeeded = useCallback(() => {
    if (!introSeen && currentCard?.id === "daily-intro") {
      setIntroSeen(true);
      saveIntroSeen(introStorageKey);
      return true;
    }
    return false;
  }, [introSeen, currentCard?.id, introStorageKey]);

  // Tap Buddy: morph body form inside fixed frame + bounce + wake speech if hidden!
  const handleTapBuddy = useCallback(() => {
    if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    setLeaving(false);
    setHopCount((c) => c + 1);
    setFormIdx((prev) => (prev + 1) % BODY_FORMS.length);

    if (hidden) {
      setHidden(false);
      setExpanded(false);
      setThankedReply(false);
    }
  }, [hidden]);

  const handleTellMeMore = useCallback(() => {
    if (!shown) return;
    if (typedLen < fullText.length) {
      setTypedLen(fullText.length);
    }
    setExpanded(true);
  }, [shown, typedLen, fullText.length]);

  const handleNext = useCallback(() => {
    setExpanded(false);
    setThankedReply(false);
    const removedIntro = markIntroDoneIfNeeded();
    if (removedIntro) {
      setDeckIdx(0);
    } else if (deck.length > 0) {
      setDeckIdx((prev) => (prev + 1) % deck.length);
    }
  }, [markIntroDoneIfNeeded, deck.length]);

  const handleThanks = useCallback(() => {
    setHopCount((c) => c + 1);
    // Morph proudly into sixpack or flex on appreciation!
    setFormIdx((prev) => (BODY_FORMS[prev] === "sixpack" ? 2 : 1));
    setThankedReply(true);
  }, []);

  const handleHide = useCallback(() => {
    markIntroDoneIfNeeded();
    setLeaving(true);
    if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => {
      setHidden(true);
      setLeaving(false);
      setExpanded(false);
      setThankedReply(false);
    }, LEAVE_MS);
  }, [markIntroDoneIfNeeded]);

  const handleOpenAction = useCallback(() => {
    if (!shown || isFeatureLocked) return;
    if (shown.action !== "none" && shown.action !== "info") {
      onAccept(shown);
    }
  }, [shown, isFeatureLocked, onAccept]);

  const activeForm = BODY_FORMS[formIdx % BODY_FORMS.length];
  const bubbleVisible = Boolean(shown && entered && !leaving);
  const isReassurance = shown?.kind === "reassurance";
  const hasActionLink =
    Boolean(shown && !isFeatureLocked && shown.action !== "none" && shown.action !== "info");

  const typedSlice = fullText.slice(0, typedLen);
  const untypedSlice = fullText.slice(typedLen);

  return (
    <section
      ref={rootRef}
      className="buddy w-full flex items-center justify-center min-h-[148px] sm:min-h-[164px] py-4 sm:py-5 px-1"
    >
      {/* Strictly Fixed Character Frame: morphing forms never change box size or push surrounding UI */}
      <div
        ref={avatarSlotRef}
        className="w-[96px] h-[96px] sm:w-[108px] sm:h-[108px] shrink-0 flex items-center justify-center overflow-hidden"
      >
        <button
          type="button"
          onClick={handleTapBuddy}
          aria-label={
            isId
              ? "Tap karakter untuk ubah bentuk atau berbincang"
              : "Tap buddy to morph body form or chat"
          }
          className="w-full h-full flex items-center justify-center cursor-pointer outline-none active:scale-95 transition-transform duration-150"
        >
          <div key={hopCount} className={hopCount > 0 ? "buddy-hop" : ""}>
            <BuddyCharacter form={activeForm} />
          </div>
        </button>
      </div>

      {/* RPG Typewriter Speech Box (Fixed text height via invisible untyped remainder -> zero layout jitter) */}
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
              {isReassurance && !thankedReply ? (
                <>
                  <button
                    type="button"
                    onClick={handleThanks}
                    className="h-7 px-3.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold hover:opacity-90 transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Makasih" : "Thanks"}
                  </button>
                  <button
                    type="button"
                    onClick={handleHide}
                    className="h-7 px-3 rounded-full bg-zinc-300/75 dark:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold hover:bg-zinc-300 dark:hover:bg-white/[0.16] transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Tutup" : "Hide"}
                  </button>
                </>
              ) : (
                <>
                  {!expanded && Boolean(shown.detail) && !thankedReply && (
                    <button
                      type="button"
                      onClick={handleTellMeMore}
                      className="h-7 px-3.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold hover:opacity-90 transition active:scale-95 cursor-pointer"
                    >
                      {isId ? "Info lanjut" : "Tell me more"}
                    </button>
                  )}

                  {expanded && hasActionLink && (
                    <button
                      type="button"
                      onClick={handleOpenAction}
                      className="h-7 px-3.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold hover:opacity-90 transition active:scale-95 cursor-pointer"
                    >
                      {isId ? "Yuk mulai" : "Let's go"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    className={`h-7 px-3.5 rounded-full text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
                      (expanded && !hasActionLink) || (!shown.detail && !thankedReply) || thankedReply
                        ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90"
                        : "bg-zinc-300/80 dark:bg-white/[0.12] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-white/[0.18]"
                    }`}
                  >
                    {isId ? "Lanjut" : "Next"}
                  </button>

                  <button
                    type="button"
                    onClick={handleHide}
                    className="h-7 px-3 rounded-full bg-zinc-300/60 dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 text-[11px] font-semibold hover:bg-zinc-300/90 dark:hover:bg-white/[0.14] transition active:scale-95 cursor-pointer"
                  >
                    {isId ? "Tutup" : "Hide"}
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
