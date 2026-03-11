import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCharacterConfig } from "./character-config.ts";

const templateCharacters = [
  {
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
      enabled: true,
      provider: "typecast",
      typecast: {
        voiceId: "voice-template",
        model: "ssfm-v30",
      },
      edge: {
        voice: "ko-KR-SunHiNeural",
      },
    },
    personaPrompt: "템플릿 프롬프트",
  },
  {
    id: "sana",
    displayName: "사나",
    agentId: "prettyclaw-sana",
    sessionKey: "prettyclaw-sana",
    avatar: "/characters/sana-avatar.png",
    sprite: "/characters/sana-sprite.png",
    background: "/backgrounds/sana-room.png",
    theme: {
      accent: "#d79a63",
      nameColor: "#f2c896",
    },
    personaPrompt: "사나 프롬프트",
  },
];

test("loadCharacterConfig loads ~/.config/prettyclaw/characters.json over the template", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-config-"));
  const configDir = join(root, ".config", "prettyclaw");
  const configFile = join(configDir, "characters.json");
  const templateFile = join(root, "characters.template.json");

  await writeFile(templateFile, JSON.stringify(templateCharacters, null, 2), "utf-8");
  await mkdir(configDir, { recursive: true });
  await writeFile(
    configFile,
    JSON.stringify(
      [
        {
          id: "yuki",
          displayName: "설정 유키",
          agentId: "prettyclaw-yuki",
          sessionKey: "prettyclaw-yuki",
          avatar: "/custom/yuki-avatar.svg",
          sprite: "/custom/yuki-sprite.png",
          background: "/custom/yuki-bg.svg",
          theme: {
            accent: "#ffffff",
            nameColor: "#000000",
          },
          tts: {
            enabled: false,
            provider: "edge",
            typecast: {
              voiceId: "voice-config",
              model: "ssfm-v21",
            },
            edge: {
              voice: "ko-KR-InJoonNeural",
              rate: "+10%",
            },
          },
          personaPrompt: "설정 프롬프트",
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  const result = await loadCharacterConfig({ configDir, configFile, templateFile });

  assert.equal(result.source, "config");
  assert.equal(result.characters[0]?.displayName, "설정 유키");
  assert.equal(result.characters[0]?.personaPrompt, "설정 프롬프트");
  assert.equal(result.characters[0]?.tts?.provider, "edge");
  assert.equal(result.characters[0]?.tts?.enabled, false);
  assert.equal(result.characters[0]?.tts?.typecast?.voiceId, "voice-config");
  assert.equal(result.characters[0]?.tts?.typecast?.model, "ssfm-v21");
  assert.equal(result.characters[0]?.tts?.edge?.voice, "ko-KR-InJoonNeural");
  assert.equal(result.characters[0]?.tts?.edge?.rate, "+10%");
  assert.equal(result.characters[1]?.id, "sana");
  assert.equal(result.characters[1]?.displayName, "사나");
});

test("loadCharacterConfig seeds ~/.config/prettyclaw/characters.json from the template when missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-template-"));
  const configDir = join(root, ".config", "prettyclaw");
  const configFile = join(configDir, "characters.json");
  const templateFile = join(root, "characters.template.json");

  await writeFile(templateFile, JSON.stringify(templateCharacters, null, 2), "utf-8");

  const result = await loadCharacterConfig({ configDir, configFile, templateFile });
  const seeded = JSON.parse(await readFile(configFile, "utf-8")) as Array<{ displayName: string }>;

  assert.equal(result.source, "template");
  assert.equal(result.characters[0]?.displayName, "유키");
  assert.equal(seeded[0]?.displayName, "유키");
});
