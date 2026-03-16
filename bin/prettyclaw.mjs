#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  detectBootstrapLocale,
  getStartValidationError,
  hasBinary,
  initPrettyClaw,
  parseInitArgs,
  PRETTYCLAW_START_HOST,
  PRETTYCLAW_START_PORT,
  resolvePrettyClawPaths,
  waitForDevicePairingApproval,
} from "../src/lib/prettyclaw-cli.ts";
import { loadAppConfig } from "../src/lib/app-config.ts";

const require = createRequire(import.meta.url);
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const INIT_LOCALE_CHOICES = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
];

function printHelp() {
  process.stdout.write(`prettyclaw <command>

Commands:
  init   Seed PrettyClaw config and sync OpenClaw agents
  start  Run the PrettyClaw UI server
  help   Show this help message

Init options:
  --locale <en|ko|ja>         Use this language for character config and prompts
  --pair                       Wait for a browser pairing request and approve it
  --pair-wait-ms <ms>          Pairing wait timeout in milliseconds
  --gateway-url <ws-url>       Gateway WebSocket URL for pairing
  --gateway-token <token>      Gateway token for pairing
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

async function promptForInitLocale(defaultLocale) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return defaultLocale;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    process.stdout.write("Select init language:\n");
    for (const [index, choice] of INIT_LOCALE_CHOICES.entries()) {
      const defaultMarker = choice.code === defaultLocale ? " (default)" : "";
      process.stdout.write(`  ${index + 1}. ${choice.label} [${choice.code}]${defaultMarker}\n`);
    }

    const answer = (await rl.question(`Choose language [${defaultLocale}]: `)).trim().toLowerCase();
    if (!answer) {
      return defaultLocale;
    }

    const numberedChoice = INIT_LOCALE_CHOICES[Number(answer) - 1];
    if (numberedChoice) {
      return numberedChoice.code;
    }

    const directChoice = INIT_LOCALE_CHOICES.find((choice) => choice.code === answer);
    return directChoice?.code ?? defaultLocale;
  } finally {
    rl.close();
  }
}

async function runInit(args) {
  const parsed = parseInitArgs(args);
  if (!parsed.ok) {
    fail(parsed.error);
    return;
  }

  if (!hasBinary("openclaw")) {
    fail("Missing required binary: openclaw");
    return;
  }

  const paths = resolvePrettyClawPaths(packageRoot);
  const appConfig = await loadAppConfig({ configFile: paths.appConfigFile });
  const defaultLocale = appConfig.source === "config" ? appConfig.language : detectBootstrapLocale();
  const locale = parsed.options.locale ?? (appConfig.source === "config" ? appConfig.language : await promptForInitLocale(defaultLocale));

  const result = await initPrettyClaw(packageRoot, "openclaw", locale);
  if (!result.ok) {
    fail(result.error);
    return;
  }

  const configLine =
    result.configStatus === "created"
      ? `Seeded locale config: ${join(paths.configDir, `characters.${locale}.json`)}`
      : `Using existing locale config: ${join(paths.configDir, `characters.${locale}.json`)}`;

  process.stdout.write(`${configLine}\n`);
  process.stdout.write(`Language: ${locale}\n`);
  process.stdout.write(`Created agents: ${result.created.length}\n`);
  process.stdout.write(`Updated agents: ${result.updated.length}\n`);

  if (!existsSync(join(paths.configDir, `characters.${locale}.json`)) && !existsSync(paths.configFile)) {
    fail(`Missing PrettyClaw config: ${join(paths.configDir, `characters.${locale}.json`)}`);
    return;
  }

  process.stdout.write("Next steps:\n");
  process.stdout.write("  openclaw gateway start\n");
  process.stdout.write("  prettyclaw start\n");

  if (!parsed.options.pair) {
    return;
  }

  process.stdout.write("Pairing mode:\n");
  process.stdout.write("  1. Make sure the gateway is running.\n");
  process.stdout.write("  2. Open PrettyClaw in your browser and let it attempt a gateway connection.\n");
  process.stdout.write("  3. This command will approve the next pending browser pairing request.\n");

  const pairingResult = await waitForDevicePairingApproval({
    waitMs: parsed.options.pairWaitMs,
    gatewayUrl: parsed.options.gatewayUrl,
    gatewayToken: parsed.options.gatewayToken,
  });

  if (pairingResult.paired) {
    process.stdout.write(`Pairing approved: ${pairingResult.requestId}\n`);
    process.stdout.write("Refresh the page or reconnect manually in PrettyClaw.\n");
    return;
  }

  if (pairingResult.timedOut) {
    process.stdout.write("Pairing timed out before any pending browser request appeared.\n");
    process.stdout.write("Open PrettyClaw in the browser and run `prettyclaw init --pair` again if needed.\n");
    return;
  }

  process.stdout.write(`Pairing not completed: ${pairingResult.error}\n`);
  process.stdout.write("Bootstrap succeeded. Open PrettyClaw in the browser and pair manually if needed.\n");
}

const [command, ...commandArgs] = process.argv.slice(2);

if (!command || command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else if (command === "init") {
  await runInit(commandArgs);
} else if (command === "start") {
  await runStart();
} else {
  fail(`Unknown command: ${command}`);
  printHelp();
}
