import { execFile, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { CharacterConfig } from "../types/index.ts";
import {
  bootstrapAgents,
  buildIdentity,
  buildSoul,
  buildUser,
  extractConfiguredAgentIds,
  getWorkspaceDir,
  syncCharacterAgent,
  type BootstrapAgentsResult,
} from "./agent-bootstrap.ts";
import { loadCharacterConfig } from "./character-config.ts";

const execFileAsync = promisify(execFile);

export const PRETTYCLAW_START_HOST = "127.0.0.1";
export const PRETTYCLAW_START_PORT = 3000;

export interface PrettyClawPaths {
  packageRoot: string;
  configDir: string;
  configFile: string;
  templateFile: string;
  openClawHome: string;
}

export type PrettyClawInitResult = BootstrapAgentsResult & {
  configStatus: "created" | "existing";
};

export function resolvePrettyClawPaths(packageRoot: string, homeDirectory = homedir()): PrettyClawPaths {
  const configDir = join(homeDirectory, ".config", "prettyclaw");

  return {
    packageRoot,
    configDir,
    configFile: join(configDir, "characters.json"),
    templateFile: join(packageRoot, "config", "characters.template.json"),
    openClawHome: join(homeDirectory, ".openclaw"),
  };
}

export async function ensureCharacterConfigSeeded(paths: PrettyClawPaths) {
  await mkdir(paths.configDir, { recursive: true });

  if (existsSync(paths.configFile)) {
    return "existing" as const;
  }

  await copyFile(paths.templateFile, paths.configFile);
  return "created" as const;
}

export function hasBinary(binary: string) {
  const whichCommand = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(whichCommand, [binary], { stdio: "ignore" });
  return result.status === 0;
}

async function runOpenClaw(openClawBin: string, args: string[]) {
  try {
    const { stdout } = await execFileAsync(openClawBin, args, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    if (error instanceof Error && "stderr" in error) {
      const execError = error as Error & { stderr?: string; stdout?: string };
      const stderr = typeof execError.stderr === "string" ? execError.stderr.trim() : "";
      const stdout = typeof execError.stdout === "string" ? execError.stdout.trim() : "";
      throw new Error(stderr || stdout || error.message);
    }

    throw error;
  }
}

async function readConfiguredAgentIds(openClawBin: string) {
  const raw = await runOpenClaw(openClawBin, ["agents", "list", "--json"]);
  const parsed = JSON.parse(raw) as Parameters<typeof extractConfiguredAgentIds>[0];
  return extractConfiguredAgentIds(parsed);
}

async function writeBootstrapFiles(character: CharacterConfig, workspaceDir: string) {
  await mkdir(workspaceDir, { recursive: true });
  await Promise.all([
    writeFile(join(workspaceDir, "IDENTITY.md"), buildIdentity(character), "utf-8"),
    writeFile(join(workspaceDir, "SOUL.md"), buildSoul(character), "utf-8"),
    writeFile(join(workspaceDir, "USER.md"), buildUser(character), "utf-8"),
  ]);
}

async function createAgent(character: CharacterConfig, openClawBin: string, openClawHome: string) {
  const workspaceDir = getWorkspaceDir(openClawHome, character.agentId);
  await runOpenClaw(openClawBin, [
    "agents",
    "add",
    character.agentId,
    "--workspace",
    workspaceDir,
    "--non-interactive",
    "--json",
  ]);

  await writeBootstrapFiles(character, workspaceDir);
}

export async function initPrettyClaw(packageRoot: string, openClawBin = "openclaw"): Promise<PrettyClawInitResult> {
  const paths = resolvePrettyClawPaths(packageRoot);

  const configStatus = await ensureCharacterConfigSeeded(paths);
  const { characters } = await loadCharacterConfig({
    configDir: paths.configDir,
    configFile: paths.configFile,
    templateFile: paths.templateFile,
  });

  const result = await bootstrapAgents({
    loadCharacters: async () => characters,
    readConfiguredAgentIds: async () => readConfiguredAgentIds(openClawBin),
    syncCharacterAgent: async (character, configuredAgentIds) =>
      syncCharacterAgent(character, configuredAgentIds, {
        createAgent: async (target) => createAgent(target, openClawBin, paths.openClawHome),
        writeBootstrapFiles: async (target) => {
          await writeBootstrapFiles(target, getWorkspaceDir(paths.openClawHome, target.agentId));
        },
        readConfiguredAgentIds: async () => readConfiguredAgentIds(openClawBin),
      }),
  });

  return {
    ...result,
    configStatus,
  };
}

export function getStartValidationError(paths: PrettyClawPaths, openClawBin = "openclaw") {
  if (!hasBinary(openClawBin)) {
    return `Missing required binary: ${openClawBin}`;
  }

  if (!existsSync(paths.configFile)) {
    return `Missing PrettyClaw config: ${paths.configFile}. Run 'prettyclaw init' first.`;
  }

  return null;
}
