import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, describe, it } from "vitest";

import { generateReport, ReportInputError } from "./generate.ts";
import type { ReportDocument } from "./view-model.ts";

const roots: string[] = [];
afterAll(async () => {
  await Promise.all(roots.map(async (root) => rm(root, { recursive: true, force: true })));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "storefront-e2e-generate-"));
  roots.push(root);
  return root;
}

const RESULT = JSON.stringify({
  runId: "run-1",
  scenario: "add-to-cart",
  verdict: "indeterminate",
  reason: "Checkout navigation was blocked (unsupported checkout URL).",
  startedAt: "2026-11-04T00:00:00.000Z",
  durationMs: 1,
  target: { storefrontUrl: "https://shop.example/" },
  checkpoints: [],
  warnings: [],
});
const EVIDENCE = `${JSON.stringify({ kind: "screenshot", timestamp: 1, data: { step: 1, summary: "s", screenshot: "step-001.png" } })}\n`;

async function artifactTree(): Promise<{ root: string; run: string }> {
  const root = await tempRoot();
  const run = path.join(root, "target", "run-1");
  await mkdir(run, { recursive: true });
  await writeFile(path.join(run, "result.json"), RESULT);
  await writeFile(path.join(run, "evidence.jsonl"), EVIDENCE);
  await writeFile(path.join(run, "step-001.png"), "png");
  return { root, run };
}

function capture(): { render: (document: ReportDocument) => string; documents: ReportDocument[] } {
  const documents: ReportDocument[] = [];
  return {
    documents,
    render: (document) => {
      documents.push(document);
      return `<!doctype html><p>${document.runs.length}</p>`;
    },
  };
}

describe("generateReport", () => {
  it("renders the loaded document to one HTML file and leaves artifacts unchanged", async () => {
    const { root, run } = await artifactTree();
    const { render, documents } = capture();
    const outputFile = path.join(root, "index.html");

    const generated = await generateReport({
      inputRoot: root,
      outputFile,
      render,
      now: new Date("2026-11-04T12:00:00.000Z"),
    });

    assert.equal(generated.outputFile, outputFile);
    assert.equal(await readFile(outputFile, "utf8"), "<!doctype html><p>1</p>");
    assert.equal(documents[0]?.generatedAt, "2026-11-04T12:00:00.000Z");
    assert.equal(documents[0]?.runs[0]?.verdict, "indeterminate");
    assert.equal(documents[0]?.runs[0]?.screenshots[0]?.href, "target/run-1/step-001.png");
    assert.equal(await readFile(path.join(run, "result.json"), "utf8"), RESULT);
    assert.equal(await readFile(path.join(run, "evidence.jsonl"), "utf8"), EVIDENCE);

    // A second run replaces the earlier report.
    await generateReport({ inputRoot: root, outputFile, render });
    assert.equal(await readFile(outputFile, "utf8"), "<!doctype html><p>1</p>");
  });

  it("writes an empty report with a warning when no runs exist", async () => {
    const root = await tempRoot();
    const { render, documents } = capture();

    await generateReport({
      inputRoot: root,
      outputFile: path.join(root, "index.html"),
      render,
    });

    assert.deepEqual(documents[0]?.runs, []);
    assert.equal(documents[0]?.warnings.length, 1);
  });

  it("refuses a missing input directory with an actionable error", async () => {
    const root = await tempRoot();
    await assert.rejects(
      generateReport({
        inputRoot: path.join(root, "missing"),
        outputFile: path.join(root, "index.html"),
        render: capture().render,
      }),
      (error: unknown) =>
        error instanceof ReportInputError &&
        /Input directory not found.*--input/.test(error.message),
    );
  });

  it("refuses outputs that could clobber artifacts or follow a symlink", async () => {
    const { root, run } = await artifactTree();
    const target = path.join(root, "victim.html");
    await writeFile(target, "keep");
    await symlink(target, path.join(root, "link.html"));
    await mkdir(path.join(root, "folder.html"));
    const outputs = [
      path.join(run, "result.json"),
      path.join(run, "evidence.jsonl"),
      path.join(run, "step-001.png"),
      path.join(root, "link.html"),
      path.join(root, "folder.html"),
    ];

    for (const outputFile of outputs) {
      await assert.rejects(
        generateReport({
          inputRoot: root,
          outputFile,
          render: capture().render,
        }),
        ReportInputError,
        outputFile,
      );
    }
    assert.equal(await readFile(target, "utf8"), "keep");
    assert.equal(await readFile(path.join(run, "result.json"), "utf8"), RESULT);
  });

  it("writes outside the input tree with relative links", async () => {
    const { root } = await artifactTree();
    const { render, documents } = capture();
    const outputFile = path.join(root, "..", `${path.basename(root)}-out`, "report.html");
    roots.push(path.dirname(outputFile));

    await generateReport({ inputRoot: root, outputFile, render });

    assert.equal(
      documents[0]?.runs[0]?.resultHref,
      `../${encodeURIComponent(path.basename(root))}/target/run-1/result.json`,
    );
  });
});
