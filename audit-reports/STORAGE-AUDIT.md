# IMAGE, MEDIA & FILE STORAGE AUDIT

**Project:** `wellness-pwa` (+ BMS — Longevity & Movement Sanctuary)  
**Media Upload Endpoints:** `/api/upload` (Workout check-in photos), `/api/profile/avatar` (User avatar)  
**Storage Posture:** **HIGH RISK (Serverless Ephemeral Storage & Base64 DB Fallback)**  
**Audit Score:** **65 / 100**  

---

## 1. Storage Architecture Overview

```mermaid
flowchart LR
    Client["Client Browser"]
    UploadAPI["POST /api/upload"]
    AvatarAPI["POST /api/profile/avatar"]
    LocalFS["Local Disk (public/uploads/workouts)"]
    DB[("PostgreSQL Database (Text Columns)")]
    CloudTarget[("Cloud Object Storage (S3 / R2 / Supabase Bucket) - RECOMMENDED")]

    Client -->|Check-in Photo (max 5MB)| UploadAPI
    Client -->|Avatar (max 400KB)| AvatarAPI

    UploadAPI -->|Attempt Write| LocalFS
    UploadAPI -.->|Fail in Serverless Lambda| DB
    AvatarAPI -->|Normalized Base64| DB

    LocalFS -.->|Needs Migration| CloudTarget
```

---

## 2. Technical Vulnerability & Risk Analysis

### 2.1 Unbounded Base64 Data URL Fallback in Database (HIGH — STOR-01)
- **Location:** `src/app/api/upload/route.ts#L79-L87`
- **Code:**
  ```typescript
  try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ success: true, url: `/uploads/workouts/${filename}` });
  } catch {
    // In serverless / read-only filesystem environments (e.g. Vercel Lambda),
    // return a normalized data URL so uploads remain functional without crashing
    const fallbackDataUrl = `data:${verifiedMime};base64,${buffer.toString("base64")}`;
    return NextResponse.json({ success: true, url: fallbackDataUrl });
  }
  ```
- **Analysis:**
  - On platforms like Vercel, the file system outside `/tmp` is read-only.
  - `fs.writeFileSync` consistently fails on every production upload.
  - The fallback returns a 5MB base64 data URL.
  - The client stores this string in `ProgramDayProgress.photoBeforeUrl` and `ProgramDayProgress.photoAfterUrl`.
- **Database Bloat Calculation:**
  - Base64 encoding increases file payload size by **33%**. A 5MB image becomes **~6.67 MB** of text.
  - A cohort of 100 participants completing 21 days with 2 photos/day:
    $$100 \times 21 \times 2 \times 6.67\text{ MB} \approx 28\text{ GB}$$
  - Storing 28 GB of raw image strings in PostgreSQL text columns causes table bloat, slow index scans, high RAM consumption, and database connection timeouts when querying rows.
- **Remediation:** Connect dedicated Cloud Object Storage (AWS S3, Cloudflare R2, or Supabase Storage) and return permanent HTTPS CDN URLs.

### 2.2 Ephemeral File Loss in Containerized Environments
- In Docker or traditional VM deployments, writing files to `public/uploads/workouts/` without an attached persistent volume (EBS, PersistentVolumeClaim) results in **total data loss** upon container redeployment, restart, or auto-scaling.

### 2.3 Orphan File Accumulation (LOW — STOR-02)
- When a user deletes their account (`wellnessDeleteAccount`), database records in `program_day_progress` and `users` are removed via `onDelete: Cascade`.
- However, physical files previously written to `public/uploads/workouts/` remain on disk indefinitely.
- No garbage-collection cron or storage cleanup routine exists.

---

## 3. Storage Security Controls (VERIFIED POSITIVE)

1. **Magic Byte Signature Inspection:**
   - Both `/api/upload` and `/api/profile/avatar` verify authentic binary headers (`0xFF 0xD8 0xFF` for JPEG, `0x89 0x50 0x4E 0x47` for PNG, `RIFF....WEBP` for WebP).
   - Spoofed files (e.g. executable script disguised with `.jpg` extension) are strictly rejected.
2. **Payload Size Caps:**
   - Avatar upload is strictly capped at **400 KB**.
   - Workout photo upload is strictly capped at **5 MB**.
3. **Randomized File Names:**
   - Upload file names are generated using `crypto.randomBytes(12).toString("hex")` combined with user ID and timestamp, preventing directory traversal and file overwrite attacks.
