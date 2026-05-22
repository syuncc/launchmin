import { z } from "zod";

// Username. Normalized to lowercase + trimmed. Restricted charset keeps URLs
// and shell display clean. 3-32 chars covers typical handles.
export const usernameField = z
	.string()
	.trim()
	.toLowerCase()
	.min(3)
	.max(32)
	.regex(/^[a-z0-9_-]+$/, "Only lowercase letters, digits, underscore, hyphen");

// Password meeting OWASP minimum length without MFA (≥15 chars).
// Upper bound caps input size to prevent DoS while still accommodating passphrases.
// NOT trimmed — leading/trailing whitespace can be intentional.
export const passwordField = z.string().min(15).max(128);

// Generic account identifier used at login (username today, possibly email later).
// Length-only validation — OWASP anti-enumeration forbids revealing format rules
// during sign-in. Casing preserved (caller decides whether to lowercase).
export const accountField = z.string().trim().min(1).max(254);
