# MEDIA & FILE STORAGE AUDIT

## 1. Upload & Serving Architecture
- **Avatar Uploads (`/api/profile/avatar`)**: Authenticated; converts validated small image into data URI stored on `User.avatarUrl` or clears on `DELETE`.
- **Workout & Health Profile Photos (`/api/upload`)**:
  - Requires authenticated session (`getWellnessSession()`).
  - Enforces `MAX_FILE_SIZE` (5 MB) and inspects actual file magic bytes (JPEG, PNG, WebP) — verified by `scripts/test-security-remediation.ts`.
  - **Storage Behavior (`src/app/api/upload/route.ts:63-86`)**:
    1. Attempts `fs.mkdir` + `fs.writeFile` into `public/uploads/workouts/<timestamp>-<uuid>.<ext>` and returns `/uploads/workouts/...`.
    2. If filesystem write fails (standard behavior on Vercel serverless read-only filesystem), catches the error and falls back to returning `data:image/<mime>;base64,<payload>`.

---

## 2. Critical & High Storage Risks

1. **Unauthenticated Public File Exposure (`AUD-002` — CRITICAL, OPEN)**:
   - On writable hosts, `/public/uploads/workouts/` serves member progress photos and sensitive body check-in images (`front`/`side`/`back`) with **zero authentication or ownership check** to any client requesting the path.
2. **PostgreSQL Row Bloat (`AUD-002` — CRITICAL, OPEN)**:
   - On read-only serverless hosts (Vercel), up to 5 MB binary images (~6.67 MB base64 strings) are stored directly inside PostgreSQL `TEXT` columns (`ProgramDayProgress.photoBeforeUrl`, `photoAfterUrl`, `CustomerHealthProfile.photoFrontUrl`, `photoSideUrl`, `photoBackUrl`). Because `/admin` eagerly loads up to 200 users with all `healthProfile` and `dayProgress` rows (`AUD-007`), a handful of base64 uploads degrades SSR serialization and DB I/O rapidly.
3. **Zero Orphan / Lifecycle Cleanup**:
   - When a member overwrites a photo or deletes their account, database rows are updated/cascaded, but local files in `public/uploads/workouts/` are never unlinked from disk, leaking storage indefinitely.
4. **Static Video Bandwidth Waste (`AUD-021` — MEDIUM, OPEN)**:
   - `public/video.mp4` is **31.2 MB** served statically from `/video.mp4` in `LandingClient.tsx:285` without adaptive streaming (HLS/DASH), compression optimization, or CDN video proxy.
5. **Service Worker Cross-Session Photo Caching (`AUD-008` — FIXED in Stage 5)**:
   - `public/sw.js` previously matched all `.webp/.jpg/.png` URLs including `/uploads/*`, persisting user media in shared browser Cache Storage across sessions. Excluded `/uploads/` in `sw.js` (`v8`).

---

## 3. Recommended Storage Architecture (Requires Approval — Stage 6)
- Provision private S3 / Cloudflare R2 / Supabase Private Storage bucket.
- Use short-lived presigned upload URLs and authenticated/short-lived signed read URLs checking user ownership or `ADMIN` role.
- Server-side resize/compress uploads (`sharp` is already installed in `package.json` but currently unused!) and delete replaced/orphaned objects on update/account deletion.
