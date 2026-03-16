import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EdgeTtsConfig } from "../types/index.ts";

export const EDGE_TTS_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

function getEdgeAudioExtension(outputFormat: string) {
  if (outputFormat.includes("wav")) {
    return "wav";
  }

  if (outputFormat.includes("webm")) {
    return "webm";
  }

  return "mp3";
}

export function getEdgeAudioContentType(outputFormat: string) {
  if (outputFormat.includes("wav")) {
    return "audio/wav";
  }

  if (outputFormat.includes("webm")) {
    return "audio/webm";
  }

  return "audio/mpeg";
}

export async function synthesizeEdgeTts(text: string, config: EdgeTtsConfig) {
  const { EdgeTTS } = await import("node-edge-tts");
  const outputFormat = config.outputFormat || EDGE_TTS_OUTPUT_FORMAT;
  const tempDir = await mkdtemp(join(tmpdir(), "prettyclaw-edge-tts-"));
  const audioPath = join(tempDir, `speech.${getEdgeAudioExtension(outputFormat)}`);

  try {
    const tts = new EdgeTTS({
      voice: config.voice,
      rate: config.rate,
      pitch: config.pitch,
      volume: config.volume,
      outputFormat,
    });

    await tts.ttsPromise(text, audioPath);
    const buffer = await readFile(audioPath);

    return {
      buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      contentType: getEdgeAudioContentType(outputFormat),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
