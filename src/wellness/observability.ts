import * as Sentry from "@sentry/nextjs";

export type ObservabilityDomain =
  | "payment"
  | "auth"
  | "media"
  | "cron"
  | "email"
  | "health"
  | "admin"
  | "program";

const SENSITIVE_KEY_RE = /(password|token|secret|cookie|authorization|email|phone|signature|key|hash)/i;

/**
 * Recursively strips PII and credentials before attaching context to Sentry events.
 */
export function sanitizeObservabilityContext(
  extra?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!extra) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      clean[k] = "[REDACTED]";
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      clean[k] = sanitizeObservabilityContext(v as Record<string, unknown>);
    } else if (v instanceof Date) {
      clean[k] = v.toISOString();
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Reports caught server/API/action exceptions to Sentry (so try/catch blocks never create blind spots)
 * while logging locally and guaranteeing observability failures never crash request handlers.
 */
export function reportServerError(
  domain: ObservabilityDomain,
  operation: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  console.error(`[${domain}:${operation}]`, error);
  try {
    const safeExtra = sanitizeObservabilityContext(extra);
    Sentry.withScope((scope) => {
      scope.setTag("domain", domain);
      scope.setTag("operation", operation);
      if (safeExtra) {
        scope.setExtras(safeExtra);
      }
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureException(new Error(`${domain}:${operation}: ${String(error)}`));
      }
    });
  } catch {
    // Observability must never interrupt production request execution
  }
}

/**
 * Reports non-exception critical operational or financial incidents (e.g. QRIS quota overflow,
 * webhook amount mismatch, failed auto-refund fallback, email delivery outage) to Sentry.
 */
export function reportCriticalIncident(
  domain: ObservabilityDomain,
  operation: string,
  message: string,
  level: "warning" | "error" = "error",
  extra?: Record<string, unknown>
): void {
  if (level === "error") {
    console.error(`[Incident ${domain}:${operation}] ${message}`);
  } else {
    console.warn(`[Incident ${domain}:${operation}] ${message}`);
  }
  try {
    const safeExtra = sanitizeObservabilityContext(extra);
    Sentry.withScope((scope) => {
      scope.setTag("domain", domain);
      scope.setTag("operation", operation);
      scope.setLevel(level);
      if (safeExtra) {
        scope.setExtras(safeExtra);
      }
      Sentry.captureMessage(`[${domain}:${operation}] ${message}`, level);
    });
  } catch {
    // Observability must never interrupt production request execution
  }
}
