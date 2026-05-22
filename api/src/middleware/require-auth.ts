import { ERROR_CODES } from "@launchmin/shared";
import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import * as denylistRepo from "../auth/denylist.repository.js";
import { COOKIE_FP } from "../lib/cookies.js";
import { AppError } from "../lib/errors.js";
import { hashFingerprint } from "../lib/fingerprint.js";
import { type AccessTokenClaims, verifyAccessToken } from "../lib/jwt.js";
import { hashToken } from "../lib/tokens.js";

declare module "hono" {
	interface ContextVariableMap {
		userId: string;
		jti: string;
	}
}

// Verifies: Bearer header present → JWT signature/claims valid → fingerprint
// cookie matches the JWT's fp claim → token not in denylist.
// Sets c.var.userId and c.var.jti for downstream handlers.
export const requireAuth: MiddlewareHandler = async (c, next) => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		throw new AppError(
			401,
			ERROR_CODES.UNAUTHORIZED,
			"Authentication required",
		);
	}

	const token = authHeader.slice(7).trim();
	if (!token) {
		throw new AppError(
			401,
			ERROR_CODES.UNAUTHORIZED,
			"Authentication required",
		);
	}

	let claims: AccessTokenClaims;
	try {
		claims = await verifyAccessToken(token);
	} catch {
		throw new AppError(
			401,
			ERROR_CODES.UNAUTHORIZED,
			"Invalid or expired token",
		);
	}

	// Anti-sidejacking: stolen JWT replayed from another machine lacks the cookie.
	const fpRaw = getCookie(c, COOKIE_FP);
	if (!fpRaw || hashFingerprint(fpRaw) !== claims.fp) {
		throw new AppError(
			401,
			ERROR_CODES.UNAUTHORIZED,
			"Authentication required",
		);
	}

	// Denylist check (revoked-by-logout tokens that haven't expired yet).
	if (await denylistRepo.exists(hashToken(token))) {
		throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Token revoked");
	}

	c.set("userId", claims.sub);
	c.set("jti", claims.jti);

	await next();
};
