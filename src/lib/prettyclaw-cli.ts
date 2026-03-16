import { execFile, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { matchAppLocale, resolveAppLocalePreference, type AppLocale } from "../i18n/config.ts";
import type { LocalizedCharacterConfig } from "../types/index.ts";
import {
  bootstrapAgents,
  getBootstrapErrorMessage,
  buildUser,
  extractConfiguredAgentIds,
  getWorkspaceDir,
  loadAgentPromptFiles,
  syncCharacterAgent,
  type BootstrapAgentsResult,
} from "./agent-bootstrap.ts";
import { writeAppConfig } from "./app-config.ts";
import { loadCharacterConfig } from "./character-config.ts";

const execFileAsync = promisify(execFile);

export const PRETTYCLAW_START_HOST = "127.0.0.1";
export const PRETTYCLAW_START_PORT = 3000;
export const DEFAULT_PAIR_WAIT_MS = 60_000;
const DEFAULT_PAIR_POLL_INTERVAL_MS = 2_000;

export interface PrettyClawPaths {
  packageRoot: string;
  configDir: string;
  appConfigFile: string;
  configFile: string;
  templateFile: string;
  openClawHome: string;
}

export type PrettyClawInitResult = BootstrapAgentsResult & {
  configStatus: "created" | "existing";
};

export interface PrettyClawInitOptions {
  locale: AppLocale | null;
  pair: boolean;
  pairWaitMs: number;
  gatewayUrl: string | null;
  gatewayToken: string | null;
}

export type ParseInitArgsResult =
  | {
      ok: true;
      options: PrettyClawInitOptions;
    }
  | {
      ok: false;
      error: string;
    };

export interface DevicePairingOptions {
  waitMs: number;
  pollIntervalMs?: number;
  gatewayUrl: string | null;
  gatewayToken: string | null;
}

export interface DevicePairingDeps {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  runOpenClaw?: (openClawBin: string, args: string[]) => Promise<string>;
}

export interface DevicePairingResult {
  paired: boolean;
  timedOut: boolean;
  error: string | null;
  requestId: string | null;
}

interface DeviceListEntry {
  id?: string;
  requestId?: string;
}

interface DeviceListPayload {
  pending?: DeviceListEntry[];
  requests?: DeviceListEntry[];
}

export function resolvePrettyClawPaths(packageRoot: string, homeDirectory = homedir()): PrettyClawPaths {
  const configDir = join(homeDirectory, ".config", "prettyclaw");

  return {
    packageRoot,
    configDir,
    appConfigFile: join(configDir, "config.json"),
    configFile: join(configDir, "characters.json"),
    templateFile: join(packageRoot, "config", "characters.template.json"),
    openClawHome: join(homeDirectory, ".openclaw"),
  };
}

function getLocalizedCharacterConfigPath(paths: PrettyClawPaths, locale: AppLocale) {
  return join(paths.configDir, `characters.${locale}.json`);
}

function getLocalizedCharacterTemplatePath(paths: PrettyClawPaths, locale: AppLocale) {
  return join(paths.packageRoot, "config", `characters.${locale}.template.json`);
}

function getLocalizedPromptTemplatePath(
  paths: PrettyClawPaths,
  locale: AppLocale,
  characterId: string,
  fileName: "IDENTITY.md" | "SOUL.md",
) {
  return join(paths.packageRoot, "config", "agents", locale, characterId, fileName);
}

function getLocalizedPromptConfigPath(paths: PrettyClawPaths, locale: AppLocale, characterId: string, fileName: "IDENTITY.md" | "SOUL.md") {
  return join(paths.configDir, "agents", characterId, locale, fileName);
}

export async function ensureCharacterConfigSeeded(paths: PrettyClawPaths, locale: AppLocale) {
  const localizedConfigFile = getLocalizedCharacterConfigPath(paths, locale);
  const localizedTemplateFile = getLocalizedCharacterTemplatePath(paths, locale);
  await mkdir(paths.configDir, { recursive: true });

  if (existsSync(localizedConfigFile)) {
    return "existing" as const;
  }

  await copyFile(localizedTemplateFile, localizedConfigFile);
  return "created" as const;
}

async function ensureLocalizedPromptFilesSeeded(
  paths: PrettyClawPaths,
  characters: LocalizedCharacterConfig[],
  locale: AppLocale,
) {
  for (const character of characters) {
    for (const fileName of ["IDENTITY.md", "SOUL.md"] as const) {
      const configPath = getLocalizedPromptConfigPath(paths, locale, character.id, fileName);
      if (existsSync(configPath)) {
        continue;
      }

      const templatePath = getLocalizedPromptTemplatePath(paths, locale, character.id, fileName);
      if (!existsSync(templatePath)) {
        continue;
      }

      await mkdir(join(paths.configDir, "agents", character.id, locale), { recursive: true });
      await copyFile(templatePath, configPath);
    }
  }
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

function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parsePositiveInt(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseInitArgs(args: string[], env: NodeJS.ProcessEnv = process.env): ParseInitArgsResult {
  let locale: AppLocale | null = null;
  let pair = false;
  let pairWaitMs = DEFAULT_PAIR_WAIT_MS;
  let gatewayUrl = normalizeOptionalString(env.NEXT_PUBLIC_GATEWAY_URL);
  let gatewayToken = normalizeOptionalString(env.NEXT_PUBLIC_GATEWAY_TOKEN);
  let sawPairOnlyFlag = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--pair") {
      pair = true;
      continue;
    }

    if (arg === "--locale") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        return { ok: false, error: "Missing value for --locale." };
      }
      const parsedLocale = matchAppLocale(nextValue);
      if (!parsedLocale) {
        return { ok: false, error: `Unsupported locale for --locale: ${nextValue}` };
      }
      locale = parsedLocale;
      index += 1;
      continue;
    }

    if (arg === "--pair-wait-ms") {
      sawPairOnlyFlag = true;
      const nextValue = args[index + 1];
      if (!nextValue) {
        return { ok: false, error: "Missing value for --pair-wait-ms." };
      }
      const parsed = parsePositiveInt(nextValue);
      if (parsed === null) {
        return { ok: false, error: "Expected a positive integer for --pair-wait-ms." };
      }
      pairWaitMs = parsed;
      index += 1;
      continue;
    }

    if (arg === "--gateway-url") {
      sawPairOnlyFlag = true;
      const nextValue = args[index + 1];
      if (!nextValue) {
        return { ok: false, error: "Missing value for --gateway-url." };
      }
      gatewayUrl = normalizeOptionalString(nextValue);
      index += 1;
      continue;
    }

    if (arg === "--gateway-token") {
      sawPairOnlyFlag = true;
      const nextValue = args[index + 1];
      if (!nextValue) {
        return { ok: false, error: "Missing value for --gateway-token." };
      }
      gatewayToken = normalizeOptionalString(nextValue);
      index += 1;
      continue;
    }

    return { ok: false, error: `Unknown init option: ${arg}` };
  }

  if (!pair && sawPairOnlyFlag) {
    return { ok: false, error: "Pairing options require --pair." };
  }

  return {
    ok: true,
    options: {
      locale,
      pair,
      pairWaitMs,
      gatewayUrl: pair ? gatewayUrl : null,
      gatewayToken: pair ? gatewayToken : null,
    },
  };
}

function buildDevicesCommandArgs(baseArgs: string[], options: DevicePairingOptions) {
  const args = [...baseArgs];

  if (options.gatewayUrl) {
    args.push("--url", options.gatewayUrl);
  }

  if (options.gatewayToken) {
    args.push("--token", options.gatewayToken);
  }

  return args;
}

function extractPendingRequestId(raw: string) {
  const parsed = JSON.parse(raw) as DeviceListPayload | DeviceListEntry[] | null;
  const pending = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.pending)
    ? parsed.pending
    : Array.isArray(parsed?.requests)
    ? parsed.requests
    : [];

  for (const item of pending) {
    if (typeof item?.requestId === "string" && item.requestId.length > 0) {
      return item.requestId;
    }
    if (typeof item?.id === "string" && item.id.length > 0) {
      return item.id;
    }
  }

  return null;
}

export async function waitForDevicePairingApproval(
  options: DevicePairingOptions,
  openClawBin = "openclaw",
  deps: DevicePairingDeps = {},
): Promise<DevicePairingResult> {
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const run = deps.runOpenClaw ?? runOpenClaw;
  const startedAt = now();
  const deadline = startedAt + Math.max(0, options.waitMs);
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_PAIR_POLL_INTERVAL_MS;

  while (true) {
    try {
      const listRaw = await run(openClawBin, buildDevicesCommandArgs(["devices", "list", "--json"], options));
      const requestId = extractPendingRequestId(listRaw);

      if (requestId) {
        await run(
          openClawBin,
          buildDevicesCommandArgs(["devices", "approve", requestId, "--json"], options),
        );
        return {
          paired: true,
          timedOut: false,
          error: null,
          requestId,
        };
      }
    } catch (error) {
      return {
        paired: false,
        timedOut: false,
        error: getBootstrapErrorMessage(error),
        requestId: null,
      };
    }

    if (now() >= deadline) {
      return {
        paired: false,
        timedOut: true,
        error: null,
        requestId: null,
      };
    }

    await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - now())));
  }
}

async function readConfiguredAgentIds(openClawBin: string) {
  const raw = await runOpenClaw(openClawBin, ["agents", "list", "--json"]);
  const parsed = JSON.parse(raw) as Parameters<typeof extractConfiguredAgentIds>[0];
  return extractConfiguredAgentIds(parsed);
}

export function detectBootstrapLocale() {
  return resolveAppLocalePreference(
    process.env.PRETTYCLAW_LOCALE,
    process.env.LC_ALL,
    process.env.LC_MESSAGES,
    process.env.LANG,
    Intl.DateTimeFormat().resolvedOptions().locale,
  );
}

async function writeBootstrapFiles(
  character: LocalizedCharacterConfig,
  workspaceDir: string,
  configDir: string,
  locale: AppLocale,
) {
  const promptFiles = await loadAgentPromptFiles(character, { configDir, locale });
  await mkdir(workspaceDir, { recursive: true });
  await Promise.all([
    writeFile(join(workspaceDir, "IDENTITY.md"), promptFiles.identity, "utf-8"),
    writeFile(join(workspaceDir, "SOUL.md"), promptFiles.soul, "utf-8"),
    writeFile(join(workspaceDir, "USER.md"), buildUser(character, locale), "utf-8"),
  ]);
}

async function createAgent(
  character: LocalizedCharacterConfig,
  openClawBin: string,
  openClawHome: string,
  configDir: string,
  locale: AppLocale,
) {
  const workspaceDir = getWorkspaceDir(openClawHome, character.agentId);
  await loadAgentPromptFiles(character, { configDir, locale });
  await runOpenClaw(openClawBin, [
    "agents",
    "add",
    character.agentId,
    "--workspace",
    workspaceDir,
    "--non-interactive",
    "--json",
  ]);

  await writeBootstrapFiles(character, workspaceDir, configDir, locale);
}

export async function initPrettyClaw(
  packageRoot: string,
  openClawBin = "openclaw",
  locale: AppLocale = detectBootstrapLocale(),
  homeDirectory = homedir(),
): Promise<PrettyClawInitResult> {
  const paths = resolvePrettyClawPaths(packageRoot, homeDirectory);

  const configStatus = await ensureCharacterConfigSeeded(paths, locale);
  await writeAppConfig({ language: locale }, { configFile: paths.appConfigFile, configDir: paths.configDir });
  const { characters } = await loadCharacterConfig({
    configDir: paths.configDir,
    configFile: paths.configFile,
    templateFile: getLocalizedCharacterTemplatePath(paths, locale),
    appConfigFile: paths.appConfigFile,
    locale,
  });
  await ensureLocalizedPromptFilesSeeded(paths, characters, locale);

  const result = await bootstrapAgents({
    loadCharacters: async () => characters,
    readConfiguredAgentIds: async () => readConfiguredAgentIds(openClawBin),
    syncCharacterAgent: async (character, configuredAgentIds) =>
      syncCharacterAgent(character, configuredAgentIds, {
        createAgent: async (target) => createAgent(target, openClawBin, paths.openClawHome, paths.configDir, locale),
        writeBootstrapFiles: async (target) => {
          await writeBootstrapFiles(target, getWorkspaceDir(paths.openClawHome, target.agentId), paths.configDir, locale);
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

  const hasAnyCharacterConfig =
    existsSync(paths.configFile) ||
    ["en", "ko", "ja"].some((locale) => existsSync(getLocalizedCharacterConfigPath(paths, locale as AppLocale)));

  if (!hasAnyCharacterConfig) {
    return `Missing PrettyClaw config: ${paths.configFile}. Run 'prettyclaw init' first.`;
  }

  return null;
}
