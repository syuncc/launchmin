import { ERROR_CODES } from "@launchmin/shared";
import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { describe, expect, it } from "vitest";
import { AppError } from "../src/lib/errors.js";
import { error } from "../src/utils/response.js";

// The production loginRateLimit middleware is effectively disabled in
// NODE_ENV=test (limit set to MAX_SAFE_INTEGER) so the rest of the auth
// suite does not trip it. This file builds a tiny Hono app with the SAME
// handler config but a low limit to prove the wiring is correct:
//   - keyGenerator buckets per-IP
//   - threshold trips at limit+1
//   - handler throws AppError(429, RATE_LIMIT_EXCEEDED)
//   - onError translates AppError into the standard error response shape

describe("loginRateLimit handler wiring", () => {
	function buildApp() {
		const app = new Hono();
		app.use(
			"/probe",
			rateLimiter({
				windowMs: 60_000,
				limit: 2,
				standardHeaders: "draft-7",
				keyGenerator: (c) => c.req.header("x-test-key") ?? "default",
				handler: () => {
					throw new AppError(
						429,
						ERROR_CODES.RATE_LIMIT_EXCEEDED,
						"Too many login attempts. Try again later.",
					);
				},
			}),
		);
		app.get("/probe", (c) => c.json({ ok: true }));
		app.onError((err, c) => {
			if (err instanceof AppError) {
				return error(c, err.statusCode, err.message, err.code);
			}
			return error(c, 500, "Internal", ERROR_CODES.INTERNAL_ERROR);
		});
		return app;
	}

	it("returns 200 within the limit and 429 RATE_LIMIT_EXCEEDED past it", async () => {
		const app = buildApp();
		const headers = { "x-test-key": "client-A" };

		expect((await app.request("/probe", { headers })).status).toBe(200);
		expect((await app.request("/probe", { headers })).status).toBe(200);

		const blocked = await app.request("/probe", { headers });
		expect(blocked.status).toBe(429);
		const body = await blocked.json();
		expect(body).toMatchObject({
			success: false,
			error: { code: "RATE_LIMIT_EXCEEDED" },
		});
	});

	it("buckets per key — different clients have independent counters", async () => {
		const app = buildApp();

		// Client A burns its budget.
		for (let i = 0; i < 2; i++) {
			await app.request("/probe", { headers: { "x-test-key": "client-A" } });
		}
		expect(
			(await app.request("/probe", { headers: { "x-test-key": "client-A" } }))
				.status,
		).toBe(429);

		// Client B is unaffected.
		expect(
			(await app.request("/probe", { headers: { "x-test-key": "client-B" } }))
				.status,
		).toBe(200);
	});
});
