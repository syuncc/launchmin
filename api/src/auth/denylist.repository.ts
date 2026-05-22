import { type Collection, ObjectId } from "mongodb";
import { getDb } from "../lib/db.js";
import type { DenylistDocument } from "./denylist.model.js";

const col = (): Collection<DenylistDocument> =>
	getDb().collection<DenylistDocument>("token_denylist");

export async function add(tokenHash: string, expiresAt: Date): Promise<void> {
	// Idempotent: ignore duplicate-key on repeated logout calls with the same AT.
	try {
		await col().insertOne({ _id: new ObjectId(), tokenHash, expiresAt });
	} catch (err) {
		if ((err as { code?: number }).code !== 11000) throw err;
	}
}

export async function exists(tokenHash: string): Promise<boolean> {
	const found = await col().findOne({ tokenHash }, { projection: { _id: 1 } });
	return found !== null;
}
