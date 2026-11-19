import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSetTag, mockSetExtras, mockSetLevel, mockCaptureException, mockCaptureMessage, mockWithScope } =
  vi.hoisted(() => {
    const setTag = vi.fn();
    const setExtras = vi.fn();
    const setLevel = vi.fn();
    const scope = { setTag, setExtras, setLevel };
    return {
      mockSetTag: setTag,
      mockSetExtras: setExtras,
      mockSetLevel: setLevel,
      mockCaptureException: vi.fn(),
      mockCaptureMessage: vi.fn(),
      mockWithScope: vi.fn((cb: (s: typeof scope) => void) => cb(scope)),
    };
  });

vi.mock("@sentry/nextjs", () => ({
  withScope: mockWithScope,
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
}));

import {
  reportCriticalIncident,
  reportServerError,
  sanitizeObservabilityContext,
} from "@/wellness/observability";

describe("Observability: Sentry Deep Error & Incident Reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("recursively redacts PII and secrets before attaching context to Sentry", () => {
    const sanitized = sanitizeObservabilityContext({
      orderId: "QRIS-123",
      userEmail: "secret@zera.id",
      password: "MyPassword1!",
      signatureKey: "sha512hex",
      nested: {
        phone: "081234567890",
        cookie: "wellness_session=abc",
        programId: "prog_1",
      },
    });

    expect(sanitized).toEqual({
      orderId: "QRIS-123",
      userEmail: "[REDACTED]",
      password: "[REDACTED]",
      signatureKey: "[REDACTED]",
      nested: {
        phone: "[REDACTED]",
        cookie: "[REDACTED]",
        programId: "prog_1",
      },
    });
  });

  it("forwards caught server exceptions with domain/operation tags and survives Sentry SDK errors", () => {
    const err = new Error("Midtrans timeout");
    reportServerError("payment", "qris_charge", err, { orderId: "QRIS-1", authToken: "secret" });

    expect(mockSetTag).toHaveBeenCalledWith("domain", "payment");
    expect(mockSetTag).toHaveBeenCalledWith("operation", "qris_charge");
    expect(mockSetExtras).toHaveBeenCalledWith({ orderId: "QRIS-1", authToken: "[REDACTED]" });
    expect(mockCaptureException).toHaveBeenCalledWith(err);

    // Non-Error throwables are wrapped cleanly
    reportServerError("cron", "dispatch", "string failure");
    expect(mockCaptureException).toHaveBeenLastCalledWith(expect.any(Error));

    // Never throws even if Sentry fails internally
    mockWithScope.mockImplementationOnce(() => {
      throw new Error("Sentry transport failure");
    });
    expect(() => reportServerError("health", "db_check", err)).not.toThrow();
  });

  it("reports silent financial/operational incidents with severity levels", () => {
    reportCriticalIncident("payment", "midtrans_quota_overflow", "Paid after full", "warning", {
      orderId: "QRIS-99",
      programId: "prog_2",
    });

    expect(mockSetTag).toHaveBeenCalledWith("domain", "payment");
    expect(mockSetLevel).toHaveBeenCalledWith("warning");
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      "[payment:midtrans_quota_overflow] Paid after full",
      "warning"
    );
  });
});
