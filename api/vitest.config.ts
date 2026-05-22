import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		setupFiles: ["./tests/setup.ts"],
		include: ["tests/**/*.test.ts"],
		// MongoMemoryServer cold-start needs headroom on first run (binary download).
		hookTimeout: 60000,
		testTimeout: 15000,
		// Single fork — share one MongoMemoryServer instance across files.
		pool: "forks",
		poolOptions: { forks: { singleFork: true } },
		env: {
			// env() parses on first call (at app import time); these must be set before.
			NODE_ENV: "test",
			CORS_ORIGIN: "http://localhost:5173",
			JWT_SECRET: "test_jwt_secret_minimum_32_chars_for_zod_validation",
			JWT_ISSUER: "launchmin-test",
			JWT_AUDIENCE: "launchmin-test-api",
			CSRF_SECRET: "test_csrf_secret_minimum_32_chars_for_zod_validation",
			ACCESS_TOKEN_TTL: "900",
			REFRESH_TOKEN_TTL: "2592000",
		},
	},
});
