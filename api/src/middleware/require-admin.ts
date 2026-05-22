import { ERROR_CODES } from "@launchmin/shared";
import type { MiddlewareHandler } from "hono";
import { AppError } from "../lib/errors.js";
import * as usersRepo from "../users/users.repository.js";

// Must be applied AFTER requireAuth (relies on c.var.userId).
// Performs a live DB lookup of the user's role — chosen over caching the role
// in the JWT claim so that demotions take effect immediately rather than after
// the access token expires.
export const requireAdmin: MiddlewareHandler = async (c, next) => {
	const userId = c.get("userId");
	if (!userId) {
		// Programmer error: requireAdmin used without requireAuth before it.
		throw new AppError(
			500,
			ERROR_CODES.INTERNAL_ERROR,
			"requireAdmin must follow requireAuth",
		);
	}

	const user = await usersRepo.findById(userId);
	if (!user) {
		throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "User not found");
	}
	if (user.role !== "admin") {
		throw new AppError(403, ERROR_CODES.FORBIDDEN, "Admin role required");
	}

	await next();
};
