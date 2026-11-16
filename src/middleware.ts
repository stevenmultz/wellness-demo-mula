import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecretKey, SESSION_COOKIE_NAME } from "./wellness/config";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secretKey = getJwtSecretKey();

  // 1. Proteksi Interface Admin: /admin/*
  if (pathname.startsWith("/admin")) {
    // Tampilan desktop-required dapat diakses langsung oleh perangkat mobile tanpa loop otentikasi
    if (pathname.startsWith("/admin/desktop-required")) {
      return NextResponse.next();
    }

    // Deteksi jika perangkat adalah mobile (Admin Control bersifat Desktop Only, kecuali override aktif)
    const userAgent = request.headers.get("user-agent") || "";
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const hasDesktopOverride =
      request.nextUrl.searchParams.get("forceDesktop") === "true" ||
      request.cookies.get("wellness_admin_desktop_override")?.value === "1";

    if (isMobile && !hasDesktopOverride) {
      return NextResponse.redirect(new URL("/admin/desktop-required", request.url));
    }

    if (!sessionCookie) {
      const signInUrl = new URL("/?auth=signin&target=admin", request.url);
      return NextResponse.redirect(signInUrl);
    }

    try {
      const { payload } = await jwtVerify(sessionCookie, secretKey, { algorithms: ["HS256"] });
      const tokenData = payload as unknown as TokenPayload;

      const ALLOWED_ADMIN_ROLES = new Set(["SUPERADMIN", "COACH", "PARTNER_ADMIN"]);
      if (!ALLOWED_ADMIN_ROLES.has(tokenData.role) || !tokenData.userId) {
        // Bukan admin/coach/partner -> alihkan ke user dashboard
        return NextResponse.redirect(new URL("/dashboard?error=unauthorized_admin", request.url));
      }

      // Terapkan header anti-cache ketat agar halaman admin tidak pernah disimpan di cache browser setelah logout
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Content-Type-Options", "nosniff");
      return response;
    } catch {
      // Token tidak valid atau kedaluwarsa
      const response = NextResponse.redirect(new URL("/?auth=signin&target=admin", request.url));
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  // 2. Proteksi Interface User Dashboard PWA: /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/?auth=signin&target=dashboard", request.url));
    }

    try {
      await jwtVerify(sessionCookie, secretKey, { algorithms: ["HS256"] });
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Content-Type-Options", "nosniff");
      return response;
    } catch {
      const response = NextResponse.redirect(new URL("/?auth=signin", request.url));
      response.cookies.delete("wellness_session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
