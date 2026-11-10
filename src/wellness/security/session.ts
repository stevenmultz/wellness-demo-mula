import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "../db";

const COOKIE_NAME = "wellness_session";
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret && process.env.NODE_ENV === "production") {
  console.error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set in production.");
}
const SECRET_KEY = new TextEncoder().encode(
  rawSecret || "wellness_platform_dev_only_jwt_secret_do_not_use_in_prod"
);

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
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

/**
 * Verifikasi signature JWT token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set HttpOnly, Secure, SameSite Cookie di browser pengguna.
 */
export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });
}

/**
 * Hapus Cookie sesi saat logout / hapus akun.
 */
export async function clearSessionCookie() {
  const cookieStore = cookies();
  try {
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // Abaikan jika tidak didukung di runtime tertentu
  }
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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

export const getWellnessSession = safeCache(async (): Promise<{
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: Date;
} | null> => {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) return null;

    // Verifikasi real-time dengan database (Cek status akun & tokenVersion)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        tokenVersion: true,
      },
    });

    if (!user) return null;
    if (user.status !== "ACTIVE") return null;
    if (user.tokenVersion !== payload.tokenVersion) return null; // Sesi telah direvoke!

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
});
