import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CharacterConfig } from "../types/index.ts";
import { loadCharacterConfig } from "./character-config.ts";

const englishTemplateCharacters: CharacterConfig[] = [
  {
    id: "yuki",
    displayName: "Yuki",
    agentId: "prettyclaw-yuki",
    sessionKey: "prettyclaw-yuki",
    avatar: "/characters/yuki-avatar.png",
    sprite: "/characters/yuki-sprite.png",
    background: "/backgrounds/room-night.svg",
    theme: {
      accent: "#7aa2ff",
      nameColor: "#a8c8ff",
    },
    description: "Template description",
    tts: {
      enabled: true,
      provider: "typecast",
      typecast: {
        voiceId: "voice-template-en",
        model: "ssfm-v30",
      },
    },
  },
];

const koreanCharacters: CharacterConfig[] = [
  {
    id: "yuki",
    displayName: "유키",
    agentId: "prettyclaw-yuki",
    sessionKey: "prettyclaw-yuki",
    avatar: "/custom/yuki-avatar.svg",
    sprite: "/custom/yuki-sprite.png",
    background: "/custom/yuki-bg.svg",
    theme: {
      accent: "#ffffff",
      nameColor: "#000000",
    },
    description: "설정 설명",
    tts: {
      enabled: false,
      provider: "edge",
      edge: {
        voice: "ko-KR-InJoonNeural",
        rate: "+10%",
      },
    },
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
  },
];

test("loadCharacterConfig reads characters.<locale>.json when a locale override is provided", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-config-locale-"));
  const configDir = join(root, ".config", "prettyclaw");
  const configFile = join(configDir, "characters.json");
  const localeConfigFile = join(configDir, "characters.ko.json");
  const templateFile = join(root, "characters.en.template.json");

  await writeFile(templateFile, JSON.stringify(englishTemplateCharacters, null, 2), "utf-8");
  await mkdir(configDir, { recursive: true });
  await writeFile(configFile, JSON.stringify(englishTemplateCharacters, null, 2), "utf-8");
  await writeFile(localeConfigFile, JSON.stringify(koreanCharacters, null, 2), "utf-8");

  const result = await loadCharacterConfig({ configDir, configFile, templateFile, locale: "ko" });

  assert.equal(result.source, "config");
  assert.equal(result.locale, "ko");
  assert.equal(result.characters.length, 2);
  assert.equal(result.characters[0]?.displayName, "유키");
  assert.equal(result.characters[0]?.tts?.provider, "edge");
  assert.equal(result.characters[1]?.displayName, "사나");
});

test("loadCharacterConfig falls back to characters.json when characters.<locale>.json is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-config-fallback-"));
  const configDir = join(root, ".config", "prettyclaw");
  const configFile = join(configDir, "characters.json");
  const templateFile = join(root, "characters.en.template.json");

  await writeFile(templateFile, JSON.stringify(englishTemplateCharacters, null, 2), "utf-8");
  await mkdir(configDir, { recursive: true });
  await writeFile(configFile, JSON.stringify(englishTemplateCharacters, null, 2), "utf-8");

  const result = await loadCharacterConfig({ configDir, configFile, templateFile, locale: "ja" });

  assert.equal(result.source, "config");
  assert.equal(result.locale, "ja");
  assert.equal(result.characters.length, 1);
  assert.equal(result.characters[0]?.displayName, "Yuki");
});

test("loadCharacterConfig returns repository locale defaults without seeding local config files", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-template-"));
  const configDir = join(root, ".config", "prettyclaw");
  const configFile = join(configDir, "characters.json");
  const templateFile = join(root, "characters.ja.template.json");

  await writeFile(
    templateFile,
    JSON.stringify(
      [
        {
          ...englishTemplateCharacters[0],
          displayName: "ユキ",
          description: "テンプレート説明",
          tts: {
            enabled: true,
            provider: "edge",
            edge: {
              voice: "ja-JP-NanamiNeural",
            },
          },
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  const result = await loadCharacterConfig({ configDir, configFile, templateFile, locale: "ja" });

  assert.equal(result.source, "template");
  assert.equal(result.locale, "ja");
  assert.equal(result.characters.length, 1);
  assert.equal(result.characters[0]?.displayName, "ユキ");
  assert.equal(existsSync(configFile), false);
});
