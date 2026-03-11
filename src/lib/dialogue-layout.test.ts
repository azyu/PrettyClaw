import test from "node:test";
import assert from "node:assert/strict";
import { resolveBackgroundFocusOffsetPx } from "./dialogue-layout.ts";

test("resolveBackgroundFocusOffsetPx uses the current dock height while expanded", () => {
  assert.equal(resolveBackgroundFocusOffsetPx(220, 180, false, 24), 244);
});

test("resolveBackgroundFocusOffsetPx keeps the last expanded dock height while collapsed", () => {
  assert.equal(resolveBackgroundFocusOffsetPx(56, 220, true, 24), 244);
});

test("resolveBackgroundFocusOffsetPx falls back to the current dock height when no expanded height is stored", () => {
  assert.equal(resolveBackgroundFocusOffsetPx(56, 0, true, 24), 80);
});
