import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAuth, mockPrisma } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockPrisma: {
    programEnrollment: { findMany: vi.fn() },
    trackingPassOrder: { findMany: vi.fn() },
  },
}));

vi.mock("@/wellness/security/guards", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
}));

import { wellnessGetHistory } from "@/wellness/actions/activity";
import { getSuperadminConfig } from "@/wellness/config";
import {
  hasProgramDayActivityInput,
  isMealLogged,
  isMovementChecked,
  isSleepLogged,
  normalizeProgramDayType,
} from "@/wellness/utils/day-completion";
import { hashEmailForAudit } from "@/wellness/services/user-governance";

describe("Centralized Core: Payment History, Superadmin Default & Day-Completion Predicates", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: "u_1", email: "member@zera.id", role: "USER" });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults SUPERADMIN_EMAIL to stevenmultz@gmail.com when env var is unset", () => {
    delete process.env.SUPERADMIN_EMAIL;
    expect(getSuperadminConfig().email).toBe("stevenmultz@gmail.com");
  });

  it("PAY-01: returns BOTH Program Enrollments and Tracking Pass Orders using immutable transaction grossAmount", async () => {
    mockPrisma.programEnrollment.findMany.mockResolvedValueOnce([
      {
        id: "enr_1",
        status: "ACTIVE",
        paymentReference: "QRIS-PROG-1",
        paidAt: new Date("2026-10-01T10:00:00.000Z"),
        createdAt: new Date("2026-10-01T09:00:00.000Z"),
        updatedAt: new Date("2026-10-01T10:00:00.000Z"),
        validUntilAt: null,
        // Live price was raised to 999_000 AFTER member paid 250_000!
        program: { title: "21-Day Mobility", price: 999_000 },
        transactions: [
          {
            grossAmount: 250_000,
            status: "SETTLEMENT",
            settledAt: new Date("2026-10-01T10:00:00.000Z"),
            orderId: "QRIS-PROG-1",
          },
        ],
      },
    ]);

    mockPrisma.trackingPassOrder.findMany.mockResolvedValueOnce([
      {
        id: "pass_1",
        status: "ACTIVE",
        paymentReference: "QRIS-PASS-1",
        durationDaysSnapshot: 180,
        priceSnapshot: 500_000,
        paidAt: new Date("2026-11-01T10:00:00.000Z"),
        createdAt: new Date("2026-11-01T09:00:00.000Z"),
        updatedAt: new Date("2026-11-01T10:00:00.000Z"),
        plan: { name: "6-Month Tracking Pass", durationDays: 180 },
        transactions: [
          {
            grossAmount: 500_000,
            status: "SETTLEMENT",
            settledAt: new Date("2026-11-01T10:00:00.000Z"),
            orderId: "QRIS-PASS-1",
          },
        ],
      },
    ]);

    const res = await wellnessGetHistory();
    expect(res.success).toBe(true);
    expect(res.data?.payments).toHaveLength(2);

    // Chronological descending: Nov Tracking Pass first, Oct Program second
    expect(res.data?.payments[0]).toMatchObject({
      enrollmentId: "pass_1",
      itemType: "TRACKING_PASS",
      amount: 500_000,
      statusLabel: "Paid",
    });
    expect(res.data?.payments[1]).toMatchObject({
      enrollmentId: "enr_1",
      itemType: "PROGRAM_ENROLLMENT",
      // Must display immutable settled 250_000, NOT live mutated 999_000!
      amount: 250_000,
      statusLabel: "Paid",
    });
  });

  it("Pintu 6: evaluates unified day-completion predicates and PII-safe audit email hashes", () => {
    expect(normalizeProgramDayType("ONLINE", "CONNECTION_DAY")).toBe("REST_DAY");
    expect(normalizeProgramDayType("ONLINE", "MEETUP_DAY")).toBe("REST_DAY");
    expect(normalizeProgramDayType("HYBRID", "CONNECTION_DAY")).toBe("CONNECTION_DAY");

    expect(isSleepLogged("22:30", "06:30")).toBe(true);
    expect(isSleepLogged("SKIPPED", "06:30")).toBe(false);
    expect(isMealLogged("FULL")).toBe(true);
    expect(isMealLogged("SKIPPED")).toBe(false);

    expect(isMovementChecked(["[Hot Pilates] Plank=60s"], "Hot Pilates", "Plank")).toBe(true);
    expect(isMovementChecked(["[Strength] Plank=60s"], "Hot Pilates", "Plank")).toBe(false);
    expect(isMovementChecked(["Foam Rolling"], null, "foam rolling")).toBe(true);

    expect(hasProgramDayActivityInput("TRAINING_DAY", { isVideoWatched: true })).toBe(true);
    expect(hasProgramDayActivityInput("REST_DAY", { workoutNotes: "Walked 25m" })).toBe(true);
    expect(hasProgramDayActivityInput("CONNECTION_DAY", { eventFeedback: "SKIPPED" })).toBe(false);

    const h = hashEmailForAudit("User@Example.COM");
    expect(h).toHaveLength(16);
    expect(h).not.toContain("example");
  });
});
