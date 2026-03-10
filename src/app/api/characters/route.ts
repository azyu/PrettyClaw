import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { CharacterConfig } from "@/types";
import { DEFAULT_CHARACTERS } from "@/lib/characters";

const CONFIG_DIR = join(homedir(), ".config", "prettyclaw");
const CONFIG_FILE = join(CONFIG_DIR, "characters.json");

function mergeCharacterConfig(character: CharacterConfig): CharacterConfig {
  const fallback = DEFAULT_CHARACTERS.find((item) => item.id === character.id);
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

export async function GET() {
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = await readFile(CONFIG_FILE, "utf-8");
      const characters = (JSON.parse(raw) as CharacterConfig[]).map(mergeCharacterConfig);
      return NextResponse.json({ characters, source: "config" });
    }
  } catch (e) {
    console.warn("Failed to read characters config:", e);
  }

  // Return defaults and create the config file for future editing
  try {
    if (!existsSync(CONFIG_DIR)) {
      await mkdir(CONFIG_DIR, { recursive: true });
    }
    await writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CHARACTERS, null, 2), "utf-8");
  } catch {
    // Non-critical
  }

  return NextResponse.json({ characters: DEFAULT_CHARACTERS, source: "default" });
}
