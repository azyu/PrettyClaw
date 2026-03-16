import { cookies, headers } from "next/headers";
import type { AppLocale } from "../types/index.ts";
import { loadAppConfig } from "../lib/app-config.ts";
import { APP_LOCALE_COOKIE, DEFAULT_APP_LOCALE, matchAppLocale, parseAcceptLanguage } from "./config";
import { getAppMessages } from "./catalog";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const saved = matchAppLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  if (saved) {
    return saved;
  }

  const headerStore = await headers();
  for (const candidate of parseAcceptLanguage(headerStore.get("accept-language"))) {
    const locale = matchAppLocale(candidate);
    if (locale) {
      return locale;
    }
  }

  return DEFAULT_APP_LOCALE;
}

export async function getRequestMessages() {
  return getAppMessages(await getRequestLocale());
}

export async function getRequestLocaleData() {
  const locale = await getRequestLocale();
  const appConfig = await loadAppConfig();

  return {
    locale,
    messages: getAppMessages(locale),
    timeZone: appConfig.timeZone,
  };
}
