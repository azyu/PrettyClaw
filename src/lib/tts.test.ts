import test from "node:test";
import assert from "node:assert/strict";
import type { CharacterConfig } from "../types";
import { buildTypecastPayload, createTtsPlaybackRequest, normalizeTtsText } from "./tts.ts";

const character: CharacterConfig = {
  id: "yuki",
  displayName: "유키",
  agentId: "prettyclaw-yuki",
  sessionKey: "prettyclaw-yuki",
  avatar: "/characters/yuki-avatar.svg",
  sprite: "/characters/yuki-sprite.png",
  background: "/backgrounds/room-night.svg",
  theme: {
    accent: "#7aa2ff",
    nameColor: "#a8c8ff",
  },
  tts: {
    provider: "typecast",
    enabled: true,
    voiceId: "voice-yuki",
  },
  personaPrompt: "유키 프롬프트",
};

test("normalizeTtsText strips markdown and collapses whitespace", () => {
  const result = normalizeTtsText("# 제목\n\n[링크](https://example.com) 와 `코드` 그리고 **강조**");

  assert.equal(result, "제목 링크 와 코드 그리고 강조");
});

test("createTtsPlaybackRequest returns null when autoplay is disabled", () => {
  const result = createTtsPlaybackRequest("req-1", character, "안녕", false);

  assert.equal(result, null);
});

test("createTtsPlaybackRequest returns a playable request for enabled typecast characters", () => {
  const result = createTtsPlaybackRequest("req-2", character, "안녕 **유키**", true);

  assert.deepEqual(result, {
    id: "req-2",
    characterId: "yuki",
    text: "안녕 유키",
  });
});

test("buildTypecastPayload keeps the configured voice and normalized text", () => {
  const payload = buildTypecastPayload(character, "## 인사\n`안녕`", "ssfm-v30");

  assert.equal(payload.model, "ssfm-v30");
  assert.equal(payload.language, "kor");
  assert.equal(payload.voice_id, "voice-yuki");
  assert.equal(payload.text, "인사 안녕");
  assert.deepEqual(payload.output, { audio_format: "wav" });
});
