import { createHash, randomBytes, randomUUID } from "node:crypto";

// Opaque refresh token: 256 bits CSPRNG, base64url encoded.
// Server stores only the SHA-256 hash; raw value lives only in the client's
// HttpOnly cookie. If the DB is breached, hashes cannot be replayed as tokens.

export function generateRefreshToken(): { raw: string; hash: string } {
	const raw = randomBytes(32).toString("base64url");
	const hash = hashToken(raw);
	return { raw, hash };
}

export function hashToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

// JWT ID — unique per access token, enables denylist by jti or by full-token hash.
export function generateJti(): string {
	return randomUUID();
}
