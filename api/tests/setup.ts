import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { connectDb, disconnectDb, getDb } from "../src/lib/db.js";
import { ensureIndexes } from "../src/lib/indexes.js";

let mongo: MongoMemoryServer;

beforeAll(async () => {
	mongo = await MongoMemoryServer.create();
	process.env.MONGODB_URI = mongo.getUri();
	await connectDb();
	await ensureIndexes();
});

afterAll(async () => {
	await disconnectDb();
	await mongo.stop();
});

// Clean all collections between tests so each test starts from a known empty state.
// Indexes are preserved (deleteMany doesn't drop the collection).
beforeEach(async () => {
	const db = getDb();
	const collections = await db.collections();
	await Promise.all(collections.map((c) => c.deleteMany({})));
});
