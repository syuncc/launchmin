import type { ObjectId } from "mongodb";

// DB document shape — confined to repository layer.
export interface UserDocument {
	_id: ObjectId;
	email: string;
	passwordHash: string;
	createdAt: Date;
	updatedAt: Date;
}

// Domain shape — flows through service → controller → HTTP response.
// Excludes passwordHash; _id becomes string id.
export interface User {
	id: string;
	email: string;
	createdAt: Date;
	updatedAt: Date;
}

export function toDomain(doc: UserDocument): User {
	return {
		id: doc._id.toHexString(),
		email: doc.email,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}
