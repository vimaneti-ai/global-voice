import { NATIVE_LANG } from "./config";

export interface Language {
  code: string;
  name: string;
  flag: string;
}

/** Listener's choice for "no translation, hear everyone natively." */
export const NATIVE_OPTION: Language = {
  code: NATIVE_LANG,
  name: "None — Native",
  flag: "👂",
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", flag: "🇮🇳" },
];

/** Options shown in the pre-flight language picker. */
export const PICKER_LANGUAGES: Language[] = SUPPORTED_LANGUAGES;

export function getLanguageByCode(code: string): Language | undefined {
  if (code === NATIVE_OPTION.code) return NATIVE_OPTION;
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}
