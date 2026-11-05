import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, describe, it } from "vitest";

import { DEFAULT_INPUT_ROOT, main, parseReportArgs } from "./report-cli.ts";

const roots: string[] = [];
afterAll(async () => {
  await Promise.all(roots.map(async (root) => rm(root, { recursive: true, force: true })));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "storefront-e2e-report-cli-"));
  roots.push(root);
  return root;
}

async function run(argv: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  let stdout = "";
  let stderr = "";
  const code = await main(argv, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? {},
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
    render: (document) => `<html>${document.runs.map((entry) => entry.reason).join()}</html>`,
  });
  return { code, stdout, stderr };
}

describe("parseReportArgs", () => {
  it("defaults to the live artifact root and its index.html", () => {
    assert.deepEqual(parseReportArgs([], "/work"), {
      kind: "run",
      inputRoot: DEFAULT_INPUT_ROOT,
      outputFile: path.join(DEFAULT_INPUT_ROOT, "index.html"),
    });
    assert.equal(path.basename(DEFAULT_INPUT_ROOT), "live");
  });

  it("resolves --input and --output from the current directory", () => {
    assert.deepEqual(
      parseReportArgs(["--", "--input", "runs", "--output", "out/r.html"], "/work"),
      {
        kind: "run",
        inputRoot: path.resolve("/work", "runs"),
        outputFile: path.resolve("/work", "out/r.html"),
      },
    );
    assert.deepEqual(parseReportArgs(["--input", "runs"], "/work"), {
      kind: "run",
      inputRoot: path.resolve("/work", "runs"),
      outputFile: path.resolve("/work", "runs", "index.html"),
    });
  });

  it("returns help and usage errors", () => {
    assert.deepEqual(parseReportArgs(["--help"], "/work"), { kind: "help" });
    assert.equal(parseReportArgs(["--bogus"], "/work").kind, "error");
    assert.equal(parseReportArgs(["extra"], "/work").kind, "error");
    assert.equal(parseReportArgs(["--input", " "], "/work").kind, "error");
  });
});

describe("main", () => {
  it("prints help", async () => {
    const result = await run(["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /--input <dir>/);
  });

  it("writes the report and prints its path and file URL", async () => {
    const root = await tempRoot();
    const runDirectory = path.join(root, "target", "run");
    await mkdir(runDirectory, { recursive: true });
    await writeFile(
      path.join(runDirectory, "result.json"),
      JSON.stringify({
        runId: "run",
        scenario: "add-to-cart",
        verdict: "pass",
        reason: "All 1 checkpoint(s) passed with sk-abcdefghijklmnopqrstuv",
        startedAt: "2026-11-04T00:00:00.000Z",
        durationMs: 1,
        target: { storefrontUrl: "https://shop.example/" },
      }),
    );

    const result = await run(["--input", "."], { cwd: root });
    const outputFile = path.join(root, "index.html");

    assert.equal(result.code, 0, result.stderr);
    assert.match(
      result.stdout,
      new RegExp(`Report: ${outputFile.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    );
    assert.ok(result.stdout.includes(`Open: ${pathToFileURL(outputFile).href}`));
    assert.match(result.stdout, /Runs: 1 \(1 latest\)/);
    const html = await readFile(outputFile, "utf8");
    assert.match(html, /All 1 checkpoint\(s\) passed/);
    assert.doesNotMatch(html, /sk-abcdefghijklmnopqrstuv/);
  });

  it("explains a missing input directory and redacts credentials in errors", async () => {
    const root = await tempRoot();
    const secret = "credential-value-123456";
    const result = await run(["--input", `missing-${secret}`], {
      cwd: root,
      env: { ANTHROPIC_API_KEY: secret },
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Input directory not found/);
    assert.doesNotMatch(result.stderr, new RegExp(secret));
  });

  it("returns a usage error for bad flags", async () => {
    const result = await run(["--output"]);
    assert.equal(result.code, 64);
    assert.match(result.stderr, /Usage: pnpm storefront-e2e:report/);
  });
});
