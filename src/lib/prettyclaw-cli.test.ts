import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureCharacterConfigSeeded,
  getStartValidationError,
  resolvePrettyClawPaths,
  type PrettyClawPaths,
} from "./prettyclaw-cli.ts";

function buildPaths(root: string): PrettyClawPaths {
  return {
    packageRoot: root,
    configDir: join(root, ".config", "prettyclaw"),
    configFile: join(root, ".config", "prettyclaw", "characters.json"),
    templateFile: join(root, "config", "characters.template.json"),
    openClawHome: join(root, ".openclaw"),
  };
}

test("resolvePrettyClawPaths derives config and OpenClaw paths from the package root", () => {
  const result = resolvePrettyClawPaths("/tmp/prettyclaw-package", "/tmp/home");

  assert.equal(result.packageRoot, "/tmp/prettyclaw-package");
  assert.equal(result.configDir, "/tmp/home/.config/prettyclaw");
  assert.equal(result.configFile, "/tmp/home/.config/prettyclaw/characters.json");
  assert.equal(result.templateFile, "/tmp/prettyclaw-package/config/characters.template.json");
  assert.equal(result.openClawHome, "/tmp/home/.openclaw");
});

test("ensureCharacterConfigSeeded copies the template only when characters.json is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "prettyclaw-cli-seed-"));
  const paths = buildPaths(root);

  await mkdir(join(root, "config"), { recursive: true });
  await writeFile(paths.templateFile, JSON.stringify([{ id: "yuki" }], null, 2), "utf-8");

  const first = await ensureCharacterConfigSeeded(paths);
  const second = await ensureCharacterConfigSeeded(paths);

  assert.equal(first, "created");
  assert.equal(second, "existing");
  assert.equal(existsSync(paths.configFile), true);
  assert.equal(await readFile(paths.configFile, "utf-8"), '[\n  {\n    "id": "yuki"\n  }\n]');
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
