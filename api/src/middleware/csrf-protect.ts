import { ERROR_CODES } from "@launchmin/shared";
import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { COOKIE_CSRF } from "../lib/cookies.js";
import { verifyCsrfToken } from "../lib/csrf.js";
import { AppError } from "../lib/errors.js";

// Apply to endpoints that authenticate via cookie (refresh, logout).
// Client reads __Host-csrf cookie via JS, echoes value in X-CSRF-Token header.
// Server validates: header equals cookie AND cookie HMAC is valid.
export const csrfProtect: MiddlewareHandler = async (c, next) => {
	const cookieToken = getCookie(c, COOKIE_CSRF);
	const headerToken = c.req.header("X-CSRF-Token");

	if (!cookieToken || !headerToken) {
		throw new AppError(403, ERROR_CODES.FORBIDDEN, "CSRF token required");
	}
	if (cookieToken !== headerToken) {
		throw new AppError(403, ERROR_CODES.FORBIDDEN, "CSRF token mismatch");
	}
	if (!verifyCsrfToken(cookieToken)) {
		throw new AppError(403, ERROR_CODES.FORBIDDEN, "Invalid CSRF token");
	}

	await next();
};
