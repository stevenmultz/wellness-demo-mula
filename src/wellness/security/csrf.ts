import type { NextRequest } from "next/server";
import { getAppUrl } from "../config";

/**
 * Verifies that cookie-authenticated mutating API requests originate from the same origin.
 * Guards against cross-origin CSRF form submissions and sibling-subdomain attacks
 * when paired with SameSite=Lax session cookies.
 */
export function verifySameOriginRequest(req: NextRequest): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (secFetchSite && secFetchSite !== "same-origin") {
    return false;
  }

  const allowedHosts = new Set<string>();
  const addHost = (raw: string | null | undefined) => {
    const trimmed = raw?.trim().toLowerCase();
    if (trimmed) allowedHosts.add(trimmed);
  };

  addHost(req.headers.get("host"));
  addHost(req.headers.get("x-forwarded-host")?.split(",")[0]);
  addHost(req.nextUrl?.host);
  try {
    addHost(new URL(getAppUrl()).host);
  } catch {
    // Ignore malformed fallback URL
  }

  if (allowedHosts.size === 0) {
    return false;
  }

  const origin = req.headers.get("origin")?.trim();
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      return allowedHosts.has(originHost);
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer")?.trim();
  if (referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      return allowedHosts.has(refererHost);
    } catch {
      return false;
    }
  }

  return true;
}
