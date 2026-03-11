import { join } from "node:path";
import type { CharacterConfig } from "../types";

export type SyncCharacterAgentResult = "created" | "updated";
export interface OpenClawAgentListItem {
  id?: string;
  name?: string;
}

export interface OpenClawAgentListObject {
  agents?: OpenClawAgentListItem[];
}
export interface BootstrapAgentsSuccess {
  ok: true;
  created: string[];
  updated: string[];
  waitMs: number;
}

export interface BootstrapAgentsFailure {
  ok: false;
  created: string[];
  updated: string[];
  error: string;
  missingBinary: boolean;
}

export type BootstrapAgentsResult = BootstrapAgentsSuccess | BootstrapAgentsFailure;

interface SyncCharacterAgentDeps {
  createAgent: (character: CharacterConfig) => Promise<void>;
  writeBootstrapFiles: (character: CharacterConfig) => Promise<void>;
  readConfiguredAgentIds: () => Promise<Set<string>>;
}

interface BootstrapAgentsDeps {
  loadCharacters: () => Promise<CharacterConfig[]>;
  readConfiguredAgentIds: () => Promise<Set<string>>;
  syncCharacterAgent: (
    character: CharacterConfig,
    configuredAgentIds: Set<string>,
  ) => Promise<SyncCharacterAgentResult>;
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

export function extractConfiguredAgentIds(parsed: OpenClawAgentListItem[] | OpenClawAgentListObject) {
  const agents = Array.isArray(parsed) ? parsed : parsed.agents ?? [];

  return new Set(
    agents
      .map((agent) => agent.id || agent.name)
      .filter((agentId): agentId is string => typeof agentId === "string" && agentId.length > 0),
  );
}

export function getBootstrapErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "OpenClaw agent bootstrap failed";
}

export function isMissingBinaryError(message: string) {
  return /ENOENT|command not found/i.test(message);
}

export function buildBootstrapFailure(
  error: unknown,
  created: string[],
  updated: string[],
): BootstrapAgentsFailure {
  const message = getBootstrapErrorMessage(error);

  return {
    ok: false,
    created,
    updated,
    error: message,
    missingBinary: isMissingBinaryError(message),
  };
}

export async function bootstrapAgents(deps: BootstrapAgentsDeps): Promise<BootstrapAgentsResult> {
  const created: string[] = [];
  const updated: string[] = [];

  try {
    const characters = await deps.loadCharacters();
    const configuredAgentIds = await deps.readConfiguredAgentIds();

    for (const character of characters) {
      try {
        const result = await deps.syncCharacterAgent(character, configuredAgentIds);
        if (result === "created") {
          created.push(character.agentId);
        } else {
          updated.push(character.agentId);
        }
      } catch (error) {
        return buildBootstrapFailure(error, created, updated);
      }
    }
  } catch (error) {
    return buildBootstrapFailure(error, created, updated);
  }

  return {
    ok: true,
    created,
    updated,
    waitMs: created.length > 0 ? 1000 : 0,
  };
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
