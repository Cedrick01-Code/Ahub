import rw from "../locales/rw.json"
import en from "../locales/en.json"
import fr from "../locales/fr.json"

export type SupportedLanguage = "rw" | "en" | "fr"

const translations: Record<SupportedLanguage, Record<string, string>> = {
  rw,
  en,
  fr,
}

const isSupportedLanguage = (
  value: string | null,
): value is SupportedLanguage =>
  value === "rw" || value === "en" || value === "fr"

// Storage can be unavailable in private browsing or restricted preview contexts.
// Keep language selection in memory so that never prevents the app from starting.
const getStoredLanguage = (): SupportedLanguage => {
  try {
    const stored = window.localStorage.getItem("ahub_lang")
    return isSupportedLanguage(stored) ? stored : "rw"
  } catch {
    return "rw"
  }
}

let currentLang: SupportedLanguage = getStoredLanguage()

export const setLanguage = (lang: SupportedLanguage) => {
  currentLang = lang
  try {
    window.localStorage.setItem("ahub_lang", lang)
  } catch {
    // Language still changes for this session when storage is unavailable.
  }
  window.dispatchEvent(new Event("languagechange"))
}

export const getLanguage = (): SupportedLanguage => currentLang

export const t = (
  key: string,
  params?: Record<string, string | number>,
): string => {
  let text =
    translations[currentLang][key] ??
    translations.en[key] ??
    translations.rw[key] ??
    key

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v))
    })
  }

  return text
}
