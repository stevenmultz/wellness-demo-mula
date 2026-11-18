"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { getWellnessSession } from "../security/session";
import { LOCALE_COOKIE_NAME, normalizeLocale, type Locale } from "../i18n/types";

export async function wellnessSetLocale(rawLocale: string): Promise<{
  success: boolean;
  locale: Locale;
}> {
  const locale = normalizeLocale(rawLocale);

  try {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  } catch {
    // Ignore cookie errors outside request context
  }

  try {
    const session = await getWellnessSession();
    if (session?.userId) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { preferredLocale: locale },
      });
    }
  } catch {
    // Non-critical DB persistence
  }

  try {
    revalidatePath("/", "layout");
  } catch {
    // Ignore outside request context
  }

  return { success: true, locale };
}
