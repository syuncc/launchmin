import type { ObjectId } from "mongodb";

// Revoked access-token hashes. TTL index on expiresAt cleans up entries automatically
// once the underlying JWT would have expired anyway.
export interface DenylistDocument {
	_id: ObjectId;
	tokenHash: string; // SHA-256 hex of the full JWT string
	expiresAt: Date;
}
