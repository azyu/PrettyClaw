import test from "node:test";
import assert from "node:assert/strict";
import { appendLiveDeveloperPayload, stringifyLiveDeveloperPayload } from "./live-developer-payload.ts";

test("appendLiveDeveloperPayload records thinking and tool call events as structured developer payload", () => {
  const withThinking = appendLiveDeveloperPayload([], "thinking", { text: "사용자 의도를 확인 중" });
  const withTool = appendLiveDeveloperPayload(withThinking, "tool", {
    id: "call_123",
    name: "read",
    arguments: { file_path: "/tmp/SOUL.md" },
    phase: "running",
  });

  assert.equal(
    stringifyLiveDeveloperPayload(withTool),
    JSON.stringify(
      [
        { type: "thinking", thinking: "사용자 의도를 확인 중" },
        {
          type: "toolCall",
          id: "call_123",
          name: "read",
          arguments: { file_path: "/tmp/SOUL.md" },
          phase: "running",
        },
      ],
      null,
      2,
    ),
  );
});

test("appendLiveDeveloperPayload appends thinking delta text to the latest thinking block", () => {
  const initial = appendLiveDeveloperPayload([], "thinking", { delta: "첫 문장" });
  const updated = appendLiveDeveloperPayload(initial, "thinking", { delta: " 이어지는 문장" });

  assert.deepEqual(updated, [
    { type: "thinking", thinking: "첫 문장 이어지는 문장" },
  ]);
});

test("appendLiveDeveloperPayload merges repeated tool events for the same tool call", () => {
  const running = appendLiveDeveloperPayload([], "tool", {
    id: "call_123",
    name: "read",
    phase: "running",
  });
  const done = appendLiveDeveloperPayload(running, "tool", {
    id: "call_123",
    name: "read",
    phase: "done",
    result: "ok",
  });

  assert.deepEqual(done, [
    {
      type: "toolCall",
      id: "call_123",
      name: "read",
      phase: "done",
      result: "ok",
    },
  ]);
});
