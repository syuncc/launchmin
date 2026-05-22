import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enApiErrors from "./locales/en/apiErrors.json";
import enAuth from "./locales/en/auth.json";
import enZod from "./locales/en/zod.json";
import zhCNApiErrors from "./locales/zh-CN/apiErrors.json";
import zhCNAuth from "./locales/zh-CN/auth.json";
import zhCNZod from "./locales/zh-CN/zod.json";

export const SUPPORTED_LANGUAGES = ["en", "zh-CN"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
	en: { auth: enAuth, zod: enZod, apiErrors: enApiErrors },
	"zh-CN": {
		auth: zhCNAuth,
		zod: zhCNZod,
		apiErrors: zhCNApiErrors,
	},
};

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "en",
		supportedLngs: [...SUPPORTED_LANGUAGES],
		// load: "currentOnly" prevents i18next from also trying "zh" (the language
		// part of "zh-CN") when zh-CN is the detected code. We do not ship a "zh"
		// namespace, and with the default load: "all" + nonExplicitSupportedLngs,
		// some edge cases caused the detected zh-CN to silently downgrade to "en".
		load: "currentOnly",
		ns: ["auth", "zod", "apiErrors"],
		interpolation: { escapeValue: false },
		returnNull: false,
		detection: {
			order: [
				"querystring",
				"cookie",
				"localStorage",
				"sessionStorage",
				"navigator",
				"htmlTag",
			],
			caches: ["localStorage", "cookie"],
		},
	});

// Dev-only: expose the i18n instance on window for runtime inspection.
//   window.i18n.language
//   window.i18n.resolvedLanguage
//   window.i18n.options.supportedLngs
//   window.i18n.t("signIn.title", { ns: "auth" })
if (import.meta.env.DEV) {
	(globalThis as unknown as { i18n: typeof i18n }).i18n = i18n;
}

export default i18n;
