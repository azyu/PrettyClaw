import type { AppLocale } from "../types/index.ts";
import en from "./messages/en.json";
import ko from "./messages/ko.json";
import ja from "./messages/ja.json";

export const appMessages = {
  en,
  ko,
  ja,
} as const;

export type AppMessages = (typeof appMessages)["en"];

export function getAppMessages(locale: AppLocale): AppMessages {
  return appMessages[locale];
}
