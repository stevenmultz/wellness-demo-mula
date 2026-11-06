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
  programTitle: string;
  amount: number;
  isFree: boolean;
  status: string; // PENDING | ACTIVE | EXPIRED | CANCELLED
  statusLabel: "Paid" | "Pending" | "Expired" | "Cancelled";
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

  const enrollments = await prisma.programEnrollment.findMany({
    where: { userId: session.userId },
    include: { program: { select: { title: true, price: true } } },
    orderBy: { createdAt: "desc" },
  });

  const payments: PaymentHistoryItem[] = enrollments.map((e) => ({
    enrollmentId: e.id,
    programTitle: e.program.title,
    amount: e.program.price,
    isFree: e.program.price <= 0,
    status: e.status,
    statusLabel: STATUS_LABEL[e.status] ?? "Pending",
    transactionDate: (e.paidAt ?? e.createdAt).toISOString(),
    reference: e.paymentReference,
  }));

  const activities: MembershipActivityItem[] = [];
  for (const e of enrollments) {
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
        detail: e.validUntil ? `Valid until ${e.validUntil.toISOString()}` : null,
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
  activities.sort((a, b) => b.date.localeCompare(a.date));

  return { success: true, message: "OK", data: { payments, activities } };
}
