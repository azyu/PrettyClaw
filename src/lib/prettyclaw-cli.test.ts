import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_PAIR_WAIT_MS,
  ensureCharacterConfigSeeded,
  getStartValidationError,
  initPrettyClaw,
  parseInitArgs,
  resolvePrettyClawPaths,
  waitForDevicePairingApproval,
  type PrettyClawPaths,
} from "./prettyclaw-cli.ts";

function buildPaths(root: string): PrettyClawPaths {
  return {
    packageRoot: root,
    configDir: join(root, ".config", "prettyclaw"),
    appConfigFile: join(root, ".config", "prettyclaw", "config.json"),
    configFile: join(root, ".config", "prettyclaw", "characters.json"),
    templateFile: join(root, "config", "characters.template.json"),
    openClawHome: join(root, ".openclaw"),
  };
}

test("resolvePrettyClawPaths derives config and OpenClaw paths from the package root", () => {
  const result = resolvePrettyClawPaths("/tmp/prettyclaw-package", "/tmp/home");

  assert.equal(result.packageRoot, "/tmp/prettyclaw-package");
  assert.equal(result.configDir, "/tmp/home/.config/prettyclaw");
  assert.equal(result.appConfigFile, "/tmp/home/.config/prettyclaw/config.json");
  assert.equal(result.configFile, "/tmp/home/.config/prettyclaw/characters.json");
  assert.equal(result.templateFile, "/tmp/prettyclaw-package/config/characters.template.json");
  assert.equal(result.openClawHome, "/tmp/home/.openclaw");
});

test("ensureCharacterConfigSeeded copies the template only when characters.json is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-cli-seed-"));
  const paths = buildPaths(root);

  await mkdir(join(root, "config"), { recursive: true });
  await writeFile(join(root, "config", "characters.en.template.json"), JSON.stringify([{ id: "yuki" }], null, 2), "utf-8");

  const first = await ensureCharacterConfigSeeded(paths, "en");
  const second = await ensureCharacterConfigSeeded(paths, "en");

  assert.equal(first, "created");
  assert.equal(second, "existing");
  assert.equal(existsSync(join(paths.configDir, "characters.en.json")), true);
  assert.equal(await readFile(join(paths.configDir, "characters.en.json"), "utf-8"), '[\n  {\n    "id": "yuki"\n  }\n]');
});

test("getStartValidationError fails fast when the OpenClaw binary is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-cli-start-"));
  const paths = buildPaths(root);

  await mkdir(paths.configDir, { recursive: true });

  const validationError = getStartValidationError(paths, "definitely-missing-openclaw");

  assert.equal(validationError, "Missing required binary: definitely-missing-openclaw");
});

test("getStartValidationError points users to init when characters.json is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-cli-start-config-"));
  const paths = buildPaths(root);

  await mkdir(paths.configDir, { recursive: true });

  const validationError = getStartValidationError(paths, "node");
  assert.equal(validationError, `Missing PrettyClaw config: ${paths.configFile}. Run 'prettyclaw init' first.`);

  await writeFile(paths.configFile, "[]", "utf-8");
  const ready = getStartValidationError(paths, "node");
  assert.equal(ready, null);
});

test("parseInitArgs keeps pairing disabled by default", () => {
  const result = parseInitArgs([]);

  assert.deepEqual(result, {
    ok: true,
    options: {
      locale: null,
      pair: false,
      pairWaitMs: DEFAULT_PAIR_WAIT_MS,
      gatewayUrl: null,
      gatewayToken: null,
    },
  });
});

test("parseInitArgs resolves pairing options from flags and env", () => {
  const env = {
    NEXT_PUBLIC_GATEWAY_URL: "ws://127.0.0.1:18789",
    NEXT_PUBLIC_GATEWAY_TOKEN: "env-token",
  } as unknown as NodeJS.ProcessEnv;

  const result = parseInitArgs(["--locale", "ko", "--pair", "--pair-wait-ms", "1500"], env);

  assert.deepEqual(result, {
    ok: true,
    options: {
      locale: "ko",
      pair: true,
      pairWaitMs: 1500,
      gatewayUrl: "ws://127.0.0.1:18789",
      gatewayToken: "env-token",
    },
  });
});

test("parseInitArgs rejects pairing flags without --pair", () => {
  const result = parseInitArgs(["--pair-wait-ms", "1500"]);

  assert.deepEqual(result, {
    ok: false,
    error: "Pairing options require --pair.",
  });
});

test("parseInitArgs rejects an unsupported locale", () => {
  const result = parseInitArgs(["--locale", "fr"]);

  assert.deepEqual(result, {
    ok: false,
    error: "Unsupported locale for --locale: fr",
  });
});

test("waitForDevicePairingApproval approves the latest pending request", async () => {
  const calls: string[][] = [];

  const result = await waitForDevicePairingApproval(
    {
      waitMs: 5000,
      pollIntervalMs: 25,
      gatewayUrl: "ws://127.0.0.1:18789",
      gatewayToken: "secret-token",
    },
    "openclaw",
    {
      now: (() => {
        let current = 0;
        return () => current;
      })(),
      sleep: async () => {},
      runOpenClaw: async (_binary, args) => {
        calls.push(args);
        if (args[1] === "list") {
          return JSON.stringify({
            pending: [{ requestId: "req-latest" }],
            paired: [],
          });
        }
        return JSON.stringify({ approved: true, requestId: "req-latest" });
      },
    },
  );

  assert.deepEqual(calls, [
    ["devices", "list", "--json", "--url", "ws://127.0.0.1:18789", "--token", "secret-token"],
    ["devices", "approve", "req-latest", "--json", "--url", "ws://127.0.0.1:18789", "--token", "secret-token"],
  ]);
  assert.deepEqual(result, {
    paired: true,
    timedOut: false,
    error: null,
    requestId: "req-latest",
  });
});

test("waitForDevicePairingApproval retries until a pending request appears", async () => {
  const calls: string[][] = [];
  let now = 0;
  let listCount = 0;

  const result = await waitForDevicePairingApproval(
    {
      waitMs: 5000,
      pollIntervalMs: 25,
      gatewayUrl: null,
      gatewayToken: null,
    },
    "openclaw",
    {
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
      runOpenClaw: async (_binary, args) => {
        calls.push(args);
        if (args[1] === "list") {
          listCount += 1;
          return JSON.stringify({
            pending: listCount < 3 ? [] : [{ id: "req-3" }],
            paired: [],
          });
        }
        return JSON.stringify({ approved: true, requestId: "req-3" });
      },
    },
  );

  assert.equal(calls.filter((args) => args[1] === "list").length, 3);
  assert.equal(calls.filter((args) => args[1] === "approve").length, 1);
  assert.deepEqual(result, {
    paired: true,
    timedOut: false,
    error: null,
    requestId: "req-3",
  });
});

test("waitForDevicePairingApproval times out without failing init", async () => {
  let now = 0;

  const result = await waitForDevicePairingApproval(
    {
      waitMs: 60,
      pollIntervalMs: 25,
      gatewayUrl: null,
      gatewayToken: null,
    },
    "openclaw",
    {
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
      runOpenClaw: async () => JSON.stringify({ pending: [], paired: [] }),
    },
  );

  assert.deepEqual(result, {
    paired: false,
    timedOut: true,
    error: null,
    requestId: null,
  });
});

test("waitForDevicePairingApproval returns a soft error on terminal gateway failures", async () => {
  const result = await waitForDevicePairingApproval(
    {
      waitMs: 5000,
      pollIntervalMs: 25,
      gatewayUrl: null,
      gatewayToken: null,
    },
    "openclaw",
    {
      now: () => 0,
      sleep: async () => {},
      runOpenClaw: async () => {
        throw new Error("AUTH_UNAUTHORIZED: token mismatch");
      },
    },
  );

  assert.deepEqual(result, {
    paired: false,
    timedOut: false,
    error: "AUTH_UNAUTHORIZED: token mismatch",
    requestId: null,
  });
});

test("initPrettyClaw fails when config_dir agent prompt files are missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-cli-init-missing-agent-files-"));
  const paths = buildPaths(root);

  await mkdir(join(root, "config"), { recursive: true });
  await writeFile(
    join(root, "config", "characters.en.template.json"),
    JSON.stringify(
      [
        {
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
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  const result = await initPrettyClaw(root, "openclaw", "en", root);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.error,
      `Missing PrettyClaw agent prompt file: ${join(root, ".config", "prettyclaw", "agents", "yuki", "SOUL.md")}`,
    );
  }
});

test("initPrettyClaw seeds locale character config and Sana prompt files before bootstrap", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-cli-init-seeding-"));
  const sourceRoot = process.cwd();
  const templatePath = join(sourceRoot, "config", "characters.en.template.json");
  const yukiIdentityPath = join(sourceRoot, "config", "agents", "en", "yuki", "IDENTITY.md");
  const yukiSoulPath = join(sourceRoot, "config", "agents", "en", "yuki", "SOUL.md");
  const sanaIdentityPath = join(sourceRoot, "config", "agents", "en", "sana", "IDENTITY.md");
  const sanaSoulPath = join(sourceRoot, "config", "agents", "en", "sana", "SOUL.md");

  await mkdir(join(root, "config", "agents", "en", "yuki"), { recursive: true });
  await mkdir(join(root, "config", "agents", "en", "sana"), { recursive: true });
  await writeFile(join(root, "config", "characters.en.template.json"), await readFile(templatePath, "utf-8"), "utf-8");
  await writeFile(join(root, "config", "agents", "en", "yuki", "IDENTITY.md"), await readFile(yukiIdentityPath, "utf-8"), "utf-8");
  await writeFile(join(root, "config", "agents", "en", "yuki", "SOUL.md"), await readFile(yukiSoulPath, "utf-8"), "utf-8");
  await writeFile(join(root, "config", "agents", "en", "sana", "IDENTITY.md"), await readFile(sanaIdentityPath, "utf-8"), "utf-8");
  await writeFile(join(root, "config", "agents", "en", "sana", "SOUL.md"), await readFile(sanaSoulPath, "utf-8"), "utf-8");

  const result = await initPrettyClaw(root, "node", "en", root);

  assert.equal(result.ok, false);
  assert.equal(existsSync(join(root, ".config", "prettyclaw", "characters.en.json")), true);
  assert.equal(existsSync(join(root, ".config", "prettyclaw", "agents", "yuki", "en", "IDENTITY.md")), true);
  assert.equal(existsSync(join(root, ".config", "prettyclaw", "agents", "yuki", "en", "SOUL.md")), true);
  assert.equal(existsSync(join(root, ".config", "prettyclaw", "agents", "sana", "en", "IDENTITY.md")), true);
  assert.equal(existsSync(join(root, ".config", "prettyclaw", "agents", "sana", "en", "SOUL.md")), true);
  assert.equal(
    await readFile(join(root, ".config", "prettyclaw", "agents", "sana", "en", "IDENTITY.md"), "utf-8"),
    await readFile(sanaIdentityPath, "utf-8"),
  );
  assert.equal(
    await readFile(join(root, ".config", "prettyclaw", "agents", "sana", "en", "SOUL.md"), "utf-8"),
    await readFile(sanaSoulPath, "utf-8"),
  );
});
