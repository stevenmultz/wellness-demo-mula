# PRODUCTION MONITORING, TELEMETRY & ALERTING SPECIFICATION

**Project:** `wellness-pwa` (+ BMS — Longevity & Movement Sanctuary)  
**Telemetry Implementation Status:** **NOT IMPLEMENTED / NO DATA (Design & Specification Blueprint)**  
**Standard:** SRE Observability Framework (Google SRE Book), Four Golden Signals (Latency, Traffic, Errors, Saturation)  

---

## 1. 25 Production Monitoring Metrics Specification

| # | Metric Name | Definition | Data Source & Collection Method | Measurement Frequency | Normal Threshold | Warning Threshold | Critical Threshold | Alert Channel & Trigger | Mitigation & Runbook Action | Current Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Uptime** | Percentage of successful HTTP requests to root and health endpoints. | Synthetic probe (BetterUptime / Datadog) hitting `GET /api/health` | Every 60s | >= 99.9% | < 99.5% | < 99.0% | PagerDuty / Slack (#alerts) | Check Vercel deployment status; verify DNS; trigger failover container if edge down. | **NOT IMPLEMENTED** |
| **2** | **SSL/TLS Status** | Validity and handshake success of TLS 1.3 certificate. | Synthetic monitor TLS handshake check | Every 1 Hour | Valid (TLS 1.3) | Protocol < 1.3 | Invalid / Broken Chain | PagerDuty | Force certificate reissue in Vercel / Cloudflare dashboard; check CAA DNS records. | **NOT IMPLEMENTED** |
| **3** | **SSL Expiration** | Days remaining before public TLS certificate expires. | Cert monitor cron (`openssl s_client` probe) | Daily | > 30 Days | <= 14 Days | <= 3 Days | Slack / Email | Trigger automated Let's Encrypt / Vercel auto-renewal; inspect ACME challenge DNS. | **NOT IMPLEMENTED** |
| **4** | **HTTPS Status** | Verification that plain HTTP requests redirect (301/308) to HTTPS. | Synthetic HTTP GET to `http://domain` | Every 6 Hours | 301/308 Redirect | 200 over HTTP | Connection Refused | Slack | Enforce "Always Use HTTPS" and HSTS at edge CDN / Vercel domain settings. | **NOT IMPLEMENTED** |
| **5** | **Security Headers**| Verification that HSTS, CSP, X-Frame-Options, and nosniff headers exist on responses. | Security header scanner (SecurityHeaders.com API / CI cron) | Daily | Grade A / A+ | Missing 1 header | CSP / HSTS missing | Slack (#security) | Check `next.config.mjs` headers configuration; deploy patch immediately. | **NOT IMPLEMENTED** |
| **6** | **Failed Authentication**| Count of failed sign-in attempts per unit time. | Application security logs (`wellnessSignIn` failures) | Real-time (1m rollup) | < 10 / min | 10–50 / min | > 50 / min | Slack / PagerDuty | Check for credential stuffing attack; temporarily increase rate limit thresholds; inspect IPs. | **NOT IMPLEMENTED** |
| **7** | **Rate Limit Hits** | Frequency of HTTP 429 Too Many Requests responses. | Reverse proxy / rate-limit middleware telemetry | Real-time (1m rollup) | < 5 / min | 5–30 / min | > 30 / min | Slack | Analyze requesting IP addresses; add abusive CIDR blocks to Cloudflare firewall blocklist. | **NOT IMPLEMENTED** |
| **8** | **Suspicious Traffic**| Requests targeting sensitive endpoints, SQLi/path traversal patterns. | WAF / Edge log analysis (Cloudflare / Vercel WAF) | Real-time | 0 / min | 1–10 / min | > 10 / min | Slack / Security On-Call | Enable Cloudflare "Under Attack Mode"; block hostile ASN / IP ranges. | **NOT IMPLEMENTED** |
| **9** | **Bot / Scraper Traffic**| Non-browser user agent traffic volume. | Edge log analyzer / User-Agent classification | Hourly rollup | < 5% total | 5%–20% total | > 20% total | Slack | Enable edge bot management challenge (Turnstile / CAPTCHA on unverified bots). | **NOT IMPLEMENTED** |
| **10**| **Dependency CVEs**| Vulnerabilities in direct or transitive npm packages. | GitHub Dependabot / Snyk daily scan | Daily | 0 CVE | 1+ Medium | 1+ High / Critical | GitHub Issue / Slack | Review CVE advisory; bump package version or apply patch; run regression tests. | **NOT IMPLEMENTED** |
| **11**| **Backup Status** | Success / failure of automated database backup. | Supabase API / backup cron notification webhook | Daily (01:00 UTC) | Success (100%) | Skipped | Backup Failed | PagerDuty (High Priority)| Manually trigger `pg_dump` backup; inspect database disk storage quota. | **NOT IMPLEMENTED** |
| **12**| **API Availability** | Uptime percentage of REST API routes (`/api/*`). | Synthetic API runner probe | Every 2 Minutes | >= 99.9% | < 99.5% | < 99.0% | PagerDuty | Inspect serverless function crash logs in Vercel; restart stalled database poolers. | **NOT IMPLEMENTED** |
| **13**| **API Latency (P95)**| 95th percentile response latency for API endpoints. | APM (Sentry / Datadog / OpenTelemetry) | Real-time (5m window)| < 300 ms | 300–800 ms | > 800 ms | Slack | Inspect slow database queries; check Supabase PgBouncer queue latency; scale serverless. | **NOT IMPLEMENTED** |
| **14**| **HTTP Error Rate** | Percentage of responses with HTTP status 5xx. | Edge log metrics / Vercel Analytics | Real-time (1m window)| < 0.1% | 0.1%–1.0% | > 1.0% | PagerDuty | Check unhandled exception logs in Sentry; verify database connectivity. | **NOT IMPLEMENTED** |
| **15**| **CPU Usage** | CPU utilization percentage on hosting containers / DB. | Cloud monitoring agent (Supabase metrics / AWS CW) | Every 60s | < 60% | 60%–80% | > 80% | Slack / PagerDuty | Identify runaway query or infinite loop; scale database compute tier. | **NOT IMPLEMENTED** |
| **16**| **Memory Usage** | RAM saturation on database server and compute lambdas. | Cloud metrics agent | Every 60s | < 70% | 70%–85% | > 85% | PagerDuty | Inspect for Node.js memory leaks; check PostgreSQL buffer pool cache size. | **NOT IMPLEMENTED** |
| **17**| **Disk Usage** | Storage volume consumption on database and file disks. | Supabase database disk metrics | Every 1 Hour | < 70% | 70%–85% | > 85% | PagerDuty | Prune old log tables; archive completed cohort images to cold storage. | **NOT IMPLEMENTED** |
| **18**| **Database Health** | Database liveness and responsiveness (`SELECT 1`). | Application database health check probe | Every 30s | Responsive (<50ms)| 50–200 ms | Unresponsive / Timeout | PagerDuty (CRITICAL) | Check Supabase service status; restart pooler; verify AWS regional connectivity. | **NOT IMPLEMENTED** |
| **19**| **Slow Queries** | Queries taking longer than 250 milliseconds to execute. | PostgreSQL `pg_stat_statements` / Supabase Query Perf | Hourly rollup | 0 queries | 1–5 / hour | > 5 / hour | Slack (#engineering) | Run `EXPLAIN ANALYZE`; verify index usage; optimize Prisma query includes. | **NOT IMPLEMENTED** |
| **20**| **DB Connections** | Active PostgreSQL connections vs pool limit. | Supabase PgBouncer metrics | Every 60s | < 50% pool | 50%–80% pool | > 80% pool | Slack / PagerDuty | Check for unclosed Prisma clients; increase pooler size; review `connection_limit`. | **NOT IMPLEMENTED** |
| **21**| **Cache Hit Ratio** | Percentage of static assets served from edge CDN cache. | Vercel Analytics / Cloudflare Cache Analytics | Daily rollup | > 85% | 70%–85% | < 70% | Slack | Review `Cache-Control` response headers; ensure immutable static hashing is active. | **NOT IMPLEMENTED** |
| **22**| **Storage Health** | Accessibility and upload success rate to media storage. | Upload probe / Cloud storage bucket metrics | Every 5 Minutes | 100% Success | < 99% Success | Storage Unreachable | PagerDuty | Verify S3 / Supabase storage bucket permissions and API credentials. | **NOT IMPLEMENTED** |
| **23**| **Queue / Cron Health**| Execution success of scheduled notification dispatches. | Vercel Cron execution logs & webhook monitor | Daily / Per-run | 100% Success | Runtime > 55s | Cron Failed / Missed | Slack / PagerDuty | Inspect `dispatch-due-notifications` error logs; verify `CRON_SECRET` authentication. | **NOT IMPLEMENTED** |
| **24**| **CDN Edge Health** | Edge network packet loss and availability. | Third-party global synthetic monitor | Every 5 Minutes | 100% Reachable | < 99.5% | Region Down | PagerDuty | Route DNS around affected edge PoP if multi-CDN; contact edge CDN support. | **NOT IMPLEMENTED** |
| **25**| **Network Latency** | Network round-trip time between app server & database. | Internal ping / APM trace between compute & DB | Every 5 Minutes | < 15 ms | 15–50 ms | > 50 ms | Slack | Ensure Next.js compute and Supabase DB reside in the same AWS region (`ap-northeast-2`). | **NOT IMPLEMENTED** |

---

## 2. Recommended Telemetry Implementation Plan

1. **APM & Error Tracking:** Install `@sentry/nextjs`. Configure automatic transaction tracing, error boundary capture, and correlation of client-side errors with server traces.
2. **Uptime Monitoring:** Configure BetterUptime or Datadog Synthetics to probe `GET /api/health` every 60 seconds from Jakarta, Singapore, and Tokyo locations.
3. **Structured Logging:** Implement Pino or Axiom logger formatting logs in structured JSON with `traceId`, `userId`, `method`, `route`, and `durationMs`.
