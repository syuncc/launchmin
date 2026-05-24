import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import {
	cookieHeader,
	type LoginResult,
	login,
	seedAdmin,
	seedUserDirectly,
} from "./helpers.js";

const url = "/api/users";
const jsonHeaders = { "Content-Type": "application/json" };

let adminAuth: LoginResult;

beforeEach(async () => {
	const admin = await seedAdmin();
	adminAuth = await login(admin.username, admin.password);
});

async function postAsAdmin(body: unknown) {
	return app.request(url, {
		method: "POST",
		headers: {
			...jsonHeaders,
			Authorization: `Bearer ${adminAuth.accessToken}`,
			Cookie: cookieHeader(adminAuth.cookies),
		},
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

describe("POST /api/users — admin gate", () => {
	it("rejects request without authentication", async () => {
		const res = await app.request(url, {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({
				username: "newuser",
				password: "passwordlongenough",
			}),
		});
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("UNAUTHORIZED");
	});

	it("rejects request from a non-admin authenticated user", async () => {
		const user = await seedUserDirectly({
			username: "regular",
			password: "regularpasswordlong",
		});
		const userAuth = await login(user.username, user.password);

		const res = await app.request(url, {
			method: "POST",
			headers: {
				...jsonHeaders,
				Authorization: `Bearer ${userAuth.accessToken}`,
				Cookie: cookieHeader(userAuth.cookies),
			},
			body: JSON.stringify({
				username: "newuser",
				password: "passwordlongenough",
			}),
		});
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.code).toBe("FORBIDDEN");
	});
});

describe("POST /api/users — as admin", () => {
	it("registers a new user with valid input and default role 'user'", async () => {
		const res = await postAsAdmin({
			username: "alice",
			password: "passwordlongenough",
		});

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			success: true,
			data: { username: "alice", role: "user" },
		});
		expect(body.data).not.toHaveProperty("passwordHash");
		expect(body.data.id).toMatch(/^[0-9a-f]{24}$/);
	});

	it("normalizes username (lowercase + trim) on registration", async () => {
		const res = await postAsAdmin({
			username: "  Alice  ",
			password: "passwordlongenough",
		});

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.username).toBe("alice");
	});

	it("rejects duplicate username with 409 DUPLICATE_RESOURCE", async () => {
		const payload = {
			username: "dup",
			password: "passwordlongenough",
		};
		expect((await postAsAdmin(payload)).status).toBe(201);

		const second = await postAsAdmin(payload);
		expect(second.status).toBe(409);
		const body = await second.json();
		expect(body).toMatchObject({
			success: false,
			error: { code: "DUPLICATE_RESOURCE" },
		});
	});

	it("treats casing-different usernames as duplicates", async () => {
		expect(
			(
				await postAsAdmin({
					username: "case",
					password: "passwordlongenough",
				})
			).status,
		).toBe(201);

		const second = await postAsAdmin({
			username: "CASE",
			password: "passwordlongenough",
		});
		expect(second.status).toBe(409);
	});

	it("rejects password shorter than 15 chars with VALIDATION_ERROR", async () => {
		const res = await postAsAdmin({
			username: "shortpw",
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

	it("rejects username with disallowed characters", async () => {
		const res = await postAsAdmin({
			username: "has space",
			password: "passwordlongenough",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
		expect(body.error.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ field: "username" })]),
		);
	});

	it("rejects username shorter than 3 chars", async () => {
		const res = await postAsAdmin({
			username: "ab",
			password: "passwordlongenough",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
	});

	it("rejects missing fields with VALIDATION_ERROR", async () => {
		const res = await postAsAdmin({});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
	});

	it("rejects malformed JSON body with VALIDATION_ERROR", async () => {
		const res = await postAsAdmin("not json at all");
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
	});
});
