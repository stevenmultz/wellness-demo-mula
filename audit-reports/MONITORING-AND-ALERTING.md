# MONITORING, LOGGING & ALERTING AUDIT

**Telemetry Implementation Status**: **NOT IMPLEMENTED** (`AUD-028`)  
*All runtime baseline metrics in [monitoring-metrics.json](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/audit-reports/monitoring-metrics.json) are explicitly recorded as `NO DATA` rather than fabricated.*

---

## 1. Current Logging Inventory
- Logging relies solely on unstructured `console.error(...)` and `console.warn(...)` calls across API routes, Server Actions, and integrations.
- Sensitive credential strings (`password`, JWT cookie values, full tokens) are **not** logged in observed catch blocks. Raw `error.message` leakage on 500 HTTP responses was removed in Stage 5 (`AUD-016`).
- Zero centralized log sink (Datadog, Logflare, BetterStack), zero APM/tracing (OpenTelemetry, Sentry), and zero security anomaly detection exist.

---

## 2. Recommended Authentication & Traffic Monitoring Indicators

| Signal | Condition / Threshold | Risk Tier | Recommended Alert Action |
|---|---|---|---|
| **Repeated Failed Logins** | `>= 10` failed attempts per IP or `>= 5` per email in `5m` (`HTTP 401` / auth failure) | **HIGH** | Emit structured event (`ip_hash`, `email_hash`, `user_agent`); trigger Slack/PagerDuty alert on burst & temporary challenge/rate-limit |
| **Rate Limit Exceeded (`429`)** | Spike in `429` responses on auth or `/api/notifications/tick` | **MEDIUM** | Separate abusive automation from misbehaving client polling (`DashboardClient`) |
| **Unauthorized Cron Access** | `>= 3` `401` hits on `/api/cron/dispatch-notifications` in `10m` | **HIGH** | Alert immediately (probing cron secret) |
| **Unauthorized Admin Access** | Non-admin user triggering `requireAdmin()` denial or revoked `tokenVersion` check | **CRITICAL** | Immediate security alert + session audit |
| **SSRF / Blocked Push Endpoint** | Attempted internal/non-allowlisted endpoint in `/api/push/subscribe` | **HIGH** | Log `userId` & blocked host only (redact full payload URL query secrets) |
| **Upload Abuse / Validation Failures** | Burst of invalid MIME/magic-byte rejections or >5MB attempts on `/api/upload` | **MEDIUM** | Flag abusive account/IP |
| **5xx Error Rate / Slow DB Queries** | `>= 1%` 5xx on API/Actions or DB query `> 500ms` | **HIGH** | Alert on-call; correlate with Vercel function logs & Supabase pooler saturation |
| **Crawler vs Bot Separation** | Inspect User-Agent + rate distribution on public `/`, `/api/explore/programs` | **LOW** | Allow legitimate bots (`Googlebot`) while throttling aggressive scrapers |

> **Privacy Rule**: Structured audit logs must NEVER store plaintext passwords, JWTs, password reset tokens, VAPID private keys, or raw base64 user body photos.
