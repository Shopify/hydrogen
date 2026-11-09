import type { BuyerResult } from "./agent/buyer.ts";
import type { StorefrontContext } from "./shopify/storefront.ts";

export type Verdict = "pass" | "fail" | "skipped" | "indeterminate";

export type Outcome = {
  verdict: Verdict;
  reason: string;
  details?: Record<string, unknown>;
};

export type CheckpointOutcome = Outcome & { verdict: Exclude<Verdict, "skipped"> };

export type CheckpointReport = CheckpointOutcome & {
  name: string;
  objective: string;
  buyer: BuyerResult;
};

export type RunResult = {
  schemaVersion: 1;
  runId: string;
  scenario: string;
  verdict: Verdict;
  reason: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  target: {
    storefrontUrl: string;
    apiOrigin: string;
    apiVersion: string;
  };
  /**
   * The run context: the configured `--country` and `--language`. The catalog queries and the
   * buyer objective use it. It is not read from or checked against the browser page.
   */
  context: StorefrontContext;
  limits: { maxSteps: number; timeoutMs: number; catalogPages: number };
  metadata: RunMetadata;
  pinned?: Record<string, unknown>;
  /** The page the runner opened before the buyer started. */
  startUrl?: string;
  checkpoints: CheckpointReport[];
  artifacts: { directory: string };
  /** Cleanup and artifact problems. These do not change the verdict. */
  warnings: string[];
};

/** Versions that explain a run. Credentials are never recorded. */
export type RunMetadata = {
  node: string;
  gitCommit?: string;
  /** Declared exact versions of the browser and agent libraries. */
  tools: Record<string, string>;
  /** Set when the runner starts the buyer. Skipped runs make no model calls. */
  buyer?: { model: string; promptSha256: string };
};

export const EXIT_CODES = {
  pass: 0,
  skipped: 0,
  fail: 1,
  indeterminate: 2,
  usage: 64,
} as const;

export function exitCodeFor(verdict: Verdict): number {
  return EXIT_CODES[verdict];
}
