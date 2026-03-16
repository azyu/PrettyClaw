import type { AppLocale, CharacterConfig, LocalizedCharacterConfig } from "../types/index.ts";

export function resolveCharacterConfig(character: LocalizedCharacterConfig, _locale: AppLocale): CharacterConfig {
  return character;
}

export function resolveCharacterConfigs(characters: LocalizedCharacterConfig[], _locale: AppLocale): CharacterConfig[] {
  return characters;
}
