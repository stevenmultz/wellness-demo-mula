# BUSINESS LOGIC & WORKFLOW AUDIT

## 1. Core Domain Workflows Evaluated

### A. Enrollment, Pricing & QRIS Checkout (`AUD-001` CRITICAL, `AUD-005` FIXED)
- **Free Programs (`price <= 0`)**: Enroll immediately in `ACTIVE` status inside `prisma.$transaction`. Previously suffered `@unique` `paymentReference` collisions (`FREE-${Date.now().toString().slice(-6)}`, wrapping every ~16.6 min) — **fixed in Stage 5** (`crypto.randomBytes(6)`).
- **Paid Programs (`price > 0`)**:
  - Creates `PENDING_PAYMENT` enrollment with 15-minute `invoiceExpiresAt` (`QrisCheckoutModal.tsx`).
  - **Blocker (`AUD-001`)**: `payment-gateway.ts` returns simulated QRIS invoices (`// TODO` stubs for Midtrans/Xendit). `QrisCheckoutModal.tsx` renders a hardcoded static SVG matrix regardless of invoice amount/reference.
  - **Blocker (`AUD-001`)**: `wellnessConfirmQrisPayment` blocks completion in `NODE_ENV === "production"` unless `ALLOW_PAYMENT_SIMULATION="true"` is enabled (bypassing real payment verification!).
  - **Blocker (`AUD-001`)**: `agreedToTerms` checkbox (`QrisCheckoutModal.tsx:113-116`) is enforced strictly in React UI; `wellnessConfirmQrisPayment` records `termsAgreedAt` server-side without checking any submitted consent boolean.
- **Unchecked Error Handling Fixed (`AUD-017` — Stage 5)**: `handleModeChange` and `handleRegenerateQris` now catch failed Server Actions instead of leaving unhandled rejections.

### B. Client-Only Fake Issue & Quit Submissions (`AUD-009` — HIGH, OPEN)
- In `src/components/dashboard/tabs/MyPlanTab.tsx:1209-1231`, submitting "Report Issue" or "Quit Program" executes a `setTimeout` (~450ms) and writes JSON arrays only to browser `localStorage` (`wellness_quit_requests`, `wellness_reported_issues`), displaying a success confirmation to the member without creating any DB record or notifying coaches/admins.

### C. Program Visibility & Day Drip Gating (`AUD-011` — HIGH, OPEN)
- `src/app/dashboard/page.tsx` maps `OPEN` status programs to `"COMING_SOON"` (and excludes `["ARCHIVE", "DRAFT"]` while omitting `"REVIEW"`).
- While `videoUrl` and `meetupLink` are gated by enrollment/unlock checks (`canAccessMedia`, `isPaidMember`), `dayNotifications`, `videoChecklist`, `mealRecommendation`, `dailyAssessment`, `restInstructions`, `onsiteVenue`, `onsiteSchedule`, and `eventDetails` are still serialized to the client RSC payload for locked future days and un-enrolled previews.

### D. WIB Timezone & Program Completion Rules (`VERIFIED`)
- `src/wellness/utils/timezone.ts` and `daily-tasks.ts` accurately normalize all day unlock windows (`00:00:00 WIB`), nightly cutoffs (`23:59:59.999 WIB`), registration deadlines, and cross-midnight sleep durations independently of server UTC locale (verified by `scripts/test-audit-unit.ts`).
- `src/wellness/validators/program.ts` enforces completeness rules for program publishing and curriculum days cleanly.
