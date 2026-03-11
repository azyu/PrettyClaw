import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHistoryMessageContent } from "./chat-history.ts";

test("normalizeHistoryMessageContent extracts text from stringified user content blocks", () => {
  const content = '[{"type":"text","text":"자기 소개 부탁해"}]';

  assert.equal(normalizeHistoryMessageContent(content), "자기 소개 부탁해");
});

test("normalizeHistoryMessageContent extracts assistant text from stringified structured content", () => {
  const content = '[{"type":"thinking","thinking":""},{"type":"text","text":" 안녕, 나는 유키야.\\n잘 부탁해.","textSignature":"{\\"v\\":1}"}]';

  assert.equal(normalizeHistoryMessageContent(content), "안녕, 나는 유키야.\n잘 부탁해.");
});

test("normalizeHistoryMessageContent leaves plain text untouched", () => {
  const content = "이미 평문인 메시지";

  assert.equal(normalizeHistoryMessageContent(content), content);
});
