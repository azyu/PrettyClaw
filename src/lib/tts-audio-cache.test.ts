import test from "node:test";
import assert from "node:assert/strict";
import { createTtsAudioCache } from "./tts-audio-cache.ts";

test("createTtsAudioCache reuses message keys and clears object URLs", () => {
  const created: string[] = [];
  const revoked: string[] = [];
  const cache = createTtsAudioCache(
    {
      createObjectURL: () => {
        const url = `blob:${created.length + 1}`;
        created.push(url);
        return url;
      },
      revokeObjectURL: (url) => revoked.push(url),
    },
    4,
  );

  const first = cache.store("msg-1", new Blob(["first"]));
  const second = cache.store("msg-1", new Blob(["second"]));

  assert.equal(first.objectUrl, "blob:1");
  assert.equal(second.objectUrl, "blob:2");
  assert.deepEqual(revoked, ["blob:1"]);

  cache.clear();

  assert.deepEqual(revoked, ["blob:1", "blob:2"]);
});

test("createTtsAudioCache evicts the oldest entry when the limit is exceeded", () => {
  const revoked: string[] = [];
  let sequence = 0;
  const cache = createTtsAudioCache(
    {
      createObjectURL: () => {
        sequence += 1;
        return `blob:${sequence}`;
      },
      revokeObjectURL: (url) => revoked.push(url),
    },
    2,
  );

  cache.store("msg-1", new Blob(["one"]));
  cache.store("msg-2", new Blob(["two"]));
  cache.store("msg-3", new Blob(["three"]));

  assert.equal(cache.get("msg-1"), undefined);
  assert.equal(cache.get("msg-2")?.objectUrl, "blob:2");
  assert.equal(cache.get("msg-3")?.objectUrl, "blob:3");
  assert.deepEqual(revoked, ["blob:1"]);
});
