import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAuth from "./locales/en/auth.json";
import enZod from "./locales/en/zod.json";
import zhCNAuth from "./locales/zh-CN/auth.json";
import zhCNZod from "./locales/zh-CN/zod.json";

export const SUPPORTED_LANGUAGES = ["en", "zh-CN"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
	en: { auth: enAuth, zod: enZod },
	"zh-CN": { auth: zhCNAuth, zod: zhCNZod },
};

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "en",
		supportedLngs: SUPPORTED_LANGUAGES,
		nonExplicitSupportedLngs: true,
		ns: ["auth", "zod"],
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

export default i18n;
