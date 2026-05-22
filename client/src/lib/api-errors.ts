import { isAxiosError } from "axios";
import i18n from "../i18n";

// Map from server-side ERROR_CODES (e.g. "DUPLICATE_RESOURCE") to a client
// i18n key. Use to override per-form what a specific code should display.
export type ErrorCodeOverrides = Record<string, string>;

// Translates an unknown error (axios / native / anything) into a user-facing
// string. Behavior:
//   1. Non-axios error or request never reached server → translate-by-default
//      ("apiErrors:network" / fallback)
//   2. Caller-provided override for the error code → use override key
//   3. Context-independent codes (RATE_LIMIT_EXCEEDED, 5xx) → built-in keys
//   4. Anything else (401 / 403 / 404 / 409 / 400) → caller's fallback key
//      (meaning depends on the form, especially 401 — anti-enumeration on
//      sign-in must stay generic)
export function formatApiError(
	err: unknown,
	fallbackKey: string,
	overrides?: ErrorCodeOverrides,
): string {
	if (!isAxiosError(err)) return i18n.t(fallbackKey);
	if (!err.response) return i18n.t("apiErrors:network");

	const status = err.response.status;
	const code: string | undefined = err.response.data?.error?.code;

	if (code && overrides) {
		const overrideKey = overrides[code];
		if (overrideKey) return i18n.t(overrideKey);
	}

	if (code === "RATE_LIMIT_EXCEEDED") return i18n.t("apiErrors:rateLimit");
	if (status >= 500) return i18n.t("apiErrors:server");

	return i18n.t(fallbackKey);
}
