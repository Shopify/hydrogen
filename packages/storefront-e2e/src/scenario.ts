import type { BuyerResult } from "./agent/buyer.ts";
import type { EvidenceRecord } from "./evidence.ts";
import type { CheckpointOutcome } from "./result.ts";
import type { StorefrontApi, StorefrontContext } from "./shopify/storefront.ts";

/** Shopify Standard Events the browser recorder supports. Hydrogen analytics are not recorded. */
export const STANDARD_EVENT_NAMES = [
  "shopify:page:view",
  "shopify:product:view",
  "shopify:product:select",
  "shopify:collection:view",
  "shopify:collection:update",
  "shopify:search:update",
  "shopify:cart:view",
  "shopify:cart:error",
  "shopify:cart:lines-update",
  "shopify:cart:note-update",
  "shopify:cart:attributes-update",
  "shopify:cart:discount-update",
] as const;

export type StandardEventName = (typeof STANDARD_EVENT_NAMES)[number];

export type ScenarioContext = {
  api: StorefrontApi;
  storefrontUrl: URL;
  /**
   * The configured country and language (`--country`, `--language`). Every Storefront API query
   * uses it with an explicit `@inContext`. It is not read from the browser page.
   */
  context: StorefrontContext;
  catalogPages: number;
  signal: AbortSignal;
};

/**
 * A small, safe explanation of why a step did not give a conclusive result. It never holds
 * raw SDK text, URLs, request bodies, page content, or cart tokens.
 * `unclassified` is used when the cause is not exposed.
 */
export type FailureDetail = {
  source:
    | "agent"
    | "sdk"
    | "action"
    | "browser"
    | "cart-json"
    | "storefront"
    | "storefront-api"
    | "runner";
  code: string;
  httpStatus?: number;
};

/** Why the cart JSON could not be read. Fixed messages only. */
export type CartReadErrorCode =
  | "page-unavailable"
  | "unsupported-root"
  | "redirect-refused"
  | "network"
  | "timeout"
  | "http-status"
  | "invalid-json"
  | "invalid-response"
  | "unreadable";

export class CartReadError extends Error {
  readonly code: CartReadErrorCode;
  readonly httpStatus: number | undefined;

  constructor(code: CartReadErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "CartReadError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** One cart line: a ProductVariant GID and a positive quantity. */
export type CartLine = { variantId: string; quantity: number };

/**
 * The active cart of the browser session, read from the storefront cart JSON endpoint. It holds
 * business fields only: no cart ID, token, note, attributes, or line properties. `endpoint` is
 * the origin and path that was read (no query). `totalQuantity` is the response `item_count`.
 */
export type CartSnapshot = { endpoint: string; totalQuantity: number; lines: CartLine[] };

export type CheckpointContext = {
  api: StorefrontApi;
  storefrontUrl: URL;
  /** The configured run context (`--country`, `--language`). Not read from the browser page. */
  context: StorefrontContext;
  /** Raw evidence observed so far in this run. Memory only. */
  evidence: readonly EvidenceRecord[];
  buyer: BuyerResult;
  signal: AbortSignal;
  /**
   * Reads the active cart of the live browser session, after the buyer was detached. Absent when
   * the driver has no reader or the page is a blocked checkout error page. Rejects with a
   * {@link CartReadError} when the cart JSON cannot be read or has another shape.
   */
  readCart?: (signal: AbortSignal) => Promise<CartSnapshot>;
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
  | { status: "skipped" | "indeterminate"; reason: string };

/**
 * A scenario pins its data and start page in `prepare` (or skips), then runs
 * ordered checkpoints in one browser session. The runner opens that session
 * and opens the storefront page before `prepare`, so `prepare` never starts a buyer.
 */
export type Scenario = {
  id: string;
  summary: string;
  /**
   * The Standard Events the browser records for this scenario, from the session start (before
   * `prepare`). Absent: none. They are diagnostic evidence only, never a cart reference.
   */
  standardEvents?: readonly StandardEventName[];
  prepare(context: ScenarioContext): Promise<Preparation>;
};
