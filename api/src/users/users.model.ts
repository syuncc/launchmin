import type { ObjectId } from "mongodb";

// Two-value role for now. Promote to a proper RBAC table when permissions
// outgrow a single boolean-ish distinction.
export type UserRole = "admin" | "user";

// DB document shape — confined to repository layer.
export interface UserDocument {
	_id: ObjectId;
	username: string;
	passwordHash: string;
	role: UserRole;
	createdAt: Date;
	updatedAt: Date;
}

// Domain shape — flows through service → controller → HTTP response.
// Excludes passwordHash; _id becomes string id.
export interface User {
	id: string;
	username: string;
	role: UserRole;
	createdAt: Date;
	updatedAt: Date;
}

export function toDomain(doc: UserDocument): User {
	return {
		id: doc._id.toHexString(),
		username: doc.username,
		role: doc.role,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}
