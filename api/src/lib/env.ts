import { z } from "zod";

// Application-wide env vars validated lazily on first env() call.
// MONGODB_URI is intentionally not here — it is consumed only inside db.ts.
const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().int().positive().default(3000),
	CORS_ORIGIN: z.string().url(),
	API_BASE: z.string().default("/api"),

	// HS256 HMAC key — minimum 32 chars (~256 bits when UTF-8 encoded).
	// Generate with: node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
	JWT_SECRET: z.string().min(32),
	JWT_ISSUER: z.string().default("launchmin"),
	JWT_AUDIENCE: z.string().default("launchmin-api"),

	// Access token TTL — short-lived per OWASP (15 min default).
	ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),
	// Refresh token TTL — long-lived for "remember me" (30 days default).
	REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(2592000),

	// HMAC key for CSRF token signing. Same length requirement as JWT_SECRET.
	CSRF_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function env(): Env {
	if (cached) return cached;
	const result = envSchema.safeParse(process.env);
	if (!result.success) {
		console.error("\n  ✗ Invalid environment configuration:");
		for (const issue of result.error.issues) {
			console.error(
				`    - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
			);
		}
		process.exit(1);
	}
	cached = result.data;
	return cached;
}
