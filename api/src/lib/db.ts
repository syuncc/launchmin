import { type Db, MongoClient } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<void> {
	const uri = process.env.MONGODB_URI;
	if (!uri) {
		throw new Error("MONGODB_URI environment variable is not set");
	}

	client = new MongoClient(uri);
	await client.connect();

	db = client.db();

	console.log("  ✓ Connected to MongoDB");
}

export function getDb(): Db {
	if (!db) {
		throw new Error(
			"Database not initialized. Call connectDb() before accessing the database",
		);
	}
	return db;
}

export function getClient(): MongoClient {
	if (!client) {
		throw new Error(
			"MongoClient not initialized. Call connectDb() before accessing the client",
		);
	}
	return client;
}

export async function disconnectDb(): Promise<void> {
	if (client) {
		try {
			await client.close();
			console.log("  ✓ Disconnected from MongoDB");
		} catch (err) {
			console.error("  ✗ Error closing MongoDB connection:", err);
		} finally {
			client = null;
			db = null;
		}
	}
}
