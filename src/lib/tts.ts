import type { CharacterConfig, TtsPlaybackRequest } from "../types";

export const TYPECAST_MODEL = "ssfm-v30";
export const TYPECAST_AUDIO_FORMAT = "wav";
export const TYPECAST_LANGUAGE = "kor";
export const TYPECAST_MAX_TEXT_LENGTH = 2000;

export function stripMarkdownForTts(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTtsText(markdown: string): string {
  return stripMarkdownForTts(markdown).slice(0, TYPECAST_MAX_TEXT_LENGTH).trim();
}

export function createTtsPlaybackRequest(
  requestId: string,
  character: CharacterConfig | undefined,
  text: string,
  autoplayEnabled: boolean,
): TtsPlaybackRequest | null {
  if (!autoplayEnabled || !character?.tts?.enabled || character.tts.provider !== "typecast") {
    return null;
  }

  const normalizedText = normalizeTtsText(text);
  if (!normalizedText) {
    return null;
  }

  return {
    id: requestId,
    characterId: character.id,
    text: normalizedText,
  };
}

export function buildTypecastPayload(character: CharacterConfig, text: string, model: string = TYPECAST_MODEL) {
  return {
    model,
    language: TYPECAST_LANGUAGE,
    voice_id: character.tts?.voiceId,
    text: normalizeTtsText(text),
    output: {
      audio_format: TYPECAST_AUDIO_FORMAT,
    },
  };
}
