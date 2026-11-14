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
  /** When set, the inbox timestamp matches the admin schedule instead of dispatch time. */
  createdAt?: Date;
}

/**
 * Persists notifications to the user inbox. Never throws: inbox persistence must not break the
 * business flow (payment, enrollment, cron dispatch) that triggers it.
 */
export async function createUserNotifications(items: UserNotificationInput[]): Promise<number> {
  if (items.length === 0) return 0;
  try {
    // Deduplicate in-memory by (userId, dedupeKey) first
    const seen = new Set<string>();
    const uniqueItems: UserNotificationInput[] = [];
    for (const item of items) {
      if (item.dedupeKey) {
        const key = `${item.userId}::${item.dedupeKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
      }
      uniqueItems.push(item);
    }

    // Filter out any dedupeKeys already stored in the database (compatible with both SQLite and PostgreSQL)
    const keyedItems = uniqueItems.filter((i) => Boolean(i.dedupeKey));
    let existingSet = new Set<string>();
    if (keyedItems.length > 0) {
      const existing = await prisma.userNotification.findMany({
        where: {
          userId: { in: Array.from(new Set(keyedItems.map((i) => i.userId))) },
          dedupeKey: { in: Array.from(new Set(keyedItems.map((i) => i.dedupeKey!))) },
        },
        select: { userId: true, dedupeKey: true },
      });
      existingSet = new Set(existing.map((e) => `${e.userId}::${e.dedupeKey}`));
    }

    const toInsert = uniqueItems.filter(
      (i) => !i.dedupeKey || !existingSet.has(`${i.userId}::${i.dedupeKey}`)
    );
    if (toInsert.length === 0) return 0;

    const res = await prisma.userNotification.createMany({
      data: toInsert.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title.slice(0, 160),
        body: i.body.slice(0, 1000),
        url: i.url ?? null,
        dedupeKey: i.dedupeKey ?? null,
        ...(i.createdAt ? { createdAt: i.createdAt } : {}),
      })),
    });
    return res.count;
  } catch (err) {
    console.warn("[UserNotification] Failed to persist inbox notification:", err);
    return 0;
  }
}
