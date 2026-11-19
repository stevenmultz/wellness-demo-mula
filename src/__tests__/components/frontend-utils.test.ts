import { describe, expect, it } from "vitest";
import {
  EMPTY,
  FORMAT_OPTIONS,
  availabilityOf,
  categoriesOf,
  coachAvatarFor,
  computeSupportedFilterOptions,
  countActive,
  durationOf,
  experienceOf,
  intensityOf,
  matches,
  priceBand,
  scheduleOf,
  splitCoachTokens,
  type ExploreProgram,
} from "@/components/dashboard/tabs/explore/exploreFilters";
import {
  calcSleepMins,
  checkedList,
  evaluateDayTaskState,
  formatDayTypeLabel,
  formatIntensityBadge,
  formatMealNoteSummary,
  formatShortDayDate,
  formatSleepHours,
  formatStartsIn,
  movementNames,
  splitActivities,
  type PlanDay,
} from "@/components/dashboard/tabs/my-plan/myPlanUtils";
import {
  buildAdminBreadcrumbs,
  extractPendingEnrollments,
  filterAndSortAdminMembers,
  filterAndSortAdminPrograms,
} from "@/components/admin/adminListUtils";
import type { AdminProgram, AdminUserItem } from "@/components/admin/adminTypes";

const sampleProgram = (overrides: Partial<ExploreProgram> = {}): ExploreProgram => ({
  id: "p1",
  title: "21-Day Breathwork",
  coverImage: null,
  coachName: "Coach Julian",
  startDate: null,
  endDate: null,
  registrationDeadline: null,
  price: 0,
  durationDays: 14,
  locationType: "ONLINE",
  city: null,
  seatsLeft: 12,
  badge: "Open Registration",
  canEnroll: true,
  enrollmentStatus: null,
  difficultyLevel: "INTERMEDIATE",
  category: "Breathwork, Mental Wellness",
  dailyCommitment: "15 mins/day",
  ...overrides,
});

describe("Frontend Utils: Explore Catalog Filters", () => {
  it("categorizes prices, intensities, experiences, durations, schedules, and availabilities", () => {
    expect(FORMAT_OPTIONS.map((o) => o.id)).toEqual(["ONLINE", "HYBRID"]);
    expect(priceBand(0)).toBe("free");
    expect(priceBand(50_000)).toBe("u100");
    expect(priceBand(150_000)).toBe("100-300");
    expect(priceBand(450_000)).toBe("300-500");
    expect(priceBand(750_000)).toBe("500+");

    expect(intensityOf("BEGINNER")).toBe("Low");
    expect(intensityOf("MODERATE")).toBe("Moderate");
    expect(intensityOf("INTERMEDIATE")).toBe("Moderate");
    expect(intensityOf("ADVANCED")).toBe("High");
    expect(intensityOf("HIGH_INTENSITY")).toBe("Very High");

    expect(durationOf(7)).toBe("7 Days");
    expect(durationOf(21)).toBe("Custom Duration");
    expect(durationOf(90)).toBe("90 Days");

    expect(experienceOf(sampleProgram({ difficultyLevel: "BEGINNER" }))).toEqual(["Beginner"]);
    expect(experienceOf(sampleProgram({ difficultyLevel: "All Levels" }))).toEqual(["All Levels"]);
    expect(categoriesOf(sampleProgram())).toEqual(["Breathwork", "Mental Wellness"]);

    expect(scheduleOf(sampleProgram({ locationType: "ONLINE" }))).toBe("Flexible Schedule");
    expect(scheduleOf(sampleProgram({ locationType: "HYBRID" }))).toBe("Fixed Schedule");

    expect(availabilityOf(sampleProgram({ enrollmentStatus: "ACTIVE" }))).toBe("Enrolled");
    expect(availabilityOf(sampleProgram({ canEnroll: true }))).toBe("Open Registration");
    expect(availabilityOf(sampleProgram({ canEnroll: false }))).toBe("Full / Closed");
  });

  it("deduplicates coach tokens, counts active filters, matches programs, and computes supported options", () => {
    expect(splitCoachTokens("Coach Sarah, Coach Julian, coach sarah")).toEqual([
      "Coach Sarah",
      "Coach Julian",
    ]);
    expect(coachAvatarFor("Dr. Marcus Vance")).toBe("/coach2.webp");
    expect(coachAvatarFor("Elena Rostova")).toBe("/coach3.webp");
    expect(coachAvatarFor("Coach Julian")).toBe("/coach.webp");

    const pOnline = sampleProgram({ id: "p1", locationType: "ONLINE", price: 0, durationDays: 7 });
    const pHybrid = sampleProgram({
      id: "p2",
      locationType: "HYBRID",
      price: 350_000,
      durationDays: 30,
      difficultyLevel: "ADVANCED",
      category: "Pilates",
    });

    const f = { ...EMPTY, format: ["HYBRID"], price: ["300-500"], intensity: ["High"] };
    expect(countActive(f)).toBe(3);
    expect(matches(pHybrid, f)).toBe(true);
    expect(matches(pOnline, f)).toBe(false);

    const supported = computeSupportedFilterOptions([pOnline, pHybrid]);
    expect(supported.format.map((x) => x.id)).toEqual(["ONLINE", "HYBRID"]);
    expect(supported.category).toEqual(["Breathwork", "Mental Wellness", "Pilates"]);
    expect(supported.duration).toEqual(["7 Days", "30 Days"]);
  });
});

describe("Frontend Utils: My Plan & Daily Check-In Helpers", () => {
  it("formats day types, intensity badges, sleep hours, and relative start dates in EN & ID", () => {
    expect(formatDayTypeLabel("TRAINING_DAY", "en")).toBe("Training Day");
    expect(formatDayTypeLabel("TRAINING_DAY", "id")).toBe("Hari Latihan");
    expect(formatDayTypeLabel("REST_DAY", "id")).toBe("Hari Istirahat");
    expect(formatDayTypeLabel("MEETUP_DAY", "en")).toBe("Meetup Day");
    expect(formatDayTypeLabel(null)).toBeNull();

    expect(formatIntensityBadge("HIGH_INTENSITY", "en")).toContain("Intensity");
    expect(formatIntensityBadge("ADVANCED", "id")).toBe("Intensitas Tinggi");
    expect(formatIntensityBadge("BEGINNER", "en")).toBe("Low Intensity");

    expect(calcSleepMins("23:00", "06:30")).toBe(450);
    expect(calcSleepMins("00:00", "00:00")).toBe(1440);
    expect(calcSleepMins("bad", "06:00")).toBe(0);
    expect(formatSleepHours(450)).toBe("7h 30m");
    expect(formatSleepHours(0)).toBe("—");

    expect(formatStartsIn(null, "id")).toEqual({
      headline: "Akses Kapan Saja",
      dateLabel: "Jadwal Fleksibel",
    });
    expect(formatShortDayDate(undefined, 3)).toBe("Day 3");
    expect(formatShortDayDate("2026-06-01T00:00:00Z", 1)).toMatch(/Jun/);
  });

  it("summarizes structured JSON meal notes and splits activity bullets", () => {
    expect(splitActivities("- Morning walk\n• Hydrate 2L\n3. Stretch 10 mins")).toEqual([
      "Morning walk",
      "Hydrate 2L",
      "Stretch 10 mins",
    ]);

    expect(
      formatMealNoteSummary(
        JSON.stringify({
          mealEntries: [{ status: "followed" }, { status: "followed" }, { status: "off" }],
          mealFeeling: "Light & energetic",
        })
      )
    ).toBe("2/3 meals followed · Feeling: Light & energetic");

    expect(formatMealNoteSummary(JSON.stringify({ mode: "similar" }))).toBe(
      "Followed similar whole-food meals"
    );
    expect(formatMealNoteSummary("Ate clean salad")).toBe("Ate clean salad");
    expect(formatMealNoteSummary("")).toBeNull();
  });

  it("evaluates day task completion state including required custom tasks", () => {
    const day: PlanDay = {
      id: "d1",
      dayNumber: 1,
      title: "Core Flow",
      dayType: "TRAINING_DAY",
      unlockDate: "2026-06-01T00:00:00Z",
      isCalendarUnlocked: true,
      isPast2359: false,
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      videoChecklist: ["[Pilates] Roll Up = 12 reps", "[Pilates] Plank = 60s"],
      workoutOptions: ["Pilates"],
      mealRecommendation: "High protein",
      meetupLink: null,
      onsiteVenue: null,
      onsiteSchedule: null,
      restInstructions: null,
      customTasks: [
        {
          id: "ct1",
          sortOrder: 0,
          taskType: "MEASUREMENT",
          title: "Weight",
          instructions: null,
          isRequired: true,
          fields: [],
          submission: null,
        },
      ],
      userProgress: {
        videoWatched: true,
        isCompleted: false,
        checklistCompleted: JSON.stringify(["[Pilates] Roll Up", "[Pilates] Plank"]),
        selectedWorkout: "Pilates",
        mealCompliance: "FULL",
        dailyReflection: "Great morning!",
        bedtime: "22:30",
        wakeTime: "06:00",
      },
    };

    expect(movementNames(day)).toEqual(["Roll Up", "Plank"]);
    expect(checkedList(day, undefined)).toHaveLength(2);

    const state = evaluateDayTaskState(day);
    expect(state.initialDone).toEqual([true, true, true, true]);
    // 1 pending required custom task
    expect(state.pendingTasksCount).toBe(1);
  });
});

describe("Frontend Utils: Admin List Filtering, Sorting & Breadcrumbs", () => {
  const mkProgram = (overrides: Partial<AdminProgram>): AdminProgram =>
    ({
      id: "p1",
      title: "Alpha Core",
      coachName: "Coach Julian",
      status: "DRAFT",
      isPublished: false,
      price: 100_000,
      durationDays: 7,
      startDate: "2026-06-01T00:00:00Z",
      days: [],
      ...overrides,
    }) as AdminProgram;

  const mkUser = (overrides: Partial<AdminUserItem>): AdminUserItem =>
    ({
      id: "u1",
      fullName: "Budi Santoso",
      email: "budi@zera.id",
      phone: "08123456789",
      role: "USER",
      status: "ACTIVE",
      createdAt: "2026-05-01T00:00:00Z",
      enrollments: [],
      ...overrides,
    }) as AdminUserItem;

  it("filters and sorts admin programs by search, status, title, and price", () => {
    const programs = [
      mkProgram({ id: "1", title: "Zebra Flow", status: "PUBLISH", price: 300_000 }),
      mkProgram({ id: "2", title: "Alpha Pilates", status: "DRAFT", price: 100_000 }),
      mkProgram({ id: "3", title: "Beta Strength", status: "PUBLISH", price: 200_000 }),
    ];

    expect(
      filterAndSortAdminPrograms(programs, "", "PUBLISH", "PRICE_ASC").map((p) => p.id)
    ).toEqual(["3", "1"]);
    expect(
      filterAndSortAdminPrograms(programs, "alpha", "ALL", "TITLE_ASC").map((p) => p.id)
    ).toEqual(["2"]);
  });

  it("filters admin members and extracts pending QRIS enrollments", () => {
    const users = [
      mkUser({
        id: "u1",
        fullName: "Citra",
        status: "ACTIVE",
        enrollments: [
          {
            id: "e1",
            status: "PENDING",
            paymentReference: "QRIS-123",
            program: { id: "p1", title: "Core", price: 150_000 },
          },
        ] as AdminUserItem["enrollments"],
      }),
      mkUser({ id: "u2", fullName: "Admin", role: "SUPERADMIN", status: "ACTIVE" }),
      mkUser({ id: "u3", fullName: "Banned", status: "SUSPENDED" }),
    ];

    expect(filterAndSortAdminMembers(users, "", "PENDING", "NAME_ASC").map((u) => u.id)).toEqual([
      "u1",
    ]);
    expect(filterAndSortAdminMembers(users, "", "SUPERADMIN", "NAME_ASC").map((u) => u.id)).toEqual([
      "u2",
    ]);
    expect(filterAndSortAdminMembers(users, "", "SUSPENDED", "NAME_ASC").map((u) => u.id)).toEqual([
      "u3",
    ]);

    const pending = extractPendingEnrollments(users);
    expect(pending).toEqual([
      {
        id: "e1",
        userFullName: "Citra",
        userEmail: "budi@zera.id",
        userPhone: "08123456789",
        programTitle: "Core",
        amountPaid: 150_000,
        paymentRef: "QRIS-123",
      },
    ]);
  });

  it("builds accurate breadcrumb trails across Admin views", () => {
    const noop = () => undefined;
    const crumbs = buildAdminBreadcrumbs({
      activeMenu: "programs",
      isCreatingProgram: false,
      selectedProgram: mkProgram({ title: "21-Day Breath" }),
      programDetailTab: "schedule",
      masterTab: "coaches",
      inspectingUserHealth: null,
      customerModalTab: "overview",
      onGoRoot: noop,
      onGoPrograms: noop,
      onSelectScheduleTab: noop,
      onGoDirectoriesCoaches: noop,
      onCloseCustomerDetail: noop,
      onSwitchCustomerOverview: noop,
    });

    expect(crumbs.map((c) => c.label)).toEqual([
      "Admin",
      "Programs",
      "21-Day Breath",
      "Curriculum Schedule",
    ]);
    expect(crumbs[crumbs.length - 1].isCurrent).toBe(true);
  });
});
