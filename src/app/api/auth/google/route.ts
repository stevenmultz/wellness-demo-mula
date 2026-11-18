import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import {
  getGoogleOAuthConfig,
  getJwtSecretKey,
  GOOGLE_OAUTH_COOKIE,
  isProductionEnv,
} from "@/wellness/config";

export const dynamic = "force-dynamic";

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin;
  const { clientId, redirectUri } = getGoogleOAuthConfig(requestOrigin);
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/?authError=google_not_configured", request.url)
    );
  }

  const state = toBase64Url(crypto.randomBytes(24));
  const codeVerifier = toBase64Url(crypto.randomBytes(32));
  const codeChallenge = toBase64Url(crypto.createHash("sha256").update(codeVerifier).digest());

  const stateJwt = await new SignJWT({ state, codeVerifier })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getJwtSecretKey());

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(GOOGLE_OAUTH_COOKIE, stateJwt, {
    httpOnly: true,
    secure: isProductionEnv(),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
