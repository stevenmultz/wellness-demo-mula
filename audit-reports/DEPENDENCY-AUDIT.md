# DEPENDENCY & SUPPLY CHAIN AUDIT

**Package Manager**: npm (`package.json`, `package-lock.json`)  
**Total Locked Packages**: `526` entries in `package-lock.json`  
**Direct Production Dependencies (`9`)**: `@prisma/client`, `bcryptjs`, `jose`, `lenis`, `lucide-react`, `next`, `pg`, `react`, `react-dom`, `sharp`, `web-push`, `zod` *(Wait: 12 listed in dependencies!)* — let's enumerate exact observed dependencies below.

---

## 1. Direct Dependency Inventory & Usage Verification (`package.json`)

- **Runtime (`12`)**: `@prisma/client` (`^5.19.0`, locked `5.22.0`), `bcryptjs` (`^3.0.3`), `jose` (`^6.2.2`), `lenis` (`^1.3.21`), `lucide-react` (`^0.438.0`), `next` (`14.2.13`, installed `14.2.35`), `pg` (`^8.23.1`), `react` (`^18`), `react-dom` (`^18`), `sharp` (`^0.35.5`), `web-push` (`^3.6.7`), `zod` (`^3.25.76`).
- **DevDependencies**: `typescript`, `@types/*`, `prisma`, `tailwindcss`, `eslint`, `eslint-config-next`, `tsx`, `postcss`.

---

## 2. Supply Chain & License Findings (`AUD-020`, `AUD-028`)

1. **Unused Heavy Runtime Dependencies (`AUD-020` — MEDIUM, OPEN)**:
   - Direct code import scan across `src/` shows **0 imports** of `pg` and **0 imports** of `sharp`. Prisma uses its own native query engine binary rather than `pg`, and `/api/upload` performs magic-byte validation without resizing via `sharp`.
2. **Copyleft / Weak-Copyleft & Unknown Transitive Licenses (`AUD-020` — MEDIUM, OPEN)**:
   - `package-lock.json` license scan reveals:
     - `10` `@img/sharp-libvips-*` packages licensed under **`LGPL-3.0-or-later`**
     - `4` `@img/sharp-libvips-*` packages dual-licensed **`Apache-2.0 AND LGPL-3.0-or-later`**
     - `2` transitive packages (`busboy`, `streamsearch`, dependencies of `undici`/upload ecosystem) reporting **`UNKNOWN`** license metadata in `package-lock.json`.
   - Keeping unused `sharp` increases container/serverless deployment size and introduces LGPL licensing obligations unnecessarily unless `sharp` is intentionally used for server image processing.
3. **CVE Vulnerability Lookup (`AUD-028` — NO DATA / NOT TESTED)**:
   - Live `npm audit` against the npm Advisory Registry requires outbound network access and was not run inside the offline sandbox. Recommend running `npm audit --audit-level=high` in CI/CD before production release.
4. **Recommendation**:
   - Remove unused `pg` (and either remove `sharp` or move image resizing into an explicitly isolated server worker/storage pipeline with legal sign-off).
   - Enable Dependabot / Renovate + `npm audit` blocking check in CI (`AUD-022`).
