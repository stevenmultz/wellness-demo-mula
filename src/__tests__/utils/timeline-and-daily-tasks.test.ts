import { describe, expect, it } from "vitest";
import {
  calculateProgramMemoryFootprint,
  formatByteSize,
  getPublicBadgeMeta,
  normalizeProgramStatus,
  resolveProgramStatus,
  resolvePublicBadge,
  toPrismaProgramStatus,
} from "@/wellness/utils/timeline";
import {
  buildDayTasks,
  getWibDayStartMs,
  resolveProgramDailyPlan,
  type DailyTaskDayInput,
} from "@/wellness/utils/daily-tasks";

describe("Utils: Program Timeline & Status Resolution", () => {
  it("normalizes DB and Prisma program status aliases accurately", () => {
    expect(toPrismaProgramStatus("PUBLISH")).toBe("PUBLISHED");
    expect(toPrismaProgramStatus("ACTIVE")).toBe("PUBLISHED");
    expect(toPrismaProgramStatus("REVIEW")).toBe("OPEN");
    expect(toPrismaProgramStatus("READY")).toBe("OPEN");
    expect(toPrismaProgramStatus("FINISHED")).toBe("DONE");
    expect(toPrismaProgramStatus("NOT_SHOW")).toBe("ARCHIVED");
    expect(toPrismaProgramStatus(null)).toBe("DRAFT");

    expect(normalizeProgramStatus("PUBLISHED")).toBe("PUBLISH");
    expect(normalizeProgramStatus("IN_REVIEW")).toBe("REVIEW");
    expect(normalizeProgramStatus("READY")).toBe("OPEN");
    expect(normalizeProgramStatus("DONE")).toBe("DONE");
    expect(normalizeProgramStatus("ARCHIVED")).toBe("ARCHIVE");
    expect(normalizeProgramStatus("UNKNOWN")).toBe("DRAFT");
  });

  it("resolves all 6 public badges across the HYBRID lifecycle and 2 ONLINE badges", () => {
    expect(resolvePublicBadge({ status: "DRAFT" })).toBeNull();

    // ONLINE anytime programs
    expect(
      resolvePublicBadge({ status: "PUBLISH", locationType: "ONLINE", maxQuota: 10, enrolledCount: 5 })
    ).toBe("Open Registration");
    expect(
      resolvePublicBadge({ status: "PUBLISH", locationType: "ONLINE", maxQuota: 10, enrolledCount: 10 })
    ).toBe("Full");

    // HYBRID fixed-schedule lifecycle
    const hybrid = {
      status: "PUBLISHED",
      locationType: "HYBRID",
      registrationOpenDate: "2026-06-01T00:00:00Z",
      registrationDeadline: "2026-06-10T16:59:59Z",
      startDate: "2026-06-15T00:00:00Z",
      endDate: "2026-07-05T16:59:59Z",
      maxQuota: 20,
      enrolledCount: 5,
    };

    expect(resolvePublicBadge({ ...hybrid, now: new Date("2026-05-20T00:00:00Z") })).toBe(
      "Coming Soon"
    );
    expect(resolvePublicBadge({ ...hybrid, now: new Date("2026-06-05T00:00:00Z") })).toBe(
      "Open Registration"
    );
    expect(
      resolvePublicBadge({ ...hybrid, enrolledCount: 20, now: new Date("2026-06-05T00:00:00Z") })
    ).toBe("Full");
    expect(resolvePublicBadge({ ...hybrid, now: new Date("2026-06-12T00:00:00Z") })).toBe(
      "Close Registration"
    );
    expect(resolvePublicBadge({ ...hybrid, now: new Date("2026-06-20T00:00:00Z") })).toBe(
      "On going"
    );
    expect(resolvePublicBadge({ ...hybrid, now: new Date("2026-07-10T00:00:00Z") })).toBe("End");
  });

  it("maps resolveProgramStatus and getPublicBadgeMeta for every administrative state", () => {
    expect(getPublicBadgeMeta("Open Registration").canEnroll).toBe(true);
    expect(getPublicBadgeMeta("Full").canEnroll).toBe(false);
    expect(getPublicBadgeMeta("Coming Soon").canEnroll).toBe(false);
    expect(getPublicBadgeMeta("Close Registration").canEnroll).toBe(false);
    expect(getPublicBadgeMeta("On going").canEnroll).toBe(false);
    expect(getPublicBadgeMeta("End").canEnroll).toBe(false);

    const draftIncomplete = resolveProgramStatus({
      status: "DRAFT",
      headerComplete: false,
      curriculumComplete: false,
    });
    expect(draftIncomplete).toMatchObject({
      authoringStatus: "CONCEPT",
      canPublish: false,
      canEnroll: false,
    });

    const draftReady = resolveProgramStatus({
      status: "DRAFT",
      headerComplete: true,
      curriculumComplete: true,
    });
    expect(draftReady).toMatchObject({
      authoringStatus: "READY",
      dbStatus: "REVIEW",
      canPublish: true,
    });

    const reviewRes = resolveProgramStatus({ status: "OPEN" });
    expect(reviewRes).toMatchObject({ dbStatus: "REVIEW", canPublish: true });

    const doneRes = resolveProgramStatus({ status: "DONE" });
    expect(doneRes).toMatchObject({ dbStatus: "DONE", timelinePhase: "FINISHED", isLocked: true });

    const archiveRes = resolveProgramStatus({ status: "ARCHIVE" });
    expect(archiveRes).toMatchObject({ dbStatus: "ARCHIVE", canPublish: false, canEnroll: false });

    const liveRes = resolveProgramStatus({
      status: "PUBLISH",
      locationType: "ONLINE",
      maxQuota: 10,
      enrolledCount: 2,
    });
    expect(liveRes).toMatchObject({
      authoringStatus: "PUBLISHED",
      timelinePhase: "ENROLLMENT_OPEN",
      canEnroll: true,
      isLocked: true,
    });
  });

  it("computes human-readable byte sizes and program memory footprint safely", () => {
    expect(formatByteSize(512)).toBe("512 B");
    expect(formatByteSize(2048)).toBe("2.0 KB");
    expect(formatByteSize(2 * 1024 * 1024)).toBe("2.00 MB");

    expect(calculateProgramMemoryFootprint(null)).toEqual({
      bytes: 0,
      formatted: "0 B",
      daysCount: 0,
      estimatedMemoryKb: 0,
    });

    const fp = calculateProgramMemoryFootprint({ id: "p1", days: [{ id: "d1" }, { id: "d2" }] });
    expect(fp.daysCount).toBe(2);
    expect(fp.bytes).toBeGreaterThan(20);
  });
});

describe("Utils: Daily Tasks Resolution (WIB)", () => {
  const makeDay = (overrides: Partial<DailyTaskDayInput>): DailyTaskDayInput => ({
    id: "d1",
    dayNumber: 1,
    title: "Core Alignment",
    dayType: "TRAINING_DAY",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    mealRecommendation: "High protein breakfast",
    restInstructions: null,
    eventTitle: null,
    eventDetails: null,
    progress: null,
    ...overrides,
  });

  it("builds task lists accurately for TRAINING_DAY, REST_DAY, CONNECTION_DAY, and customTasks", () => {
    const trainingTasks = buildDayTasks(
      makeDay({
        progress: {
          videoWatched: true,
          isCompleted: false,
          mealCompliance: "FULL",
          dailyReflection: "Felt energized",
          bedtime: "22:30",
          wakeTime: "06:00",
        },
        customTasks: [
          { id: "ct1", title: "Weigh-in", instructions: "Morning weight", isDone: true },
        ],
      })
    );
    expect(trainingTasks.map((t) => [t.kind, t.isDone])).toEqual([
      ["SLEEP", true],
      ["WORKOUT", true],
      ["MEAL", true],
      ["REFLECTION", true],
      ["CUSTOM", true],
    ]);

    const restTasks = buildDayTasks(
      makeDay({
        id: "d2",
        dayType: "REST_DAY",
        restInstructions: "20-minute sunlight walk",
        progress: {
          videoWatched: false,
          isCompleted: false,
          mealCompliance: null,
          dailyReflection: null,
          bedtime: "SKIPPED",
          checklistCompleted: JSON.stringify(["Walk"]),
        },
      })
    );
    expect(restTasks.find((t) => t.kind === "SLEEP")?.isDone).toBe(true);
    expect(restTasks.find((t) => t.kind === "REST")?.isDone).toBe(true);
    expect(restTasks.find((t) => t.kind === "MEAL")?.isDone).toBe(false);

    const eventTasks = buildDayTasks(
      makeDay({
        id: "d3",
        dayType: "CONNECTION_DAY",
        eventTitle: "Live Q&A Circle",
        progress: {
          videoWatched: false,
          isCompleted: false,
          mealCompliance: null,
          dailyReflection: null,
          eventFeedback: "Great session",
        },
      })
    );
    expect(eventTasks.find((t) => t.kind === "EVENT")?.isDone).toBe(true);
  });

  it("resolves distinct today and tomorrow windows for HYBRID cohorts by WIB date", () => {
    const start = "2026-06-01T00:00:00.000Z"; // Day 1 = June 1 WIB, Day 2 = June 2 WIB
    const days = [
      makeDay({ id: "d1", dayNumber: 1, title: "Day 1" }),
      makeDay({ id: "d2", dayNumber: 2, title: "Day 2" }),
      makeDay({ id: "d3", dayNumber: 3, title: "Day 3" }),
    ];

    // June 1 2026, 08:00 WIB == 2026-06-01T01:00:00.000Z
    const now = new Date("2026-06-01T01:00:00.000Z");
    expect(new Date(getWibDayStartMs(now)).toISOString()).toBe("2026-05-31T17:00:00.000Z");

    const plan = resolveProgramDailyPlan("prog_hybrid", start, days, now, "HYBRID");
    expect(plan.today?.dayNumber).toBe(1);
    expect(plan.tomorrow?.dayNumber).toBe(2);
    expect(plan.today?.tasks[0].id).not.toBe(plan.tomorrow?.tasks[0].id);
  });

  it("surfaces next uncompleted day as today for self-paced ONLINE programs", () => {
    const days = [
      makeDay({
        id: "d1",
        dayNumber: 1,
        title: "Day 1",
        progress: { videoWatched: true, isCompleted: true, mealCompliance: "FULL", dailyReflection: "Ok" },
      }),
      makeDay({ id: "d2", dayNumber: 2, title: "Day 2", progress: null }),
      makeDay({ id: "d3", dayNumber: 3, title: "Day 3", progress: null }),
    ];

    const plan = resolveProgramDailyPlan("prog_online", null, days, new Date(), "ONLINE");
    expect(plan.today?.dayNumber).toBe(2);
    expect(plan.tomorrow?.dayNumber).toBe(3);
  });
});
