import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { env } from "./env.js";

// __Host- prefix forces Secure + Path=/ + no Domain (browser-enforced).
// Works on localhost over HTTP because browsers treat localhost as secure context.

export const COOKIE_RT = "__Host-rt";
export const COOKIE_FP = "__Host-fp";
export const COOKIE_CSRF = "__Host-csrf";

// Refresh token cookie — long-lived, JS-inaccessible.
export function setRefreshTokenCookie(c: Context, value: string): void {
	setCookie(c, COOKIE_RT, value, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		path: "/",
		maxAge: env().REFRESH_TOKEN_TTL,
	});
}

// Fingerprint cookie — TTL matches access token per OWASP JWT CS.
export function setFingerprintCookie(c: Context, value: string): void {
	setCookie(c, COOKIE_FP, value, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		path: "/",
		maxAge: env().ACCESS_TOKEN_TTL,
	});
}

// CSRF cookie — readable by client JS (sends back via X-CSRF-Token header).
// HttpOnly intentionally false; SameSite=Lax limits exposure.
export function setCsrfCookie(c: Context, value: string): void {
	setCookie(c, COOKIE_CSRF, value, {
		httpOnly: false,
		secure: true,
		sameSite: "Strict",
		path: "/",
		maxAge: env().REFRESH_TOKEN_TTL,
	});
}

export function clearAuthCookies(c: Context): void {
	deleteCookie(c, COOKIE_RT, { path: "/", secure: true });
	deleteCookie(c, COOKIE_FP, { path: "/", secure: true });
	deleteCookie(c, COOKIE_CSRF, { path: "/", secure: true });
}
