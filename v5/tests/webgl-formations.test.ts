import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { buildFormations, prepareFormations } from "../src/webgl/formations.ts";

test("formation preparation completes when a busy browser never grants an idle period", async () => {
  const original = globalThis.requestIdleCallback;
  // Model a busy browser's idle queue. The sculpture must not wait on it.
  globalThis.requestIdleCallback = () => 1;
  try {
    const result = await Promise.race([
      prepareFormations(128).then(() => "prepared"),
      new Promise((resolve) => setTimeout(() => resolve("still waiting for idle"), 350)),
    ]);
    assert.equal(result, "prepared");
  } finally {
    if (original) globalThis.requestIdleCallback = original;
    else delete (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback;
  }
});

test("cooperative preparation preserves all six original deterministic formations", async () => {
  // Captured from the untouched original generator, including random attributes.
  const expected = "aeb5021e8322a3d18f078d89976691ac7dd3a1b3c0a85463f94a540933b58fb4";
  await prepareFormations(128);
  const built = buildFormations(128);
  assert.equal(built.targets.length, 6);
  const hash = createHash("sha256");
  for (const values of [...built.targets, built.rnd]) {
    assert.equal(values.length, 128 * 3);
    assert.ok(values.every(Number.isFinite));
    hash.update(new Uint8Array(values.buffer));
  }
  assert.equal(hash.digest("hex"), expected);
});

test("preparation yields between formations so input can run before completion", async () => {
  let otherTaskRan = false;
  const pending = prepareFormations(129);
  setTimeout(() => { otherTaskRan = true; }, 0);
  await pending;
  assert.equal(otherTaskRan, true);
});
