import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DEFAULT_APP_LOCALE, resolveAppLocalePreference, DEFAULT_APP_TIME_ZONE, resolveAppTimeZone } from "../i18n/config.ts";
import type { AppLocale } from "../types/index.ts";

const CONFIG_DIR = join(homedir(), ".config", "prettyclaw");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface LoadAppConfigOptions {
  configFile?: string;
}

export interface StoredAppConfig {
  language?: string;
  timeZone?: string;
}

export async function loadAppConfig(options: LoadAppConfigOptions = {}) {
  const configFile = options.configFile ?? CONFIG_FILE;

  try {
    if (existsSync(configFile)) {
      const raw = await readFile(configFile, "utf-8");
      const parsed = JSON.parse(raw) as StoredAppConfig | null;
      const language = resolveAppLocalePreference(parsed?.language);
      const timeZone = resolveAppTimeZone(parsed?.timeZone);

      if (
        language !== DEFAULT_APP_LOCALE ||
        timeZone !== DEFAULT_APP_TIME_ZONE ||
        parsed?.language?.trim() ||
        parsed?.timeZone?.trim()
      ) {
        return {
          language,
          timeZone,
          source: "config" as const,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to read PrettyClaw app config:", error);
  }

  return {
    language: DEFAULT_APP_LOCALE,
    timeZone: DEFAULT_APP_TIME_ZONE,
    source: "default" as const,
  };
}

interface WriteAppConfigOptions {
  configDir?: string;
  configFile?: string;
}

export async function writeAppConfig(
  values: {
    language: AppLocale;
    timeZone?: string;
  },
  options: WriteAppConfigOptions = {},
) {
  const configFile = options.configFile ?? CONFIG_FILE;
  const configDir = options.configDir ?? dirname(configFile);
  const current = await loadAppConfig({ configFile });

  await mkdir(configDir, { recursive: true });
  await writeFile(
    configFile,
    JSON.stringify(
      {
        language: values.language,
        timeZone: values.timeZone ?? current.timeZone,
      },
      null,
      2,
    ),
    "utf-8",
  );
}
