import type {
  CharacterConfig,
  EdgeTtsConfig,
  TtsMessageState,
  TtsPlaybackRequest,
  TypecastTtsConfig,
} from "../types";

export const TYPECAST_MODEL = "ssfm-v30";
export const TYPECAST_AUDIO_FORMAT = "wav";
export const TYPECAST_LANGUAGE = "kor";
export const TYPECAST_MAX_TEXT_LENGTH = 2000;
export const TYPECAST_TTS_ENDPOINT = "https://api.typecast.ai/v1/text-to-speech";

export type ActiveTtsConfig =
  | { provider: "typecast"; config: TypecastTtsConfig }
  | { provider: "edge"; config: EdgeTtsConfig };

const TTS_EXCLUDED_LINE_PATTERNS = [
  /^출처:\s*https?:\/\/\S+\s*$/i,
  /^https?:\/\/\S+\s*$/i,
  /^[-=_]{3,}\s*$/u,
];

function stripExcludedTtsLines(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^원하면 내가 이어서(?:\s|$)/u.test(line)) {
      break;
    }

    if (TTS_EXCLUDED_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
      continue;
    }

    kept.push(rawLine);
  }

  return kept.join("\n");
}

function addListItemPauses(text: string): string {
  return text
    .split(/\r?\n/)
    .map((rawLine) => {
      const trimmed = rawLine.trim();
      const match = trimmed.match(/^([-*+]|\d+\.)\s+(.+)$/u);
      if (!match) {
        return rawLine;
      }

      const content = match[2].trim();
      if (/[.!?…。！？]$/u.test(content)) {
        return content;
      }

      return `${content}.`;
    })
    .join("\n");
}

export function stripMarkdownForTts(markdown: string): string {
  return addListItemPauses(stripExcludedTtsLines(markdown))
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
  playbackToken: number = 0,
): TtsPlaybackRequest | null {
  if (!autoplayEnabled || !character?.tts?.enabled || !resolveActiveTtsConfig(character)) {
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
    playbackToken,
  };
}

export function setTtsMessageState(
  states: Map<string, TtsMessageState>,
  messageId: string,
  state: TtsMessageState | null,
): Map<string, TtsMessageState> {
  const next = new Map(states);
  if (state) {
    next.set(messageId, state);
  } else {
    next.delete(messageId);
  }
  return next;
}

export function resolveActiveTtsConfig(character: CharacterConfig | undefined): ActiveTtsConfig | null {
  const tts = character?.tts;
  if (!tts?.enabled) {
    return null;
  }

  if (tts.provider === "typecast" && tts.typecast?.voiceId) {
    return {
      provider: "typecast",
      config: tts.typecast,
    };
  }

  if (tts.provider === "edge" && tts.edge?.voice) {
    return {
      provider: "edge",
      config: tts.edge,
    };
  }

  return null;
}

export function canReplayTts(character: CharacterConfig | undefined): boolean {
  return resolveActiveTtsConfig(character) !== null;
}

export function buildTypecastPayload(character: CharacterConfig, text: string, model: string = TYPECAST_MODEL) {
  return {
    model,
    language: TYPECAST_LANGUAGE,
    voice_id: character.tts?.typecast?.voiceId,
    text: normalizeTtsText(text),
    output: {
      audio_format: TYPECAST_AUDIO_FORMAT,
    },
  };
}

export function buildTypecastHeaders(apiKey: string) {
  return {
    "X-API-KEY": apiKey,
    "Content-Type": "application/json",
  };
}
