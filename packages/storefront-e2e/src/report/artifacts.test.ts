import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, describe, it } from "vitest";

import type { RunResult } from "../result.ts";
import { createArtifactStore, createRunId } from "./artifacts.ts";

const roots: string[] = [];
afterAll(async () => {
  await Promise.all(roots.map(async (root) => rm(root, { recursive: true, force: true })));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "storefront-e2e-"));
  roots.push(root);
  return root;
}

describe("createArtifactStore", () => {
  it("preserves owner debug data in evidence and results", async () => {
    const root = await tempRoot();
    const store = await createArtifactStore({ root, runId: "run-a" });
    await store.appendEvidence({
      kind: "checkout",
      timestamp: 1,
      data: { url: "https://x.com/cart/c/tokentoken?key=k1", token: "owner-debug-value" },
    });
    await store.appendEvidence({
      kind: "agent-action",
      timestamp: 2,
      data: { text: "typed gid://shopify/Cart/abc?key=z" },
    });
    const resultPath = await store.writeResult({
      reason: "cart gid://shopify/Cart/abc?key=z",
    } as unknown as RunResult);

    const lines = (await readFile(path.join(store.directory, "evidence.jsonl"), "utf8"))
      .trim()
      .split("\n");
    assert.equal(lines.length, 2);
    const written = lines.join("") + (await readFile(resultPath, "utf8"));
    for (const value of ["tokentoken?key=k1", "Cart/abc?key=z", "owner-debug-value"]) {
      assert.ok(written.includes(value), value);
    }
  });

  it("never reuses an existing run directory and rejects unsafe run IDs", async () => {
    const root = await tempRoot();
    await createArtifactStore({ root, runId: "run-b" });
    await assert.rejects(createArtifactStore({ root, runId: "run-b" }), /EEXIST/);
    await assert.rejects(createArtifactStore({ root, runId: "../escape" }), /Invalid run ID/);
  });

  it("creates unique, path-safe run IDs", () => {
    const first = createRunId("add-to-cart", new Date("2026-11-03T10:00:00.123Z"));
    assert.match(first, /^20261103T100000Z-add-to-cart-[0-9a-f]{8}$/);
    assert.notEqual(first, createRunId("add-to-cart", new Date("2026-11-03T10:00:00.123Z")));
  });
});
