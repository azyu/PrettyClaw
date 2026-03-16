import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_APP_LOCALE, DEFAULT_APP_TIME_ZONE } from "../i18n/config.ts";
import { loadAppConfig } from "./app-config.ts";

test("loadAppConfig falls back to the default time zone when config.json is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-app-config-missing-"));
  const configDir = join(root, ".config", "prettyclaw");
  const configFile = join(configDir, "config.json");

  const result = await loadAppConfig({ configFile });

  assert.deepEqual(result, {
    language: DEFAULT_APP_LOCALE,
    timeZone: DEFAULT_APP_TIME_ZONE,
    source: "default",
  });
});

test("loadAppConfig reads timeZone and language from ~/.config/prettyclaw/config.json", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-app-config-present-"));
  const configDir = join(root, ".config", "prettyclaw");
  const configFile = join(configDir, "config.json");

  await mkdir(configDir, { recursive: true });
  await writeFile(
    configFile,
    JSON.stringify(
      {
        language: "ja",
        timeZone: "America/Los_Angeles",
      },
      null,
      2,
    ),
    "utf-8",
  );

  const result = await loadAppConfig({ configFile });

  assert.deepEqual(result, {
    language: "ja",
    timeZone: "America/Los_Angeles",
    source: "config",
  });
});

test("loadAppConfig ignores blank config values and keeps defaults", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-app-config-blank-"));
  const configDir = join(root, ".config", "prettyclaw");
  const configFile = join(configDir, "config.json");

  await mkdir(configDir, { recursive: true });
  await writeFile(
    configFile,
    JSON.stringify(
      {
        language: "   ",
        timeZone: "   ",
      },
      null,
      2,
    ),
    "utf-8",
  );

  const result = await loadAppConfig({ configFile });

  assert.deepEqual(result, {
    language: DEFAULT_APP_LOCALE,
    timeZone: DEFAULT_APP_TIME_ZONE,
    source: "default",
  });
});
