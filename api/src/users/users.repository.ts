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

// Atomic single-pipeline update:
//   1. Always increment failedLoginCount + stamp lastFailedLoginAt.
//   2. If the incremented count >= maxAttempts AND the account is not
//      currently locked (lockedUntil null or in the past), set lockedUntil
//      and reset the counter so the user does not re-lock immediately
//      after the lockout expires.
// The not-currently-locked guard prevents continuous attack traffic from
// pushing lockedUntil indefinitely forward (DoS amplification).
export async function recordFailedLogin(
	userId: ObjectId,
	maxAttempts: number,
	lockoutDurationMs: number,
): Promise<void> {
	const now = new Date();
	const lockUntil = new Date(now.getTime() + lockoutDurationMs);

	await col().updateOne({ _id: userId }, [
		{
			$set: {
				failedLoginCount: {
					$add: [{ $ifNull: ["$failedLoginCount", 0] }, 1],
				},
				lastFailedLoginAt: now,
			},
		},
		{
			$set: {
				lockedUntil: {
					$cond: [
						{
							$and: [
								{ $gte: ["$failedLoginCount", maxAttempts] },
								{
									$or: [
										{ $eq: ["$lockedUntil", null] },
										{ $lt: ["$lockedUntil", now] },
									],
								},
							],
						},
						lockUntil,
						"$lockedUntil",
					],
				},
				failedLoginCount: {
					$cond: [
						{
							$and: [
								{ $gte: ["$failedLoginCount", maxAttempts] },
								{
									$or: [
										{ $eq: ["$lockedUntil", null] },
										{ $lt: ["$lockedUntil", now] },
									],
								},
							],
						},
						0,
						"$failedLoginCount",
					],
				},
			},
		},
	]);
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
