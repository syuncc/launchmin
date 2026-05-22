import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAuth from "./locales/en/auth.json";
import zhCNAuth from "./locales/zh-CN/auth.json";

export const SUPPORTED_LANGUAGES = ["en", "zh-CN"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
	en: { auth: enAuth },
	"zh-CN": { auth: zhCNAuth },
};

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "en",
		supportedLngs: SUPPORTED_LANGUAGES,
		nonExplicitSupportedLngs: true,
		ns: ["auth"],
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
