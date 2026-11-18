"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { BRAND } from "../brand";
import { getAppUrl } from "../config";
import { requireAuth } from "../security/guards";
import { checkDistributedRateLimit } from "../security/rate-limit";
import { escapeHtml, sendTransactionalEmail } from "../integrations/email-service";
import { createUserNotifications } from "../integrations/user-notifications";
import { recordAuditLog } from "../integrations/audit-log";
import type { WellnessActionResult } from "./auth";

const CreateShareSchema = z.object({
  viewerEmail: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  label: z.string().trim().max(40).optional().nullable(),
});

export interface OutgoingShareItem {
  id: string;
  viewerEmail: string;
  viewerName: string | null;
  label: string | null;
  status: string;
  createdAt: string;
}

export interface SharedDaySummary {
  dayNumber: number;
  title: string;
  dayType: string;
  isCompleted: boolean;
  selectedWorkout: string | null;
  mealCompliance: string | null;
  sleepDurationMinutes: number | null;
  happinessRate: number | null;
  completedAt: string | null;
}

export interface SharedProgramProgressItem {
  programId: string;
  programTitle: string;
  category: string;
  coachName: string;
  durationDays: number;
  startDate: string | null;
  endDate: string | null;
  completedDaysCount: number;
  days: SharedDaySummary[];
}

export interface IncomingSharedProgressItem {
  shareId: string;
  ownerUserId: string;
  ownerName: string;
  label: string | null;
  sharedAt: string;
  programs: SharedProgramProgressItem[];
}

export interface ShareProgressOverviewPayload {
  outgoing: OutgoingShareItem[];
  incoming: IncomingSharedProgressItem[];
}

const MAX_ACTIVE_SHARES_PER_USER = 20;

function revalidateShareRoutes() {
  try {
    revalidatePath("/dashboard");
  } catch {
    // Ignore outside request context
  }
}

/**
 * Loads outgoing Share Progress grants created by the user AND read-only incoming shares
 * granted to this user's verified email address.
 * Unverified sessions never receive incoming shared progress.
 */
export async function wellnessGetShareProgressOverview(): Promise<
  WellnessActionResult<ShareProgressOverviewPayload>
> {
  const session = await requireAuth();
  const normalizedEmail = session.email.trim().toLowerCase();

  const [outgoingRows, incomingRows] = await Promise.all([
    prisma.userProgressShare.findMany({
      where: { ownerUserId: session.userId, status: "ACTIVE" },
      take: 50,
      include: {
        viewer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    session.emailVerifiedAt
      ? prisma.userProgressShare.findMany({
          where: {
            status: "ACTIVE",
            viewerEmail: normalizedEmail,
            owner: { deletedAt: null, status: "ACTIVE" },
          },
          take: 50,
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                enrollments: {
                  where: { status: "ACTIVE" },
                  take: 25,
                  include: {
                    program: {
                      select: {
                        id: true,
                        title: true,
                        durationDays: true,
                        startAt: true,
                        endAt: true,
                        deletedAt: true,
                        categories: { include: { category: { select: { name: true } } } },
                        coaches: { include: { coach: { select: { name: true } } } },
                        days: {
                          orderBy: { dayNumber: "asc" },
                          select: {
                            id: true,
                            dayNumber: true,
                            title: true,
                            dayType: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: { createdAt: "desc" },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Note: nested `progresses` inside `program.days` must be filtered strictly to `owner.id`
  // Fetch owner day progresses explicitly per ownerUserId and shared day IDs so no other rows are read!
  const ownerIds = Array.from(new Set(incomingRows.map((r) => r.owner.id)));
  const sharedDayIds = Array.from(
    new Set(
      incomingRows.flatMap((r) =>
        r.owner.enrollments.flatMap((e) => e.program.days.map((d) => d.id))
      )
    )
  );
  const ownerProgressRows =
    ownerIds.length > 0 && sharedDayIds.length > 0
      ? await prisma.programDayProgress.findMany({
          where: {
            userId: { in: ownerIds },
            programDayId: { in: sharedDayIds },
          },
          take: 2000,
          select: {
            userId: true,
            programDayId: true,
            isCompleted: true,
            selectedWorkout: true,
            mealCompliance: true,
            sleepDurationMinutes: true,
            happinessRate: true,
            completedAt: true,
          },
        })
      : [];

  const progressByOwnerDay = new Map<string, (typeof ownerProgressRows)[number]>();
  for (const row of ownerProgressRows) {
    progressByOwnerDay.set(`${row.userId}:${row.programDayId}`, row);
  }

  return {
    success: true,
    data: {
      outgoing: outgoingRows.map((s) => ({
        id: s.id,
        viewerEmail: s.viewerEmail,
        viewerName: s.viewer?.fullName ?? null,
        label: s.label,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
      incoming: incomingRows.map((share) => {
        const programs: SharedProgramProgressItem[] = share.owner.enrollments
          .filter((en) => en.program.deletedAt === null)
          .map((en) => {
            const p = en.program;
            const days: SharedDaySummary[] = p.days.map((d) => {
              const dp = progressByOwnerDay.get(`${share.owner.id}:${d.id}`);
              return {
                dayNumber: d.dayNumber,
                title: d.title,
                dayType: d.dayType,
                isCompleted: Boolean(dp?.isCompleted),
                selectedWorkout: dp?.selectedWorkout ?? null,
                mealCompliance: dp?.mealCompliance ?? null,
                sleepDurationMinutes: dp?.sleepDurationMinutes ?? null,
                happinessRate: dp?.happinessRate ?? null,
                completedAt: dp?.completedAt ? dp.completedAt.toISOString() : null,
              };
            });

            return {
              programId: p.id,
              programTitle: p.title,
              category:
                p.categories.map((c) => c.category.name).filter(Boolean).join(", ") || "Wellness",
              coachName:
                p.coaches.map((c) => c.coach.name).filter(Boolean).join(", ") || "Wellness Coach",
              durationDays: p.durationDays,
              startDate: p.startAt ? p.startAt.toISOString() : null,
              endDate: p.endAt ? p.endAt.toISOString() : null,
              completedDaysCount: days.filter((d) => d.isCompleted).length,
              days,
            };
          });

        return {
          shareId: share.id,
          ownerUserId: share.owner.id,
          ownerName: share.owner.fullName,
          label: share.label,
          sharedAt: share.createdAt.toISOString(),
          programs,
        };
      }),
    },
  };
}

/**
 * Self-service: Allows an authenticated user to grant read-only progress viewing
 * access to another user by email (e.g. family, mentor, accountability partner).
 */
export async function wellnessCreateProgressShare(
  rawInput: unknown
): Promise<WellnessActionResult<OutgoingShareItem>> {
  const session = await requireAuth();
  if (!session.emailVerifiedAt) {
    return {
      success: false,
      message: "Please verify your email address before sharing progress with others.",
    };
  }
  const parsed = CreateShareSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message:
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
        "Invalid Share Progress input.",
    };
  }

  const viewerEmail = parsed.data.viewerEmail.trim().toLowerCase();
  const label = parsed.data.label?.trim() || null;

  if (viewerEmail === session.email.trim().toLowerCase()) {
    return {
      success: false,
      message: "You cannot share progress with your own email address.",
    };
  }

  const rl = await checkDistributedRateLimit(`share-progress:${session.userId}`, {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return {
      success: false,
      message: "Too many Share Progress invitations sent recently. Please wait 15 minutes.",
    };
  }

  const activeCount = await prisma.userProgressShare.count({
    where: { ownerUserId: session.userId, status: "ACTIVE" },
  });
  if (activeCount >= MAX_ACTIVE_SHARES_PER_USER) {
    return {
      success: false,
      message: `Maximum ${MAX_ACTIVE_SHARES_PER_USER} active Share Progress recipients reached. Revoke an unused access first.`,
    };
  }

  const matchedViewer = await prisma.user.findFirst({
    where: { email: { equals: viewerEmail, mode: "insensitive" }, deletedAt: null },
    select: { id: true, fullName: true, emailVerifiedAt: true },
  });

  const saved = await prisma.$transaction(async (tx) => {
    const row = await tx.userProgressShare.upsert({
      where: {
        ownerUserId_viewerEmail: {
          ownerUserId: session.userId,
          viewerEmail,
        },
      },
      create: {
        ownerUserId: session.userId,
        viewerEmail,
        viewerUserId: matchedViewer?.emailVerifiedAt ? matchedViewer.id : null,
        label,
        status: "ACTIVE",
        revokedAt: null,
      },
      update: {
        viewerUserId: matchedViewer?.emailVerifiedAt ? matchedViewer.id : null,
        label,
        status: "ACTIVE",
        revokedAt: null,
      },
    });

    await recordAuditLog(
      {
        actorUserId: session.userId,
        action: "PROGRESS_SHARE_GRANTED",
        entityType: "UserProgressShare",
        entityId: row.id,
        metadata: { viewerEmail, label },
      },
      tx
    );

    return row;
  });

  if (matchedViewer?.emailVerifiedAt) {
    await createUserNotifications([
      {
        userId: matchedViewer.id,
        type: "INFO",
        title: "Progress shared with you",
        body: `${session.fullName} shared their read-only wellness progress with you.`,
        url: "/dashboard",
        dedupeKey: `share-progress:${saved.id}:${saved.updatedAt.getTime()}`,
      },
    ]).catch(() => null);
  }

  const dashboardUrl = `${getAppUrl()}/dashboard`;
  const safeSenderName = escapeHtml(session.fullName);
  const safeViewerEmail = escapeHtml(viewerEmail);
  await sendTransactionalEmail({
    to: viewerEmail,
    subject: `${BRAND.fullName} — ${session.fullName} shared their progress with you`,
    html: `<p>Hi,</p><p><strong>${safeSenderName}</strong> invited you to view their read-only wellness progress on ${BRAND.fullName}.</p><p>Sign in with <strong>${safeViewerEmail}</strong> at <a href="${dashboardUrl}">${dashboardUrl}</a> and open <em>Profile → Share Progress</em> to view.</p>`,
    text: `${session.fullName} shared their wellness progress with you. Sign in with ${viewerEmail} at ${dashboardUrl} to view.`,
  }).catch(() => null);

  revalidateShareRoutes();

  return {
    success: true,
    message: `Progress shared (read-only) with ${viewerEmail}.`,
    data: {
      id: saved.id,
      viewerEmail: saved.viewerEmail,
      viewerName: matchedViewer?.fullName ?? null,
      label: saved.label,
      status: saved.status,
      createdAt: saved.createdAt.toISOString(),
    },
  };
}

/**
 * Self-service: Owner revokes a Share Progress entry immediately.
 */
export async function wellnessRevokeProgressShare(
  shareId: string
): Promise<WellnessActionResult> {
  const session = await requireAuth();
  if (!shareId?.trim()) {
    return { success: false, message: "Invalid share reference." };
  }

  const res = await prisma.$transaction(async (tx) => {
    const existing = await tx.userProgressShare.findFirst({
      where: { id: shareId, ownerUserId: session.userId, status: "ACTIVE" },
    });
    if (!existing) return null;

    const now = new Date();
    await tx.userProgressShare.update({
      where: { id: existing.id },
      data: { status: "REVOKED", revokedAt: now },
    });

    await recordAuditLog(
      {
        actorUserId: session.userId,
        action: "PROGRESS_SHARE_REVOKED",
        entityType: "UserProgressShare",
        entityId: existing.id,
        metadata: { viewerEmail: existing.viewerEmail },
      },
      tx
    );

    return existing;
  });

  if (!res) {
    return { success: false, message: "Active share record not found." };
  }

  revalidateShareRoutes();
  return {
    success: true,
    message: `Access revoked for ${res.viewerEmail}.`,
  };
}

/**
 * Allows the recipient viewer to dismiss an incoming Share Progress card from their view.
 */
export async function wellnessRemoveIncomingShare(
  shareId: string
): Promise<WellnessActionResult> {
  const session = await requireAuth();
  if (!shareId?.trim()) {
    return { success: false, message: "Invalid share reference." };
  }

  const updated = await prisma.userProgressShare.updateMany({
    where: {
      id: shareId,
      viewerEmail: { equals: session.email.trim().toLowerCase(), mode: "insensitive" },
      status: "ACTIVE",
    },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  if (updated.count === 0) {
    return { success: false, message: "Shared progress entry not found." };
  }

  revalidateShareRoutes();
  return {
    success: true,
    message: "Removed from your Shared With Me list.",
  };
}
