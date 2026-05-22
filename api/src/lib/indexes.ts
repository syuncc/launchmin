import { getDb } from "./db.js";

// Idempotent — MongoDB createIndex skips if an equivalent index exists.
// Call once at server startup, after connectDb().
export async function ensureIndexes(): Promise<void> {
	const db = getDb();

	await db.collection("users").createIndex({ email: 1 }, { unique: true });

	await db
		.collection("refresh_tokens")
		.createIndex({ tokenHash: 1 }, { unique: true });
	await db.collection("refresh_tokens").createIndex({ familyId: 1 });
	await db
		.collection("refresh_tokens")
		.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

	await db
		.collection("token_denylist")
		.createIndex({ tokenHash: 1 }, { unique: true });
	await db
		.collection("token_denylist")
		.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

	console.log("  ✓ Indexes ensured");
}
