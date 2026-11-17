export interface ExploreProgram {
  id: string;
  title: string;
  coverImage: string | null;
  coachName: string;
  organizationName?: string | null;
  organizationLogo?: string | null;
  organizationVerified?: boolean;
  language?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  price: number;
  actualPrice?: number;
  discountPercentage?: number;
  durationDays: number;
  locationType: string;
  city: string | null;
  minQuota?: number;
  maxQuota?: number;
  seatsLeft: number;
  badge: string;
  canEnroll: boolean;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
  difficultyLevel: string;
  category: string;
  recommendedFor: string;
  dailyCommitment: string | null;
  trainingDaysTotal?: number;
  connectDaysTotal?: number;
  restDaysTotal?: number;
}

export type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; programs: ExploreProgram[] };

export const PAGE_SIZE = 8;

export const FORMAT_OPTIONS = [
  { id: "ONLINE", label: "Full Online" },
  { id: "HYBRID", label: "Hybrid (Online + Onsite)" },
  { id: "ONSITE", label: "Full Onsite" },
] as const;

export const INTENSITY_OPTIONS = ["Low", "Moderate", "High", "Very High"] as const;
export const CATEGORY_OPTIONS = [
  "Fitness",
  "Nutrition",
  "Mental Wellness",
  "Lifestyle",
  "Personal Development",
] as const;
export const DURATION_OPTIONS = [
  "7 Days",
  "14 Days",
  "30 Days",
  "60 Days",
  "90 Days",
  "Custom Duration",
] as const;
export const PRICE_BANDS = [
  { id: "free", label: "Free" },
  { id: "u100", label: "Under Rp100.000" },
  { id: "100-300", label: "Rp100.000 – 300.000" },
  { id: "300-500", label: "Rp300.000 – 500.000" },
  { id: "500+", label: "Rp500.000+" },
] as const;
export const EXPERIENCE_OPTIONS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All Levels",
] as const;
export const SCHEDULE_OPTIONS = ["Flexible Schedule", "Fixed Schedule"] as const;

export type Filters = {
  format: string[];
  intensity: string[];
  category: string[];
  duration: string[];
  price: string[];
  experience: string[];
  schedule: string[];
};

export const EMPTY: Filters = {
  format: [],
  intensity: [],
  category: [],
  duration: [],
  price: [],
  experience: [],
  schedule: [],
};

export interface SupportedFilterOptions {
  format: Array<(typeof FORMAT_OPTIONS)[number]>;
  intensity: Array<(typeof INTENSITY_OPTIONS)[number]>;
  category: string[];
  duration: Array<(typeof DURATION_OPTIONS)[number]>;
  experience: Array<(typeof EXPERIENCE_OPTIONS)[number]>;
  schedule: Array<(typeof SCHEDULE_OPTIONS)[number]>;
  price: boolean;
}

export function priceBand(amount: number): string {
  if (amount <= 0) return "free";
  if (amount < 100000) return "u100";
  if (amount < 300000) return "100-300";
  if (amount < 500000) return "300-500";
  return "500+";
}

export function intensityOf(level: string): (typeof INTENSITY_OPTIONS)[number] {
  const value = (level || "").toUpperCase();
  if (value.includes("HIGH")) return "Very High";
  if (value === "ADVANCED") return "High";
  if (value === "INTERMEDIATE") return "High";
  if (value === "MODERATE") return "Moderate";
  return "Low";
}

export function experienceOf(program: ExploreProgram): string[] {
  const tags: string[] = [];
  const level = (program.difficultyLevel || "").toUpperCase();
  const text = `${program.recommendedFor || ""} ${program.difficultyLevel || ""}`.toLowerCase();
  if (text.includes("all level")) tags.push("All Levels");
  if (level === "BEGINNER" || text.includes("beginner")) tags.push("Beginner");
  if (
    level === "MODERATE" ||
    level === "INTERMEDIATE" ||
    text.includes("intermediate")
  ) {
    tags.push("Intermediate");
  }
  if (level === "ADVANCED" || level.includes("HIGH") || text.includes("advanced")) {
    tags.push("Advanced");
  }
  return tags;
}

export function categoriesOf(program: ExploreProgram): string[] {
  const raw = (program.category || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function durationOf(days: number): string {
  if (days === 7) return "7 Days";
  if (days === 14) return "14 Days";
  if (days === 30) return "30 Days";
  if (days === 60) return "60 Days";
  if (days === 90) return "90 Days";
  return "Custom Duration";
}

export function scheduleOf(program: ExploreProgram): string | null {
  const text = `${program.dailyCommitment || ""} ${program.recommendedFor || ""}`.toLowerCase();
  if (text.includes("flex")) return "Flexible Schedule";
  if (text.includes("fixed")) return "Fixed Schedule";
  return null;
}

export function countActive(f: Filters): number {
  return (
    f.format.length +
    f.intensity.length +
    f.category.length +
    f.duration.length +
    f.price.length +
    f.experience.length +
    f.schedule.length
  );
}

export function matches(program: ExploreProgram, f: Filters): boolean {
  if (f.format.length && !f.format.includes(program.locationType)) return false;
  if (f.intensity.length && !f.intensity.includes(intensityOf(program.difficultyLevel))) {
    return false;
  }
  if (
    f.category.length &&
    !categoriesOf(program).some((c) =>
      f.category.some((sel) => sel.trim().toLowerCase() === c.trim().toLowerCase())
    )
  ) {
    return false;
  }
  if (f.duration.length && !f.duration.includes(durationOf(program.durationDays))) {
    return false;
  }
  if (
    f.experience.length &&
    !experienceOf(program).some((e) => f.experience.includes(e))
  ) {
    return false;
  }
  if (f.schedule.length) {
    const s = scheduleOf(program);
    if (!s || !f.schedule.includes(s)) return false;
  }
  if (f.price.length && !f.price.includes(priceBand(program.price))) return false;
  return true;
}

export function computeSupportedFilterOptions(
  catalog: ExploreProgram[]
): SupportedFilterOptions {
  const formats = new Set(catalog.map((p) => p.locationType));
  const intensities = new Set(catalog.map((p) => intensityOf(p.difficultyLevel)));
  const categoriesMap = new Map<string, string>();
  for (const name of catalog.flatMap(categoriesOf)) {
    const key = name.toLowerCase();
    if (!categoriesMap.has(key)) categoriesMap.set(key, name);
  }
  const durations = new Set(catalog.map((p) => durationOf(p.durationDays)));
  const experiences = new Set(catalog.flatMap(experienceOf));
  const schedules = new Set(catalog.map(scheduleOf).filter(Boolean) as string[]);

  return {
    format: FORMAT_OPTIONS.filter((o) => formats.has(o.id)),
    intensity: INTENSITY_OPTIONS.filter((o) => intensities.has(o)),
    category: Array.from(categoriesMap.values()).sort((a, b) => a.localeCompare(b)),
    duration: DURATION_OPTIONS.filter((o) => durations.has(o)),
    experience: EXPERIENCE_OPTIONS.filter((o) => experiences.has(o)),
    schedule: SCHEDULE_OPTIONS.filter((o) => schedules.has(o)),
    price: catalog.some((p) => p.price <= 0) || catalog.some((p) => p.price > 0),
  };
}

export function coachAvatarFor(name: string): string {
  const n = (name || "").toLowerCase();
  if (
    n.includes("marcus") ||
    n.includes("vance") ||
    n.includes("nutri") ||
    n.includes("dr.")
  ) {
    return "/coach2.webp";
  }
  if (
    n.includes("elena") ||
    n.includes("rostova") ||
    n.includes("sleep") ||
    n.includes("somatics")
  ) {
    return "/coach3.webp";
  }
  return "/coach.webp";
}
