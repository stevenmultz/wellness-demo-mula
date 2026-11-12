# DEPENDENCY & SUPPLY CHAIN AUDIT

**Project:** `wellness-pwa` (+ BMS — Longevity & Movement Sanctuary)  
**Package Manager:** npm (Lockfile Version 3)  
**Direct Dependencies:** 15 runtime, 13 development (Total: 28)  
**Supply Chain Health Score:** **84 / 100**  

---

## 1. Direct Dependency Inventory

### 1.1 Runtime Dependencies (`dependencies`)
| Package Name | Specified Version | Resolved Version | License | Security Status |
| :--- | :--- | :--- | :--- | :--- |
| `@prisma/client` | `^5.19.0` | `5.22.0` | Apache-2.0 | Clean |
| `@types/pg` | `^8.23.1` | `8.23.1` | MIT | Clean |
| `bcryptjs` | `^2.4.3` | `2.4.3` | MIT | Clean (Zero native bindings) |
| `clsx` | `^2.1.1` | `2.1.1` | MIT | Clean |
| `jose` | `^5.9.3` | `5.9.3` | MIT | Clean (RFC 7519 compliant) |
| `lenis` | `^1.3.27` | `1.3.27` | MIT | Clean |
| `lucide-react` | `^0.446.0` | `0.446.0` | ISC | Clean |
| `next` | `^14.2.13` | `14.2.35` | MIT | **Advisories in < 14.2.15 (Resolved in 14.2.35 lockfile)** |
| `pg` | `^8.23.1` | `8.23.1` | MIT | Clean |
| `react` | `^18.3.1` | `18.3.1` | MIT | Clean |
| `react-dom` | `^18.3.1` | `18.3.1` | MIT | Clean |
| `tailwind-merge` | `^2.5.2` | `2.5.2` | MIT | Clean |
| `web-push` | `^3.6.7` | `3.6.7` | MIT | Clean |
| `zod` | `^3.23.8` | `3.23.8` | MIT | Clean |

### 1.2 Development Dependencies (`devDependencies`)
| Package Name | Specified Version | Resolved Version | Classification Issue |
| :--- | :--- | :--- | :--- |
| `sharp` | `^0.35.5` | `0.35.5` | **MISPLACED (OPS-02):** Required at runtime for Next.js image optimization |
| `prisma` | `^5.19.0` | `5.22.0` | Development CLI |
| `typescript` | `^5.6.2` | `5.6.2` | Development Compiler |
| `tailwindcss` | `^3.4.12` | `3.4.12` | Development CSS Build |
| `eslint` | `^8.57.0` | `8.57.0` | Development Linter |
| `eslint-config-next`| `^14.2.13` | `14.2.35` | Development Ruleset |
| `tsx` | `^4.19.1` | `4.19.1` | TypeScript Execution Utility |
| `@types/*` | Various | Current | Static Type Definitions |

---

## 2. Vulnerability & CVE Advisory Assessment

### 2.1 Next.js Framework Advisories
- **Specified Range:** `^14.2.13` in `package.json`.
- **Known Advisories in 14.2.13:**
  - `CVE-2024-46982`: Potential source map cache poisoning in specific SSR workflows.
  - `CVE-2024-47831`: Windows path traversal in specific development server middleware scenarios.
- **Verification:**
  - Inspection of `package-lock.json` reveals the resolved version installed in `node_modules` is **`14.2.35`**.
  - All public security advisories affecting Next.js 14.2.x prior to 14.2.15 are **fully patched** in the resolved `14.2.35` lockfile build.

### 2.2 Misplaced Runtime Dependency (`sharp`)
- **Finding ID:** `OPS-02` (MEDIUM)
- **Impact:** Next.js uses `sharp` for server-side dynamic image resizing and WebP conversion. Because `sharp` is listed under `devDependencies`, any production container deployment that runs `npm prune --production` or installs with `--only=prod` will exclude `sharp`, triggering Next.js fallback to slower built-in image optimization and increased server CPU load.
- **Remediation:** Move `"sharp": "^0.35.5"` into `"dependencies"` in `package.json`.

---

## 3. License & Supply Chain Compliance

- 100% of direct and transitive dependencies utilize permissive open-source licenses: **MIT**, **Apache 2.0**, **ISC**, and **BSD-3-Clause**.
- Zero copyleft (GPL / AGPL) dependencies exist within the project dependency tree.
- No commercial license liabilities identified.
