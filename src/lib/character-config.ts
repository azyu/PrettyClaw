import { readFile, writeFile, mkdir } from "fs/promises";
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

function mergeTtsConfig(character: CharacterConfig, fallback: CharacterConfig | undefined) {
  if (!character.tts) {
    return fallback?.tts;
  }

  return {
    ...fallback?.tts,
    ...character.tts,
    typecast: character.tts.typecast
      ? {
          ...fallback?.tts?.typecast,
          ...character.tts.typecast,
        }
      : fallback?.tts?.typecast,
    edge: character.tts.edge
      ? {
          ...fallback?.tts?.edge,
          ...character.tts.edge,
        }
      : fallback?.tts?.edge,
  };
}

export function mergeCharacterConfig(character: CharacterConfig, templateCharacters: CharacterConfig[]): CharacterConfig {
  const fallback = templateCharacters.find((item) => item.id === character.id);
  if (!fallback) {
    return character;
  }

  return {
    ...fallback,
    ...character,
    theme: {
      ...fallback.theme,
      ...character.theme,
    },
    tts: mergeTtsConfig(character, fallback),
    spriteMeta: character.spriteMeta
      ? {
          ...fallback.spriteMeta,
          ...character.spriteMeta,
          eyes: character.spriteMeta.eyes ?? fallback.spriteMeta?.eyes,
          mouth: character.spriteMeta.mouth ?? fallback.spriteMeta?.mouth,
        }
      : fallback.spriteMeta,
  };
}

async function readCharacterTemplate(templateFile: string) {
  return readCharacterConfigFile(templateFile);
}

export async function loadCharacterConfig(options: LoadCharacterConfigOptions = {}) {
  const configDir = options.configDir ?? CONFIG_DIR;
  const configFile = options.configFile ?? CONFIG_FILE;
  const templateFile = options.templateFile ?? TEMPLATE_FILE;
  const templateCharacters = await readCharacterTemplate(templateFile);

  try {
    if (existsSync(configFile)) {
      const configuredCharacters = await readCharacterConfigFile(configFile);
      const mergedCharacters = configuredCharacters.map((character) =>
        mergeCharacterConfig(character, templateCharacters),
      );
      const missingTemplateCharacters = templateCharacters.filter(
        (templateCharacter) => !configuredCharacters.some((character) => character.id === templateCharacter.id),
      );
      const characters = [...mergedCharacters, ...missingTemplateCharacters];
      return { characters, source: "config" as const };
    }
  } catch (e) {
    console.warn("Failed to read characters config:", e);
  }

  try {
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }
    await writeFile(configFile, JSON.stringify(templateCharacters, null, 2), "utf-8");
  } catch {
    // Non-critical
  }

  return { characters: templateCharacters, source: "template" as const };
}
