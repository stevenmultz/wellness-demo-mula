import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAuth, mockTx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    programDayCustomSubmission: { upsert: vi.fn() },
    $executeRaw: vi.fn(),
  };
  const prisma = {
    programDayCustomTask: { findUnique: vi.fn() },
    programEnrollment: { findUnique: vi.fn() },
    programDayCustomSubmission: { findUnique: vi.fn() },
    programDayProgress: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };
  return {
    mockRequireAuth: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/wellness/security/guards", () => ({
  requireAuth: mockRequireAuth,
  requireProgramAccess: vi.fn(),
}));
vi.mock("@/wellness/db", () => ({ prisma: mockPrisma }));

import { wellnessUserSubmitCustomTask } from "@/wellness/actions/custom-tasks";

describe("Server Actions: Custom Task Submissions & Atomic Body Metrics Upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T03:00:00.000Z")); // 10:00 WIB
    mockRequireAuth.mockResolvedValue({ userId: "u_1", role: "USER" });
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects mismatched programDayId, inactive enrollment, and unsafe field values", async () => {
    // Mismatched programDayId
    mockPrisma.programDayCustomTask.findUnique.mockResolvedValueOnce({
      id: "ct_1",
      programDayId: "day_other",
      programDay: { programId: "p1", dayNumber: 1, program: { locationType: "ONLINE", startAt: null } },
    });
    expect(
      (await wellnessUserSubmitCustomTask({ programDayId: "day_1", customTaskId: "ct_1", values: {} }))
        .success
    ).toBe(false);

    // Inactive enrollment
    mockPrisma.programDayCustomTask.findUnique.mockResolvedValueOnce({
      id: "ct_1",
      programDayId: "day_1",
      programDay: { programId: "p1", dayNumber: 1, program: { locationType: "ONLINE", startAt: null } },
    });
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({ status: "PENDING" });
    expect(
      (await wellnessUserSubmitCustomTask({ programDayId: "day_1", customTaskId: "ct_1", values: {} }))
        .success
    ).toBe(false);
  });

  it("atomically upserts MEASUREMENT submissions into user_body_metric_logs and blocks XSS photos", async () => {
    const measurementTask = {
      id: "ct_measure",
      programDayId: "day_1",
      title: "Body Measurement",
      taskType: "MEASUREMENT",
      fieldsSchemaJson: [
        { key: "weightKg", label: "Body Weight", type: "number", min: 20, max: 300, required: true },
        { key: "photoUrl", label: "Photo", type: "photo", required: false },
      ],
      programDay: {
        programId: "p1",
        dayNumber: 1,
        program: { locationType: "ONLINE", startAt: null },
      },
    };

    // XSS photo rejected before DB write
    mockPrisma.programDayCustomTask.findUnique.mockResolvedValueOnce(measurementTask);
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({ status: "ACTIVE" });
    mockPrisma.programDayCustomSubmission.findUnique.mockResolvedValueOnce(null);
    mockPrisma.programDayProgress.findUnique.mockResolvedValueOnce(null);
    const xssRes = await wellnessUserSubmitCustomTask({
      programDayId: "day_1",
      customTaskId: "ct_measure",
      values: { weightKg: 65, photoUrl: "javascript:alert(1)" },
    });
    expect(xssRes.success).toBe(false);
    expect(mockTx.programDayCustomSubmission.upsert).not.toHaveBeenCalled();

    // Valid measurement triggers submission upsert AND atomic SQL upsert into user_body_metric_logs
    mockPrisma.programDayCustomTask.findUnique.mockResolvedValueOnce(measurementTask);
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({ status: "ACTIVE" });
    mockPrisma.programDayCustomSubmission.findUnique.mockResolvedValueOnce(null);
    mockPrisma.programDayProgress.findUnique.mockResolvedValueOnce(null);
    const now = new Date();
    mockTx.programDayCustomSubmission.upsert.mockResolvedValueOnce({
      id: "sub_1",
      customTaskId: "ct_measure",
      valuesJson: { weightKg: 65.5 },
      submittedAt: now,
      updatedAt: now,
    });

    const okRes = await wellnessUserSubmitCustomTask({
      programDayId: "day_1",
      customTaskId: "ct_measure",
      values: { weightKg: "65.5" },
    });
    expect(okRes.success).toBe(true);
    expect(mockTx.$executeRaw).toHaveBeenCalledOnce();
  });
});
