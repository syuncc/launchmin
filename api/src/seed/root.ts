// Development convenience: ensures a "root" user exists at every api startup
// so the team doesn't have to register one to sign in locally.
//
// The password "root" deliberately bypasses the application's HTTP-layer Zod
// policy (passwordField min 15) — the bypass works because we call the
// repository directly, not the registration endpoint. The min-15 policy
// still applies to all real registrations going through POST /api/users.
//
// DELETE this file + remove the import and call in server.ts when no longer
// needed (e.g. once you have real users or a proper invite flow).

import { hashPassword } from "../lib/password.js";
import * as repo from "../users/users.repository.js";

const ROOT_USERNAME = "root";
const ROOT_PASSWORD = "root";

export async function ensureRootUser(): Promise<void> {
	const existing = await repo.findByUsername(ROOT_USERNAME);
	if (existing) return;

	const now = new Date();
	try {
		await repo.insert({
			username: ROOT_USERNAME,
			passwordHash: await hashPassword(ROOT_PASSWORD),
			role: "admin",
			failedLoginCount: 0,
			lockedUntil: null,
			lastFailedLoginAt: null,
			createdAt: now,
			updatedAt: now,
		});
		console.log(`  ✓ Seeded root user (username: ${ROOT_USERNAME})`);
	} catch (err) {
		// Race with another startup that inserted first → unique index conflict.
		if ((err as { code?: number }).code === 11000) return;
		throw err;
	}
}
