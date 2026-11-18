import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "../db";
import { calculateAgeFromDob } from "../validators/auth";
import {
  getJwtSecretKey,
  isProductionEnv,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRATION_CLAIM,
  SESSION_MAX_AGE_SECONDS,
} from "../config";

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

/**
 * Generate signed JWT token untuk sesi pengguna.
 * Masa berlaku: 7 hari.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION_CLAIM)
    .sign(getJwtSecretKey());
}

/**
 * Verifikasi signature JWT token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set HttpOnly, Secure, SameSite Cookie di browser pengguna.
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProductionEnv(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Hapus Cookie sesi saat logout / hapus akun.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  try {
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Abaikan jika tidak didukung di runtime tertentu
  }
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProductionEnv(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Ambil sesi aktif pengguna dan validasi tokenVersion secara real-time.
 * Dibungkus dengan React cache() agar pemanggilan berulang dalam 1 request RSC
 * (misal di layout.tsx dan page.tsx) hanya melakukan 1x query ke database.
 */
const safeCache = typeof cache === "function" ? cache : <T extends (...args: any[]) => any>(fn: T): T => fn;

export const wellnessGetSessionType = {} as never;
export { ADMIN_ROLES, isAdminRole, type AdminRole } from "./roles";

export const getWellnessSession = safeCache(async (): Promise<{
  userId: string;
  email: string;
  emailVerifiedAt: Date | null;
  fullName: string;
  phone: string | null;
  age: number | null;
  dateOfBirth: Date | null;
  avatarPath: string | null;
  gender: string | null;
  occupation: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  role: string;
  status: string;
  preferredLocale: string;
  organizationId: string | null;
  organizationName: string | null;
  coachProfileId: string | null;
  coachProfileName: string | null;
  createdAt: Date;
} | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) return null;

    // Lightweight real-time verification (excludes large/signed media resolution from every request)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        fullName: true,
        phone: true,
        birthDate: true,
        avatarPath: true,
        gender: true,
        occupation: true,
        address: true,
        city: true,
        province: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        role: true,
        status: true,
        deletedAt: true,
        preferredLocale: true,
        organizationId: true,
        coachProfileId: true,
        organization: { select: { name: true } },
        coachProfile: { select: { name: true } },
        createdAt: true,
        tokenVersion: true,
      },
    });

    if (!user || user.deletedAt !== null) return null;
    if (user.status !== "ACTIVE") return null;
    if (user.tokenVersion !== payload.tokenVersion) return null;

    return {
      userId: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      fullName: user.fullName,
      phone: user.phone,
      age: user.birthDate ? calculateAgeFromDob(user.birthDate) : null,
      dateOfBirth: user.birthDate,
      avatarPath: user.avatarPath,
      gender: user.gender,
      occupation: user.occupation,
      address: user.address,
      city: user.city,
      province: user.province,
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
      role: user.role,
      status: user.status,
      preferredLocale: user.preferredLocale || "en",
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      coachProfileId: user.coachProfileId,
      coachProfileName: user.coachProfile?.name ?? null,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
});
