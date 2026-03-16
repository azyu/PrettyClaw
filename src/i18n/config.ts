import { APP_LOCALES, DEFAULT_APP_LOCALE, type AppLocale } from "../types/index.ts";

export { APP_LOCALES, DEFAULT_APP_LOCALE };
export type { AppLocale };

export const APP_LOCALE_COOKIE = "prettyclaw-locale";
export const APP_LOCALE_STORAGE_KEY = "prettyclaw-locale";
export const DEFAULT_APP_TIME_ZONE = "Asia/Seoul";
const APP_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAppLocale(value: string): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale);
}

export function matchAppLocale(value: string | null | undefined): AppLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (isAppLocale(normalized)) {
    return normalized;
  }

  const baseLocale = normalized.split("-")[0];
  return isAppLocale(baseLocale) ? baseLocale : null;
}

export function parseAcceptLanguage(headerValue: string | null | undefined): string[] {
  if (!headerValue) {
    return [];
  }

  return headerValue
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter((value): value is string => Boolean(value));
}

export function resolveAppLocalePreference(...candidates: Array<string | null | undefined>): AppLocale {
  for (const candidate of candidates) {
    const locale = matchAppLocale(candidate);
    if (locale) {
      return locale;
    }
  }

  return DEFAULT_APP_LOCALE;
}

export function resolveAppTimeZone(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : DEFAULT_APP_TIME_ZONE;
}

export function buildLocaleCookieValue(locale: AppLocale) {
  return `${APP_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${APP_LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}
