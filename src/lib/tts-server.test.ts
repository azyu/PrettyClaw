import test from "node:test";
import assert from "node:assert/strict";
import type { CharacterConfig } from "../types";
import { synthesizeCharacterSpeech } from "./tts-server.ts";

const typecastCharacter: CharacterConfig = {
  id: "yuki",
  displayName: "유키",
  agentId: "prettyclaw-yuki",
  sessionKey: "prettyclaw-yuki",
  avatar: "/characters/yuki-avatar.png",
  sprite: "/characters/yuki-sprite.png",
  background: "/backgrounds/room-night.svg",
  theme: {
    accent: "#7aa2ff",
    nameColor: "#a8c8ff",
  },
  tts: {
    enabled: true,
    provider: "typecast",
    typecast: {
      voiceId: "voice-yuki",
      model: "ssfm-v21",
    },
  },
  personaPrompt: "유키 프롬프트",
};

const edgeCharacter: CharacterConfig = {
  ...typecastCharacter,
  id: "sana",
  displayName: "사나",
  agentId: "prettyclaw-sana",
  sessionKey: "prettyclaw-sana",
  tts: {
    enabled: true,
    provider: "edge",
    edge: {
      voice: "ko-KR-SunHiNeural",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    },
  },
};

test("synthesizeCharacterSpeech returns 503 when TYPECAST_API_KEY is missing", async () => {
  const result = await synthesizeCharacterSpeech(typecastCharacter, "안녕", {
    env: {},
  });

  assert.deepEqual(result, {
    ok: false,
    status: 503,
    error: "TYPECAST_API_KEY is not configured",
  });
});

test("synthesizeCharacterSpeech returns 400 when the selected provider config is missing", async () => {
  const result = await synthesizeCharacterSpeech(
    {
      ...edgeCharacter,
      tts: {
        enabled: true,
        provider: "edge",
      },
    },
    "안녕",
    {},
  );

  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: "TTS is not configured for this character",
  });
});

test("synthesizeCharacterSpeech forwards normalized text to edge synthesis", async () => {
  let receivedText = "";
  let receivedVoice = "";

  const result = await synthesizeCharacterSpeech(edgeCharacter, "## 인사\n`안녕`", {
    synthesizeEdgeTtsImpl: async (text, config) => {
      receivedText = text;
      receivedVoice = config.voice;
      return {
        buffer: new Uint8Array([1, 2, 3]).buffer,
        contentType: "audio/mpeg",
      };
    },
  });

  assert.equal(receivedText, "인사 안녕");
  assert.equal(receivedVoice, "ko-KR-SunHiNeural");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.contentType, "audio/mpeg");
    assert.equal(result.buffer.byteLength, 3);
  }
});

test("synthesizeCharacterSpeech forwards typecast payload and headers", async () => {
  let requestUrl = "";
  let requestHeaders: HeadersInit | undefined;
  let requestBody = "";

  const result = await synthesizeCharacterSpeech(typecastCharacter, "안녕 **유키**", {
    env: {
      TYPECAST_API_KEY: "secret-key",
      TYPECAST_MODEL: "ssfm-v30",
    },
    fetchImpl: async (input, init) => {
      requestUrl = String(input);
      requestHeaders = init?.headers;
      requestBody = String(init?.body);
      return new Response(new Uint8Array([4, 5, 6]), {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
        },
      });
    },
  });

  assert.equal(requestUrl, "https://api.typecast.ai/v1/text-to-speech");
  assert.deepEqual(requestHeaders, {
    "X-API-KEY": "secret-key",
    "Content-Type": "application/json",
  });
  assert.match(requestBody, /"voice_id":"voice-yuki"/);
  assert.match(requestBody, /"text":"안녕 유키"/);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.contentType, "audio/wav");
    assert.equal(result.buffer.byteLength, 3);
  }
});
