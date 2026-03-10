import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import type { CharacterConfig } from "@/types";
import { loadCharacterConfig } from "@/lib/character-config";

const execFileAsync = promisify(execFile);
const OPENCLAW_HOME = join(homedir(), ".openclaw");
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || "openclaw";

export const runtime = "nodejs";

interface OpenClawAgentsList {
  agents?: Array<{
    id?: string;
    name?: string;
  }>;
}

function getWorkspaceDir(agentId: string) {
  return join(OPENCLAW_HOME, `workspace-${agentId}`);
}

function buildIdentity(character: CharacterConfig) {
  return `Name: ${character.displayName}\n`;
}

function buildSoul(character: CharacterConfig) {
  return `${character.personaPrompt.trim()}\n`;
}

function buildUser(character: CharacterConfig) {
  return `사용자는 PrettyClaw에서 ${character.displayName}와 대화하고 있습니다.\n`;
}

async function runOpenClaw(args: string[]) {
  try {
    const { stdout } = await execFileAsync(OPENCLAW_BIN, args, {
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

async function readConfiguredAgentIds() {
  const raw = await runOpenClaw(["agents", "list", "--json"]);
  const parsed = JSON.parse(raw) as OpenClawAgentsList;
  return new Set(
    (parsed.agents ?? [])
      .map((agent) => agent.id || agent.name)
      .filter((agentId): agentId is string => typeof agentId === "string" && agentId.length > 0),
  );
}

async function writeBootstrapFiles(character: CharacterConfig, workspaceDir: string) {
  await mkdir(workspaceDir, { recursive: true });
  await Promise.all([
    writeFile(join(workspaceDir, "IDENTITY.md"), buildIdentity(character), "utf-8"),
    writeFile(join(workspaceDir, "SOUL.md"), buildSoul(character), "utf-8"),
    writeFile(join(workspaceDir, "USER.md"), buildUser(character), "utf-8"),
  ]);
}

async function createAgent(character: CharacterConfig) {
  const workspaceDir = getWorkspaceDir(character.agentId);
  await runOpenClaw([
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

export async function POST() {
  const { characters } = await loadCharacterConfig();
  const configuredAgentIds = await readConfiguredAgentIds();
  const created: string[] = [];
  const skipped: string[] = [];

  for (const character of characters) {
    if (configuredAgentIds.has(character.agentId)) {
      skipped.push(character.agentId);
      continue;
    }

    try {
      await createAgent(character);
      configuredAgentIds.add(character.agentId);
      created.push(character.agentId);
    } catch (e) {
      const refreshedAgentIds = await readConfiguredAgentIds();
      if (refreshedAgentIds.has(character.agentId)) {
        configuredAgentIds.add(character.agentId);
        skipped.push(character.agentId);
        continue;
      }

      const message = e instanceof Error ? e.message : "OpenClaw agent bootstrap failed";
      return NextResponse.json(
        {
          ok: false,
          created,
          skipped,
          error: message,
          missingBinary: message.includes("ENOENT"),
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    waitMs: created.length > 0 ? 1000 : 0,
  });
}
