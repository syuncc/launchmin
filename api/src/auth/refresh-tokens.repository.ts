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

export async function markUsedAndReplaced(
	tokenHash: string,
	replacedByHash: string,
): Promise<void> {
	await col().updateOne(
		{ tokenHash },
		{
			$set: {
				isRevoked: true,
				replacedByHash,
				lastUsedAt: new Date(),
			},
		},
	);
}

export async function revokeFamily(familyId: ObjectId): Promise<void> {
	await col().updateMany({ familyId }, { $set: { isRevoked: true } });
}
