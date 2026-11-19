import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAuth, mockTx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    programDayProgress: { findUnique: vi.fn(), upsert: vi.fn() },
    programDayCustomTask: { findMany: vi.fn() },
    programDayCustomSubmission: { count: vi.fn() },
  };
  const prisma = {
    programDay: { findUnique: vi.fn() },
    programEnrollment: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };
  return {
    mockRequireAuth: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("@/wellness/security/guards", () => ({
  requireAuth: mockRequireAuth,
  requireProgramAccess: vi.fn(),
}));

vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
}));

import { submitDayProgressService } from "@/wellness/services/program-progress";

describe("Server Service: Daily Progress Submission & WIB Cutoff Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // 2026-06-01 10:00 WIB == 2026-06-01T03:00:00.000Z
    vi.setSystemTime(new Date("2026-06-01T03:00:00.000Z"));
    mockRequireAuth.mockResolvedValue({ userId: "member_1", role: "USER" });
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects invalid schema input and users without ACTIVE enrollment", async () => {
    const badInput = await submitDayProgressService({
      programDayId: "d1",
      isCompleted: true,
      happinessRate: 99,
    });
    expect(badInput.success).toBe(false);

    mockPrisma.programDay.findUnique.mockResolvedValueOnce({
      id: "d1",
      programId: "p1",
      dayNumber: 1,
      dayType: "TRAINING_DAY",
      program: { id: "p1", locationType: "ONLINE", startAt: null },
    });
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({ status: "PENDING" });

    const unpaidRes = await submitDayProgressService({
      programDayId: "d1",
      isCompleted: true,
    });
    expect(unpaidRes.success).toBe(false);
    expect(unpaidRes.message).toContain("Active enrollment is required");
  });

  it("enforces HYBRID 00:00 WIB unlock and 23:59 WIB cutoff windows strictly", async () => {
    // Batch starts 2026-06-01 WIB -> Day 2 unlocks 2026-06-02 00:00 WIB (locked today)
    mockPrisma.programDay.findUnique.mockResolvedValueOnce({
      id: "d2",
      programId: "p_hybrid",
      dayNumber: 2,
      dayType: "TRAINING_DAY",
      program: {
        id: "p_hybrid",
        locationType: "HYBRID",
        startAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    });
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({ status: "ACTIVE" });

    const futureRes = await submitDayProgressService({ programDayId: "d2", isCompleted: true });
    expect(futureRes.success).toBe(false);
    expect(futureRes.message).toContain("unlocks on its scheduled date at 00:00 WIB");

    // Batch started 2026-05-30 WIB -> Day 1 cutoff passed yesterday at 23:59 WIB
    mockPrisma.programDay.findUnique.mockResolvedValueOnce({
      id: "d1_missed",
      programId: "p_hybrid",
      dayNumber: 1,
      dayType: "TRAINING_DAY",
      program: {
        id: "p_hybrid",
        locationType: "HYBRID",
        startAt: new Date("2026-05-30T00:00:00.000Z"),
      },
    });
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({ status: "ACTIVE" });
    mockTx.programDayProgress.findUnique.mockResolvedValueOnce(null);

    const missedRes = await submitDayProgressService({
      programDayId: "d1_missed",
      isCompleted: true,
    });
    expect(missedRes.success).toBe(false);
    expect(missedRes.message).toContain("closed at 23:59 WIB");
  });

  it("prevents client spoofing of isCompleted=true when video/movements/customTasks are incomplete, and calculates sleep across midnight", async () => {
    const trainingDay = {
      id: "d1",
      programId: "p1",
      dayNumber: 1,
      dayType: "TRAINING_DAY",
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      workoutOptionsJson: ["Pilates"],
      videoChecklistJson: ["[Pilates] Roll Up = 12 reps", "[Pilates] Plank = 60s"],
      program: { id: "p1", locationType: "ONLINE", startAt: null },
    };

    // Case 1: Client sends isCompleted=true but videoWatched=false -> server downgrades isCompleted to false
    mockPrisma.programDay.findUnique.mockResolvedValueOnce(trainingDay);
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({ status: "ACTIVE" });
    mockTx.programDayProgress.findUnique.mockResolvedValueOnce(null);
    mockTx.programDayCustomTask.findMany.mockResolvedValueOnce([]);
    mockTx.programDayProgress.upsert.mockImplementationOnce(async ({ create }) => create);

    const spoofRes = await submitDayProgressService({
      programDayId: "d1",
      videoWatched: false,
      isCompleted: true,
      selectedWorkout: "Pilates",
      checklistCompleted: ["[Pilates] Roll Up", "[Pilates] Plank"],
      bedtime: "23:00",
      wakeTime: "06:30",
    });
    expect(spoofRes.success).toBe(true);
    expect(mockTx.programDayProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          isCompleted: false, // Server overrode spoofed true!
          sleepDurationMinutes: 450, // Auto-computed 23:00 -> 06:30
        }),
      })
    );

    // Case 2: All movements & video watched, but 1 required custom task unsubmitted -> isCompleted forced false
    mockPrisma.programDay.findUnique.mockResolvedValueOnce(trainingDay);
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({ status: "ACTIVE" });
    mockTx.programDayProgress.findUnique.mockResolvedValueOnce(null);
    mockTx.programDayCustomTask.findMany.mockResolvedValueOnce([{ id: "ct_req_1" }]);
    mockTx.programDayCustomSubmission.count.mockResolvedValueOnce(0);
    mockTx.programDayProgress.upsert.mockImplementationOnce(async ({ create }) => create);

    await submitDayProgressService({
      programDayId: "d1",
      videoWatched: true,
      isCompleted: true,
      selectedWorkout: "Pilates",
      checklistCompleted: ["[Pilates] Roll Up", "[Pilates] Plank"],
    });
    expect(mockTx.programDayProgress.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isCompleted: false }),
      })
    );
  });
});
