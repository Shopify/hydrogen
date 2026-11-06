import { randomBytes } from "node:crypto";
import { appendFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { serializeEvidence, type EvidenceRecord } from "../evidence.ts";
import type { RunResult } from "../result.ts";

export const EVIDENCE_FILE = "evidence.jsonl";
export const RESULT_FILE = "result.json";

const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type ArtifactStore = {
  directory: string;
  /** Appends one evidence line as soon as it is observed. */
  appendEvidence(record: EvidenceRecord): Promise<void>;
  /** Atomically writes the result. Returns its path. */
  writeResult(result: RunResult): Promise<string>;
};

export function createRunId(scenarioId: string, now: Date = new Date()): string {
  const stamp = now
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  return `${stamp}-${scenarioId}-${randomBytes(4).toString("hex")}`;
}

/** Resolves an output root and rejects unsafe values. Relative paths use `cwd`. */
export function resolveOutputRoot(input: string, cwd: string): string {
  if (input.trim() === "" || input.includes("\0")) {
    throw new Error("Output directory must be a non-empty path.");
  }
  const resolved = path.resolve(cwd, input);
  if (path.parse(resolved).root === resolved) {
    throw new Error("Output directory must not be a filesystem root.");
  }
  return resolved;
}

/** Creates a new, unique run directory under `root`. An existing run directory is never reused. */
export async function createArtifactStore(options: {
  root: string;
  runId: string;
}): Promise<ArtifactStore> {
  if (!RUN_ID.test(options.runId)) {
    throw new Error(`Invalid run ID: ${options.runId}`);
  }
  await mkdir(options.root, { recursive: true });
  const directory = path.join(options.root, options.runId);
  await mkdir(directory);

  const evidencePath = path.join(directory, EVIDENCE_FILE);
  const resultPath = path.join(directory, RESULT_FILE);
  await writeFile(evidencePath, "", "utf8");

  return {
    directory,
    async appendEvidence(record) {
      await appendFile(evidencePath, `${serializeEvidence(record)}\n`, "utf8");
    },
    async writeResult(result) {
      const temporaryPath = `${resultPath}.tmp`;
      await writeFile(temporaryPath, `${serializeEvidence(result, 2)}\n`, "utf8");
      await rename(temporaryPath, resultPath);
      return resultPath;
    },
  };
}
