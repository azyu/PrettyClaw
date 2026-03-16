import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type { AppLocale, CharacterConfig } from "../types/index.ts";
import { loadAppConfig } from "./app-config.ts";

const CONFIG_DIR = join(homedir(), ".config", "prettyclaw");
const CONFIG_FILE = join(CONFIG_DIR, "characters.json");
const TEMPLATE_FILE = join(process.cwd(), "config", "characters.template.json");

interface LoadCharacterConfigOptions {
  configDir?: string;
  configFile?: string;
  templateFile?: string;
  appConfigFile?: string;
  locale?: AppLocale;
}

async function readCharacterConfigFile(filePath: string) {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as CharacterConfig[];
}

async function readCharacterTemplate(templateFile: string) {
  return readCharacterConfigFile(templateFile);
}

function buildLocaleConfigFilePath(configDir: string, locale: AppLocale) {
  return join(configDir, `characters.${locale}.json`);
}

function buildLocaleTemplateFilePath(templateFile: string, locale: AppLocale) {
  return templateFile.replace(/characters(?:\.[^.]+)?\.template\.json$/, `characters.${locale}.template.json`);
}

export async function loadCharacterConfig(options: LoadCharacterConfigOptions = {}) {
  const configDir = options.configDir ?? CONFIG_DIR;
  const configFile = options.configFile ?? CONFIG_FILE;
  const appConfig = await loadAppConfig({ configFile: options.appConfigFile });
  const locale = options.locale ?? appConfig.language;
  const templateFile = options.templateFile ?? buildLocaleTemplateFilePath(TEMPLATE_FILE, locale);
  const templateCharacters = await readCharacterTemplate(templateFile);
  const localeConfigFile = buildLocaleConfigFilePath(configDir, locale);

  try {
    if (existsSync(localeConfigFile)) {
      const configuredCharacters = await readCharacterConfigFile(localeConfigFile);
      return { characters: configuredCharacters, locale, source: "config" as const };
    }

    if (existsSync(configFile)) {
      const configuredCharacters = await readCharacterConfigFile(configFile);
      return { characters: configuredCharacters, locale, source: "config" as const };
    }
  } catch (error) {
    console.warn("Failed to read characters config:", error);
  }

  return { characters: templateCharacters, locale, source: "template" as const };
}
