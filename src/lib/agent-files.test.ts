import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CharacterConfig } from "../types/index.ts";
import { loadAgentPromptFiles } from "./agent-bootstrap.ts";

const character: CharacterConfig = {
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
};

test("loadAgentPromptFiles reads SOUL.md and IDENTITY.md from locale-specific config_dir agents/<id>/<locale>", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-agent-files-"));
  const agentDir = join(root, "agents", "yuki", "ko");

  await mkdir(agentDir, { recursive: true });
  await writeFile(join(agentDir, "SOUL.md"), "SOUL from ko config\n", "utf-8");
  await writeFile(join(agentDir, "IDENTITY.md"), "IDENTITY from ko config\n", "utf-8");

  const result = await loadAgentPromptFiles(character, {
    configDir: root,
    locale: "ko",
  });

  assert.deepEqual(result, {
    soul: "SOUL from ko config\n",
    identity: "IDENTITY from ko config\n",
  });
});

test("loadAgentPromptFiles falls back to non-localized config_dir agents/<id>", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-agent-files-fallback-"));
  const agentDir = join(root, "agents", "yuki");

  await mkdir(agentDir, { recursive: true });
  await writeFile(join(agentDir, "SOUL.md"), "SOUL from fallback config\n", "utf-8");
  await writeFile(join(agentDir, "IDENTITY.md"), "IDENTITY from fallback config\n", "utf-8");

  const result = await loadAgentPromptFiles(character, {
    configDir: root,
    locale: "ja",
  });

  assert.deepEqual(result, {
    soul: "SOUL from fallback config\n",
    identity: "IDENTITY from fallback config\n",
  });
});

test("loadAgentPromptFiles fails with the missing absolute path", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-agent-files-missing-"));
  const agentDir = join(root, "agents", "yuki", "ja");

  await mkdir(agentDir, { recursive: true });
  await writeFile(join(agentDir, "SOUL.md"), "SOUL from config\n", "utf-8");

  await assert.rejects(
    () =>
      loadAgentPromptFiles(character, {
        configDir: root,
        locale: "ja",
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === `Missing PrettyClaw agent prompt file: ${join(root, "agents", "yuki", "IDENTITY.md")}`,
  );
});

test("repository includes Sana prompt templates for every locale", async () => {
  for (const locale of ["en", "ko", "ja"] as const) {
    const identityPath = join(process.cwd(), "config", "agents", locale, "sana", "IDENTITY.md");
    const soulPath = join(process.cwd(), "config", "agents", locale, "sana", "SOUL.md");
    const [identity, soul] = await Promise.all([readFile(identityPath, "utf-8"), readFile(soulPath, "utf-8")]);

    assert.match(identity, /Sana|사나|紗奈/);
    assert.match(soul, /Sana|사나|紗奈/);
  }
});
