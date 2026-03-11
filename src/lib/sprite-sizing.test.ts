import test from "node:test";
import assert from "node:assert/strict";
import { getMaxSpriteDimension } from "./sprite-sizing.ts";

test("getMaxSpriteDimension falls back to the default dimension when no stage size is available", () => {
  assert.equal(getMaxSpriteDimension(undefined, 1), 820);
  assert.equal(getMaxSpriteDimension(undefined, 2), 410);
});

test("getMaxSpriteDimension uses only stage height when sizing a sprite", () => {
  assert.equal(
    getMaxSpriteDimension(
      {
        width: 320,
        height: 1000,
      },
      1,
    ),
    820,
  );
  assert.equal(
    getMaxSpriteDimension(
      {
        width: 3200,
        height: 1000,
      },
      1,
    ),
    820,
  );
});

test("getMaxSpriteDimension scales the height-based limit for spriteScale", () => {
  assert.equal(
    getMaxSpriteDimension(
      {
        width: 1200,
        height: 600,
      },
      2,
    ),
    264,
  );
});
