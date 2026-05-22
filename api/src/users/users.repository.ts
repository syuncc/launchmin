import { type Collection, ObjectId } from "mongodb";
import { getDb } from "../lib/db.js";
import type { UserDocument } from "./users.model.js";

const col = (): Collection<UserDocument> =>
	getDb().collection<UserDocument>("users");

export async function findByUsername(
	username: string,
): Promise<UserDocument | null> {
	return col().findOne({ username });
}

export async function findById(id: string): Promise<UserDocument | null> {
	if (!ObjectId.isValid(id)) return null;
	return col().findOne({ _id: new ObjectId(id) });
}

export async function insert(
	doc: Omit<UserDocument, "_id">,
): Promise<UserDocument> {
	const _id = new ObjectId();
	await col().insertOne({ ...doc, _id });
	return { ...doc, _id };
}

// Increments the failure counter; on reaching maxAttempts, sets lockedUntil
// and resets the counter (so the user does not re-lock immediately after unlock).
// Two operations rather than one aggregation update — small race window where two
// concurrent failures past the threshold both write lockedUntil. Idempotent value;
// acceptable for v1.
export async function recordFailedLogin(
	userId: ObjectId,
	maxAttempts: number,
	lockoutDurationMs: number,
): Promise<void> {
	const updated = await col().findOneAndUpdate(
		{ _id: userId },
		{
			$inc: { failedLoginCount: 1 },
			$set: { lastFailedLoginAt: new Date() },
		},
		{ returnDocument: "after" },
	);
	if (updated && updated.failedLoginCount >= maxAttempts) {
		await col().updateOne(
			{ _id: userId },
			{
				$set: {
					lockedUntil: new Date(Date.now() + lockoutDurationMs),
					failedLoginCount: 0,
				},
			},
		);
	}
}

export async function resetLoginState(userId: ObjectId): Promise<void> {
	await col().updateOne(
		{ _id: userId },
		{
			$set: {
				failedLoginCount: 0,
				lockedUntil: null,
				lastFailedLoginAt: null,
			},
		},
	);
}
