import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { middleware } from "@/middleware";
import { getJwtSecretKey, SESSION_COOKIE_NAME } from "@/wellness/config";

async function signTestToken(payload: Record<string, unknown>, expiresIn = "1h") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

function makeRequest(
  path: string,
  options?: { userAgent?: string; cookies?: Record<string, string> }
) {
  const headers: Record<string, string> = {};
  if (options?.userAgent) headers["user-agent"] = options.userAgent;
  if (options?.cookies) {
    headers["cookie"] = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
  return new NextRequest(`https://zera.id${path}`, { headers });
}

describe("Edge Middleware: Route Protection, RBAC & Desktop Guard", () => {
  const desktopUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36";
  const mobileUA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

  it("allows /admin/desktop-required directly without redirect loop on mobile", async () => {
    const res = await middleware(makeRequest("/admin/desktop-required", { userAgent: mobileUA }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects mobile devices on /admin to /admin/desktop-required unless desktop override is active", async () => {
    const mobileRedirect = await middleware(makeRequest("/admin", { userAgent: mobileUA }));
    expect(mobileRedirect.status).toBe(307);
    expect(mobileRedirect.headers.get("location")).toBe("https://zera.id/admin/desktop-required");

    const token = await signTestToken({
      userId: "u_admin",
      email: "admin@zera.id",
      role: "SUPERADMIN",
      tokenVersion: 0,
    });

    // Query override bypasses mobile redirect
    const forceDesktop = await middleware(
      makeRequest("/admin?forceDesktop=true", {
        userAgent: mobileUA,
        cookies: { [SESSION_COOKIE_NAME]: token },
      })
    );
    expect(forceDesktop.status).toBe(200);

    // Cookie override bypasses mobile redirect
    const cookieOverride = await middleware(
      makeRequest("/admin/programs", {
        userAgent: mobileUA,
        cookies: {
          [SESSION_COOKIE_NAME]: token,
          wellness_admin_desktop_override: "1",
        },
      })
    );
    expect(cookieOverride.status).toBe(200);
  });

  it("redirects unauthenticated desktop users away from /admin and /dashboard", async () => {
    const adminRes = await middleware(makeRequest("/admin/programs", { userAgent: desktopUA }));
    expect(adminRes.status).toBe(307);
    expect(adminRes.headers.get("location")).toBe("https://zera.id/?auth=signin&target=admin");

    const dashRes = await middleware(makeRequest("/dashboard", { userAgent: desktopUA }));
    expect(dashRes.status).toBe(307);
    expect(dashRes.headers.get("location")).toBe("https://zera.id/?auth=signin&target=dashboard");
  });

  it("blocks regular USER from /admin and redirects to /dashboard?error=unauthorized_admin", async () => {
    const userToken = await signTestToken({
      userId: "u_member",
      email: "budi@zera.id",
      role: "USER",
      tokenVersion: 0,
    });

    const res = await middleware(
      makeRequest("/admin", {
        userAgent: desktopUA,
        cookies: { [SESSION_COOKIE_NAME]: userToken },
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://zera.id/dashboard?error=unauthorized_admin");
  });

  it("permits SUPERADMIN, PARTNER_ADMIN, and COACH on /admin with strict anti-cache & security headers", async () => {
    for (const role of ["SUPERADMIN", "PARTNER_ADMIN", "COACH"]) {
      const token = await signTestToken({
        userId: `u_${role}`,
        email: `${role.toLowerCase()}@zera.id`,
        role,
        tokenVersion: 1,
      });

      const res = await middleware(
        makeRequest("/admin", {
          userAgent: desktopUA,
          cookies: { [SESSION_COOKIE_NAME]: token },
        })
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toContain("no-store");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });

  it("clears invalid/expired session cookie and redirects to signin on /admin and /dashboard", async () => {
    const resAdmin = await middleware(
      makeRequest("/admin", {
        userAgent: desktopUA,
        cookies: { [SESSION_COOKIE_NAME]: "invalid.jwt.token" },
      })
    );
    expect(resAdmin.status).toBe(307);
    expect(resAdmin.headers.get("location")).toBe("https://zera.id/?auth=signin&target=admin");
    expect(resAdmin.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("");

    const resDash = await middleware(
      makeRequest("/dashboard/my-plan", {
        userAgent: mobileUA,
        cookies: { [SESSION_COOKIE_NAME]: "invalid.jwt.token" },
      })
    );
    expect(resDash.status).toBe(307);
    expect(resDash.headers.get("location")).toBe("https://zera.id/?auth=signin");
    expect(resDash.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("");
  });

  it("permits authenticated USER on /dashboard with private no-store headers", async () => {
    const userToken = await signTestToken({
      userId: "u_member",
      email: "budi@zera.id",
      role: "USER",
      tokenVersion: 0,
    });

    const res = await middleware(
      makeRequest("/dashboard", {
        userAgent: mobileUA,
        cookies: { [SESSION_COOKIE_NAME]: userToken },
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("private, no-store");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
