import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APP_LOCALE,
  DEFAULT_APP_TIME_ZONE,
  matchAppLocale,
  parseAcceptLanguage,
  resolveAppLocalePreference,
  resolveAppTimeZone,
} from "../i18n/config.ts";

test("matchAppLocale normalizes base locales from browser and env values", () => {
  assert.equal(matchAppLocale("ko-KR"), "ko");
  assert.equal(matchAppLocale("JA-jp"), "ja");
  assert.equal(matchAppLocale("en"), "en");
  assert.equal(matchAppLocale("fr-FR"), null);
});

test("parseAcceptLanguage preserves candidate order", () => {
  assert.deepEqual(
    parseAcceptLanguage("ja-JP,ko-KR;q=0.9,en-US;q=0.8"),
    ["ja-JP", "ko-KR", "en-US"],
  );
});

test("resolveAppLocalePreference falls back to english", () => {
  assert.equal(resolveAppLocalePreference("fr-FR", "ko-KR"), "ko");
  assert.equal(resolveAppLocalePreference("fr-FR"), DEFAULT_APP_LOCALE);
});

test("resolveAppTimeZone falls back to Asia/Seoul and accepts overrides", () => {
  assert.equal(resolveAppTimeZone(undefined), DEFAULT_APP_TIME_ZONE);
  assert.equal(resolveAppTimeZone(""), DEFAULT_APP_TIME_ZONE);
  assert.equal(resolveAppTimeZone("  Asia/Tokyo  "), "Asia/Tokyo");
});
