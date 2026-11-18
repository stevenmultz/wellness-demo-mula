import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/wellness/db";
import {
  getAppUrl,
  getGoogleOAuthConfig,
  getJwtSecretKey,
  GOOGLE_OAUTH_COOKIE,
} from "@/wellness/config";
import {
  createSessionToken,
  isAdminRole,
  setSessionCookie,
} from "@/wellness/security/session";
import { recordAuditLog } from "@/wellness/integrations/audit-log";
import { buildOAuthLinkUserUpdate } from "@/wellness/security/oauth-linking";

export const dynamic = "force-dynamic";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

function redirectWithError(code: string) {
  return NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(code)}`, getAppUrl()));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError || !code || !state) {
    return redirectWithError(oauthError || "google_oauth_cancelled");
  }

  const cookieToken = request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value;
  if (!cookieToken) {
    return redirectWithError("google_oauth_state_missing");
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
    return redirectWithError("google_oauth_state_invalid");
  }

  if (!savedState || savedState !== state || !codeVerifier) {
    return redirectWithError("google_oauth_state_mismatch");
  }

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  if (!clientId || !clientSecret) {
    return redirectWithError("google_not_configured");
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
      return redirectWithError("google_token_exchange_failed");
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
      return redirectWithError("google_email_not_verified");
    }

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
        const linked = existingIdentity.user;
        if (linked.deletedAt !== null || linked.status !== "ACTIVE") {
          throw new Error("ACCOUNT_DISABLED");
        }
        if (!linked.emailVerifiedAt) {
          await tx.user.update({
            where: { id: linked.id },
            data: { emailVerifiedAt: new Date() },
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
        const updated = linkUpdate
          ? await tx.user.update({
              where: { id: existingByEmail.id },
              data: linkUpdate,
            })
          : existingByEmail;
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

      const created = await tx.user.create({
        data: {
          email,
          emailVerifiedAt: new Date(),
          fullName,
          passwordHash: null,
          role: "USER",
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

    const dest = isAdminRole(user.role) ? "/admin" : "/dashboard";
    const response = NextResponse.redirect(new URL(dest, getAppUrl()));
    response.cookies.delete(GOOGLE_OAUTH_COOKIE);
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "ACCOUNT_DISABLED") {
      return redirectWithError("account_suspended");
    }
    console.error("[Google OAuth Callback Error]:", err);
    return redirectWithError("google_oauth_failed");
  }
}
