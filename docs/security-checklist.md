# Security Checklist

---

## 1. Authentication & Session Management

### Password & Credential Storage

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 1.1 | **Hash passwords with Argon2id**: min 19 MiB memory, 2 iterations, parallelism 1. Fall back to bcrypt work factor ≥ 10. | 🔴 Critical | ASVS V6.2, Password Storage CS |
| 1.2 | Enforce password length **8–128 chars**, no composition rules. Check against breached password lists. | 🔴 Critical | ASVS V6.2, Authentication CS, NIST 800-63B |
| 1.3 | Return **identical generic error messages** for all auth failures regardless of cause. | 🔴 Critical | ASVS V6.3, Authentication CS |
| 1.4 | Require **re-authentication** (password or MFA) before sensitive operations: password change, email change, role change, impersonation start. | 🔴 High | ASVS V6.3, Authentication CS |
| 1.5 | Enforce **MFA** (TOTP preferred) for admin accounts. | 🔴 High | ASVS V6.5, API2:2023 |
| 1.6 | Implement **account-level lockout** with exponential backoff after 5 failed attempts (not IP-based). | 🔴 High | Authentication CS, API2:2023 |

### JWT Token Security

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 1.7 | **Explicitly specify algorithm** in Hono's JWT middleware; reject `alg: "none"`. Prefer RS256/ES256 over HS256. | 🔴 Critical | JWT CS, API2:2023, ASVS V9.1 |
| 1.8 | **Validate all JWT claims** on every request: `exp`, `iss`, `aud`, `sub`, `iat`, `nbf`. | 🔴 Critical | JWT CS, ASVS V9.2 |
| 1.9 | Use **short-lived access tokens (15 min)** with refresh token rotation stored in httpOnly cookies. | 🔴 Critical | JWT CS, ASVS V7.3, Session Mgmt CS |
| 1.10 | Implement **token fingerprinting**: generate a random string at login, send as `__Secure-Fgp` hardened cookie, store SHA-256 hash in JWT, validate on every request. | 🔴 High | JWT CS |
| 1.11 | Maintain a **token denylist** for logout and password changes. Store SHA-256 of revoked JWTs in MongoDB with TTL index. | 🔴 High | JWT CS, ASVS V7.4 |
| 1.12 | HS256 secrets must be **at least 64 chars** (CSPRNG-generated); or use RSA/ECDSA key pairs. Store in env vars or secrets manager, never in code. | 🔴 High | JWT CS |

### Session & Cookie Configuration

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 1.13 | Set all auth cookies with **`httpOnly: true`, `secure: true`, `sameSite: 'Strict'`**; do not set the `domain` attribute. | 🔴 Critical | Session Mgmt CS, ASVS V7.2 |
| 1.14 | **Regenerate tokens** after every privilege level change (login, role change, impersonation start/end). | 🔴 High | Session Mgmt CS, ASVS V7.2 |
| 1.15 | Implement **idle timeout (30 min)** and **absolute timeout (8 hours)**. | 🔴 High | ASVS V7.3, Session Mgmt CS |
| 1.16 | On logout, **invalidate server-side token**, clear cookies (`maxAge: 0`), and send `Clear-Site-Data: "cookies", "storage"` header. | 🔴 High | Session Mgmt CS, ASVS V7.4 |

### Password Reset Flow

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 1.17 | Generate reset tokens using **CSPRNG**, hash before storing in MongoDB, set 1-hour expiry, single-use only. | 🔴 High | Forgot Password CS |
| 1.18 | Return **identical responses** for registered and unregistered emails; normalize response time. | 🔴 High | Forgot Password CS, Authentication CS |
| 1.19 | After password reset: **invalidate all existing sessions**, notify user via email, do not auto-login. | 🟡 Medium | Forgot Password CS, ASVS V7.4 |

---

## 2. Authorization & RBAC

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 2.1 | **Deny by default** — every route requires an explicit permission grant. No access unless a role explicitly allows it. | 🔴 Critical | ASVS V8.2, A01:2021, API5:2023 |
| 2.2 | Implement **centralized authorization middleware** in Hono that checks role + permission on every API endpoint. | 🔴 Critical | ASVS V8.2, API1:2023, Authorization CS |
| 2.3 | Enforce **object-level authorization** on every data access — verify the requesting user owns or has explicit access to the specific resource. | 🔴 Critical | API1:2023, ASVS V8.3 |
| 2.4 | **Never trust role claims from JWT alone** for sensitive operations — verify against the database. | 🔴 High | Authorization CS, ASVS V8.2 |
| 2.5 | Use **UUIDs instead of sequential MongoDB ObjectIds** in API responses to prevent enumeration. | 🔴 High | API1:2023, ASVS V8.3 |
| 2.6 | Build an **authorization matrix** mapping every role to every endpoint/action, and write automated integration tests against it. | 🔴 High | Authorization CS, ASVS V8.1 |
| 2.7 | Enforce **function-level authorization** — standard users must not access admin endpoints via URL manipulation or HTTP method change. | 🔴 High | API5:2023, ASVS V8.3 |
| 2.8 | Return **403 Forbidden** for function-level denial; return **404** for object-level denial where the resource's existence should not be revealed. | 🟡 Medium | Authorization CS, ASVS V8.2 |

---

## 3. Input Validation & Sanitization

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 3.1 | Validate **every API input** with Zod schemas on the backend using `@hono/zod-validator`. Client-side validation is UX only. | 🔴 Critical | ASVS V2.2, Input Validation CS, A03:2021 |
| 3.2 | Use **allowlist validation** (enums, regexes, type enforcement) — never rely on blocklists. | 🔴 Critical | Input Validation CS, ASVS V2.2 |
| 3.3 | Enforce **maximum length on all string inputs** to prevent memory exhaustion and DoS. | 🔴 High | Input Validation CS, API4:2023 |
| 3.4 | Set a **global request body size limit** in Hono. | 🔴 High | API4:2023, ASVS V4.2, Node.js CS |
| 3.5 | **Override Zod validator error responses** to prevent leaking internal schema structure. | 🔴 High | A05:2021, Error Handling CS |
| 3.6 | Validate `Content-Type` on all requests — **reject anything other than `application/json`** on API endpoints. | 🟡 Medium | REST Security CS, ASVS V4.2 |
| 3.7 | **Share Zod schemas** between the React frontend and Hono backend via a shared monorepo package. | 🟡 Medium | Input Validation CS |
| 3.8 | **Normalize Unicode** input before validation and storage, especially for passwords. | 🟢 Low | Password Storage CS, Input Validation CS |

---

## 4. Injection Prevention (MongoDB NoSQL)

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 4.1 | **Enforce string types via Zod** on all user-supplied query values to block operator injection (e.g., `{"$ne": ""}` instead of a string). | 🔴 Critical | A03:2021, NoSQL Security CS |
| 4.2 | Implement a **MongoDB sanitization middleware** that rejects request bodies containing `$`-prefixed keys. | 🔴 Critical | NoSQL Security CS, A03:2021 |
| 4.3 | Use **Zod schemas to validate all query/update documents** before passing to the MongoDB driver — reject unknown fields and enforce expected types. | 🔴 High | NoSQL Security CS |
| 4.4 | **Disable server-side JavaScript execution** in MongoDB — disallow `$where`, `$accumulator`, `$function`, and `mapReduce` with user input. | 🔴 High | NoSQL Security CS, A03:2021 |
| 4.5 | **Never use `eval()`, `new Function()`, string-form `setTimeout`**, or `child_process.exec()` with any user-controlled input. | 🔴 Critical | Node.js CS, A03:2021 |
| 4.6 | **Validate MongoDB ObjectIds** before passing to `findById()` or similar query methods. | 🟡 Medium | NoSQL Security CS |
| 4.7 | Protect against **prototype pollution**: reject `__proto__`, `constructor`, and `prototype` keys in JSON input. | 🔴 High | Node.js CS, A03:2021 |

---

## 5. XSS Prevention (React-Specific)

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 5.1 | **Never use `dangerouslySetInnerHTML` without DOMPurify sanitization.** Create a `<SafeHTML>` wrapper component. | 🔴 Critical | XSS Prevention CS, A03:2021 |
| 5.2 | **Validate all user-provided URLs** before rendering in `href` or `src` — allowlist `https:`, `http:`, `mailto:` only. | 🔴 Critical | DOM XSS CS, XSS Prevention CS |
| 5.3 | Implement a **strict Content Security Policy** via Hono's `secureHeaders()` middleware. | 🔴 High | XSS Prevention CS, ASVS V14 |
| 5.4 | **Never use `eval()`, `new Function()`, string-form `setTimeout/setInterval`**, or `document.write()` anywhere in frontend code. | 🔴 High | DOM XSS CS, Node.js CS |
| 5.5 | **Never spread unvalidated user JSON into React component props** — attackers can inject `dangerouslySetInnerHTML`. | 🔴 High | DOM XSS CS |
| 5.6 | Set **`X-Content-Type-Options: nosniff`** to prevent MIME-type sniffing that could enable XSS. | 🟡 Medium | XSS Prevention CS, ASVS V14 |
| 5.7 | Use an **ESLint plugin** to flag XSS-prone patterns automatically. | 🟡 Medium | XSS Prevention CS |

---

## 6. CSRF Protection

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 6.1 | Set **`SameSite=Strict`** on all authentication cookies (refresh tokens, fingerprint cookies). | 🔴 Critical | CSRF Prevention CS, ASVS V7.5 |
| 6.2 | Enable **Hono's built-in CSRF middleware**, which validates `Origin` and `Sec-Fetch-Site` headers. | 🔴 High | CSRF Prevention CS |
| 6.3 | **Require `Content-Type: application/json`** on all state-changing endpoints — HTML forms cannot submit JSON. | 🔴 High | CSRF Prevention CS, REST Security CS |
| 6.4 | **Verify the `Origin` header** server-side on all state-changing requests as an additional layer. | 🟡 Medium | CSRF Prevention CS |
| 6.5 | If using Bearer tokens in the Authorization header (not cookies), CSRF is **largely mitigated** — but still implement SameSite for any cookie-based auth components. | 🟡 Medium | CSRF Prevention CS |

---

## 7. API Security (Hono-Specific)

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 7.1 | Apply the **recommended middleware order**: requestId → logger → secureHeaders → cors → csrf → bodyLimit → rateLimiter → jwt auth → zValidator → route handlers → notFound → onError. | 🔴 Critical | REST Security CS, Node.js CS |
| 7.2 | Configure **CORS with an explicit origin allowlist** — never use `'*'` with credentials. | 🔴 Critical | REST Security CS, API8:2023, ASVS V4.1 |
| 7.3 | **Authenticate every API endpoint** except explicitly public ones (login, health check, public docs). | 🔴 Critical | API2:2023, ASVS V4.1 |
| 7.4 | Implement a **request timeout middleware** to prevent slow-loris and long-running request attacks. | 🔴 High | API4:2023 |
| 7.5 | Return **only necessary fields** in API responses — use explicit field selection; never return full database documents. | 🔴 High | API3:2023, ASVS V14.2 |
| 7.6 | Implement **pagination** on all list endpoints with an enforced maximum page size. | 🔴 High | API4:2023 |
| 7.7 | Return **`405 Method Not Allowed`** for unsupported HTTP methods on each endpoint. | 🟡 Medium | REST Security CS, API8:2023 |
| 7.8 | Implement **API versioning** via URL path prefix (`/api/v1/`) with a clear deprecation strategy. | 🟡 Medium | API9:2023 |
| 7.9 | Set an **explicit `Content-Type: application/json`** on all API responses to prevent MIME confusion. | 🟡 Medium | REST Security CS |

---

## 8. Data Protection & Encryption

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 8.1 | Enforce **HTTPS everywhere** with TLS 1.2+ (prefer 1.3). Never serve over plain HTTP. | 🔴 Critical | A02:2021, ASVS V12.1 |
| 8.2 | Enable **MongoDB TLS** for all connections between the application and database. | 🔴 Critical | A02:2021, ASVS V12.3 |
| 8.3 | **Never store sensitive data in JWT payloads** — JWTs are Base64-encoded, not encrypted. Store role names only, never PII. | 🔴 High | JWT CS, A02:2021 |
| 8.4 | Enable **MongoDB encryption at rest** (WiredTiger encrypted storage engine or Atlas encryption). | 🔴 High | A02:2021, ASVS V14.2 |
| 8.5 | Use **field-level encryption (CSFLE)** for PII fields (email, phone, address) in MongoDB. | 🔴 High | A02:2021, ASVS V14.2, GDPR |
| 8.6 | Set **`Cache-Control: no-store`** on all API responses containing sensitive data. | 🟡 Medium | ASVS V14.2 |
| 8.7 | **Never include sensitive data in URL parameters** — use request body or headers. | 🟡 Medium | ASVS V14.2, REST Security CS |
| 8.8 | Store all secrets (JWT keys, DB credentials, API keys) in a **secrets manager** (Vault, AWS Secrets Manager, Doppler) or encrypted env vars. Never commit to Git. | 🔴 High | A02:2021, Node.js CS |

---

## 9. Security Headers & CORS

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 9.1 | Enable **Hono's `secureHeaders()` middleware** — the Helmet equivalent with secure defaults. | 🔴 Critical | A05:2021, API8:2023 |
| 9.2 | Configure a **Content Security Policy** with strict directives. | 🔴 High | XSS Prevention CS, ASVS V14 |
| 9.3 | Set **`X-Frame-Options: DENY`** and CSP `frame-ancestors 'none'` to prevent clickjacking. | 🔴 High | ASVS V14, A05:2021 |
| 9.4 | Set **`Referrer-Policy: strict-origin-when-cross-origin`** or `no-referrer` to prevent sensitive URL leakage. | 🟡 Medium | ASVS V14 |
| 9.5 | Set **`Permissions-Policy`** to disable unnecessary browser features. | 🟡 Medium | A05:2021 |
| 9.6 | **Never blindly reflect the `Origin` header** into `Access-Control-Allow-Origin` — always validate against an allowlist. | 🔴 High | REST Security CS, API8:2023 |

---

## 10. Rate Limiting & DoS Protection

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 10.1 | Apply **strict rate limiting on authentication endpoints** (login, register, password reset, token refresh). | 🔴 Critical | API4:2023, Authentication CS, API6:2023 |
| 10.2 | Apply **general rate limiting** on all API endpoints. | 🔴 High | API4:2023, ASVS V4.2 |
| 10.3 | Use **per-user rate limit keys** (user ID or API key), not IP addresses alone. | 🔴 High | API4:2023 |
| 10.4 | Set **request body size limits** per route type. | 🔴 High | API4:2023, Node.js CS |
| 10.5 | Implement **request timeouts** to prevent slow requests from consuming server resources. | 🟡 Medium | API4:2023 |
| 10.6 | **Audit all regex patterns** for ReDoS — avoid complex/nested quantifiers with user input. | 🟡 Medium | API4:2023, Node.js CS |
| 10.7 | Use **Redis-backed rate limiting** for multi-instance production deployments. | 🟡 Medium | API4:2023 |

---

## 11. Logging, Audit Trail & Monitoring

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 11.1 | Log **all authentication events**: successful logins, failed logins, logouts, password changes, MFA events, account lockouts. | 🔴 Critical | A09:2021, ASVS V16.2 |
| 11.2 | Log **all authorization failures** with user ID, requested resource, action, and timestamp. | 🔴 Critical | A09:2021, ASVS V16.2, Authorization CS |
| 11.3 | Log **all admin actions** to a dedicated append-only audit log collection in MongoDB. | 🔴 Critical | A09:2021, ASVS V16.2 |
| 11.4 | Log **all impersonation lifecycle events** and every action taken during impersonation, distinctly marked in the audit trail. | 🔴 Critical | A09:2021, ASVS V16.2 |
| 11.5 | **Prevent log injection** — sanitize user-controlled data before including it in log messages. | 🔴 High | ASVS V16.4 |
| 11.6 | **Never log sensitive data**: passwords, tokens, credit card numbers, full session IDs. | 🔴 High | ASVS V16.4, A02:2021 |
| 11.7 | Use **structured JSON logging** with consistent fields: timestamp, level, event, userId, requestId, IP, path, method. | 🔴 High | A09:2021, ASVS V16.2 |
| 11.8 | Set up **alerting** on suspicious patterns: 5+ failed logins, repeated authorization failures, unusual impersonation activity. | 🟡 Medium | A09:2021, ASVS V16.3 |
| 11.9 | Protect audit logs from **tampering** — use append-only storage with separate write permissions or ship to an external system. | 🟡 Medium | ASVS V16.4 |

---

## 12. Dependency & Supply Chain Security

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 12.1 | Run **`npm audit`** in CI/CD and fail builds on high/critical severity vulnerabilities. | 🔴 Critical | A06:2021, A08:2021 |
| 12.2 | Use **`npm ci` (not `npm install`)** in CI/CD to enforce exact lockfile versions. | 🔴 Critical | A08:2021, NPM Security CS |
| 12.3 | **Pin dependency versions** using `save-exact=true` in `.npmrc` and always commit `package-lock.json`. | 🔴 High | A06:2021, NPM Security CS |
| 12.4 | Enable **automated dependency updates** via Dependabot or Renovate; configure auto-merge for patch versions. | 🔴 High | A06:2021 |
| 12.5 | **Verify package integrity** and guard against typosquatting — carefully review package names before installing. | 🔴 High | A08:2021, NPM Security CS |
| 12.6 | Generate and maintain a **Software Bill of Materials (SBOM)** for compliance and vulnerability tracking. | 🟡 Medium | A06:2021, A08:2021 |
| 12.7 | **Disable source maps** in production Vite builds. | 🟡 Medium | A05:2021 |
| 12.8 | **Never prefix backend secrets with `VITE_`** — only `VITE_`-prefixed env vars are bundled into the client. | 🔴 Critical | A05:2021 |
| 12.9 | **Manually keep shadcn/ui components updated** and audit underlying Radix UI primitives for CVEs. | 🟡 Medium | A06:2021 |
| 12.10 | Enable **2FA on all npm accounts** for team members who publish packages. | 🟡 Medium | A08:2021, NPM Security CS |

---

## 13. User Impersonation Security

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 13.1 | **Require MFA re-authentication** before starting an impersonation session. | 🔴 Critical | Authentication CS, ASVS V6.3 |
| 13.2 | Create a **dedicated impersonation JWT** with explicit claims: `sub` (target user), `impersonatorId` (admin), `isImpersonation: true`, and a **max 30-minute expiry**. | 🔴 Critical | JWT CS, Session Mgmt CS, ASVS V7.2 |
| 13.3 | Grant an **explicit `users:impersonate` permission** — not all admins should be able to impersonate. | 🔴 Critical | Authorization CS, ASVS V8.2 |
| 13.4 | **Prevent privilege escalation** — admins must not impersonate other admins or superadmins. | 🔴 Critical | Authorization CS, API5:2023 |
| 13.5 | **Restrict actions during impersonation**: block password changes, email changes, role modifications, MFA changes, and nested impersonation. | 🔴 Critical | Authorization CS, ASVS V8.2 |
| 13.6 | **Log every impersonation lifecycle event** (start, actions, end) with both admin and target user IDs, distinctly marked in the audit trail. | 🔴 Critical | A09:2021, ASVS V16.2 |
| 13.7 | Display a **prominent visual indicator** in the React UI when an impersonation session is active, showing the admin's identity and a clear "End Impersonation" button. | 🔴 High | Session Mgmt CS |
| 13.8 | **Preserve the admin's original session** — do not destroy it when starting impersonation; allow instant switch back. | 🔴 High | Session Mgmt CS |
| 13.9 | **Rate-limit impersonation starts** — max 10 impersonations per admin per hour. | 🟡 Medium | API6:2023, Authentication CS |

---

## 14. File Upload Security

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 14.1 | Validate file type by **magic bytes** (file signature), not extension or Content-Type header. | 🔴 Critical | File Upload CS, A04:2021 |
| 14.2 | **Generate random filenames** (UUID) — never use the original filename; strip path traversal characters. | 🔴 Critical | File Upload CS |
| 14.3 | Store uploads **outside the webroot** or in cloud storage (S3, GCS); serve via a separate domain or signed URLs. | 🔴 High | File Upload CS |
| 14.4 | Enforce **file size limits** at both the web server and application level. | 🔴 High | File Upload CS, API4:2023 |
| 14.5 | Set **`Content-Disposition: attachment`** and the correct `Content-Type` when serving uploaded files for download. | 🟡 Medium | File Upload CS |
| 14.6 | **Scan uploaded files** for malware using ClamAV or a cloud antivirus API. | 🟡 Medium | File Upload CS |
| 14.7 | **Re-encode images** to strip embedded scripts or EXIF metadata. | 🟢 Low | File Upload CS |

---

## 15. Error Handling & Information Disclosure

| # | Action | Priority | OWASP Source |
|---|--------|----------|-------------
| 15.1 | Implement a **global error handler** in Hono that returns generic messages to clients and logs full details server-side. | 🔴 Critical | A05:2021, ASVS V16.5, Error Handling CS |
| 15.2 | **Never return stack traces, database errors, file paths, or framework versions** to clients. | 🔴 Critical | A05:2021, Error Handling CS |
| 15.3 | **Fail securely (fail-closed)** — on any auth error, default to denying access. | 🔴 Critical | ASVS V8.2, Error Handling CS |
| 15.4 | Use a **consistent error response format** (RFC 7807 Problem Details) across all endpoints. | 🔴 High | REST Security CS |
| 15.5 | Implement **React error boundaries** to catch rendering errors and display a generic fallback UI. | 🔴 High | Error Handling CS |
| 15.6 | **Disable all debug features in production**: Hono `showRoutes()`, Vite source maps, MongoDB command monitoring, Zustand DevTools. | 🔴 High | A05:2021, API8:2023 |
| 15.7 | Return **uniform 401/404 responses** where resource existence should not be revealed (e.g., user lookup endpoints). | 🟡 Medium | Authentication CS, ASVS V16.5 |
| 15.8 | Handle **`uncaughtException`** and **`unhandledRejection`** at the Node.js process level to prevent crashes and information leaks. | 🟡 Medium | Node.js CS |
