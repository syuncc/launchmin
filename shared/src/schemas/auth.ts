import { z } from "zod";
import { accountField, passwordField, usernameField } from "./atoms.js";

// Input for user registration.
// Consumers: POST /api/users (server), sign-up form (client).
export const userRegisterInput = z.object({
	username: usernameField,
	password: passwordField,
});
export type UserRegisterInput = z.infer<typeof userRegisterInput>;

// Input for user login.
// Consumers: POST /api/auth/login (server), sign-in form (client).
// Password validation is permissive on purpose — OWASP anti-enumeration requires
// that login never reveals registration password rules.
export const userLoginInput = z.object({
	account: accountField,
	password: z.string().min(1).max(128),
});
export type UserLoginInput = z.infer<typeof userLoginInput>;
