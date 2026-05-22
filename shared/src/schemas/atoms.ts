import { z } from "zod";

// Email address. Normalized to lowercase + trimmed; max length per RFC 5321.
export const emailField = z.string().trim().toLowerCase().email().max(254);

// Password meeting OWASP minimum length without MFA (≥15 chars).
// Upper bound caps input size to prevent DoS while still accommodating passphrases.
// NOT trimmed — leading/trailing whitespace can be intentional.
export const passwordField = z.string().min(15).max(128);

// Generic account identifier used at login (email or username).
// Length-only validation — OWASP anti-enumeration forbids revealing format rules
// during sign-in. Casing preserved (caller decides whether to lowercase).
export const accountField = z.string().trim().min(1).max(254);
