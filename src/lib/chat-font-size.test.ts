import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_FONT_SIZE_STORAGE_KEY,
  DEFAULT_CHAT_FONT_SIZE_PX,
  MAX_CHAT_FONT_SIZE_PX,
  MIN_CHAT_FONT_SIZE_PX,
  clampChatFontSizePx,
  getChatFontSizeCssVars,
  getChatFontSizeStyle,
  loadChatFontSizePx,
  resolveChatFontSizeCommit,
  saveChatFontSizePx,
} from "./chat-font-size.ts";

test("clampChatFontSizePx keeps values inside the supported range", () => {
  assert.equal(clampChatFontSizePx(10), MIN_CHAT_FONT_SIZE_PX);
  assert.equal(clampChatFontSizePx(14), 14);
  assert.equal(clampChatFontSizePx(40), MAX_CHAT_FONT_SIZE_PX);
});

test("loadChatFontSizePx falls back to the default for missing or invalid data", () => {
  const missingStorage = {
    getItem: (_key: string) => null,
  };
  const invalidStorage = {
    getItem: (_key: string) => "\"oops\"",
  };

  assert.equal(loadChatFontSizePx(missingStorage), DEFAULT_CHAT_FONT_SIZE_PX);
  assert.equal(loadChatFontSizePx(invalidStorage), DEFAULT_CHAT_FONT_SIZE_PX);
});

test("loadChatFontSizePx clamps persisted values to the supported range", () => {
  const storage = {
    getItem: (_key: string) => "32",
  };

  assert.equal(loadChatFontSizePx(storage), MAX_CHAT_FONT_SIZE_PX);
});

test("saveChatFontSizePx persists a clamped numeric value", () => {
  const writes = new Map<string, string>();
  const storage = {
    setItem: (key: string, value: string) => {
      writes.set(key, value);
    },
  };

  saveChatFontSizePx(9, storage);

  assert.equal(writes.get(CHAT_FONT_SIZE_STORAGE_KEY), JSON.stringify(MIN_CHAT_FONT_SIZE_PX));
});

test("getChatFontSizeCssVars returns stable CSS variable values", () => {
  assert.deepEqual(getChatFontSizeCssVars(14), {
    "--chat-font-size-px": "14px",
    "--chat-line-height": "1.6",
  });

  assert.deepEqual(getChatFontSizeCssVars(18), {
    "--chat-font-size-px": "18px",
    "--chat-line-height": "1.7",
  });
});

test("getChatFontSizeStyle returns direct inline style values", () => {
  assert.deepEqual(getChatFontSizeStyle(20), {
    fontSize: "20px",
    lineHeight: "1.7",
  });
});

test("resolveChatFontSizeCommit uses the latest typed input value", () => {
  assert.deepEqual(resolveChatFontSizeCommit("18", 14), {
    nextInput: "18",
    nextSize: 18,
  });
});

test("resolveChatFontSizeCommit falls back to the current size for blank input", () => {
  assert.deepEqual(resolveChatFontSizeCommit("", 14), {
    nextInput: "14",
    nextSize: null,
  });
});
