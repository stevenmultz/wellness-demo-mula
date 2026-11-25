"use server";

import { prisma } from "../db";
import { requireAuth } from "../security/guards";
import { WellnessActionResult } from "./auth";

export interface InboxNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsPayload {
  items: InboxNotification[];
  unreadCount: number;
}

export interface PaymentHistoryItem {
  enrollmentId: string;
  itemType?: "PROGRAM_ENROLLMENT" | "TRACKING_PASS";
  programTitle: string;
  amount: number;
  isFree: boolean;
  status: string; // PENDING | ACTIVE | EXPIRED | CANCELLED | REFUNDED
  statusLabel: "Paid" | "Pending" | "Expired" | "Cancelled" | "Refunded";
  transactionDate: string; // paidAt, else createdAt
  reference: string | null;
}

export interface MembershipActivityItem {
  id: string;
  programTitle: string;
  event: "REGISTERED" | "ACTIVATED" | "EXPIRED" | "CANCELLED";
  label: string;
  date: string;
  detail: string | null;
}

export interface HistoryPayload {
  payments: PaymentHistoryItem[];
  activities: MembershipActivityItem[];
}

const STATUS_LABEL: Record<string, PaymentHistoryItem["statusLabel"]> = {
  ACTIVE: "Paid",
  PENDING: "Pending",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/** The authenticated user's inbox (most recent 100). userId always comes from the session. */
export async function wellnessGetNotifications(): Promise<WellnessActionResult<NotificationsPayload>> {
  const session = await requireAuth();

  const [rows, unreadCount] = await Promise.all([
    prisma.userNotification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.userNotification.count({ where: { userId: session.userId, readAt: null } }),
  ]);

  return {
    success: true,
    message: "OK",
    data: {
      unreadCount,
      items: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        url: n.url,
        isRead: !!n.readAt,
        createdAt: n.createdAt.toISOString(),
      })),
    },
  };
}

/** Marks one notification read. Scoped by userId so other users' rows can never be touched. */
export async function wellnessMarkNotificationRead(id: string): Promise<WellnessActionResult> {
  const session = await requireAuth();
  if (!id || typeof id !== "string") {
    return { success: false, message: "Invalid notification." };
  }
  await prisma.userNotification.updateMany({
    where: { id, userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { success: true, message: "Marked as read." };
}

export async function wellnessMarkAllNotificationsRead(): Promise<WellnessActionResult> {
  const session = await requireAuth();
  await prisma.userNotification.updateMany({
    where: { userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { success: true, message: "All notifications marked as read." };
}

/**
 * Payment + membership history for the authenticated user only
 * (every query is filtered by the session userId).
 */
export async function wellnessGetHistory(): Promise<WellnessActionResult<HistoryPayload>> {
  const session = await requireAuth();

  const prismaAny = prisma as unknown as {
    trackingPassOrder?: { findMany?: typeof prisma.trackingPassOrder.findMany };
  };

  const [enrollments, passOrders] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { userId: session.userId },
      take: 100,
      include: {
        program: { select: { title: true, price: true } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { grossAmount: true, status: true, settledAt: true, orderId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    typeof prismaAny.trackingPassOrder?.findMany === "function"
      ? prisma.trackingPassOrder.findMany({
          where: { userId: session.userId },
          take: 100,
          include: {
            plan: { select: { name: true, durationDays: true } },
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 5,
              select: { grossAmount: true, status: true, settledAt: true, orderId: true },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const payments: PaymentHistoryItem[] = [];
  const activities: MembershipActivityItem[] = [];

  for (const e of enrollments) {
    const settledTx = e.transactions?.find(
      (tx) => tx.status === "SETTLEMENT" || tx.status === "MANUAL_APPROVED" || tx.status === "REFUND"
    );
    const latestTx = settledTx ?? e.transactions?.[0] ?? null;
    const immutableAmount = latestTx ? latestTx.grossAmount : e.program.price;
    const isRefunded = settledTx?.status === "REFUND";
    const effectiveStatus = isRefunded ? "REFUNDED" : e.status;

    payments.push({
      enrollmentId: e.id,
      itemType: "PROGRAM_ENROLLMENT",
      programTitle: e.program.title,
      amount: immutableAmount,
      isFree: immutableAmount <= 0,
      status: effectiveStatus,
      statusLabel: STATUS_LABEL[effectiveStatus] ?? "Pending",
      transactionDate: (e.paidAt ?? e.createdAt).toISOString(),
      reference: e.paymentReference ?? latestTx?.orderId ?? null,
    });

    activities.push({
      id: `${e.id}:reg`,
      programTitle: e.program.title,
      event: "REGISTERED",
      label: "Registered",
      date: e.createdAt.toISOString(),
      detail: null,
    });
    if (e.paidAt && e.status === "ACTIVE") {
      activities.push({
        id: `${e.id}:act`,
        programTitle: e.program.title,
        event: "ACTIVATED",
        label: "Membership activated",
        date: e.paidAt.toISOString(),
        detail: e.validUntilAt ? `Valid until ${e.validUntilAt.toISOString()}` : null,
      });
    }
    if (e.status === "EXPIRED" || e.status === "CANCELLED") {
      activities.push({
        id: `${e.id}:end`,
        programTitle: e.program.title,
        event: e.status === "EXPIRED" ? "EXPIRED" : "CANCELLED",
        label: e.status === "EXPIRED" ? "Invoice / membership expired" : "Membership cancelled",
        date: e.updatedAt.toISOString(),
        detail: null,
      });
    }
  }

  for (const o of passOrders) {
    const settledTx = o.transactions?.find(
      (tx) => tx.status === "SETTLEMENT" || tx.status === "MANUAL_APPROVED" || tx.status === "REFUND"
    );
    const latestTx = settledTx ?? o.transactions?.[0] ?? null;
    const immutableAmount = latestTx ? latestTx.grossAmount : o.priceSnapshot;
    const effectiveStatus = settledTx?.status === "REFUND" ? "REFUNDED" : o.status;
    const title = `${o.plan.name} (${o.durationDaysSnapshot}d Tracking Pass)`;

    payments.push({
      enrollmentId: o.id,
      itemType: "TRACKING_PASS",
      programTitle: title,
      amount: immutableAmount,
      isFree: immutableAmount <= 0,
      status: effectiveStatus,
      statusLabel: STATUS_LABEL[effectiveStatus] ?? "Pending",
      transactionDate: (o.paidAt ?? o.createdAt).toISOString(),
      reference: o.paymentReference ?? latestTx?.orderId ?? null,
    });

    activities.push({
      id: `pass:${o.id}:reg`,
      programTitle: title,
      event: "REGISTERED",
      label: "Tracking Pass ordered",
      date: o.createdAt.toISOString(),
      detail: null,
    });
    if (o.paidAt && o.status === "ACTIVE") {
      activities.push({
        id: `pass:${o.id}:act`,
        programTitle: title,
        event: "ACTIVATED",
        label: "Tracking Pass activated",
        date: o.paidAt.toISOString(),
        detail: `${o.durationDaysSnapshot} days unlocked`,
      });
    }
    if (o.status === "EXPIRED" || o.status === "CANCELLED" || o.status === "REFUNDED") {
      activities.push({
        id: `pass:${o.id}:end`,
        programTitle: title,
        event: o.status === "EXPIRED" ? "EXPIRED" : "CANCELLED",
        label:
          o.status === "EXPIRED"
            ? "Tracking Pass invoice expired"
            : o.status === "REFUNDED"
              ? "Tracking Pass refunded"
              : "Tracking Pass cancelled",
        date: o.updatedAt.toISOString(),
        detail: null,
      });
    }
  }

  payments.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  activities.sort((a, b) => b.date.localeCompare(a.date));

  return { success: true, message: "OK", data: { payments, activities } };
}
