import type { StorefrontClient } from "../../client";
import {
  withoutStorefrontHeaderCapture,
  withStorefrontApiVersion,
  withStorefrontClientCache,
} from "../../client/client";
import { StorefrontTimeoutError } from "../../client/errors";
import { Cache } from "../cache";
import {
  ROLLOUTS_ASSIGN_API_VERSION,
  ROLLOUTS_ASSIGN_MUTATION,
  findEssentialSetCookie,
  getRolloutsAssignUserErrorCodes,
} from "../cart/rollouts-assign";
import { getLogger } from "../logging";
import { parseCookieHeader, SHOPIFY_ESSENTIAL_COOKIE } from "../request-context";
import { isObjectRecord } from "../utils/record";

const ROLLOUTS_DOCUMENT_TIMEOUT_IN_MS = 500;
const PREFETCH_HEADERS = ["sec-purpose", "purpose"] as const;
const ROLLOUTS_ASSIGNMENT_ACTIVE_QUERY: string = `
  query RolloutsAssignmentActive {
    rolloutsAssignmentActive
  }
`;
const ROLLOUTS_ASSIGNMENT_ACTIVE_STRATEGY = Cache({ maxAge: 30, staleWhileRevalidate: 300 });

const log = getLogger("rollouts");

/** The facts about the incoming request that decide whether the helper assigns a buyer. */
export type DocumentRolloutsFacts = {
  method?: string;
  documentRequest: boolean;
  prefetch: boolean;
  privateClient: boolean;
  hasEssentialCookie: boolean;
};

/** The state of one document assignment. */
export type State =
  | { status: "Skipped" }
  | { status: "CheckingShop" }
  | { status: "Assigning" }
  | { status: "Done"; setCookie?: string };

/** What the steps of one document assignment can learn. */
export type Event =
  | { type: "Started"; facts: DocumentRolloutsFacts }
  | { type: "ShopSignal"; result: "active" | "inactive" | "failed" }
  | { type: "Assigned"; setCookie: string }
  | { type: "NoAssignment" }
  | { type: "AssignmentFailed"; reason: "error" | "timedOut" };

/** The work that answers one event. */
export type Effect = { type: "FetchShopSignal" } | { type: "CallRolloutsAssign" };

/** The cookies that `applySetCookies()` adds to the response of one document request. */
export type DocumentRolloutsAssignment = {
  applySetCookies(headers: Headers): Promise<void>;
};

/**
 * Assigns a buyer with no Shopify session to the shop's checkout rollouts while a page request
 * runs, so the HTML document that the request answers with already carries the buyer's session.
 *
 * Call the function in root middleware before you render the page, and await `applySetCookies()`
 * on the response headers after rendering, before `requestContext.applyResponseHeaders()`. The
 * method appends the `_shopify_essential` cookie from the `rolloutsAssign` mutation and nothing
 * else, and the request context then makes the response private and uncacheable.
 *
 * The helper only assigns a `GET` document request from a browser, with a private Storefront API
 * client, when the request carries no `_shopify_essential` cookie, and when the shop's cached
 * `rolloutsAssignmentActive` field is true. It waits at most half a second and never throws: a
 * failed, slow, or empty assignment leaves the response unchanged.
 *
 * Skip the call for bots, and for anything but a page load. React Router passes client data
 * requests through the same middleware.
 *
 * @param storefrontClient The client for this request. The helper uses its request context for the
 * request headers and its cookies.
 * @param request The incoming request, which names the method and the prefetch headers.
 * @returns The headers to update once the page rendered.
 * @publicDocs
 */
export function assignRolloutsOnDocument(
  storefrontClient: StorefrontClient,
  request: Request,
): DocumentRolloutsAssignment {
  const assignment = drive(storefrontClient, factsOf(storefrontClient, request));

  return {
    async applySetCookies(headers) {
      const state = await assignment;
      if (state.status === "Done" && state.setCookie) headers.append("set-cookie", state.setCookie);
    },
  };
}

/**
 * The state machine of one document assignment. Pure and total: an event that the current state
 * doesn't expect leaves the state unchanged and returns no effects.
 */
export function step(state: State, event: Event): [State, Effect[]] {
  switch (event.type) {
    case "Started":
      if (state.status !== "Skipped" || !shouldAssign(event.facts)) return [state, []];
      return [{ status: "CheckingShop" }, [{ type: "FetchShopSignal" }]];
    case "ShopSignal":
      if (state.status !== "CheckingShop") return [state, []];
      return event.result === "active"
        ? [{ status: "Assigning" }, [{ type: "CallRolloutsAssign" }]]
        : [{ status: "Done" }, []];
    case "Assigned":
      if (state.status !== "Assigning") return [state, []];
      return [{ status: "Done", setCookie: event.setCookie }, []];
    case "NoAssignment":
    case "AssignmentFailed":
      if (state.status !== "Assigning") return [state, []];
      return [{ status: "Done" }, []];
  }
}

/** Runs one effect against the Storefront API and returns the event that answers it. */
export async function perform(effect: Effect, storefrontClient: StorefrontClient): Promise<Event> {
  try {
    return await withDeadline((signal) =>
      effect.type === "FetchShopSignal"
        ? fetchShopSignal(storefrontClient, signal)
        : callRolloutsAssign(storefrontClient, signal),
    );
  } catch (error) {
    if (effect.type === "FetchShopSignal") {
      log.warn("rollouts assignment signal failed", { error });
      return { type: "ShopSignal", result: "failed" };
    }

    log.warn("rollouts assignment failed", { error });
    return {
      type: "AssignmentFailed",
      reason: error instanceof StorefrontTimeoutError ? "timedOut" : "error",
    };
  }
}

async function drive(storefrontClient: StorefrontClient, facts: DocumentRolloutsFacts) {
  let state: State = { status: "Skipped" };
  const events: Event[] = [{ type: "Started", facts }];

  for (let event = events.shift(); event; event = events.shift()) {
    const [next, effects] = step(state, event);
    state = next;
    for (const effect of effects) events.push(await perform(effect, storefrontClient));
  }

  return state;
}

function factsOf(storefrontClient: StorefrontClient, request: Request): DocumentRolloutsFacts {
  return {
    method: request.method,
    documentRequest: isDocumentRequest(request),
    prefetch: PREFETCH_HEADERS.some((header) =>
      request.headers.get(header)?.toLowerCase().includes("prefetch"),
    ),
    privateClient: storefrontClient.type === "private",
    hasEssentialCookie: parseCookieHeader(storefrontClient.requestContext.cookie).has(
      SHOPIFY_ESSENTIAL_COOKIE,
    ),
  };
}

function isDocumentRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (request.headers.get("sec-fetch-dest") === "document") return true;

  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function shouldAssign(facts: DocumentRolloutsFacts): boolean {
  return (
    facts.method?.toUpperCase() === "GET" &&
    facts.documentRequest &&
    !facts.prefetch &&
    facts.privateClient &&
    !facts.hasEssentialCookie
  );
}

async function fetchShopSignal(
  storefrontClient: StorefrontClient,
  signal: AbortSignal,
): Promise<Event> {
  const result = await storefrontClient.graphql(
    ROLLOUTS_ASSIGNMENT_ACTIVE_QUERY,
    withStorefrontApiVersion(
      withStorefrontClientCache(
        storefrontClient,
        withoutStorefrontHeaderCapture({ signal }),
        ROLLOUTS_ASSIGNMENT_ACTIVE_STRATEGY,
      ),
      ROLLOUTS_ASSIGN_API_VERSION,
    ),
  );

  if (result.errors) {
    log.warn("rollouts assignment signal returned errors", {
      errors: result.errors.map(({ message }) => message),
    });
    return { type: "ShopSignal", result: "failed" };
  }

  const data: unknown = result.data;

  return {
    type: "ShopSignal",
    result: isObjectRecord(data) && data.rolloutsAssignmentActive === true ? "active" : "inactive",
  };
}

async function callRolloutsAssign(
  storefrontClient: StorefrontClient,
  signal: AbortSignal,
): Promise<Event> {
  const result = await storefrontClient.graphql(
    ROLLOUTS_ASSIGN_MUTATION,
    withoutStorefrontHeaderCapture(
      withStorefrontApiVersion({ signal }, ROLLOUTS_ASSIGN_API_VERSION),
    ),
  );

  const userErrorCodes = getRolloutsAssignUserErrorCodes(result.data);
  if (result.errors || userErrorCodes.length > 0) {
    log.warn("rollouts assignment returned errors", {
      errors: result.errors?.map(({ message }) => message),
      userErrorCodes,
    });
    return { type: "AssignmentFailed", reason: "error" };
  }

  storefrontClient.requestContext.captureSubrequestHeaders(result.headers);
  const setCookie = findEssentialSetCookie(result.headers.getSetCookie());
  if (!setCookie) return { type: "NoAssignment" };

  storefrontClient.requestContext.markResponseAsSessionEstablishing("rollouts assignment");
  return { type: "Assigned", setCookie };
}

async function withDeadline<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const deadline = new AbortController();
  const timeoutId = setTimeout(() => {
    deadline.abort(new StorefrontTimeoutError(ROLLOUTS_DOCUMENT_TIMEOUT_IN_MS));
  }, ROLLOUTS_DOCUMENT_TIMEOUT_IN_MS);

  try {
    return await work(deadline.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}
