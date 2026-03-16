import test from "node:test";
import assert from "node:assert/strict";
import type { CharacterConfig } from "../types/index.ts";
import {
  canReplayTts,
  TYPECAST_TTS_ENDPOINT,
  buildTypecastHeaders,
  buildTypecastPayload,
  createTtsPlaybackRequest,
  normalizeTtsText,
  resolveActiveTtsConfig,
  setTtsMessageState,
} from "./tts.ts";

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
      rate: "+5%",
      pitch: "-2Hz",
      volume: "+0%",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    },
  },
};

test("normalizeTtsText strips markdown and collapses whitespace", () => {
  const result = normalizeTtsText("# 제목\n\n[링크](https://example.com) 와 `코드` 그리고 **강조**");

  assert.equal(result, "제목 링크 와 코드 그리고 강조");
});

test("normalizeTtsText removes source metadata lines and separators", () => {
  const result = normalizeTtsText(`
한국 뉴스

수출 증가 소식
3월 초 한국 수출이 크게 늘었다는 보도가 있었어.
출처: https://english.news.cn/

----

세계 뉴스
중동 긴장 심화
에너지 시장이 크게 흔들리고 있다는 보도가 많아.
출처: https://economictimes.indiatimes.com/
`);

  assert.equal(
    result,
    "한국 뉴스 수출 증가 소식 3월 초 한국 수출이 크게 늘었다는 보도가 있었어. 세계 뉴스 중동 긴장 심화 에너지 시장이 크게 흔들리고 있다는 보도가 많아.",
  );
});

test("normalizeTtsText drops trailing follow-up suggestions", () => {
  const result = normalizeTtsText(`
응, 오늘 기준으로 크게 보면 이런 흐름이야.

한국 뉴스
북한 미사일 관련 긴장
북한이 신형 구축함에서 전략 순항미사일을 시험 발사했다는 보도가 있었어.

원하면 내가 이어서
한국 뉴스만 더 자세히
IT/경제 뉴스만 따로
믿을 만한 매체 위주로 다시 압축
이렇게 정리해줄게.
`);

  assert.equal(
    result,
    "응, 오늘 기준으로 크게 보면 이런 흐름이야. 한국 뉴스 북한 미사일 관련 긴장 북한이 신형 구축함에서 전략 순항미사일을 시험 발사했다는 보도가 있었어.",
  );
});

test("normalizeTtsText adds short pauses between markdown list items", () => {
  const result = normalizeTtsText(`
- 같은 작품 캐릭터로 맞추기
- 분위기 비슷한 커플 캐릭터 해보기
- 너무 본격적인 것보다 살짝 일상복 느낌으로 녹인 코스프레도 괜찮을 거 같고
`);

  assert.equal(
    result,
    "같은 작품 캐릭터로 맞추기. 분위기 비슷한 커플 캐릭터 해보기. 너무 본격적인 것보다 살짝 일상복 느낌으로 녹인 코스프레도 괜찮을 거 같고.",
  );
});

test("createTtsPlaybackRequest returns null when autoplay is disabled", () => {
  const result = createTtsPlaybackRequest("req-1", typecastCharacter, "안녕", false, 1);

  assert.equal(result, null);
});

test("createTtsPlaybackRequest returns a playable request for enabled typecast characters", () => {
  const result = createTtsPlaybackRequest("req-2", typecastCharacter, "안녕 **유키**", true, 7);

  assert.deepEqual(result, {
    id: "req-2",
    characterId: "yuki",
    text: "안녕 유키",
    playbackToken: 7,
  });
});

test("createTtsPlaybackRequest returns a playable request for enabled edge characters", () => {
  const result = createTtsPlaybackRequest("req-edge", edgeCharacter, "안녕 **사나**", true, 9);

  assert.deepEqual(result, {
    id: "req-edge",
    characterId: "sana",
    text: "안녕 사나",
    playbackToken: 9,
  });
});

test("createTtsPlaybackRequest returns null when the selected provider config is missing", () => {
  const result = createTtsPlaybackRequest(
    "req-missing",
    {
      ...typecastCharacter,
      tts: {
        enabled: true,
        provider: "edge",
      },
    },
    "안녕",
    true,
    1,
  );

  assert.equal(result, null);
});

test("setTtsMessageState updates and clears message playback state immutably", () => {
  const initial = new Map<string, "loading" | "ready">([["msg-1", "loading"]]);
  const ready = setTtsMessageState(initial, "msg-1", "ready");
  const cleared = setTtsMessageState(ready, "msg-1", null);

  assert.equal(initial.get("msg-1"), "loading");
  assert.equal(ready.get("msg-1"), "ready");
  assert.equal(cleared.has("msg-1"), false);
});

test("buildTypecastPayload keeps the configured voice and normalized text", () => {
  const payload = buildTypecastPayload(typecastCharacter, "## 인사\n`안녕`", "ssfm-v30");

  assert.equal(payload.model, "ssfm-v30");
  assert.equal(payload.language, "kor");
  assert.equal(payload.voice_id, "voice-yuki");
  assert.equal(payload.text, "인사 안녕");
  assert.deepEqual(payload.output, { audio_format: "wav" });
});

test("buildTypecastPayload can use a character-specific model", () => {
  const payload = buildTypecastPayload(typecastCharacter, "안녕", typecastCharacter.tts?.typecast?.model);

  assert.equal(payload.model, "ssfm-v21");
});

test("resolveActiveTtsConfig returns the selected provider config", () => {
  const result = resolveActiveTtsConfig(edgeCharacter);

  assert.deepEqual(result, {
    provider: "edge",
    config: {
      voice: "ko-KR-SunHiNeural",
      rate: "+5%",
      pitch: "-2Hz",
      volume: "+0%",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    },
  });
});

test("canReplayTts returns true only for characters with an active TTS provider config", () => {
  assert.equal(canReplayTts(typecastCharacter), true);
  assert.equal(canReplayTts(edgeCharacter), true);
  assert.equal(
    canReplayTts({
      ...edgeCharacter,
      tts: {
        enabled: true,
        provider: "edge",
      },
    }),
    false,
  );
  assert.equal(canReplayTts(undefined), false);
});

test("typecast endpoint and headers match the official API host", () => {
  const headers = buildTypecastHeaders("secret-key");

  assert.equal(TYPECAST_TTS_ENDPOINT, "https://api.typecast.ai/v1/text-to-speech");
  assert.deepEqual(headers, {
    "X-API-KEY": "secret-key",
    "Content-Type": "application/json",
  });
});
