import type { BuyerResult } from "./agent/buyer.ts";
import type { Locale, StorefrontContext } from "./shopify/storefront.ts";

export type Verdict = "pass" | "fail" | "skipped" | "indeterminate";

/**
 * Why a run could not reach a conclusive verdict. Setup and API problems are
 * kept apart from buyer (agent) problems so they are never read as a
 * storefront failure.
 */
export type ErrorKind =
  | "setup"
  | "api"
  | "browser"
  | "buyer"
  /** The storefront or Storefront API context changed or could not be confirmed during the run. */
  | "context"
  | "timeout"
  | "internal";

export type Outcome = {
  verdict: Verdict;
  reason: string;
  errorKind?: ErrorKind;
  details?: Record<string, unknown>;
};

export type CheckpointOutcome = Outcome & { verdict: Exclude<Verdict, "skipped"> };

export type CheckpointReport = CheckpointOutcome & {
  name: string;
  objective: string;
  buyer: BuyerResult;
  /** Set when the runner stopped the buyer at the first checkout handoff. */
  stoppedOn?: "checkout";
};

export type RunResult = {
  schemaVersion: 1;
  runId: string;
  scenario: string;
  verdict: Verdict;
  reason: string;
  errorKind?: ErrorKind;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  target: {
    storefrontUrl: string;
    apiOrigin: string;
    apiVersion: string;
  };
  context: RunContext;
  limits: { maxSteps: number; timeoutMs: number; catalogPages: number };
  metadata: RunMetadata;
  pinned?: Record<string, unknown>;
  /** The page the runner opened before the buyer started. */
  startUrl?: string;
  checkpoints: CheckpointReport[];
  observations: { evidenceRecords: number; standardEvents: number; checkoutCaptured: boolean };
  artifacts: { directory: string; evidence: string; result: string };
  /** Cleanup and artifact problems. These do not change the verdict. */
  warnings: string[];
};

/**
 * The one context source of a run: the country and language that the storefront page showed
 * at preflight. The CLI never sets the market (no cookies or headers).
 */
export type RunContext = {
  /** `--country` and `--language`: constraints the resolved context must meet. */
  requested: Locale;
  /** The frozen context. Every Storefront API query uses it. Absent when preflight failed. */
  resolved?: StorefrontContext;
  /** Country and language reads in order: browser evidence and runner checks. */
  observations: LocaleObservation[];
  /** Why the context could not be kept. Set with `errorKind: context` or `setup`. */
  mismatch?: string;
};

export type LocaleObservation = {
  source: "browser" | "runner";
  /** The runner step, for runner reads. */
  step?: string;
  country: string | null;
  language: string | null;
  url?: string;
  /**
   * `carried-forward`: the page set no locale, so the runner kept the frozen run context as an
   * assumption. The values are copied from the frozen context, not read from the page.
   */
  verification?: "carried-forward";
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
