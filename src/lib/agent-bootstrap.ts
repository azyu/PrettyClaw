import { join } from "node:path";
import type { CharacterConfig } from "../types";

export type SyncCharacterAgentResult = "created" | "updated";

interface SyncCharacterAgentDeps {
  createAgent: (character: CharacterConfig) => Promise<void>;
  writeBootstrapFiles: (character: CharacterConfig) => Promise<void>;
  readConfiguredAgentIds: () => Promise<Set<string>>;
}

export function getWorkspaceDir(openClawHome: string, agentId: string) {
  return join(openClawHome, `workspace-${agentId}`);
}

export function buildIdentity(character: CharacterConfig) {
  return `Name: ${character.displayName}\n`;
}

export function buildSoul(character: CharacterConfig) {
  return `${character.personaPrompt.trim()}\n`;
}

export function buildUser(character: CharacterConfig) {
  return `사용자는 PrettyClaw에서 ${character.displayName}와 대화하고 있습니다.\n`;
}

export async function syncCharacterAgent(
  character: CharacterConfig,
  configuredAgentIds: Set<string>,
  deps: SyncCharacterAgentDeps,
): Promise<SyncCharacterAgentResult> {
  if (configuredAgentIds.has(character.agentId)) {
    await deps.writeBootstrapFiles(character);
    return "updated";
  }

  try {
    await deps.createAgent(character);
    configuredAgentIds.add(character.agentId);
    return "created";
  } catch (error) {
    const refreshedAgentIds = await deps.readConfiguredAgentIds();
    if (refreshedAgentIds.has(character.agentId)) {
      configuredAgentIds.add(character.agentId);
      await deps.writeBootstrapFiles(character);
      return "updated";
    }
    throw error;
  }
}
