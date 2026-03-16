"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { getAppMessages } from "@/i18n/catalog";
import {
  APP_LOCALE_STORAGE_KEY,
  buildLocaleCookieValue,
  DEFAULT_APP_LOCALE,
  matchAppLocale,
  resolveAppTimeZone,
  type AppLocale,
} from "@/i18n/config";

interface AppLocaleContextValue {
  locale: AppLocale;
  isChangingLocale: boolean;
  setLocale: (locale: AppLocale) => void;
}

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

function persistLocale(locale: AppLocale) {
  try {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  } catch {}

  document.cookie = buildLocaleCookieValue(locale);
}

function updateDocumentMetadata(locale: AppLocale) {
  if (typeof document === "undefined") {
    return;
  }

  const messages = getAppMessages(locale);
  document.documentElement.lang = locale;
  document.title = String(messages.metadata?.title ?? "PrettyClaw");

  const description = document.querySelector('meta[name="description"]');
  if (description instanceof HTMLMetaElement) {
    description.content = String(messages.metadata?.description ?? "");
  }
}

export function AppIntlProvider({
  children,
  initialLocale,
  initialMessages,
}: {
  children: ReactNode;
  initialLocale: AppLocale;
  initialMessages?: AbstractIntlMessages;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);
  const messages = locale === initialLocale && initialMessages ? initialMessages : getAppMessages(locale);
  const timeZone = resolveAppTimeZone(process.env.NEXT_PUBLIC_APP_TIME_ZONE);

  useEffect(() => {
    try {
      const saved = matchAppLocale(localStorage.getItem(APP_LOCALE_STORAGE_KEY));
      if (saved && saved !== locale) {
        setLocaleState(saved);
        persistLocale(saved);
        return;
      }
    } catch {}

    persistLocale(locale);
  }, []);

  useEffect(() => {
    updateDocumentMetadata(locale);
    persistLocale(locale);
  }, [locale]);

  return (
    <AppLocaleContext.Provider
      value={{
        locale,
        isChangingLocale: false,
        setLocale: (nextLocale) => {
          setLocaleState(nextLocale);
        },
      }}
    >
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
        {children}
      </NextIntlClientProvider>
    </AppLocaleContext.Provider>
  );
}

export function useAppLocale() {
  const context = useContext(AppLocaleContext);
  if (!context) {
    throw new Error("useAppLocale must be used within AppIntlProvider");
  }
  return context;
}

export function useCurrentAppLocale() {
  return useAppLocale().locale;
}

export function useSetAppLocale() {
  return useAppLocale().setLocale;
}

export function useOptionalAppLocale() {
  return useContext(AppLocaleContext) ?? {
    locale: DEFAULT_APP_LOCALE,
    isChangingLocale: false,
    setLocale: () => {},
  };
}
