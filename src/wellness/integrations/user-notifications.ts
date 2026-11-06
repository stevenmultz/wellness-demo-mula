import { prisma } from "../db";

export type UserNotificationType =
  | "PROGRAM"
  | "TASK"
  | "PAYMENT"
  | "REMINDER"
  | "ANNOUNCEMENT"
  | "INFO";

export interface UserNotificationInput {
  userId: string;
  type: UserNotificationType;
  title: string;
  body: string;
  url?: string | null;
  /** Unique per user; a repeated key is silently skipped (idempotent dispatch). */
  dedupeKey?: string | null;
}

/**
 * Persists notifications to the user inbox. Never throws: inbox persistence must not break the
 * business flow (payment, enrollment, cron dispatch) that triggers it.
 */
export async function createUserNotifications(items: UserNotificationInput[]): Promise<number> {
  if (items.length === 0) return 0;
  try {
    const res = await prisma.userNotification.createMany({
      data: items.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title.slice(0, 160),
        body: i.body.slice(0, 1000),
        url: i.url ?? null,
        dedupeKey: i.dedupeKey ?? null,
      })),
      skipDuplicates: true,
    });
    return res.count;
  } catch (err) {
    console.warn("[UserNotification] Failed to persist inbox notification:", err);
    return 0;
  }
}
