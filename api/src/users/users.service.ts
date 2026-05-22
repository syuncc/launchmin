import { ERROR_CODES, type UserRegisterInput } from "@launchmin/shared";
import { AppError } from "../lib/errors.js";
import { hashPassword } from "../lib/password.js";
import { toDomain, type User } from "./users.model.js";
import * as repo from "./users.repository.js";

export async function register(input: UserRegisterInput): Promise<User> {
	const existing = await repo.findByEmail(input.email);
	if (existing) {
		throw new AppError(
			409,
			ERROR_CODES.DUPLICATE_RESOURCE,
			"Email already registered",
		);
	}

	const now = new Date();
	const doc = await repo.insert({
		email: input.email,
		passwordHash: await hashPassword(input.password),
		createdAt: now,
		updatedAt: now,
	});
	return toDomain(doc);
}

export async function getById(userId: string): Promise<User | null> {
	const doc = await repo.findById(userId);
	return doc ? toDomain(doc) : null;
}
