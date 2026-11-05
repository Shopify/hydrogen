import type { BuyerResult } from "./agent/buyer.ts";
import type { EvidenceRecord } from "./evidence.ts";
import type { CheckpointOutcome, ErrorKind } from "./result.ts";
import type { StorefrontApi, StorefrontContext } from "./shopify/storefront.ts";

export type ScenarioContext = {
  api: StorefrontApi;
  storefrontUrl: URL;
  /**
   * The country and language the storefront page showed at preflight, frozen for the run.
   * Every Storefront API query must use it with an explicit `@inContext`.
   */
  context: StorefrontContext;
  catalogPages: number;
  signal: AbortSignal;
};

/**
 * A small, safe explanation of why a step did not give a conclusive result. It never holds
 * raw SDK text, URLs, request bodies, page content, or cart tokens. `errorKind` stays the
 * primary routing; this only explains it. `unclassified` is used when the cause is not exposed.
 */
export type FailureDetail = {
  source:
    | "agent"
    | "sdk"
    | "action"
    | "browser"
    | "page-cart-action"
    | "storefront"
    | "storefront-api"
    | "runner";
  code: string;
  httpStatus?: number;
};

/** Why the page cart action could not be read. Fixed messages only. */
export type CartReferenceErrorCode =
  | "failed"
  | "malformed"
  | "timeout"
  | "unusable-id"
  | "unreadable";

export class CartReferenceError extends Error {
  readonly code: CartReferenceErrorCode;

  constructor(code: CartReferenceErrorCode, message: string) {
    super(message);
    this.name = "CartReferenceError";
    this.code = code;
  }
}

/**
 * What the current storefront page reports as its active cart, through the read-only
 * Shopify Standard Action `getCart()`. The ID is only a candidate: assertions read the cart
 * through the configured Storefront API. `unavailable` means the page has no such action.
 */
export type CartReference =
  | { status: "available"; cartId: string }
  | { status: "empty" }
  | { status: "unavailable" };

export type CheckpointContext = {
  api: StorefrontApi;
  storefrontUrl: URL;
  /** The frozen run context. Assertions query the Storefront API in this context only. */
  context: StorefrontContext;
  /** Raw evidence observed so far in this run. Memory only. */
  evidence: readonly EvidenceRecord[];
  buyer: BuyerResult;
  signal: AbortSignal;
  /**
   * Reads the cart reference of the live page, after the buyer was detached. Absent when the
   * driver has no reader or the page is a blocked checkout error page. Rejects with a fixed
   * message when the action fails, returns a malformed value, or times out. The cart ID stays
   * in memory.
   */
  readCartReference?: (signal: AbortSignal) => Promise<CartReference>;
};

/** One buyer objective, then a code assertion against observed state. */
export type Checkpoint = {
  name: string;
  objective: string;
  /**
   * `checkout` makes the checkpoint terminal: the runner aborts the buyer the
   * moment the first checkout handoff is observed, then detaches it before
   * the assertion runs.
   */
  stopOn?: "checkout";
  assert(context: CheckpointContext): Promise<CheckpointOutcome>;
};

export type Preparation =
  | {
      status: "ready";
      pinned: Record<string, unknown>;
      /** Same-origin page the runner opens before the buyer starts. */
      startUrl: URL;
      checkpoints: readonly Checkpoint[];
    }
  | { status: "skipped" | "indeterminate"; reason: string; errorKind?: ErrorKind };

/**
 * A scenario pins its data and start page in `prepare` (or skips), then runs
 * ordered checkpoints in one browser session. The runner opens that session
 * and resolves the context before `prepare`, so `prepare` never starts a buyer.
 */
export type Scenario = {
  id: string;
  summary: string;
  prepare(context: ScenarioContext): Promise<Preparation>;
};
