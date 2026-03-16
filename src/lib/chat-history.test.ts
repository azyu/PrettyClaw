import test from "node:test";
import assert from "node:assert/strict";
import {
  isPayloadOnlyHistoryMessage,
  shouldDisplayHistoryMessage,
  normalizeHistoryMessage,
  normalizeHistoryMessageContent,
} from "./chat-history.ts";

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

test("normalizeHistoryMessage separates tool payload from assistant text", () => {
  const content = [
    { type: "thinking", thinking: "" },
    {
      type: "toolCall",
      id: "call_123",
      name: "read",
      arguments: { file_path: "/tmp/SOUL.md" },
    },
    { type: "text", text: "안녕, 나는 유키야." },
  ];

  assert.deepEqual(normalizeHistoryMessage(content), {
    content: "안녕, 나는 유키야.",
    developerContent: JSON.stringify(
      [
        { type: "thinking", thinking: "" },
        {
          type: "toolCall",
          id: "call_123",
          name: "read",
          arguments: { file_path: "/tmp/SOUL.md" },
        },
      ],
      null,
      2,
    ),
  });
});

test("normalizeHistoryMessage keeps developer payload hidden from default content", () => {
  const content = [
    {
      type: "toolCall",
      id: "call_123",
      name: "read",
      arguments: { file_path: "/tmp/SOUL.md" },
    },
  ];

  assert.deepEqual(normalizeHistoryMessage(content), {
    content: "",
    developerContent: JSON.stringify(
      [
        {
          type: "toolCall",
          id: "call_123",
          name: "read",
          arguments: { file_path: "/tmp/SOUL.md" },
        },
      ],
      null,
      2,
    ),
  });
});

test("shouldDisplayHistoryMessage hides payload-only history when developer mode is off", () => {
  assert.equal(
    shouldDisplayHistoryMessage(
      {
        id: "assistant-1",
        role: "assistant",
        content: "",
        developerContent: '[{"type":"toolCall"}]',
        timestamp: 0,
      },
      false,
    ),
    false,
  );
});

test("shouldDisplayHistoryMessage keeps payload-only history visible in developer mode", () => {
  assert.equal(
    shouldDisplayHistoryMessage(
      {
        id: "assistant-1",
        role: "assistant",
        content: "",
        developerContent: '[{"type":"toolCall"}]',
        timestamp: 0,
      },
      true,
    ),
    true,
  );
});

test("isPayloadOnlyHistoryMessage detects messages that should render as developer payload only", () => {
  assert.equal(
    isPayloadOnlyHistoryMessage({
      id: "assistant-1",
      role: "assistant",
      content: "   ",
      developerContent: '[{"type":"toolCall"}]',
      timestamp: 0,
    }),
    true,
  );
});
