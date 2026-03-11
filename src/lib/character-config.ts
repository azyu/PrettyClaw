import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { CharacterConfig } from "../types";

const CONFIG_DIR = join(homedir(), ".config", "prettyclaw");
const CONFIG_FILE = join(CONFIG_DIR, "characters.json");
const TEMPLATE_FILE = join(process.cwd(), "config", "characters.template.json");

interface LoadCharacterConfigOptions {
  configDir?: string;
  configFile?: string;
  templateFile?: string;
}

async function readCharacterConfigFile(filePath: string) {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as CharacterConfig[];
}

async function readCharacterTemplate(templateFile: string) {
  return readCharacterConfigFile(templateFile);
}

export async function loadCharacterConfig(options: LoadCharacterConfigOptions = {}) {
  const configFile = options.configFile ?? CONFIG_FILE;
  const templateFile = options.templateFile ?? TEMPLATE_FILE;
  const templateCharacters = await readCharacterTemplate(templateFile);

  try {
    if (existsSync(configFile)) {
      const configuredCharacters = await readCharacterConfigFile(configFile);
      return { characters: configuredCharacters, source: "config" as const };
    }
  } catch (e) {
    console.warn("Failed to read characters config:", e);
  }

  return { characters: templateCharacters, source: "template" as const };
}
