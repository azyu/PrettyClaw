#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  getStartValidationError,
  hasBinary,
  initPrettyClaw,
  PRETTYCLAW_START_HOST,
  PRETTYCLAW_START_PORT,
  resolvePrettyClawPaths,
} from "../src/lib/prettyclaw-cli.ts";

const require = createRequire(import.meta.url);
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function printHelp() {
  process.stdout.write(`prettyclaw <command>

Commands:
  init   Seed PrettyClaw config and sync OpenClaw agents
  start  Run the PrettyClaw UI server
  help   Show this help message
`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function resolveNextBin() {
  return require.resolve("next/dist/bin/next");
}

async function runStart() {
  const paths = resolvePrettyClawPaths(packageRoot);
  const validationError = getStartValidationError(paths);
  if (validationError) {
    fail(validationError);
    return;
  }

  const nextBin = resolveNextBin();
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--hostname", PRETTYCLAW_START_HOST, "--port", String(PRETTYCLAW_START_PORT)],
    {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

async function runInit() {
  if (!hasBinary("openclaw")) {
    fail("Missing required binary: openclaw");
    return;
  }

  const result = await initPrettyClaw(packageRoot);
  if (!result.ok) {
    fail(result.error);
    return;
  }

  const paths = resolvePrettyClawPaths(packageRoot);
  const configLine =
    result.configStatus === "created"
      ? `Seeded config: ${paths.configFile}`
      : `Using existing config: ${paths.configFile}`;

  process.stdout.write(`${configLine}\n`);
  process.stdout.write(`Created agents: ${result.created.length}\n`);
  process.stdout.write(`Updated agents: ${result.updated.length}\n`);

  if (!existsSync(paths.configFile)) {
    fail(`Missing PrettyClaw config: ${paths.configFile}`);
    return;
  }

  process.stdout.write("Next steps:\n");
  process.stdout.write("  openclaw gateway start\n");
  process.stdout.write("  prettyclaw start\n");
}

const [command] = process.argv.slice(2);

if (!command || command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else if (command === "init") {
  await runInit();
} else if (command === "start") {
  await runStart();
} else {
  fail(`Unknown command: ${command}`);
  printHelp();
}
