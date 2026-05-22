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
