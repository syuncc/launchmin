import { describe, expect, it } from "vitest";
import app from "../src/app.js";

const jsonHeaders = { "Content-Type": "application/json" };

function extractCookies(res: Response): Record<string, string> {
	const cookies: Record<string, string> = {};
	const setCookieList = res.headers.getSetCookie?.() ?? [];
	for (const setCookie of setCookieList) {
		const [pair] = setCookie.split(";");
		if (!pair) continue;
		const eq = pair.indexOf("=");
		if (eq === -1) continue;
		cookies[pair.slice(0, eq)] = pair.slice(eq + 1);
	}
	return cookies;
}

function cookieHeader(cookies: Record<string, string>): string {
	return Object.entries(cookies)
		.map(([k, v]) => `${k}=${v}`)
		.join("; ");
}

async function registerUser(username: string, password: string) {
	return app.request("/api/users", {
		method: "POST",
		headers: jsonHeaders,
		body: JSON.stringify({ username, password }),
	});
}

async function loginUser(account: string, password: string) {
	const res = await app.request("/api/auth/login", {
		method: "POST",
		headers: jsonHeaders,
		body: JSON.stringify({ account, password }),
	});
	const body = await res.json();
	const cookies = extractCookies(res);
	return { res, body, cookies };
}

describe("POST /api/auth/login", () => {
	it("returns 200 + access token + sets rt/fp/csrf cookies on valid credentials", async () => {
		await registerUser("alice", "passwordlongenough");
		const { res, body, cookies } = await loginUser(
			"alice",
			"passwordlongenough",
		);

		expect(res.status).toBe(200);
		expect(body).toMatchObject({
			success: true,
			data: { accessToken: expect.any(String), expiresIn: 900 },
		});
		expect(cookies["__Host-rt"]).toBeDefined();
		expect(cookies["__Host-fp"]).toBeDefined();
		expect(cookies["__Host-csrf"]).toBeDefined();
	});

	it("returns 401 with generic message on wrong password", async () => {
		await registerUser("wrongpw", "passwordlongenough");
		const { res, body } = await loginUser("wrongpw", "thisIsTheWrongPwd");

		expect(res.status).toBe(401);
		expect(body).toMatchObject({
			success: false,
			message: "Login failed; invalid user ID or password",
			error: { code: "UNAUTHORIZED" },
		});
	});

	it("returns 401 with same message on non-existent account (anti-enumeration)", async () => {
		const { res, body } = await loginUser("noone", "passwordlongenough");

		expect(res.status).toBe(401);
		expect(body.message).toBe("Login failed; invalid user ID or password");
		expect(body.error.code).toBe("UNAUTHORIZED");
	});

	it("returns 400 VALIDATION_ERROR on missing fields", async () => {
		const res = await app.request("/api/auth/login", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
	});

	it("accepts uppercase username at login (lowercased on lookup)", async () => {
		await registerUser("mixed", "passwordlongenough");
		const { res } = await loginUser("MIXED", "passwordlongenough");
		expect(res.status).toBe(200);
	});
});

describe("POST /api/auth/refresh", () => {
	async function setupLogin() {
		await registerUser("bob", "passwordlongenough");
		return loginUser("bob", "passwordlongenough");
	}

	it("returns 200 + new access token + rotates refresh cookie", async () => {
		const { cookies } = await setupLogin();
		const oldRt = cookies["__Host-rt"];

		const refreshRes = await app.request("/api/auth/refresh", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(cookies),
				"X-CSRF-Token": cookies["__Host-csrf"] ?? "",
			},
		});

		expect(refreshRes.status).toBe(200);
		const body = await refreshRes.json();
		expect(body.data.accessToken).toBeDefined();

		const newCookies = extractCookies(refreshRes);
		expect(newCookies["__Host-rt"]).toBeDefined();
		expect(newCookies["__Host-rt"]).not.toBe(oldRt);
	});

	it("returns 403 FORBIDDEN on missing CSRF header", async () => {
		const { cookies } = await setupLogin();
		const res = await app.request("/api/auth/refresh", {
			method: "POST",
			headers: { Cookie: cookieHeader(cookies) },
		});
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.code).toBe("FORBIDDEN");
	});

	it("returns 403 on CSRF mismatch", async () => {
		const { cookies } = await setupLogin();
		const res = await app.request("/api/auth/refresh", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(cookies),
				"X-CSRF-Token": "wrong-token-value",
			},
		});
		expect(res.status).toBe(403);
	});

	it("returns 401 on missing refresh cookie", async () => {
		const { cookies } = await setupLogin();
		const noRt = { ...cookies };
		delete noRt["__Host-rt"];

		const res = await app.request("/api/auth/refresh", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(noRt),
				"X-CSRF-Token": cookies["__Host-csrf"] ?? "",
			},
		});
		expect(res.status).toBe(401);
	});

	it("detects refresh token reuse and revokes the whole family", async () => {
		const { cookies } = await setupLogin();

		// First refresh succeeds and rotates the token.
		const r1 = await app.request("/api/auth/refresh", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(cookies),
				"X-CSRF-Token": cookies["__Host-csrf"] ?? "",
			},
		});
		expect(r1.status).toBe(200);
		const newCookies = extractCookies(r1);

		// Reusing the original (now-rotated) RT triggers reuse detection.
		const r2 = await app.request("/api/auth/refresh", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(cookies),
				"X-CSRF-Token": cookies["__Host-csrf"] ?? "",
			},
		});
		expect(r2.status).toBe(401);

		// Family revoked — even the freshly-issued RT from r1 should now fail.
		const r3 = await app.request("/api/auth/refresh", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(newCookies),
				"X-CSRF-Token": newCookies["__Host-csrf"] ?? "",
			},
		});
		expect(r3.status).toBe(401);
	});
});

describe("POST /api/auth/logout", () => {
	async function setupLogin() {
		await registerUser("carol", "passwordlongenough");
		return loginUser("carol", "passwordlongenough");
	}

	it("revokes RT family and denylists the access token", async () => {
		const { body: loginBody, cookies } = await setupLogin();
		const at = loginBody.data.accessToken;

		const logoutRes = await app.request("/api/auth/logout", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(cookies),
				"X-CSRF-Token": cookies["__Host-csrf"] ?? "",
				Authorization: `Bearer ${at}`,
			},
		});
		expect(logoutRes.status).toBe(200);

		// AT is denylisted — protected endpoint now rejects it.
		const meRes = await app.request("/api/users/me", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${at}`,
				Cookie: cookieHeader(cookies),
			},
		});
		expect(meRes.status).toBe(401);

		// RT family revoked — refresh also fails.
		const refreshRes = await app.request("/api/auth/refresh", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(cookies),
				"X-CSRF-Token": cookies["__Host-csrf"] ?? "",
			},
		});
		expect(refreshRes.status).toBe(401);
	});

	it("returns 403 on missing CSRF", async () => {
		const { cookies, body } = await setupLogin();
		const res = await app.request("/api/auth/logout", {
			method: "POST",
			headers: {
				Cookie: cookieHeader(cookies),
				Authorization: `Bearer ${body.data.accessToken}`,
			},
		});
		expect(res.status).toBe(403);
	});
});

describe("Account lockout", () => {
	async function attemptLogin(account: string, password: string) {
		return app.request("/api/auth/login", {
			method: "POST",
			headers: jsonHeaders,
			body: JSON.stringify({ account, password }),
		});
	}

	it("locks account after 5 consecutive failed login attempts", async () => {
		await registerUser("locktest", "correctpasswordlongenough");

		for (let i = 0; i < 5; i++) {
			const res = await attemptLogin("locktest", "wrong-password-here");
			expect(res.status).toBe(401);
		}

		// Correct password is now also rejected — account is locked.
		const res = await attemptLogin("locktest", "correctpasswordlongenough");
		expect(res.status).toBe(401);
		const body = await res.json();
		// Anti-enumeration: same generic message even when locked.
		expect(body.message).toBe("Login failed; invalid user ID or password");
	});

	it("resets failure counter on a successful login", async () => {
		await registerUser("resettest", "correctpasswordlongenough");

		// 4 failed attempts (one below threshold).
		for (let i = 0; i < 4; i++) {
			expect((await attemptLogin("resettest", "wrong-password")).status).toBe(
				401,
			);
		}

		// Successful login resets the counter.
		expect(
			(await attemptLogin("resettest", "correctpasswordlongenough")).status,
		).toBe(200);

		// 4 more failures should NOT lock (counter was reset).
		for (let i = 0; i < 4; i++) {
			expect((await attemptLogin("resettest", "wrong-password")).status).toBe(
				401,
			);
		}

		// Still able to login.
		expect(
			(await attemptLogin("resettest", "correctpasswordlongenough")).status,
		).toBe(200);
	});

	it("does not lock non-existent accounts", async () => {
		// Many tries against a username that does not exist.
		for (let i = 0; i < 10; i++) {
			expect(
				(await attemptLogin("nobody-here", "anything-at-all")).status,
			).toBe(401);
		}
		// Registering the same username after the attack — should not be pre-locked.
		await registerUser("nobody-here", "newpasswordlongenough");
		expect(
			(await attemptLogin("nobody-here", "newpasswordlongenough")).status,
		).toBe(200);
	});
});

describe("GET /api/users/me (requireAuth middleware)", () => {
	async function setupLogin() {
		await registerUser("dave", "passwordlongenough");
		return loginUser("dave", "passwordlongenough");
	}

	it("returns 200 + user profile with valid token + fingerprint", async () => {
		const { body: loginBody, cookies } = await setupLogin();
		const at = loginBody.data.accessToken;

		const res = await app.request("/api/users/me", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${at}`,
				Cookie: cookieHeader(cookies),
			},
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.username).toBe("dave");
		expect(body.data.role).toBe("user");
		expect(body.data).not.toHaveProperty("passwordHash");
	});

	it("rejects request with missing Authorization header", async () => {
		const res = await app.request("/api/users/me", { method: "GET" });
		expect(res.status).toBe(401);
	});

	it("rejects malformed Authorization header", async () => {
		const res = await app.request("/api/users/me", {
			method: "GET",
			headers: { Authorization: "NotBearer xyz" },
		});
		expect(res.status).toBe(401);
	});

	it("rejects invalid JWT", async () => {
		const res = await app.request("/api/users/me", {
			method: "GET",
			headers: { Authorization: "Bearer invalid.jwt.string" },
		});
		expect(res.status).toBe(401);
	});

	it("rejects valid JWT without fingerprint cookie (sidejacking simulation)", async () => {
		const { body: loginBody } = await setupLogin();
		const at = loginBody.data.accessToken;

		const res = await app.request("/api/users/me", {
			method: "GET",
			headers: { Authorization: `Bearer ${at}` },
		});
		expect(res.status).toBe(401);
	});

	it("rejects valid JWT with mismatched fingerprint cookie", async () => {
		const { body: loginBody, cookies } = await setupLogin();
		const at = loginBody.data.accessToken;
		const tampered = { ...cookies, "__Host-fp": "tamperedfpvalue" };

		const res = await app.request("/api/users/me", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${at}`,
				Cookie: cookieHeader(tampered),
			},
		});
		expect(res.status).toBe(401);
	});
});
