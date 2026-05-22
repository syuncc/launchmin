import type { ObjectId } from "mongodb";

// One row per refresh token issued. Tokens within a single login session share familyId
// to enable reuse detection per RFC 9700 §2.2.2 (rotation + reuse-detection model).
export interface RefreshTokenDocument {
	_id: ObjectId;
	tokenHash: string; // SHA-256 hex of the raw token
	userId: ObjectId;
	familyId: ObjectId; // shared across rotated tokens in the same session
	issuedAt: Date;
	expiresAt: Date; // TTL index drops the row after this
	lastUsedAt: Date | null;
	isRevoked: boolean;
	replacedByHash: string | null; // hash of the successor token (chain tracing)
	deviceInfo: string; // User-Agent at issuance; display only
}
