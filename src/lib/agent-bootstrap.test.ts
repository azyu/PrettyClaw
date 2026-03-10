import test from "node:test";
import assert from "node:assert/strict";
import type { CharacterConfig } from "../types";
import { syncCharacterAgent } from "./agent-bootstrap.ts";

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
  personaPrompt: "유키 프롬프트",
};

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
