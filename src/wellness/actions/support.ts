"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { RATE_LIMITS } from "../config";
import { requireAuth, requireSuperadmin } from "../security/guards";
import { checkDistributedRateLimit } from "../security/rate-limit";
import { recordAuditLog } from "../integrations/audit-log";
import type { WellnessActionResult } from "./auth";

const CreateSupportRequestSchema = z.object({
  programId: z.string().trim().min(1).max(128),
  requestType: z.enum(["QUIT_COHORT", "REPORT_ISSUE"]),
  reasonCode: z.string().trim().min(1).max(80),
  note: z.string().trim().min(3, "Please provide at least a short explanation.").max(2000),
});

const ResolveSupportRequestSchema = z.object({
  id: z.string().trim().min(1).max(128),
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"]),
  adminNote: z.string().trim().max(2000).optional().nullable(),
});

export async function wellnessSubmitCohortSupportRequest(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const rl = await checkDistributedRateLimit(
    `support:${session.userId}`,
    RATE_LIMITS.supportRequest
  );
  if (!rl.allowed) {
    return {
      success: false,
      message: "Too many support requests submitted recently. Please wait before submitting again.",
    };
  }

  const parsed = CreateSupportRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid support request payload.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { programId, requestType, reasonCode, note } = parsed.data;

  const [enrollment, existingOpen] = await Promise.all([
    prisma.programEnrollment.findUnique({
      where: {
        userId_programId: { userId: session.userId, programId },
      },
      select: { id: true, status: true },
    }),
    prisma.cohortSupportRequest.findFirst({
      where: {
        userId: session.userId,
        programId,
        requestType,
        status: { in: ["OPEN", "IN_REVIEW"] },
      },
      select: { id: true },
    }),
  ]);

  if (!enrollment) {
    return { success: false, message: "You are not enrolled in this cohort." };
  }
  if (existingOpen) {
    return {
      success: false,
      message:
        "You already have an active open request of this type for this cohort. Our team is reviewing it.",
    };
  }

  const created = await prisma.cohortSupportRequest.create({
    data: {
      userId: session.userId,
      programId,
      enrollmentId: enrollment.id,
      requestType,
      reasonCode,
      note,
      status: "OPEN",
    },
  });

  await recordAuditLog({
    actorUserId: session.userId,
    action: requestType === "QUIT_COHORT" ? "COHORT_QUIT_REQUESTED" : "COHORT_ISSUE_REPORTED",
    entityType: "CohortSupportRequest",
    entityId: created.id,
    metadata: { programId, reasonCode },
  });

  try {
    revalidatePath("/dashboard");
    revalidatePath("/admin");
  } catch {
    // Ignore outside request context
  }

  return {
    success: true,
    message:
      requestType === "QUIT_COHORT"
        ? "Your cohort withdrawal request has been submitted to the admin team."
        : "Your issue report has been logged and will be reviewed by our team.",
    data: created,
  };
}

export async function wellnessAdminUpdateSupportRequest(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const admin = await requireSuperadmin();
  const parsed = ResolveSupportRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: "Invalid support request status payload." };
  }

  const { id, status, adminNote } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.cohortSupportRequest.findUnique({ where: { id } });
      if (!existing) throw new Error("Support request not found.");

      const isResolved = status === "RESOLVED" || status === "REJECTED";
      const row = await tx.cohortSupportRequest.update({
        where: { id },
        data: {
          status,
          adminNote: adminNote?.trim() || existing.adminNote,
          resolvedById: isResolved ? admin.userId : null,
          resolvedAt: isResolved ? new Date() : null,
        },
      });

      await recordAuditLog(
        {
          actorUserId: admin.userId,
          action: "SUPPORT_REQUEST_STATUS_UPDATED",
          entityType: "CohortSupportRequest",
          entityId: id,
          metadata: { status },
        },
        tx
      );

      return row;
    });

    try {
      revalidatePath("/admin");
      revalidatePath("/dashboard");
    } catch {
      // Ignore outside request context
    }

    return {
      success: true,
      message: `Support request updated to ${status}.`,
      data: updated,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update support request.",
    };
  }
}
