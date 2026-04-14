# Authentication System Implementation Guide

This guide provides a framework-agnostic reference for implementing JWT-based authentication with cookie-stored refresh tokens. Every recommendation is traced to a specific authoritative source — OWASP Cheat Sheets, IETF RFCs, or OWASP ASVS — with explicit distinction between normative requirements and architectural suggestions marked **[Guide]**.

The architecture uses short-lived JWT access tokens stored in `sessionStorage`, paired with opaque refresh tokens delivered via hardened `HttpOnly` cookies. This pattern balances security, usability, and statelessness while enabling robust token revocation. The overarching principle is **defense in depth** — no single mechanism is trusted absolutely.

---

## 1. Access Token Design

### 1.1 Standard Claims to Validate

The OWASP REST Security Cheat Sheet specifies that **at least four standard claims** must be verified on every incoming JWT access token [OWASP REST CS]:

| Claim | Purpose | Validation rule |
|-------|---------|-----------------|
| `iss` | Issuer identity | Must match a trusted issuer; the cryptographic key used to sign the JWT must belong to this issuer [RFC 8725 §3.8] |
| `aud` | Audience | The relying party must confirm it is the intended audience [RFC 8725 §3.9] |
| `exp` | Expiration time | Current time must be before this value |
| `nbf` | Not before | Current time must be after this value |

The REST CS uses the language "at least the following," signaling these four are the minimum — not an exhaustive list. RFC 9068 (JWT Profile for OAuth 2.0 Access Tokens) defines a richer mandatory set for OAuth2 contexts: `iss`, `exp`, `aud`, `sub`, `client_id`, `iat`, and `jti` [RFC 9068 §2.2]. If your system follows the OAuth2 JWT access token profile, implement the full RFC 9068 claim set. For non-OAuth2 systems, the four REST CS claims are the baseline.

**What must never appear in a JWT**: The JWT payload is only Base64-encoded, not encrypted — anyone who holds the token can decode it. Passwords, detailed role permissions, PII, and internal system information must never be placed in the payload [OWASP JWT CS].

### 1.2 The `typ` Header: Preventing Cross-JWT Confusion

RFC 8725 §2.8 identifies Cross-JWT Confusion as a real attack class where a JWT issued for one purpose (e.g., a password reset token) is replayed in a different context (e.g., an API access token). The mitigation is **explicit typing** via the `typ` header parameter [RFC 8725 §3.11]:

> "Explicit JWT typing is accomplished by using the 'typ' Header Parameter. [...] Explicit typing is RECOMMENDED for new uses of JWTs."

For OAuth2 access tokens, RFC 9068 §2.1 **requires** `typ` to be set to `at+jwt` and mandates that resource servers reject tokens carrying any other value [RFC 9068 §2.1, §4]. For non-OAuth2 systems, set `typ` to a value that uniquely identifies your token type (e.g., `access+jwt`) and validate it on every request [Guide].

### 1.3 Header Injection Risks: `kid`, `jku`, and `x5u`

RFC 8725 §3.10 warns that untrusted JWT header values create injection and SSRF attack surfaces:

- **`kid` (Key ID):** Applications must sanitize and validate this value to prevent SQL injection and LDAP injection when performing key lookups.
- **`jku` (JWK Set URL) and `x5u` (X.509 URL):** Blindly following these URLs "could result in server-side request forgery (SSRF) attacks." Applications SHOULD match these URLs against a whitelist of allowed locations and must not send cookies in the resulting GET requests [RFC 8725 §3.10].

The safest approach for most applications is to never resolve `jku` or `x5u` from incoming tokens. Instead, configure trusted key material server-side and use `kid` only as a lookup index into a pre-configured key store [Guide].

### 1.4 HMAC Key Requirements

RFC 8725 §3.5 imposes a normative prohibition: **"Human-memorizable passwords MUST NOT be directly used as the key to a keyed-MAC algorithm such as 'HS256'."** HMAC signing keys must have sufficient entropy — at minimum matching the hash output size (256 bits for HS256, 384 bits for HS384, 512 bits for HS512). Generate keys using a CSPRNG and store them in a secrets vault or HSM [RFC 7518 §3.2].

### 1.5 Signing Algorithm Selection

ES256 (ECDSA with P-256), EdDSA (Ed25519), and RS256 are all recommended options [Guide based on RFC 8725]:

- **ES256:** Compact signatures (~64 bytes), good performance, widely supported.
- **EdDSA (Ed25519):** Excellent performance, deterministic signatures (no nonce-related vulnerabilities). Requires library support.
- **RS256:** Broadest ecosystem compatibility. Larger signatures (~256 bytes). RFC 9068 §2.1 mandates RS256 support as a baseline for OAuth2 access tokens.
- **HS256:** Acceptable only in a monolithic application where the same process both signs and verifies. Key must be at least 256 bits from a CSPRNG — never a human-memorable password [RFC 8725 §3.5].

The OWASP REST Security Cheat Sheet states that asymmetric signing is preferred over symmetric MAC for multi-service architectures, because with a symmetric key, any service that can verify a token can also forge one [OWASP REST CS].

### 1.6 Preventing `alg:none` and Algorithm Confusion Attacks

RFC 8725 §2.1 documents two well-known attacks: the `alg:none` bypass (the library skips signature verification) and the RS256→HS256 confusion (the library uses the RSA public key as an HMAC shared secret). The countermeasure per RFC 8725 §3.1: **libraries MUST enable callers to specify a supported set of algorithms and MUST NOT use any other algorithms.**

In practice:

- Configure your JWT library with an explicit allowlist of accepted algorithms.
- Never accept `none` in authentication contexts.
- Bind each key to its algorithm — an RSA key must never be usable as an HMAC key.
- Never mix symmetric and asymmetric algorithms in the same whitelist.

### 1.7 Token Fingerprint (Anti-Sidejacking)

The OWASP JWT Cheat Sheet defines a "user context" mechanism to prevent stolen tokens from being replayed from a different browser or machine [OWASP JWT CS — Token Sidejacking]. The attack this prevents is an attacker stealing the AT via XSS or network interception and using it from their own environment.

**The principle:**

1. At authentication, generate a cryptographically random string (OWASP reference implementation uses 50 bytes).
2. Compute its SHA-256 hash and embed the hash in the JWT payload as a custom claim (`userFingerprint`).
3. Send the raw string to the client as a hardened `HttpOnly` cookie with flags `Secure`, `SameSite`, `Path=/`, and a `__Host-` or `__Secure-` cookie prefix. Set `Max-Age` equal to or less than the JWT's expiry time — never more [OWASP JWT CS].
4. On every request, read the raw string from the cookie, recompute its SHA-256, and compare against the claim in the JWT. A mismatch means the token is being used from a different context — reject it.

**Why this works:** Even if the AT is stolen, the attacker cannot read the raw fingerprint from the `HttpOnly` cookie (JavaScript cannot access `HttpOnly` cookies). The stolen token is useless without the cookie that pairs with it.

The JWT CS notes: "A well implemented Token Sidejacking solution should alleviate the need for maintaining denylist on server side" [OWASP JWT CS] — though this guide recommends using both layers together.

OWASP explicitly warns: **do not use IP addresses as a fingerprint component** — IPs change legitimately during mobile sessions and raise GDPR compliance concerns [OWASP JWT CS].

### 1.8 Access Token Storage on the Client

The OWASP JWT Cheat Sheet lists storage options in this order [OWASP JWT CS — Token Storage on Client Side]:

1. **`sessionStorage` (preferred):** Scoped to the browser tab. Cleared when the tab closes. Vulnerable to XSS but the fingerprint mechanism prevents replay from another machine.
2. **JavaScript closures / private variables (alternative):** All requests route through a module encapsulating the token in a private variable. Offers similar XSS exposure as `sessionStorage` but with tighter programmatic access.
3. **`localStorage` with strict controls:** Acceptable when combined with short expiration times (15–30 min idle, 8-hour absolute), token rotation, and refresh tokens [OWASP JWT CS].

For all storage methods, the fingerprint cookie and a strong Content Security Policy are mandatory complementary controls. Memory storage protects token **confidentiality** from XSS, but a successful XSS attack can still make authenticated API calls through the application's own request functions — making XSS prevention non-negotiable regardless of storage choice.

| Storage | XSS: token readable? | CSRF risk | Survives page refresh |
|---------|----------------------|-----------|----------------------|
| `sessionStorage` | Yes (same origin) | Immune (manual header) | No — requires silent refresh |
| JS closure/memory | Yes (same origin) | Immune (manual header) | No — requires silent refresh |
| `localStorage` | Yes (same origin) | Immune (manual header) | Yes |
| HttpOnly Cookie | No | Yes — requires mitigation | Yes |

---

## 2. Refresh Token Design

### 2.1 Why Opaque Strings Are Recommended

Refresh tokens should be **opaque, high-entropy random strings** rather than JWTs. This recommendation derives from the OAuth2 security model: RFC 9700 requires that refresh tokens be either sender-constrained or subject to rotation with reuse detection [RFC 9700 §2.2.2]. When the server must track each token's lineage, family membership, and revocation status in a database, making the token self-contained adds complexity and attack surface without benefit. An opaque token can be instantly revoked by deleting its database record — a JWT-based RT cannot be revoked without an additional denylist [Guide based on RFC 9700].

### 2.2 Entropy and Length Requirements

The OWASP Session Management Cheat Sheet defines two distinct requirements for session identifiers [OWASP Session Management CS]:

- **Entropy:** At least **64 bits** of entropy from a CSPRNG.
- **Output size:** Use "at least **128 bits**" of CSPRNG output.

These are different properties: entropy measures unpredictability; output size is the raw bit count before encoding. For refresh tokens, which function as long-lived session credentials, this guide recommends generating **256 bits (32 bytes) of CSPRNG output**, encoded as a Base64url string [Guide]. This exceeds OWASP minimums and provides ample margin for encoding overhead.

### 2.3 Server-Side Storage: Hash the Entire Token

Store the **SHA-256 hash of the complete refresh token string** — never the plaintext value. The OWASP JWT Cheat Sheet specifies storing "a digest (SHA-256 encoded in HEX) of the token" for denylists [OWASP JWT CS]. The same principle applies to RT storage: if the database is breached, leaked hashes cannot be used directly as tokens. The lookup process: the client presents the raw token, the server computes its SHA-256, and queries for a matching hash.

### 2.4 Two Equivalent Security Mechanisms: Sender-Constrained or Rotation

RFC 9700 §2.2.2 states: **"Refresh tokens for public clients MUST be sender-constrained or use refresh token rotation."** These are two acceptable alternatives [RFC 9700 §2.2.2]:

- **Sender-constrained tokens:** Cryptographically bind the RT to the client's key material using mutual TLS [RFC 8705] or DPoP [RFC 9449]. Stronger against theft but requires client-side key management.
- **Refresh token rotation:** Issue a new RT with every use and immediately invalidate the previous one. Enables theft detection through reuse detection.

For browser-based SPAs, **rotation with reuse detection** is typically the viable choice because browser clients cannot securely maintain persistent cryptographic key material [Guide].

### 2.5 Token Family Model and Reuse Detection

Implement a **Token Family** to detect refresh token theft [Guide]:

1. Assign a `familyId` (UUID) at first authentication. All RTs issued in this login session share this ID.
2. Each rotation creates a new token and invalidates the previous one.
3. If a previously-invalidated RT is presented (reuse detected), **immediately revoke the entire family** — all tokens sharing that `familyId`. This forces both the legitimate user and the potential attacker to re-authenticate.

The rationale: if an attacker steals an RT and uses it first, the legitimate user's next request triggers reuse detection. If the legitimate user rotates first, the attacker's use of the old token triggers detection.

### 2.6 Refresh Token Database Record Design

Each refresh token record should contain [Guide]:

| Field | Type | Purpose |
|-------|------|---------|
| `tokenHash` | VARCHAR(64) | SHA-256 hex digest of the raw token (primary lookup key) |
| `userId` | FK | Owner of the token |
| `familyId` | UUID | Links tokens in a rotation chain for reuse detection |
| `issuedAt` | TIMESTAMP | Creation time |
| `expiresAt` | TIMESTAMP | Absolute expiration (TTL index for auto-cleanup) |
| `lastUsedAt` | TIMESTAMP | For idle timeout enforcement |
| `isRevoked` | BOOLEAN | Soft-revocation flag |
| `replacedByHash` | VARCHAR(64) | Points to the successor token; enables chain tracing |
| `deviceInfo` | VARCHAR | User-Agent string for session management UI (display only, not for validation) |
| `ipAddress` | VARCHAR | For audit logging (consider GDPR implications) |

### 2.7 Device/IP Binding Trade-offs

OWASP explicitly warns against hard IP binding: IPs change legitimately on mobile networks and IP tracking raises GDPR concerns [OWASP JWT CS]. Store device info for audit and display purposes, but treat it as a soft signal for anomaly detection rather than a hard validation gate.

---

## 3. Cookie Security Configuration

### 3.1 The `__Host-` Prefix

Use the `__Host-` prefix for both the RT cookie and the Fingerprint cookie. This prefix enforces three constraints simultaneously: the `Secure` flag must be set, `Path` must be `/`, and the cookie must not specify a `Domain` attribute — preventing subdomain-scoped attacks where a compromised subdomain overwrites a parent domain's cookies [ASVS V3.4.4, OWASP CSRF CS].

The difference from `__Secure-`: `__Secure-` requires the Secure flag but still allows the Domain attribute. `__Host-` is the stricter option and should be the default choice.

### 3.2 Required Cookie Attributes

Every auth-related cookie must carry all of the following:

| Attribute | Value | Source |
|-----------|-------|--------|
| **HttpOnly** | `true` | Prevents JS access, blocks XSS-based token extraction [ASVS V3.4.2] |
| **Secure** | `true` | Transmit only over HTTPS [ASVS V3.4.1] |
| **SameSite** | See §3.3 | CSRF mitigation [ASVS V3.4.3] |
| **Path** | `/` (enforced by `__Host-`) | Minimum scope [ASVS V3.4.5] |
| **Max-Age** | Match token server-side lifetime | See §3.4 |
| **Domain** | Not set | Without Domain, cookie is scoped to the exact origin only [OWASP Session Mgmt CS] |

### 3.3 SameSite Selection

The OWASP CSRF Prevention Cheat Sheet distinguishes between `Strict` and `Lax` based on application type [OWASP CSRF CS]:

- **`Strict`:** Appropriate for applications where cross-site navigation to authenticated pages is not needed. The CSRF CS specifically cites **banking websites** as the canonical use case. With `Strict`, cookies are not sent even on top-level navigations from external links.
- **`Lax`:** The reasonable default for most applications. Cookies are included on top-level GET navigations but blocked on cross-site POST requests and subresource loads.

`Lax` is the recommended default for general-purpose web applications. Reserve `Strict` for high-security scenarios like financial or healthcare applications [OWASP CSRF CS].

### 3.4 Intentional Deviation: Persistent Cookie for Refresh Tokens

The OWASP Session Management Cheat Sheet recommends **non-persistent cookies** (no `Max-Age` or `Expires`) for session identifiers so that sessions disappear when the browser closes [OWASP Session Mgmt CS]. However, refresh tokens are designed to survive browser restarts to enable "remember me" functionality. **Setting `Max-Age` on the RT cookie is a deliberate, documented deviation from this recommendation** [Guide].

This deviation is justified because: the RT's server-side expiration and rotation provide equivalent protection; the Token Family reuse detection mechanism catches theft across restarts; and the OWASP JWT CS itself specifies that the fingerprint cookie should have `Max-Age` set equal to or less than the JWT expiry [OWASP JWT CS].

If your application does not need cross-restart persistence, omit `Max-Age` to align with the Session Management CS.

---

## 4. CSRF Defense

### 4.1 Access Tokens: Natural CSRF Immunity

When the access token is stored in `sessionStorage` or JS memory and attached via the `Authorization: Bearer` header, the browser never automatically includes it in cross-origin requests. A CSRF attacker who tricks the user's browser into making a cross-site request cannot attach the Bearer header — the AT layer is CSRF-immune by design [Guide].

### 4.2 Refresh Token Cookie Requires Dedicated CSRF Protection

The refresh token cookie will be automatically sent by the browser. The OWASP CSRF Prevention Cheat Sheet explicitly states that SameSite **"should not replace a CSRF Token. Instead, it should co-exist with that token to protect the user in a more robust way."** SameSite and Origin/Referer validation are classified as **"Defense In Depth Techniques"** — not primary defenses [OWASP CSRF CS].

The refresh endpoint must therefore have its own CSRF token defense. Choose one [OWASP CSRF CS]:

- **Synchronizer Token Pattern** (stateful): Generate a CSRF token per session, store it server-side, embed it in the page, and validate it on every state-changing request. Recommended for stateful applications.
- **Signed (HMAC) Double-Submit Cookie** (stateless): Generate an HMAC-signed CSRF token bound to the user's session identifier. Send it as both a cookie and a request header/body value. The server validates the HMAC signature and confirms both values match.

**The naive double-submit cookie pattern (without HMAC signing) is explicitly discouraged** by the CSRF CS due to vulnerability to cookie injection attacks [OWASP CSRF CS].

### 4.3 Fetch Metadata Headers as Defense-in-Depth

The OWASP CSRF Prevention Cheat Sheet treats `Sec-Fetch-Site` as a primary signal in the Fetch Metadata approach [OWASP CSRF CS]. On every state-changing endpoint, inspect this header:

- `same-origin` → Allow
- `same-site` → Allow (if appropriate for your trust model)
- `none` → Allow (direct navigation, e.g., bookmark)
- `cross-site` → **Reject**

The CSRF CS mandates a fallback: "A fallback to standard origin verification headers is a **mandatory requirement** for any Fetch Metadata implementation" because legacy browsers may not send `Sec-Fetch-*` headers [OWASP CSRF CS]. Implement Origin/Referer header checking as the fallback.

### 4.4 Client-Side CSRF

The OWASP CSRF Prevention Cheat Sheet describes Client-Side CSRF attacks as variants that **"can bypass some of the common anti-CSRF countermeasures like token-based mitigations and SameSite cookies"** [OWASP CSRF CS]. In SPA frameworks, this occurs when user-controlled data influences request destinations or payloads in client-side JavaScript. Mitigations include input validation on all parameters that affect API endpoint URLs or request bodies, and code review procedures that flag these patterns.

### 4.5 When `SameSite=None` Is Unavoidable

If the API and frontend are on completely different domains and `SameSite=None` must be used, all automatic SameSite protection is lost. Deploy the full CSRF defense stack [Guide]:

- A primary CSRF token mechanism (Synchronizer Token or Signed Double-Submit Cookie)
- Fetch Metadata header validation with Origin/Referer fallback
- `Secure` flag (required by browsers for `SameSite=None` cookies)
- Same-domain deployment should be strongly preferred architecturally to avoid this scenario entirely

---

## 5. XSS Defense

### 5.1 Output Encoding Is the Foundational Defense

The OWASP XSS Prevention Cheat Sheet positions **output encoding and framework security** as the primary defenses — not CSP. The XSS CS explicitly warns against sole reliance on CSP, placing it under "Other Controls" with the note: "It's easy to make mistakes with the implementation so it should not be your primary defense mechanism." The cheat sheet further categorizes "Sole Reliance on Content-Security-Policy Headers" as a **common anti-pattern** [OWASP XSS CS].

The correct layering:

1. **Output encoding** — the foundation. All dynamic content must be contextually encoded: HTML entity encoding for HTML contexts, JavaScript encoding for JS contexts, URL encoding for URL parameters.
2. **HTML sanitization** — for rich-text inputs that must render user-supplied HTML. Use a battle-tested library such as DOMPurify.
3. **Content Security Policy** — an additional hardening layer that mitigates impact if encoding fails.

### 5.2 Framework Escape Hatches

Modern frameworks auto-encode by default, but the OWASP XSS CS lists specific escape hatches that bypass these protections [OWASP XSS CS]:

- **React:** `dangerouslySetInnerHTML` renders raw HTML without sanitization. React also cannot protect against `javascript:` or `data:` URLs without explicit validation.
- **Angular:** `bypassSecurityTrustAs*` functions disable Angular's built-in sanitizer.

Any use of these escape hatches must be accompanied by explicit sanitization via DOMPurify or equivalent. All dynamic URLs must be validated against an allowlist of safe schemes (`https:`, `http:` — never `javascript:` or `data:`).

### 5.3 Strict Content Security Policy

The OWASP CSP Cheat Sheet provides two equivalent Strict CSP templates [OWASP CSP CS]:

**Nonce-based (preferred when the server renders pages):**
```
Content-Security-Policy:
  script-src 'nonce-{RANDOM}' 'strict-dynamic';
  object-src 'none';
  base-uri 'none';
  form-action 'self';
  frame-ancestors 'none';
```

**Hash-based (preferred for static pages with known inline scripts):**
```
Content-Security-Policy:
  script-src 'sha256-{HASHED_INLINE_SCRIPT}' 'strict-dynamic';
  object-src 'none';
  base-uri 'none';
  form-action 'self';
  frame-ancestors 'none';
```

Key directives:

- **`strict-dynamic`**: Allows scripts loaded by trusted (nonced/hashed) scripts to execute without individual nonces. Required for modern bundled JavaScript [OWASP CSP CS].
- **`base-uri 'none'`**: Prevents `<base>` tag injection. The OWASP Strict CSP template uses `'none'`, not `'self'` [OWASP CSP CS].
- **`object-src 'none'`**: Blocks plugin-based script execution.
- **`form-action 'self'`**: Prevents form submissions to external origins. This directive does **not** inherit from `default-src` and must be set explicitly [OWASP CSP CS].
- **`frame-ancestors 'none'`**: Prevents clickjacking. Supersedes `X-Frame-Options` in modern browsers [OWASP CSP CS].

A fresh nonce must be generated per HTTP response. Never reuse nonces.

### 5.4 Security Response Headers

In addition to CSP, every response should include [Guide]:

- **`X-Content-Type-Options: nosniff`** — prevents MIME-type sniffing attacks where uploaded content is executed as scripts.
- **`Cache-Control: no-store`** — on authenticated responses, prevents sensitive data from being stored in browser or proxy caches.

---

## 6. Password Security

### 6.1 Algorithm Priority

The OWASP Password Storage Cheat Sheet defines a clear priority order [OWASP Password Storage CS]:

| Priority | Algorithm | When to use | Minimum configuration |
|----------|-----------|-------------|----------------------|
| **1st** | **Argon2id** | Default choice | 19 MiB memory, 2 iterations, 1 parallelism |
| **2nd** | **scrypt** | When Argon2id is unavailable | N=2^17, r=8, p=1 |
| **3rd** | **bcrypt** | Legacy systems only — where both Argon2id **and** scrypt are unavailable | Work factor ≥10 |
| **4th** | **PBKDF2** | Only when FIPS-140 compliance is required | ≥600,000 iterations with HMAC-SHA-256 |

OWASP states bcrypt "**should only** be used for password storage in legacy systems where Argon2 and scrypt are not available" [OWASP Password Storage CS]. PBKDF2 is positioned exclusively for FIPS-140 compliance: "If FIPS-140 compliance is required, use PBKDF2" [OWASP Password Storage CS].

### 6.2 bcrypt Pre-Hashing: The Correct Approach

bcrypt silently truncates input at 72 bytes, making longer passwords less secure. Pre-hashing solves this but introduces serious risks if done incorrectly. The OWASP Password Storage CS explicitly warns that **using plain SHA-256 or SHA-512 is dangerous due to password shucking** — an attack where the bcrypt layer is stripped and the weaker inner hash is attacked directly [OWASP Password Storage CS].

The **correct formula**, as stated in the Password Storage CS:

> `bcrypt(base64(hmac-sha384(data: $password, key: $pepper)), $salt, $cost)`

Critical implementation details [OWASP Password Storage CS]:

- The HMAC key is a **pepper** stored outside the database (in a secrets vault or HSM), never alongside the hash.
- **HMAC-SHA-384** is used — the HMAC construction with a secret key prevents password shucking because the attacker cannot compute the inner value without the pepper.
- **Base64 encoding** is mandatory to avoid null bytes in the HMAC output, which would cause bcrypt to truncate prematurely.
- The Base64 output of HMAC-SHA-384 is 64 characters — within bcrypt's 72-byte limit.

### 6.3 Hash Computation Time

The OWASP Password Storage CS states: **"As a general rule, calculating a hash should take less than one second"** [OWASP Password Storage CS]. It does not specify a narrower range. The commonly cited **200–500ms** target is a community best practice, not an OWASP mandate [community convention]. Tune the work factor based on your server hardware and expected authentication load, keeping total hash time under one second.

### 6.4 Password Length Requirements

The OWASP Authentication Cheat Sheet specifies minimum lengths based on MFA status [OWASP Authentication CS]:

- **With MFA:** Minimum **8 characters**
- **Without MFA:** Minimum **15 characters**
- **Maximum length:** At least **64 characters** to allow passphrases
- Do not impose composition rules (mandatory uppercase, special characters, etc.)
- Block common and previously breached passwords (e.g., via the Pwned Passwords API)

### 6.5 Pepper

A pepper is a secret value used in the hashing formula that is stored separately from the password database. It provides defense-in-depth: even if the database is fully compromised, the attacker cannot brute-force the hashes without the pepper. Peppers must be stored in a secrets vault or HSM. Changing a pepper requires all users to reset their passwords, so plan for pepper rotation accordingly [OWASP Password Storage CS].

---

## 7. Login Security

### 7.1 Account Enumeration Prevention

The OWASP Authentication Cheat Sheet mandates **generic, identical error messages** regardless of the failure reason [OWASP Authentication CS]:

- **Login:** `"Login failed; Invalid user ID or password."`
- **Password recovery:** `"If that email address is in our database, we will send you an email to reset your password."`
- **Registration:** `"A link to activate your account has been emailed to the address provided."`

Additionally, the application must return in **constant time** regardless of whether the account exists. Always compute the password hash even for non-existent accounts to prevent timing-based enumeration [OWASP Authentication CS]. HTTP status codes must also be consistent — do not return 200 for valid usernames and 403 for invalid ones.

### 7.2 Rate Limiting

Rate limiting should operate on two independent dimensions [Guide]:

- **IP-based:** Limits total login attempts from a single IP address across all accounts.
- **Account-based:** Limits attempts targeting a specific account regardless of source IP. This prevents distributed attacks from multiple IPs.

OWASP does not specify exact threshold values — specific numbers are implementation decisions based on your application's risk profile [OWASP Authentication CS]. Example values for illustration only: 10 failed attempts per IP per 15 minutes, 5 failed attempts per account per 15 minutes [Guide — example values, not mandates].

### 7.3 Account Lockout and Exponential Backoff

Exponential lockout is a **variant of account lockout**, not an alternative to it [OWASP Authentication CS]:

> "Rather than implementing a fixed lockout duration (e.g., ten minutes), some applications use an exponential lockout, where the lockout duration starts as a very short period (e.g., one second), but doubles after each failed login attempt."

Key design points [OWASP Authentication CS]:

- Associate the failed attempt counter with the account, not the source IP.
- Prevent denial-of-service through targeted lockout: always allow the password reset flow even for locked accounts.
- After sufficient escalation, consider requiring manual intervention or identity verification.

### 7.4 Multi-Factor Authentication

The OWASP Authentication Cheat Sheet states MFA "is by far the best defense against the majority of password-related attacks" and cites Microsoft's analysis showing it stops **99.9% of account compromises** [OWASP Authentication CS]. Its presence also relaxes the minimum password length requirement from 15 to 8 characters. Recommended options in descending order: FIDO2/WebAuthn/Passkeys (most secure), TOTP authenticator apps (reasonable), SMS (NIST classifies as "restricted" due to SIM-swapping vulnerabilities).

---

## 8. Logout and Token Revocation

### 8.1 The Fundamental Problem with JWT Revocation

JWTs are stateless. Once issued, they remain valid until expiry regardless of server-side actions. This is JWT's inherent limitation [OWASP JWT CS]. Two complementary strategies address this — both should be active simultaneously.

### 8.2 Layer 1: Fingerprint Cookie Invalidation (Primary)

On logout, the server clears the fingerprint cookie by setting `Max-Age=0`. Any AT replayed without a valid, matching fingerprint cookie is rejected at the verification step. The OWASP JWT CS states: "A logout can thus be 'simulated' by clearing the JWT from session storage. If the user chooses to close the browser instead, then both the cookie and sessionStorage are cleared automatically" [OWASP JWT CS].

For **server-initiated invalidation** (password change, admin-forced logout), the server cannot clear the client's cookie. In this case, the denylist layer takes over.

### 8.3 Layer 2: Token Denylist (Supplementary)

The OWASP JWT Cheat Sheet specifies: "The denylist will keep a **digest (SHA-256 encoded in HEX) of the token** with a revocation date" [OWASP JWT CS]. The OWASP REST Security Cheat Sheet confirms: "a digest or hash of any associated JWTs should be submitted to a denylist" [OWASP REST CS].

Implementation requirements:

- Store the **SHA-256 hash of the entire token string** (not just the `jti` claim) — this is what the OWASP JWT CS specifies [OWASP JWT CS].
- Each denylist entry must persist at least until the token's `exp` time, after which it can be garbage-collected.
- Use a fast store (e.g., Redis with TTL matching token expiration) for O(1) lookup on every request.

### 8.4 Combined Logout Flow

When a user logs out [Guide]:

1. Revoke the entire RT family in the database (`isRevoked = true` for all tokens with the same `familyId`).
2. Add the current AT's SHA-256 hash to the denylist (TTL = remaining AT lifetime).
3. Clear the fingerprint cookie and the RT cookie by setting `Max-Age=0` in the response.
4. Instruct the client to clear the AT from `sessionStorage`.

On every subsequent request, the server checks: (a) the fingerprint cookie's hash matches the JWT claim, and (b) the token's SHA-256 hash is not in the denylist. Either check failing rejects the request.

### 8.5 Multi-Device Session Management

OWASP ASVS V3.3.4 requires: **"Verify that users are able to view and (having re-entered login credentials) log out of any or all currently active sessions and devices"** [ASVS V3.3.4]. Implementation:

- Provide a session management UI listing all active RT families with device info and last-used timestamps.
- **Require the user to re-enter their password** before revoking sessions on other devices [ASVS V3.3.4].
- When revoking a remote session, revoke that session's RT family and add the last-known AT hash to the denylist.

**Selective logout** (one device): Revoke the specific RT family. Other families remain active.

**Global logout** (all devices): Store a `revoked_at` timestamp per user in a fast store. During AT validation, check whether the token's `iat` predates this timestamp — if so, reject. This works without enumerating all active tokens.

**After a password change**: Always trigger global logout automatically, offering the user the option to terminate all other active sessions [ASVS V3.3.3].

---

## 9. Token Transmission

### 9.1 Never Transmit Tokens in URLs

Tokens must never appear in URL query strings or path parameters. URLs are stored in browser history, server logs, Referer headers, and proxy records [OWASP REST CS, RFC 6750 §2.3]. A token in a URL is effectively a credential stored in plaintext in multiple locations outside the application's control.

### 9.2 Authorization: Bearer Header

Access tokens must be sent in the `Authorization` request header using the `Bearer` scheme. This is defined by RFC 6750 §2.1:

> "Clients SHOULD make authenticated requests with a bearer token using the 'Authorization' request header field with the 'Bearer' HTTP authorization scheme."

The standard format is: `Authorization: Bearer <token>` [RFC 6750 §2.1].

### 9.3 HTTPS and HSTS

All token transmission must occur exclusively over HTTPS. Deploy HTTP Strict Transport Security with the following configuration [OWASP HSTS CS]:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

The `max-age` of **63,072,000 seconds (2 years)** meets the HSTS preload list eligibility requirement. Include `includeSubDomains` to prevent subdomain-based cookie attacks, and `preload` to submit your domain to browser preload lists for protection on first visit.

---

## 10. Production Checklist

Each item is tagged with its normative source: **[OWASP]** for explicit OWASP/RFC requirements, **[Guide]** for this document's architectural recommendations.

### Access Token

- [ ] Signed with ES256, EdDSA, or RS256 — algorithm configured server-side, not from token header [RFC 8725 §3.1]
- [ ] `typ` header set and validated on receipt (e.g., `at+jwt` for OAuth2) [RFC 8725 §3.11, RFC 9068 §2.1]
- [ ] `alg:none` rejected; each key bound to exactly one algorithm [RFC 8725 §3.1, §3.2]
- [ ] At minimum `iss`, `aud`, `exp`, `nbf` validated on every request [OWASP REST CS]
- [ ] `kid` values sanitized; `jku`/`x5u` resolved only from a server-side whitelist or disabled entirely [RFC 8725 §3.10]
- [ ] HMAC keys are ≥256-bit CSPRNG output, never human-memorable passwords [RFC 8725 §3.5]
- [ ] Token fingerprint implemented: SHA-256 of random value stored in JWT claim, raw value in `__Host-` HttpOnly cookie [OWASP JWT CS]
- [ ] Fingerprint cookie `Max-Age` ≤ JWT expiry [OWASP JWT CS]
- [ ] AT stored in `sessionStorage` (preferred) or JS closure/memory [OWASP JWT CS]
- [ ] AT lifetime kept short — 5–15 minutes [Guide, OWASP JWT CS]

### Refresh Token

- [ ] Opaque random string, ≥256 bits of CSPRNG output [Guide] (OWASP minimum: 64-bit entropy, 128-bit output [OWASP Session Mgmt CS])
- [ ] Server stores SHA-256 hash of entire token, never plaintext [OWASP JWT CS pattern]
- [ ] Single-use: each RT marked used immediately on consumption [RFC 9700 §2.2.2]
- [ ] New RT issued on every use (rotation) [RFC 9700 §2.2.2]
- [ ] Reuse detection: stale RT triggers immediate revocation of entire Token Family [Guide]
- [ ] Database record includes: tokenHash, userId, familyId, issuedAt, expiresAt, isRevoked, replacedByHash, deviceInfo [Guide]

### Cookie Security

- [ ] `__Host-` prefix on both RT cookie and Fingerprint cookie [ASVS V3.4.4]
- [ ] `HttpOnly` on all auth cookies [ASVS V3.4.2]
- [ ] `Secure` on all auth cookies [ASVS V3.4.1]
- [ ] `SameSite=Lax` (general apps) or `Strict` (financial/high-security) [OWASP CSRF CS, ASVS V3.4.3]
- [ ] No `Domain` attribute [OWASP Session Mgmt CS]
- [ ] `Max-Age` matches RT lifetime (documented deviation from Session Management CS non-persistent cookie recommendation) [Guide]

### CSRF Defense

- [ ] AT in sessionStorage + Bearer header = CSRF-immune for all API calls [Guide]
- [ ] Refresh endpoint protected by Synchronizer Token Pattern or Signed Double-Submit Cookie [OWASP CSRF CS]
- [ ] Naive (unsigned) double-submit cookie pattern NOT used [OWASP CSRF CS]
- [ ] `Sec-Fetch-Site` header validated with Origin/Referer fallback on all state-changing endpoints [OWASP CSRF CS]
- [ ] Client-Side CSRF risks reviewed in all SPA routing and API call code paths [OWASP CSRF CS]
- [ ] If `SameSite=None` required: full CSRF token + Fetch Metadata + origin validation all active [Guide]

### XSS Defense

- [ ] Output encoding applied to all dynamic content as the foundational defense [OWASP XSS CS]
- [ ] Framework escape hatches (`dangerouslySetInnerHTML`, `bypassSecurityTrustAs*`) audited and wrapped with DOMPurify sanitization [OWASP XSS CS]
- [ ] All dynamic URLs validated against a safe-scheme allowlist [OWASP XSS CS]
- [ ] Strict CSP deployed: `script-src 'nonce-{RANDOM}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'` [OWASP CSP CS]
- [ ] Hash-based CSP considered as alternative for static pages [OWASP CSP CS]
- [ ] `X-Content-Type-Options: nosniff` on all responses [Guide]
- [ ] `Cache-Control: no-store` on all authenticated API responses [Guide]

### Password Security

- [ ] Primary algorithm: Argon2id (19 MiB memory, 2 iterations, 1 parallelism) [OWASP Password Storage CS]
- [ ] Fallback only when unavailable: scrypt → bcrypt (legacy) → PBKDF2 (FIPS-140 only) [OWASP Password Storage CS]
- [ ] If using bcrypt: pre-hash with `bcrypt(base64(hmac-sha384(data:$password, key:$pepper)), $salt, $cost)` — plain SHA-256 pre-hashing is explicitly prohibited [OWASP Password Storage CS]
- [ ] Hash computation time < 1 second [OWASP Password Storage CS]; target 200–500ms [community convention]
- [ ] Minimum password length: 8 chars (with MFA) / 15 chars (without MFA) [OWASP Authentication CS]
- [ ] Maximum password length: ≥64 characters [OWASP Authentication CS]
- [ ] Breached password checking implemented (e.g., Pwned Passwords API) [OWASP Authentication CS]
- [ ] Pepper stored in secrets vault or HSM, never in the password database [OWASP Password Storage CS]

### Login Security

- [ ] Generic error message for all failure modes: `"Login failed; Invalid user ID or password."` [OWASP Authentication CS]
- [ ] Constant-time response regardless of whether account exists [OWASP Authentication CS]
- [ ] Password hash computed even for non-existent accounts [OWASP Authentication CS]
- [ ] Rate limiting active on both IP and account dimensions [Guide; specific thresholds are risk-based, not OWASP-mandated]
- [ ] Exponential backoff lockout implemented as a lockout variant [OWASP Authentication CS]
- [ ] Password reset flow bypasses lockout to prevent denial-of-service [OWASP Authentication CS]
- [ ] MFA implemented where feasible [OWASP Authentication CS]

### Logout and Revocation

- [ ] On logout: RT family revoked + AT hash added to denylist + fingerprint and RT cookies cleared (`Max-Age=0`) + client storage cleared [Guide]
- [ ] Denylist stores SHA-256 hash of **entire token** (not just `jti`) with TTL matching remaining token validity [OWASP JWT CS]
- [ ] Fingerprint invalidation (primary) and denylist (supplementary) both active simultaneously [Guide]
- [ ] Session management UI allows users to view all active sessions [ASVS V3.3.4]
- [ ] Remote session termination requires re-entering credentials [ASVS V3.3.4]
- [ ] Password change triggers global logout and offers option to terminate all other sessions [ASVS V3.3.3]

### Token Transmission

- [ ] Tokens never transmitted in URL parameters or query strings [OWASP REST CS, RFC 6750 §2.3]
- [ ] AT sent exclusively via `Authorization: Bearer` header [RFC 6750 §2.1]
- [ ] All endpoints HTTPS-only [OWASP REST CS]
- [ ] HSTS header: `max-age=63072000; includeSubDomains; preload` [OWASP HSTS CS]

---

## Conclusion

The security of this architecture rests on three interlocking principles. **Compartmentalization:** AT in sessionStorage isolates token access from CSRF; RT in an HttpOnly cookie isolates it from XSS; the fingerprint binds both to the originating browser context. **Detectability:** RT rotation plus reuse detection converts a silent credential theft into a visible security event that triggers automatic remediation. **Depth:** no single layer is trusted absolutely — output encoding backs up CSP, the denylist backs up fingerprint invalidation, CSRF tokens back up SameSite, Fetch Metadata headers back up CSRF tokens.

Three design decisions carry the highest security impact and are worth re-emphasizing. The bcrypt pre-hashing formula — using plain SHA-256 enables password shucking, an attack that strips the bcrypt layer entirely; the HMAC-SHA-384-with-pepper construction eliminates this attack class. The token denylist target — hashing only the `jti` claim leaves a gap for tokens without a `jti`; hashing the entire token is what OWASP specifies. The CSRF defense for the refresh endpoint — SameSite alone is a defense-in-depth technique, not a primary control; the refresh endpoint requires a CSRF token.

Every recommendation in this guide traces to a verifiable authoritative source. Where this guide makes architectural suggestions beyond what OWASP and the RFCs mandate, it is marked **[Guide]** to make the distinction explicit. Security decisions should be made with full awareness of what is a hard requirement and what is a considered recommendation.
