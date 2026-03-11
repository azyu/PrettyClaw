import type { CharacterConfig, EdgeTtsConfig } from "../types";
import { synthesizeEdgeTts } from "./edge-tts.ts";
import {
  TYPECAST_AUDIO_FORMAT,
  TYPECAST_MODEL,
  TYPECAST_TTS_ENDPOINT,
  buildTypecastHeaders,
  buildTypecastPayload,
  normalizeTtsText,
  resolveActiveTtsConfig,
} from "./tts.ts";

export type TtsSynthesisResult =
  | { ok: true; buffer: ArrayBuffer; contentType: string }
  | { ok: false; status: number; error: string };

interface SynthesizeCharacterSpeechOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  synthesizeEdgeTtsImpl?: (text: string, config: EdgeTtsConfig) => Promise<{
    buffer: ArrayBuffer;
    contentType: string;
  }>;
}

export async function synthesizeCharacterSpeech(
  character: CharacterConfig | undefined,
  text: string,
  options: SynthesizeCharacterSpeechOptions = {},
): Promise<TtsSynthesisResult> {
  if (!character) {
    return {
      ok: false,
      status: 400,
      error: "TTS is not configured for this character",
    };
  }

  const activeTts = resolveActiveTtsConfig(character);
  if (!activeTts) {
    return {
      ok: false,
      status: 400,
      error: "TTS is not configured for this character",
    };
  }

  const normalizedText = normalizeTtsText(text);
  if (!normalizedText) {
    return {
      ok: false,
      status: 400,
      error: "Text is empty after normalization",
    };
  }

  if (activeTts.provider === "edge") {
    try {
      const synthesize = options.synthesizeEdgeTtsImpl ?? synthesizeEdgeTts;
      const result = await synthesize(normalizedText, activeTts.config);
      return {
        ok: true,
        buffer: result.buffer,
        contentType: result.contentType,
      };
    } catch (error) {
      console.warn("Edge TTS failed:", error);
      return {
        ok: false,
        status: 502,
        error: "Edge TTS request failed",
      };
    }
  }

  const env = options.env ?? process.env;
  const apiKey = env.TYPECAST_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: "TYPECAST_API_KEY is not configured",
    };
  }

  const model = activeTts.config.model || env.TYPECAST_MODEL || TYPECAST_MODEL;
  const payload = buildTypecastPayload(character, normalizedText, model);

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const upstream = await fetchImpl(TYPECAST_TTS_ENDPOINT, {
      method: "POST",
      headers: buildTypecastHeaders(apiKey),
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const errorBody = await upstream.text();
      console.warn("Typecast TTS failed:", upstream.status, errorBody.slice(0, 500));
      return {
        ok: false,
        status: upstream.status,
        error: "Typecast TTS request failed",
      };
    }

    return {
      ok: true,
      buffer: await upstream.arrayBuffer(),
      contentType: upstream.headers.get("content-type") || `audio/${TYPECAST_AUDIO_FORMAT}`,
    };
  } catch (error) {
    console.warn("Typecast TTS network failure:", error);
    return {
      ok: false,
      status: 502,
      error: "Typecast TTS request failed",
    };
  }
}
