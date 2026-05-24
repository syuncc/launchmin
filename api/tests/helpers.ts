import { ObjectId } from "mongodb";
import app from "../src/app.js";
import { getDb } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/password.js";
import type { UserRole } from "../src/users/users.model.js";

const jsonHeaders = { "Content-Type": "application/json" };

export interface SeededUser {
	username: string;
	password: string;
}

export interface LoginResult {
	accessToken: string;
	cookies: Record<string, string>;
}

// Bypass the (admin-gated) HTTP route by writing the user directly.
// Use this to bootstrap test fixtures, NOT to test registration itself.
export async function seedUserDirectly(args: {
	username: string;
	password: string;
	role?: UserRole;
}): Promise<SeededUser> {
	const role: UserRole = args.role ?? "user";
	const username = args.username.trim().toLowerCase();
	const now = new Date();
	await getDb()
		.collection("users")
		.insertOne({
			_id: new ObjectId(),
			username,
			passwordHash: await hashPassword(args.password),
			role,
			failedLoginCount: 0,
			lockedUntil: null,
			lastFailedLoginAt: null,
			createdAt: now,
			updatedAt: now,
		});
	return { username, password: args.password };
}

export async function seedAdmin(
	username = "test-admin",
	password = "adminpasswordlong",
): Promise<SeededUser> {
	return seedUserDirectly({ username, password, role: "admin" });
}

export async function login(
	account: string,
	password: string,
): Promise<LoginResult> {
	const res = await app.request("/api/auth/login", {
		method: "POST",
		headers: jsonHeaders,
		body: JSON.stringify({ account, password }),
	});
	if (res.status !== 200) {
		throw new Error(`login failed: ${res.status}`);
	}
	const body = await res.json();
	return {
		accessToken: body.data.accessToken,
		cookies: extractCookies(res),
	};
}

export function extractCookies(res: Response): Record<string, string> {
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

export function cookieHeader(cookies: Record<string, string>): string {
	return Object.entries(cookies)
		.map(([k, v]) => `${k}=${v}`)
		.join("; ");
}
