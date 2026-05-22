import { getConnInfo } from "@hono/node-server/conninfo";
import { ERROR_CODES } from "@launchmin/shared";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { env } from "./env.js";
import { AppError } from "./errors.js";

// Prefer the first hop in X-Forwarded-For (set by a trusted reverse proxy)
// over the raw socket address. Falls back to "test" so unit tests sharing the
// memory store all bucket under one key — we override the limit in NODE_ENV=test
// to keep tests from accidentally triggering it.
function clientKey(c: Context): string {
	const xff = c.req.header("x-forwarded-for");
	if (xff) {
		const first = xff.split(",")[0]?.trim();
		if (first) return first;
	}
	try {
		return getConnInfo(c).remote.address ?? "test";
	} catch {
		return "test";
	}
}

export const loginRateLimit = rateLimiter({
	windowMs: env().LOGIN_RATE_LIMIT_WINDOW_MS,
	limit:
		env().NODE_ENV === "test"
			? Number.MAX_SAFE_INTEGER
			: env().LOGIN_RATE_LIMIT_MAX,
	standardHeaders: "draft-7",
	keyGenerator: clientKey,
	handler: () => {
		throw new AppError(
			429,
			ERROR_CODES.RATE_LIMIT_EXCEEDED,
			"Too many login attempts. Try again later.",
		);
	},
});
