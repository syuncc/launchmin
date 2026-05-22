import type { z } from "zod";
import i18n from "../i18n";

// Maps Zod issue codes to i18n keys in the "zod" namespace.
// Falls back to Zod's default English message when no translation is wired up.
// Installed globally via z.setErrorMap() — all client-side Zod parses use it.
export const zodErrorMap: z.ZodErrorMap = (issue, ctx) => {
	switch (issue.code) {
		case "too_small":
			if (issue.type === "string") {
				// `count` triggers i18next's plural lookup (tooSmall_one / tooSmall_other).
				return {
					message: i18n.t("zod:string.tooSmall", {
						count: Number(issue.minimum),
					}),
				};
			}
			break;
		case "too_big":
			if (issue.type === "string") {
				return {
					message: i18n.t("zod:string.tooBig", {
						count: Number(issue.maximum),
					}),
				};
			}
			break;
		case "invalid_string":
			if (issue.validation === "email") {
				return { message: i18n.t("zod:string.invalidEmail") };
			}
			if (issue.validation === "regex") {
				return { message: i18n.t("zod:string.invalidFormat") };
			}
			break;
		case "invalid_type":
			if (issue.received === "undefined") {
				return { message: i18n.t("zod:required") };
			}
			break;
	}
	return { message: ctx.defaultError };
};
