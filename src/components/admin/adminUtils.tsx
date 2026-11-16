import { isProgramDayComplete } from "@/wellness/validators/program";
import type { ProgramTermChapter } from "@/wellness/utils/json";
import type {
  AdminDayFormState,
  AdminProgramDay,
  ProgramHeaderFormState,
} from "./adminTypes";

export function formatDate(dateVal?: Date | string | null): string {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function isDayFilled(day: AdminProgramDay | undefined): boolean {
  if (!day) return false;
  return isProgramDayComplete(day);
}

export function formatWIBDateISO(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().split("T")[0];
  }
}

export function formatWIBTimeDisplay(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "09:00";
  }
}

export function formatWIBDateDisplay(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "Mon, 02 Nov 2026";
  }
}

export function toInputDate(d: Date | string): string {
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return formatWIBDateISO(new Date());
  return formatWIBDateISO(parsed);
}

export function computeEndDate(startIso: string, durationDays: number): string {
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return startIso;
  const end = new Date(
    start.getTime() + Math.max(0, durationDays - 1) * 24 * 3600 * 1000
  );
  return formatWIBDateISO(end);
}

export function parseTagList(val: string | null | undefined): string[] {
  if (!val) return [];
  return val
    .split(/[,•\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stringifyTagList(list: string[]): string {
  return list.filter(Boolean).join(", ");
}

export function toggleTagInList(tag: string, currentVal: string): string {
  const currentTags = parseTagList(currentVal);
  const exists = currentTags.some((t) => t.toLowerCase() === tag.toLowerCase());
  const nextTags = exists
    ? currentTags.filter((t) => t.toLowerCase() !== tag.toLowerCase())
    : [...currentTags, tag];
  return stringifyTagList(nextTags);
}

export function getSectionCardClass(secNum: number, expanded: boolean): string {
  const isEven = secNum % 2 === 0;
  if (isEven) {
    return expanded
      ? "rounded-2xl border transition-all duration-200 overflow-hidden border-zinc-300 dark:border-zinc-600 bg-zinc-200/90 dark:bg-zinc-800/90 shadow-xs"
      : "rounded-2xl border transition-all duration-200 overflow-hidden border-zinc-300 dark:border-zinc-600 bg-zinc-200/80 dark:bg-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-500 shadow-2xs";
  }
  return expanded
    ? "rounded-2xl border transition-all duration-200 overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs"
    : "rounded-2xl border transition-all duration-200 overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs";
}

export function getSectionHeaderClass(secNum: number): string {
  const isEven = secNum % 2 === 0;
  return isEven
    ? "w-full p-5 sm:p-6 flex items-center justify-between text-left bg-zinc-300/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700/80 transition cursor-pointer"
    : "w-full p-5 sm:p-6 flex items-center justify-between text-left bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition cursor-pointer";
}

export function getSectionBadgeClass(secNum: number): string {
  const isEven = secNum % 2 === 0;
  return isEven
    ? "w-6 h-6 rounded-md bg-white text-zinc-950 border border-zinc-500 dark:bg-zinc-950 dark:text-white dark:border-zinc-400 inline-flex items-center justify-center text-[11px] font-bold tracking-tight shadow-2xs shrink-0"
    : "w-6 h-6 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 inline-flex items-center justify-center text-[11px] font-bold tracking-tight shadow-2xs shrink-0";
}

export function renderSectionProgressBadge(filled: number, total: number) {
  const isComplete = total > 0 && filled === total;
  return (
    <span
      className={`text-[10px] font-mono font-medium px-2.5 py-1 rounded-full transition whitespace-nowrap ${
        isComplete
          ? "bg-zinc-50 text-zinc-700 border border-zinc-200 dark:bg-zinc-950/40 dark:text-zinc-400 dark:border-zinc-800/60 font-semibold"
          : filled > 0
          ? "bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/10"
          : "bg-zinc-100/60 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 border border-zinc-200/40 dark:border-white/5"
      }`}
    >
      ( {filled} / {total} )
    </span>
  );
}

export function getProgramSectionStats(
  section: number,
  form: ProgramHeaderFormState
): { filled: number; total: number } {
  switch (section) {
    case 1: {
      const items = [
        Boolean(form.title?.trim()),
        Boolean(form.difficultyLevel?.trim()),
        Boolean(form.coverImage?.trim()),
        Boolean(form.description?.trim()),
      ];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 2: {
      const items = [
        Boolean(form.targetState?.trim()),
        Boolean(form.methodology?.trim()),
        (form.expectedBenefits || []).filter((b) => b.trim()).length > 0,
        (form.scientificReferences || []).filter((r) => r.title.trim()).length > 0,
      ];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 3: {
      const items = [
        parseTagList(form.category || "").length > 0,
        Boolean(form.dailyCommitment?.trim()),
        parseTagList(form.equipment || "").length > 0,
        parseTagList(form.coachName || "").length > 0,
        parseTagList(form.recommendedFor || "").length > 0,
      ];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 4: {
      const items = [
        Boolean(form.startDate),
        Boolean(form.endDate),
        Boolean(form.registrationOpenDate),
        Boolean(form.registrationDeadline),
      ];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 5: {
      if (form.locationType === "ONLINE") {
        return { filled: 1, total: 1 };
      }
      const items = [
        Boolean(form.locationType),
        Boolean(form.city?.trim()),
        Boolean(form.venueAddress?.trim()),
      ];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 6: {
      const items = [
        Boolean(form.maxQuota && Number(form.maxQuota) > 0),
        form.actualPrice !== undefined &&
          form.actualPrice !== null &&
          Number(form.actualPrice) >= 0,
        form.discountPercentage !== undefined && form.discountPercentage !== null,
      ];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 7: {
      const items = [Boolean(form.communityLink?.trim())];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 8: {
      const hasChapters = (form.termsChapters || []).some(
        (c: ProgramTermChapter) =>
          c.chapter.trim().length > 0 && c.clauses.some((cl) => cl.trim().length > 0)
      );
      const hasLegacyTerms = (form.termsList || []).filter((t) => t.trim()).length > 0;
      return { filled: hasChapters || hasLegacyTerms ? 1 : 0, total: 1 };
    }
    default:
      return { filled: 0, total: 0 };
  }
}

export function getDaySectionStats(
  section: number,
  form: AdminDayFormState
): { filled: number; total: number } {
  switch (section) {
    case 1: {
      if (form.dayType === "REST_DAY") {
        const items = [Boolean(form.title?.trim())];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      const items = [
        Boolean(form.title?.trim()),
        Boolean(form.coachName?.trim()),
        Boolean(form.recommendedFor?.trim()),
      ];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 2: {
      if (form.dayType === "TRAINING_DAY") {
        const hasVideos = (form.videoLinks || []).some((v) => v.url.trim().length > 0);
        const hasWorkouts = (form.workoutGroups || []).some(
          (g) =>
            g.optionName.trim().length > 0 &&
            g.movements.some((m) => m.name.trim().length > 0)
        );
        const items = [hasVideos, hasWorkouts];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      if (form.dayType === "REST_DAY") {
        const items = [Boolean(form.restInstructions?.trim())];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      const hasTitle = Boolean(form.eventTitle?.trim() || form.title?.trim());
      const hasLocationOrLink = Boolean(
        (form.onsiteVenue?.trim() && form.onsiteSchedule?.trim()) ||
          form.meetupLink?.trim()
      );
      const items = [hasTitle, hasLocationOrLink];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 3: {
      const items = [Boolean(form.mealRecommendation?.trim())];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 4: {
      const items = [Boolean(form.sleepRecommendation?.trim())];
      return { filled: items.filter(Boolean).length, total: items.length };
    }
    case 5: {
      const notifs = form.dayNotifications || [];
      const total = notifs.length || (form.dayType === "REST_DAY" ? 2 : 3);
      const filled = notifs.filter((n) => Boolean(n.message?.trim())).length;
      return { filled, total };
    }
    case 6: {
      const count = (form.customTasks || []).length;
      return { filled: count, total: Math.max(count, 1) };
    }
    default:
      return { filled: 0, total: 0 };
  }
}
