import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CharacterConfig } from "../types/index.ts";
import {
  bootstrapAgents,
  buildUser,
  extractConfiguredAgentIds,
  loadAgentPromptFiles,
  syncCharacterAgent,
} from "./agent-bootstrap.ts";

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

test("loadAgentPromptFiles and buildUser resolve bootstrap sources", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-bootstrap-files-"));
  const agentDir = join(root, "agents", "yuki", "en");

  await mkdir(agentDir, { recursive: true });
  await writeFile(join(agentDir, "IDENTITY.md"), "Name: Yuki\n", "utf-8");
  await writeFile(join(agentDir, "SOUL.md"), "You are Yuki.\n", "utf-8");

  const result = await loadAgentPromptFiles(character, { configDir: root, locale: "en" });

  assert.equal(result.identity, "Name: Yuki\n");
  assert.equal(result.soul, "You are Yuki.\n");
  assert.equal(buildUser(character, "en"), "The user is talking with Yuki in PrettyClaw.\n");
});

test("syncCharacterAgent rewrites bootstrap files for existing agents", async () => {
  let writes = 0;
  let creates = 0;

  const result = await syncCharacterAgent(character, new Set([character.agentId]), {
    createAgent: async () => {
      creates += 1;
    },
    writeBootstrapFiles: async () => {
      writes += 1;
    },
    readConfiguredAgentIds: async () => new Set(),
  });

  assert.equal(result, "updated");
  assert.equal(writes, 1);
  assert.equal(creates, 0);
});

test("syncCharacterAgent treats an add race as an update and rewrites files", async () => {
  let writes = 0;

  const result = await syncCharacterAgent(character, new Set(), {
    createAgent: async () => {
      throw new Error("already exists");
    },
    writeBootstrapFiles: async () => {
      writes += 1;
    },
    readConfiguredAgentIds: async () => new Set([character.agentId]),
  });

  assert.equal(result, "updated");
  assert.equal(writes, 1);
});

test("bootstrapAgents returns a structured failure when configured agent lookup fails before the loop", async () => {
  let syncCalls = 0;

  const result = await bootstrapAgents({
    loadCharacters: async () => [character],
    readConfiguredAgentIds: async () => {
      throw new Error("spawn openclaw ENOENT");
    },
    syncCharacterAgent: async () => {
      syncCalls += 1;
      return "updated";
    },
  });

  assert.deepEqual(result, {
    ok: false,
    created: [],
    updated: [],
    error: "spawn openclaw ENOENT",
    missingBinary: true,
  });
  assert.equal(syncCalls, 0);
});

test("extractConfiguredAgentIds supports the current CLI array output shape", () => {
  const result = extractConfiguredAgentIds([
    { id: "main" },
    { id: "prettyclaw-yuki", name: "prettyclaw-yuki" },
    { name: "prettyclaw-sana" },
  ]);

  assert.deepEqual([...result], ["main", "prettyclaw-yuki", "prettyclaw-sana"]);
});
