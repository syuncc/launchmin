import { type Collection, ObjectId } from "mongodb";
import { getDb } from "../lib/db.js";
import type { RefreshTokenDocument } from "./refresh-tokens.model.js";

const col = (): Collection<RefreshTokenDocument> =>
	getDb().collection<RefreshTokenDocument>("refresh_tokens");

export async function insert(
	doc: Omit<RefreshTokenDocument, "_id">,
): Promise<RefreshTokenDocument> {
	const _id = new ObjectId();
	await col().insertOne({ ...doc, _id });
	return { ...doc, _id };
}

export async function findByHash(
	tokenHash: string,
): Promise<RefreshTokenDocument | null> {
	return col().findOne({ tokenHash });
}

// Atomically claim the rotation slot — only revoke if the token is still
// active. Returns true if this caller won the race; false if it was already
// revoked (= reuse, even if the same legitimate client raced with itself).
export async function tryRevokeForRotation(
	tokenHash: string,
): Promise<boolean> {
	const result = await col().updateOne(
		{ tokenHash, isRevoked: false },
		{ $set: { isRevoked: true, lastUsedAt: new Date() } },
	);
	return result.modifiedCount === 1;
}

// Back-pointer to the successor token. Called after tryRevokeForRotation
// succeeds and the new RT has been issued. Pure trace info — not used by
// security checks, so failure is non-fatal.
export async function setReplacedBy(
	tokenHash: string,
	replacedByHash: string,
): Promise<void> {
	await col().updateOne({ tokenHash }, { $set: { replacedByHash } });
}

export async function revokeFamily(familyId: ObjectId): Promise<void> {
	await col().updateMany({ familyId }, { $set: { isRevoked: true } });
}
