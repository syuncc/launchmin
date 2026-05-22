import { describe, expect, it } from "vitest";
import app from "../src/app.js";

const url = "/api/users";
const jsonHeaders = { "Content-Type": "application/json" };

async function post(body: unknown) {
	return app.request(url, {
		method: "POST",
		headers: jsonHeaders,
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

describe("POST /api/users", () => {
	it("registers a new user with valid input", async () => {
		const res = await post({
			email: "alice@example.com",
			password: "passwordlongenough",
		});

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			success: true,
			data: { email: "alice@example.com" },
		});
		// Sensitive field must not leak.
		expect(body.data).not.toHaveProperty("passwordHash");
		// ObjectId surfaces as 24-char hex string.
		expect(body.data.id).toMatch(/^[0-9a-f]{24}$/);
	});

	it("normalizes email (lowercase + trim) on registration", async () => {
		const res = await post({
			email: "  Alice@Example.COM  ",
			password: "passwordlongenough",
		});

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.email).toBe("alice@example.com");
	});

	it("rejects duplicate email with 409 DUPLICATE_RESOURCE", async () => {
		const payload = {
			email: "dup@example.com",
			password: "passwordlongenough",
		};
		expect((await post(payload)).status).toBe(201);

		const second = await post(payload);
		expect(second.status).toBe(409);
		const body = await second.json();
		expect(body).toMatchObject({
			success: false,
			error: { code: "DUPLICATE_RESOURCE" },
		});
	});

	it("treats casing-different emails as duplicates", async () => {
		expect(
			(
				await post({
					email: "case@example.com",
					password: "passwordlongenough",
				})
			).status,
		).toBe(201);

		const second = await post({
			email: "CASE@example.com",
			password: "passwordlongenough",
		});
		expect(second.status).toBe(409);
	});

	it("rejects password shorter than 15 chars with VALIDATION_ERROR", async () => {
		const res = await post({
			email: "short@example.com",
			password: "tooshort",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toMatchObject({
			success: false,
			error: { code: "VALIDATION_ERROR" },
		});
		expect(body.error.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ field: "password" })]),
		);
	});

	it("rejects invalid email format with VALIDATION_ERROR", async () => {
		const res = await post({
			email: "not-an-email",
			password: "passwordlongenough",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
	});

	it("rejects missing fields with VALIDATION_ERROR", async () => {
		const res = await post({});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
	});

	it("rejects malformed JSON body with VALIDATION_ERROR", async () => {
		const res = await post("not json at all");
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
	});
});
