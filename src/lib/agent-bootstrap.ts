import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AppLocale, LocalizedCharacterConfig } from "../types/index.ts";

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
  createAgent: (character: LocalizedCharacterConfig) => Promise<void>;
  writeBootstrapFiles: (character: LocalizedCharacterConfig) => Promise<void>;
  readConfiguredAgentIds: () => Promise<Set<string>>;
}

interface BootstrapAgentsDeps {
  loadCharacters: () => Promise<LocalizedCharacterConfig[]>;
  readConfiguredAgentIds: () => Promise<Set<string>>;
  syncCharacterAgent: (
    character: LocalizedCharacterConfig,
    configuredAgentIds: Set<string>,
  ) => Promise<SyncCharacterAgentResult>;
}

interface LoadAgentPromptFilesOptions {
  configDir?: string;
  locale?: AppLocale;
}

export interface AgentPromptFiles {
  identity: string;
  soul: string;
}

const DEFAULT_CONFIG_DIR = join(homedir(), ".config", "prettyclaw");

export function getWorkspaceDir(openClawHome: string, agentId: string) {
  return join(openClawHome, `workspace-${agentId}`);
}

function getAgentPromptFilePath(configDir: string, characterId: string, fileName: "IDENTITY.md" | "SOUL.md") {
  return join(configDir, "agents", characterId, fileName);
}

function getLocalizedAgentPromptFilePath(
  configDir: string,
  characterId: string,
  locale: AppLocale,
  fileName: "IDENTITY.md" | "SOUL.md",
) {
  return join(configDir, "agents", characterId, locale, fileName);
}

export async function loadAgentPromptFiles(
  character: LocalizedCharacterConfig,
  options: LoadAgentPromptFilesOptions = {},
): Promise<AgentPromptFiles> {
  const configDir = options.configDir ?? DEFAULT_CONFIG_DIR;
  const identityPath =
    options.locale && existsSync(getLocalizedAgentPromptFilePath(configDir, character.id, options.locale, "IDENTITY.md"))
      ? getLocalizedAgentPromptFilePath(configDir, character.id, options.locale, "IDENTITY.md")
      : getAgentPromptFilePath(configDir, character.id, "IDENTITY.md");
  const soulPath =
    options.locale && existsSync(getLocalizedAgentPromptFilePath(configDir, character.id, options.locale, "SOUL.md"))
      ? getLocalizedAgentPromptFilePath(configDir, character.id, options.locale, "SOUL.md")
      : getAgentPromptFilePath(configDir, character.id, "SOUL.md");

  if (!existsSync(soulPath)) {
    throw new Error(`Missing PrettyClaw agent prompt file: ${soulPath}`);
  }

  if (!existsSync(identityPath)) {
    throw new Error(`Missing PrettyClaw agent prompt file: ${identityPath}`);
  }

  const [identity, soul] = await Promise.all([
    readFile(identityPath, "utf-8"),
    readFile(soulPath, "utf-8"),
  ]);

  return {
    identity,
    soul,
  };
}

export function buildUser(character: LocalizedCharacterConfig, locale: AppLocale) {
  switch (locale) {
    case "ko":
      return `사용자는 PrettyClaw에서 ${character.displayName}와 대화하고 있습니다.\n`;
    case "ja":
      return `ユーザーは PrettyClaw で ${character.displayName} と会話しています。\n`;
    case "en":
    default:
      return `The user is talking with ${character.displayName} in PrettyClaw.\n`;
  }
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
  character: LocalizedCharacterConfig,
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
