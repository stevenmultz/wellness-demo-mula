import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/wellness/db";
import {
  getGoogleOAuthConfig,
  getJwtSecretKey,
  getSuperadminConfig,
  GOOGLE_OAUTH_COOKIE,
} from "@/wellness/config";
import {
  createSessionToken,
  isAdminRole,
  setSessionCookie,
} from "@/wellness/security/session";
import { recordAuditLog } from "@/wellness/integrations/audit-log";
import { buildOAuthLinkUserUpdate } from "@/wellness/security/oauth-linking";
import { isUserOnboardingComplete } from "@/wellness/validators/auth";
import { reportServerError } from "@/wellness/observability";

export const dynamic = "force-dynamic";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

function redirectWithError(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(code)}`, request.url));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError || !code || !state) {
    return redirectWithError(request, oauthError || "google_oauth_cancelled");
  }

  const cookieToken = request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value;
  if (!cookieToken) {
    return redirectWithError(request, "google_oauth_state_missing");
  }

  let savedState = "";
  let codeVerifier = "";
  try {
    const { payload } = await jwtVerify(cookieToken, getJwtSecretKey(), {
      algorithms: ["HS256"],
    });
    savedState = typeof payload.state === "string" ? payload.state : "";
    codeVerifier = typeof payload.codeVerifier === "string" ? payload.codeVerifier : "";
  } catch {
    return redirectWithError(request, "google_oauth_state_invalid");
  }

  if (!savedState || savedState !== state || !codeVerifier) {
    return redirectWithError(request, "google_oauth_state_mismatch");
  }

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(requestUrl.origin);
  if (!clientId || !clientSecret) {
    return redirectWithError(request, "google_not_configured");
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const tokenJson = (await tokenRes.json().catch(() => null)) as {
      id_token?: string;
    } | null;

    if (!tokenRes.ok || !tokenJson?.id_token) {
      return redirectWithError(request, "google_token_exchange_failed");
    }

    const { payload: idClaims } = await jwtVerify(tokenJson.id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });

    const sub = typeof idClaims.sub === "string" ? idClaims.sub : "";
    const email = typeof idClaims.email === "string" ? idClaims.email.toLowerCase().trim() : "";
    const emailVerified = idClaims.email_verified === true;
    const fullName =
      typeof idClaims.name === "string" && idClaims.name.trim().length >= 2
        ? idClaims.name.trim().slice(0, 60)
        : email.split("@")[0] || "Wellness Member";

    if (!sub || !email || !emailVerified) {
      return redirectWithError(request, "google_email_not_verified");
    }

    const superadminEmail = getSuperadminConfig().email;
    const isSuperadminMatch = Boolean(superadminEmail) && email === superadminEmail;

    const user = await prisma.$transaction(async (tx) => {
      const existingIdentity = await tx.userIdentity.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "GOOGLE",
            providerAccountId: sub,
          },
        },
        include: { user: true },
      });

      if (existingIdentity) {
        let linked = existingIdentity.user;
        if (linked.deletedAt !== null || linked.status !== "ACTIVE") {
          throw new Error("ACCOUNT_DISABLED");
        }
        if (!linked.emailVerifiedAt || (isSuperadminMatch && linked.role !== "SUPERADMIN")) {
          linked = await tx.user.update({
            where: { id: linked.id },
            data: {
              emailVerifiedAt: linked.emailVerifiedAt ?? new Date(),
              ...(isSuperadminMatch
                ? { role: "SUPERADMIN", organizationId: null, coachProfileId: null }
                : {}),
            },
          });
        }
        await recordAuditLog(
          {
            actorUserId: linked.id,
            action: "GOOGLE_SIGN_IN",
            entityType: "User",
            entityId: linked.id,
          },
          tx
        );
        return linked;
      }

      // Account linking by verified email ONLY (verified by Google ID token)
      const existingByEmail = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      });

      if (existingByEmail) {
        if (existingByEmail.status !== "ACTIVE") {
          throw new Error("ACCOUNT_DISABLED");
        }
        await tx.userIdentity.create({
          data: {
            userId: existingByEmail.id,
            provider: "GOOGLE",
            providerAccountId: sub,
            email,
          },
        });
        const linkUpdate = buildOAuthLinkUserUpdate(existingByEmail);
        const roleUpgrade =
          isSuperadminMatch && existingByEmail.role !== "SUPERADMIN"
            ? { role: "SUPERADMIN" as const, organizationId: null, coachProfileId: null }
            : {};
        const updated =
          linkUpdate || Object.keys(roleUpgrade).length > 0
            ? await tx.user.update({
                where: { id: existingByEmail.id },
                data: { ...(linkUpdate || {}), ...roleUpgrade },
              })
            : existingByEmail;
        await tx.userProgressShare.updateMany({
          where: {
            viewerEmail: updated.email.trim().toLowerCase(),
            viewerUserId: null,
            status: "ACTIVE",
          },
          data: { viewerUserId: updated.id },
        });
        await recordAuditLog(
          {
            actorUserId: updated.id,
            action: "GOOGLE_ACCOUNT_LINKED",
            entityType: "User",
            entityId: updated.id,
          },
          tx
        );
        return updated;
      }

      const targetRole = isSuperadminMatch ? "SUPERADMIN" : "USER";

      const created = await tx.user.create({
        data: {
          email,
          emailVerifiedAt: new Date(),
          fullName,
          passwordHash: null,
          role: targetRole,
          status: "ACTIVE",
          tokenVersion: 0,
          identities: {
            create: {
              provider: "GOOGLE",
              providerAccountId: sub,
              email,
            },
          },
        },
      });
      await tx.userProgressShare.updateMany({
        where: {
          viewerEmail: created.email.trim().toLowerCase(),
          viewerUserId: null,
          status: "ACTIVE",
        },
        data: { viewerUserId: created.id },
      });
      await recordAuditLog(
        {
          actorUserId: created.id,
          action: "GOOGLE_SIGN_UP",
          entityType: "User",
          entityId: created.id,
        },
        tx
      );
      return created;
    });

    const sessionJwt = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    await setSessionCookie(sessionJwt);

    const dest = isAdminRole(user.role)
      ? "/admin"
      : isUserOnboardingComplete(user)
        ? "/dashboard"
        : "/onboarding";
    const response = NextResponse.redirect(new URL(dest, request.url));
    response.cookies.delete(GOOGLE_OAUTH_COOKIE);
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "ACCOUNT_DISABLED") {
      return redirectWithError(request, "account_suspended");
    }
    reportServerError("auth", "google_oauth_callback", err);
    return redirectWithError(request, "google_oauth_failed");
  }
}
