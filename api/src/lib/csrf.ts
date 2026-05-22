import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";

// Signed double-submit cookie per OWASP CSRF Prevention Cheat Sheet (§4.2).
// Naive double-submit (unsigned) is explicitly discouraged due to cookie injection.
// Format: <nonce>.<HMAC-SHA256(nonce, CSRF_SECRET)>

export function generateCsrfToken(): string {
	const nonce = randomBytes(16).toString("base64url");
	const sig = sign(nonce);
	return `${nonce}.${sig}`;
}

export function verifyCsrfToken(token: string): boolean {
	const parts = token.split(".");
	if (parts.length !== 2) return false;
	const [nonce, sig] = parts;
	if (!nonce || !sig) return false;

	const expected = sign(nonce);
	try {
		const actualBuf = Buffer.from(sig, "base64url");
		const expectedBuf = Buffer.from(expected, "base64url");
		if (actualBuf.length !== expectedBuf.length) return false;
		return timingSafeEqual(actualBuf, expectedBuf);
	} catch {
		return false;
	}
}

function sign(nonce: string): string {
	return createHmac("sha256", env().CSRF_SECRET)
		.update(nonce)
		.digest("base64url");
}
