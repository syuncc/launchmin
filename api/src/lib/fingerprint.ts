import { createHash, randomBytes } from "node:crypto";

// Anti-sidejacking per OWASP JWT Cheat Sheet:
// raw is sent to client as HttpOnly cookie; SHA-256 hash is embedded in the JWT claim.
// On every request, server re-hashes the cookie value and compares to the claim.

export function generateFingerprint(): { raw: string; hash: string } {
	const raw = randomBytes(32).toString("base64url");
	const hash = hashFingerprint(raw);
	return { raw, hash };
}

export function hashFingerprint(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}
