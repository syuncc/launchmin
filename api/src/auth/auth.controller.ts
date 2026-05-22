import { ERROR_CODES, userLoginInput } from "@launchmin/shared";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import {
	COOKIE_RT,
	clearAuthCookies,
	setCsrfCookie,
	setFingerprintCookie,
	setRefreshTokenCookie,
} from "../lib/cookies.js";
import { error, success } from "../utils/response.js";
import * as service from "./auth.service.js";

export async function login(c: Context) {
	const body = await c.req.json().catch(() => null);
	const parsed = userLoginInput.safeParse(body);
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

	const deviceInfo = c.req.header("User-Agent") ?? "unknown";
	const tokens = await service.login(parsed.data, deviceInfo);

	setRefreshTokenCookie(c, tokens.refreshTokenRaw);
	setFingerprintCookie(c, tokens.fingerprintRaw);
	setCsrfCookie(c, tokens.csrfToken);

	return success(c, 200, "Login successful", {
		accessToken: tokens.accessToken,
		expiresIn: tokens.expiresIn,
	});
}

export async function refresh(c: Context) {
	const refreshToken = getCookie(c, COOKIE_RT);
	if (!refreshToken) {
		return error(c, 401, "Missing refresh token", ERROR_CODES.UNAUTHORIZED);
	}

	const deviceInfo = c.req.header("User-Agent") ?? "unknown";
	const tokens = await service.refresh(refreshToken, deviceInfo);

	setRefreshTokenCookie(c, tokens.refreshTokenRaw);
	setFingerprintCookie(c, tokens.fingerprintRaw);
	setCsrfCookie(c, tokens.csrfToken);

	return success(c, 200, "Refresh successful", {
		accessToken: tokens.accessToken,
		expiresIn: tokens.expiresIn,
	});
}

export async function logout(c: Context) {
	const refreshToken = getCookie(c, COOKIE_RT);
	const accessToken = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");

	await service.logout(refreshToken, accessToken);
	clearAuthCookies(c);

	return success(c, 200, "Logout successful");
}
