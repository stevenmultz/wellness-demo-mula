/**
 * TRANSACTIONAL EMAIL INTEGRATION TEMPLATE (RESEND / NODEMAILER / SENDGRID)
 * -------------------------------------------------------------------------
 * Central adapter for sending password reset links and cohort enrollment receipts.
 * Enforces explicit request timeouts and bounded retry with jitter on transient 5xx/429 failures.
 */

import {
  EMAIL_MAX_ATTEMPTS,
  EMAIL_REQUEST_TIMEOUT_MS,
  getEmailConfig,
  isProductionEnv,
} from "../config";

export function escapeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendTransactionalEmail(
  payload: SendEmailPayload
): Promise<{ delivered: boolean; provider: string }> {
  const { provider, resendApiKey, from } = getEmailConfig();

  if (provider === "RESEND" && resendApiKey) {
    for (let attempt = 1; attempt <= EMAIL_MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
            ...(payload.text ? { text: payload.text } : {}),
          }),
          signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
        });

        if (res.ok) {
          return { delivered: true, provider: "RESEND" };
        }

        const errorText = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        console.error(`[Email Adapter Error - Resend]: HTTP ${res.status}: ${errorText}`);

        if (!retryable || attempt >= EMAIL_MAX_ATTEMPTS) {
          return { delivered: false, provider: "RESEND" };
        }
      } catch (err) {
        console.error(`[Email Adapter Error - Resend Exception attempt ${attempt}]:`, err);
        if (attempt >= EMAIL_MAX_ATTEMPTS) {
          return { delivered: false, provider: "RESEND" };
        }
      }

      // Bounded backoff with jitter before retry
      const jitterMs = 200 + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, jitterMs));
    }
    return { delivered: false, provider: "RESEND" };
  }

  if (isProductionEnv()) {
    console.error("[Email Adapter]: Transactional email provider is not configured in production.");
    return { delivered: false, provider: "UNCONFIGURED" };
  }

  console.log(`\n======================================================`);
  console.log(`[EMAIL ADAPTER - ${provider}]`);
  console.log(`To: ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  if (payload.text) console.log(`Body: ${payload.text}`);
  console.log(`======================================================\n`);

  return { delivered: true, provider: "CONSOLE_DEV" };
}
