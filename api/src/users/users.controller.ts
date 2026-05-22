import { ERROR_CODES, userRegisterInput } from "@launchmin/shared";
import type { Context } from "hono";
import { error, success } from "../utils/response.js";
import * as service from "./users.service.js";

export async function register(c: Context) {
	const body = await c.req.json().catch(() => null);
	const parsed = userRegisterInput.safeParse(body);
	if (!parsed.success) {
		return error(
			c,
			400,
			"Validation failed",
			ERROR_CODES.VALIDATION_ERROR,
			parsed.error.issues.map((i) => ({
				field: i.path.join("."),
				message: i.message,
			})),
		);
	}

	const user = await service.register(parsed.data);
	return success(c, 201, "User registered successfully", user);
}

export async function me(c: Context) {
	const userId = c.get("userId");
	const user = await service.getById(userId);
	if (!user) {
		return error(c, 404, "User not found", ERROR_CODES.RESOURCE_NOT_FOUND);
	}
	return success(c, 200, "Current user", user);
}
