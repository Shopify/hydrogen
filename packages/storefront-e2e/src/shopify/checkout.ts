import type { EvidenceRecord } from "../evidence.ts";
import {
  expectArray,
  expectNumber,
  expectPageInfo,
  expectRecord,
  expectString,
  isRecord,
  inContext,
  optionalString,
  type StorefrontApi,
  type StorefrontContext,
} from "./storefront.ts";

const CART_GID_PREFIX = "gid://shopify/Cart/";
/** A `%` that does not start a two-digit hex escape. */
const MALFORMED_ESCAPE = /%(?![0-9A-Fa-f]{2})/;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
/** A bound for opaque IDs from evidence. It limits input size only; it is not a format rule. */
const MAX_OPAQUE_ID_LENGTH = 4096;
const CART_LINES_PER_PAGE = 100;
const MAX_CART_PAGES = 10;

/** Path words that are public in route shapes and are never registered as secrets. */
const ROUTE_WORDS = new Set([
  "account",
  "c",
  "cart",
  "checkout",
  "checkouts",
  "cn",
  "co",
  "information",
  "orders",
  "pay",
  "payment",
  "processing",
  "review",
  "shipping",
  "thank-you",
  "thank_you",
]);
const LOCALE_SEGMENT = /^[a-z]{2}(?:-[a-z]{2})?$/i;
const VARIANT_QUANTITIES = /^\d+:\d+(?:,\d+:\d+)*$/;
/**
 * Query parameter names that are public. Any other name is private, because a name alone can
 * carry a token (for example `?deadbeefcafe`).
 */
const QUERY_NAMES = new Set([
  "_ga",
  "_gl",
  "_r",
  "auto_redirect",
  "channel",
  "country",
  "discount",
  "key",
  "language",
  "locale",
  "payment",
  "ref",
  "return_to",
  "skip_shop_pay",
  "step",
]);
const UTM_NAME = /^utm_[a-z]{1,16}$/;
const NO_REFERENCE = "The checkout URL has no supported cart reference.";

/**
 * The public label of a raw path segment: a route word, `:locale`, `:variant-quantities`
 * (`123:1`), or `:number`. Undefined for a private segment, such as a token.
 */
export function publicSegmentLabel(segment: string): string | undefined {
  const lower = segment.toLowerCase();
  if (ROUTE_WORDS.has(lower)) return lower;
  if (LOCALE_SEGMENT.test(segment)) return ":locale";
  if (VARIANT_QUANTITIES.test(segment)) return ":variant-quantities";
  if (/^\d+$/.test(segment)) return ":number";
  return undefined;
}

/** True for query parameter names that are public in route shapes. */
export function isPublicQueryName(name: string): boolean {
  return QUERY_NAMES.has(name) || UTM_NAME.test(name);
}

/** Supported Shopify checkout URL forms that carry a cart reference. */
export type CheckoutForm = "cart-permalink" | "native-checkout" | "shop-checkout";

/**
 * The cart reference in a checkout URL. `token` is the decoded opaque path segment. `cartId` is
 * the Storefront API cart ID for it (`gid://shopify/Cart/<raw token>`, with a single clean `key`
 * when the URL has one). Neither is validated against a format: the API decides.
 */
export type CheckoutReference =
  | { found: true; form: CheckoutForm; token: string; cartId: string }
  | { found: false; problem: string };

/**
 * Reads the cart reference of a checkout URL by URL structure only, after an optional storefront
 * locale prefix:
 * - `/cart/c/<token>` (cart permalink),
 * - `/checkouts/(cn|co)/<token>/...` (native checkout, with optional locale and step segments),
 * - `/checkout/<shop>/(cn|co)/<token>/...` (Shop checkout wrapper).
 *
 * The token is opaque: it is percent-decoded once, and only controls or a malformed escape make
 * it unreadable. Query parameters such as `_r`, `auto_redirect`, and `skip_shop_pay` are not
 * cart data and are ignored. A duplicate, empty, or malformed `key` makes the reference
 * unresolved, because the key is ambiguous.
 */
export function readCheckoutReference(url: URL): CheckoutReference {
  const match = matchReferencePath(url.pathname.split("/").slice(1));
  if (match === undefined) {
    return { found: false, problem: NO_REFERENCE };
  }
  const token = decodeSegment(match.rawToken);
  if (token === undefined) {
    return { found: false, problem: "The checkout URL cart reference is not valid URL syntax." };
  }
  const key = readUrlKey(url);
  if (key === "ambiguous") {
    return { found: false, problem: "The checkout URL cart key is ambiguous." };
  }
  const query = key === undefined ? "" : `?${new URLSearchParams([["key", key]]).toString()}`;
  return {
    found: true,
    form: match.form,
    token,
    cartId: `${CART_GID_PREFIX}${match.rawToken}${query}`,
  };
}

type ReferencePath = { form: CheckoutForm; rawToken: string };

function matchReferencePath(path: readonly string[]): ReferencePath | undefined {
  const segments =
    LOCALE_SEGMENT.test(path[0] ?? "") &&
    ["cart", "checkouts", "checkout"].includes(lowerCase(path[1]))
      ? path.slice(1)
      : path;
  const words = segments.map(lowerCase);
  return permalinkPath(segments, words) ?? nativePath(segments, words) ?? shopPath(segments, words);
}

/** `/cart/c/<token>` with an optional trailing slash and nothing after it. */
function permalinkPath(segments: readonly string[], words: readonly string[]) {
  const rawToken = segments[2] ?? "";
  if (words[0] !== "cart" || words[1] !== "c" || rawToken === "") return undefined;
  if (segments.length > 4 || (segments[3] ?? "") !== "") return undefined;
  return { form: "cart-permalink", rawToken } satisfies ReferencePath;
}

/** `/checkouts/(cn|co)/<token>/...` */
function nativePath(segments: readonly string[], words: readonly string[]) {
  const rawToken = segments[2] ?? "";
  if (words[0] !== "checkouts" || !isExchange(words[1]) || rawToken === "") return undefined;
  return { form: "native-checkout", rawToken } satisfies ReferencePath;
}

/** `/checkout/<shop>/(cn|co)/<token>/...` */
function shopPath(segments: readonly string[], words: readonly string[]) {
  const rawToken = segments[3] ?? "";
  if (words[0] !== "checkout" || (segments[1] ?? "") === "" || !isExchange(words[2])) {
    return undefined;
  }
  return rawToken === ""
    ? undefined
    : ({ form: "shop-checkout", rawToken } satisfies ReferencePath);
}

function isExchange(word: string | undefined): boolean {
  return word === "cn" || word === "co";
}

function lowerCase(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

/** The single clean `key` value, undefined when absent, or `ambiguous`. */
function readUrlKey(url: URL): string | "ambiguous" | undefined {
  const keyPairs = url.search
    .slice(1)
    .split("&")
    .filter((pair) => new URLSearchParams(pair).has("key"));
  if (keyPairs.length > 1 || keyPairs.some((pair) => MALFORMED_ESCAPE.test(pair))) {
    return "ambiguous";
  }
  const key = url.searchParams.get("key");
  if (key === null) {
    return undefined;
  }
  return key === "" || hasControl(key) ? "ambiguous" : key;
}

/**
 * A checkout handoff the browser captured and blocked. It is an unverified candidate: the URL
 * host and the cart are not trusted until `bindCheckout` binds the URL to the cart that the
 * configured Storefront API returns. `cartId` is the cart ID to read first, or undefined when
 * the URL has no readable reference (`problem` says why). The capture is kept either way.
 */
export type CapturedCheckout = {
  url: URL;
  reference: CheckoutReference;
  cartId: string | undefined;
  problem: string | undefined;
};

export type CheckoutParse =
  | { ok: true; checkout: CapturedCheckout }
  | { ok: false; reason: string };

type SafeUrl = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * Parses an absolute checkout URL strictly: `https` only (plain `http` only for loopback
 * fixtures), and no credentials. No host is trusted here.
 */
function parseSafeUrl(raw: string, label: string): SafeUrl {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: `${label} is not valid.` };
  }
  if (url.username !== "" || url.password !== "") {
    return { ok: false, reason: `${label} must not contain credentials.` };
  }
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    return { ok: false, reason: `${label} must use https.` };
  }
  return { ok: true, url };
}

/**
 * True for an opaque ID that may be sent to the API unchanged: non-empty, bounded, and with no
 * controls or spaces. No format is checked.
 */
export function isOpaqueId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value !== "" &&
    value.length <= MAX_OPAQUE_ID_LENGTH &&
    !hasControl(value, { orSpace: true })
  );
}

/**
 * Reads browser `checkout` evidence into an unverified candidate. Only URL hygiene can reject it
 * (no URL, not a URL, credentials, or not https). Any checkout route is kept: the cart reference
 * may be missing, and then `cartId` is undefined and `problem` says why. An observed cart ID is
 * used unchanged when it is an opaque ID and does not name another token than the URL.
 */
export function parseCheckoutEvidence(data: Record<string, unknown>): CheckoutParse {
  if (typeof data.url !== "string") {
    return { ok: false, reason: "Checkout evidence has no URL." };
  }
  const parsed = parseSafeUrl(data.url, "Checkout URL");
  if (!parsed.ok) {
    return parsed;
  }
  const url = parsed.url;
  const reference = readCheckoutReference(url);
  return { ok: true, checkout: { url, reference, ...resolveCartId(data.cartId, reference) } };
}

/** An observed opaque cart ID first, unless it names another token than the URL reference. */
function resolveCartId(
  observed: unknown,
  reference: CheckoutReference,
): { cartId: string | undefined; problem: string | undefined } {
  const id = isOpaqueId(observed) ? observed : undefined;
  const observedToken = id === undefined ? undefined : parseCartId(id)?.token;
  if (reference.found && observedToken !== undefined && observedToken !== reference.token) {
    return { cartId: undefined, problem: "The observed cart ID does not match the checkout URL." };
  }
  if (id !== undefined) {
    return { cartId: id, problem: undefined };
  }
  return reference.found
    ? { cartId: reference.cartId, problem: undefined }
    : { cartId: undefined, problem: reference.problem };
}

/**
 * A Cart GID: `gid://shopify/Cart/<token>` with an optional `?key=<key>`. The token and the key
 * are opaque. Their format and length can change, so only URL syntax is checked, never their
 * characters. `id` is the exact string. The decoded `token` is the cart resource identity. The
 * `key` is response-specific (a live Storefront API probe returned a different key for the same
 * cart on each response), so it is never used to compare carts.
 *
 * This parser only reads identity from IDs. It never rejects an ID before the API reads it.
 */
export type CartId = { id: string; token: string; key: string | undefined };

/**
 * Parses a Cart GID by URL syntax. The token is one percent-decoded path segment. The query is
 * read with `URLSearchParams`, so `%2B`, `%2F`, `%3D`, `%26`, and `%25` inside the key are key
 * characters. A raw `=` inside the key value (base64 padding) is kept. Undefined for: another
 * scheme or authority, userinfo, a fragment, controls or spaces, a malformed `%` escape, a raw
 * `&`, any query parameter other than one non-empty `key`, and an empty token.
 */
export function parseCartId(raw: string): CartId | undefined {
  if (
    !raw.startsWith(CART_GID_PREFIX) ||
    hasControl(raw, { orSpace: true }) ||
    MALFORMED_ESCAPE.test(raw) ||
    raw.includes("#")
  ) {
    return undefined;
  }
  const rest = raw.slice(CART_GID_PREFIX.length);
  const queryStart = rest.indexOf("?");
  const token = decodeSegment(queryStart === -1 ? rest : rest.slice(0, queryStart));
  if (token === undefined) {
    return undefined;
  }
  if (queryStart === -1) {
    return { id: raw, token, key: undefined };
  }
  const key = readKeyQuery(rest.slice(queryStart + 1));
  return key === undefined ? undefined : { id: raw, token, key };
}

/** The value of a query that is exactly one `key=<value>` pair, or undefined. */
function readKeyQuery(query: string): string | undefined {
  if (query.includes("&")) {
    return undefined;
  }
  const params = new URLSearchParams(query);
  const names = [...params.keys()];
  const key = params.get("key");
  if (names.length !== 1 || names[0] !== "key" || key === null || key === "" || hasControl(key)) {
    return undefined;
  }
  return key;
}

/**
 * True for C0 controls and DEL, which are never part of a cart token or key. Raw IDs also
 * exclude spaces, because a raw space is not valid URL syntax.
 */
function hasControl(value: string, options: { orSpace?: boolean } = {}): boolean {
  const limit = options.orSpace === true ? 0x20 : 0x1f;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= limit || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/** Percent-decodes one non-empty path segment. Malformed escapes and controls are rejected. */
function decodeSegment(raw: string): string | undefined {
  if (raw === "" || raw.includes("/")) {
    return undefined;
  }
  try {
    const decoded = decodeURIComponent(raw);
    return hasControl(decoded) ? undefined : decoded;
  } catch {
    return undefined;
  }
}

/** Origins and route forms only. They never hold a token or a key. Never a gate. */
export type BindingDiagnostics = {
  /** The captured and API checkout origins. They can differ (for example a wrapper host). */
  capturedOrigin: string;
  apiOrigin: string;
  capturedForm: CheckoutForm | "unknown";
  apiForm: CheckoutForm | "unknown";
  /** Every API checkout URL query value is in the captured URL. A diagnostic, never a gate. */
  exactApiQuery: boolean;
};

export type CheckoutBinding =
  /** The captured URL references the API cart, on any origin. */
  | { status: "bound"; via: "cart-id" | "checkout-url"; diagnostics: BindingDiagnostics }
  /** The captured URL does not reference the cart that the API returned. */
  | { status: "unbound"; reason: string; diagnostics: BindingDiagnostics }
  /** The API checkout URL cannot be used. */
  | { status: "invalid"; reason: string };

/**
 * Binds a captured checkout URL to a cart that the configured Storefront API returned. The
 * captured cart reference token (or, for an unrecognized route, one whole decoded private path
 * segment) must equal the token of the API cart ID or of the API checkout URL reference. So a
 * native route and a cart permalink for the same cart are equivalent, and query parameters
 * (tracking, locale, step, `key`) are not cart identity. The checkout origin is an
 * implementation detail (for example a custom domain or a wrapper host): it is recorded in the
 * diagnostics but does not decide the binding. Reasons hold no tokens or keys.
 *
 * Key equality is never proof: the API could reflect the requested key, and keys change per
 * response. The independent evidence is the cart token and the cart state read through the
 * configured API.
 */
export function bindCheckout(
  captured: URL,
  cart: Pick<CheckoutCart, "token" | "checkoutUrl">,
): CheckoutBinding {
  const api = parseSafeUrl(cart.checkoutUrl, "Storefront API checkout URL");
  if (!api.ok) {
    return { status: "invalid", reason: api.reason };
  }
  const capturedReference = readCheckoutReference(captured);
  const apiReference = readCheckoutReference(api.url);
  const diagnostics: BindingDiagnostics = {
    capturedOrigin: captured.origin,
    apiOrigin: api.url.origin,
    capturedForm: capturedReference.found ? capturedReference.form : "unknown",
    apiForm: apiReference.found ? apiReference.form : "unknown",
    exactApiQuery: hasApiQuery(captured, api.url),
  };
  const tokens = capturedReference.found
    ? [capturedReference.token]
    : privateSegments(captured).flatMap((segment) => decodeSegment(segment) ?? []);
  const via = bindingSource(tokens, cart.token, apiReference);
  if (via === undefined) {
    const reason = "The checkout URL does not reference the cart that the Storefront API returned.";
    return { status: "unbound", reason, diagnostics };
  }
  return { status: "bound", via, diagnostics };
}

function bindingSource(
  tokens: readonly string[],
  cartToken: string | undefined,
  apiReference: CheckoutReference,
): "cart-id" | "checkout-url" | undefined {
  if (cartToken !== undefined && tokens.includes(cartToken)) return "cart-id";
  if (apiReference.found && tokens.includes(apiReference.token)) return "checkout-url";
  return undefined;
}

function hasApiQuery(captured: URL, api: URL): boolean {
  return [...new Set(api.searchParams.keys())].every((name) => {
    const want = api.searchParams.getAll(name).toSorted();
    const got = captured.searchParams.getAll(name).toSorted();
    return want.length === got.length && want.every((value, index) => value === got[index]);
  });
}

/** Raw non-empty path segments without a public label. */
function privateSegments(url: URL): string[] {
  return url.pathname
    .split("/")
    .filter((segment) => segment !== "" && publicSegmentLabel(segment) === undefined);
}

/**
 * Parses the first captured checkout candidate. Returns undefined when no checkout was
 * captured. The browser session records a candidate only for the first top-level
 * checkout-looking document request.
 */
export function firstCheckout(evidence: readonly EvidenceRecord[]): CheckoutParse | undefined {
  const record = evidence.find((candidate) => candidate.kind === "checkout");
  return record === undefined ? undefined : parseCheckoutEvidence(record.data);
}

/**
 * True for the first signal that the buyer attempted checkout, verified or not. A checkout
 * request blocked in an embedded frame (for example a checkout button widget that loads when
 * the cart renders) is not a handoff. A record with a missing or unknown `frame` is a handoff
 * (fail closed).
 */
export function isCheckoutHandoff(record: EvidenceRecord): boolean {
  return (
    record.kind === "checkout" ||
    (record.kind === "navigation-blocked" &&
      record.data.reason === "checkout" &&
      record.data.frame !== "embedded")
  );
}

/**
 * The cart ID from the latest Standard Event before the first checkout handoff: a settled
 * `shopify:cart:lines-update` with no user errors, or a `shopify:cart:view`. It is optional
 * evidence: a fallback when the checkout URL has no readable reference or its cart is not found.
 * The ID is opaque and is returned unchanged.
 */
export function standardEventCartId(evidence: readonly EvidenceRecord[]): string | undefined {
  const end = evidence.findIndex(isCheckoutHandoff);
  let cartId: string | undefined;
  for (const record of end === -1 ? evidence : evidence.slice(0, end)) {
    const id = eventCartId(record);
    if (id !== undefined) cartId = id;
  }
  return cartId;
}

function eventCartId(record: EvidenceRecord): string | undefined {
  if (record.kind !== "standard-event") return undefined;
  const cart = settledAddCart(record.data) ?? viewedCart(record.data);
  const id = isRecord(cart) ? cart.id : undefined;
  return isOpaqueId(id) ? id : undefined;
}

function settledAddCart(data: Record<string, unknown>): unknown {
  const event = recordOf(data.event);
  if (event.name !== "shopify:cart:lines-update" || event.phase !== "settled") return undefined;
  const result = recordOf(data.result);
  const errors = result.userErrors;
  return errors === undefined || (Array.isArray(errors) && errors.length === 0)
    ? result.cart
    : undefined;
}

function viewedCart(data: Record<string, unknown>): unknown {
  const event = recordOf(data.event);
  return event.name === "shopify:cart:view" && event.phase === "input"
    ? recordOf(data.input).cart
    : undefined;
}

function recordOf(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/**
 * Literal secrets of one evidence record, registered before the record is written: checkout URL
 * secrets for `checkout` records, and Standard Event cart IDs of any format.
 */
export function evidenceSecrets(record: EvidenceRecord): string[] {
  if (record.kind === "checkout") {
    return checkoutSecrets(record.data);
  }
  if (record.kind !== "standard-event") {
    return [];
  }
  const ids = [record.data.result, record.data.input].flatMap((part) => {
    const cart = isRecord(part) ? part.cart : undefined;
    return isRecord(cart) && typeof cart.id === "string" ? [cart.id] : [];
  });
  return unique(ids.flatMap(cartIdSecrets));
}

/**
 * Secret parts of checkout evidence for literal redaction, for any URL shape: the full URL,
 * every private path segment and query value (raw and decoded), private query names, and the
 * cart ID with its token and key. Public route words, locales, numbers, and the host are never
 * included, so the target and its route shape stay readable in reports.
 */
export function checkoutSecrets(data: Record<string, unknown>): string[] {
  const secrets: string[] = [];
  if (typeof data.cartId === "string") {
    secrets.push(...cartIdSecrets(data.cartId));
  }
  if (typeof data.url === "string" && URL.canParse(data.url)) {
    const url = new URL(data.url);
    secrets.push(data.url, url.href);
    for (const segment of privateSegments(url)) {
      secrets.push(segment, decodeSegment(segment) ?? "");
    }
    const query = url.search.slice(1);
    secrets.push(...url.searchParams.values(), ...rawQueryValues(query), ...privateNames(query));
    return unique(secrets).filter((secret) => !url.host.includes(secret));
  }
  return unique(secrets);
}

/** Literal secrets of one opaque cart ID of any format: the ID, and for a Cart GID its parts. */
export function cartIdSecrets(id: string): string[] {
  const parsed = parseCartId(id);
  if (parsed === undefined) {
    return [id];
  }
  const [rawToken = "", rawQuery = ""] = splitOnce(id.slice(CART_GID_PREFIX.length), "?");
  // Decoded and raw (encoded) forms, so either spelling is redacted.
  return [id, parsed.token, parsed.key ?? "", rawToken, ...rawQueryValues(rawQuery)];
}

function privateNames(query: string): string[] {
  return query.split("&").flatMap((pair) => {
    const [rawName = ""] = splitOnce(pair, "=");
    const name = new URLSearchParams(`${rawName}=`).keys().next().value ?? "";
    return name === "" || isPublicQueryName(name) ? [] : [rawName, name];
  });
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].filter((value) => value !== "");
}

function splitOnce(value: string, separator: string): [string, string | undefined] {
  const index = value.indexOf(separator);
  return index === -1 ? [value, undefined] : [value.slice(0, index), value.slice(index + 1)];
}

/** Raw (still encoded) values of a query string, as they appear in the URL text. */
function rawQueryValues(query: string): string[] {
  return query
    .split("&")
    .map((pair) => splitOnce(pair, "=")[1] ?? "")
    .filter((value) => value !== "");
}

export type CartLine = { variantId: string | undefined; quantity: number };
export type CartSnapshot = { totalQuantity: number; lines: CartLine[] };
/**
 * A complete cart read. `id` and `checkoutUrl` are secret: they hold the cart token and key.
 * Keep them in memory and never copy them into outcome details or reasons. The key in `id` is
 * response-specific: the same cart returns another key in each response. Never compare it.
 * `token` is the cart identity read from `id`, or undefined when `id` is not a Cart GID; then
 * only the checkout URL reference can bind the cart.
 *
 * `buyerCountry` is `cart.buyerIdentity.countryCode`. When it is set, it overrides the
 * `@inContext` country for the cart, so it is the only proof of the cart country. When it is
 * null, the cart country is not independently confirmed.
 */
export type CheckoutCart = CartSnapshot & {
  id: string;
  token: string | undefined;
  checkoutUrl: string;
  buyerCountry: string | null;
};
export type CartFetch =
  | { status: "complete"; cart: CheckoutCart }
  | { status: "missing" }
  | { status: "incomplete"; reason: string }
  /** The cart buyer identity names another country than the run context. */
  | { status: "context-mismatch"; reason: string };

function cartQuery(context: StorefrontContext): {
  document: string;
  variables: Record<string, string>;
} {
  const scope = inContext(context);
  return {
    document: `query StorefrontE2ECart($id: ID!, $first: Int!, $after: String${scope.definitions}) ${scope.directive} {
  cart(id: $id) {
    id
    checkoutUrl
    totalQuantity
    buyerIdentity { countryCode }
    lines(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { quantity merchandise { ... on ProductVariant { id } } }
    }
  }
}`,
    variables: scope.variables,
  };
}

type CartPage = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  buyerCountry: string | null;
  lines: CartLine[];
  hasNextPage: boolean;
  endCursor: string | undefined;
};

/**
 * Reads every cart line, the cart ID, the checkout URL, and the buyer identity country through
 * the configured Storefront API only, in the run context. Each page query carries an explicit
 * `@inContext` and the response context is checked. When the requested and returned IDs are
 * both Cart GIDs, their tokens must be equal on every page. Other ID formats are not rejected:
 * the checkout URL binding decides. A partial read, a cart ID for another cart, or a cart that
 * changes token, checkout URL, country, or total during pagination is `incomplete`. The request
 * always sends `cartId` unchanged. A buyer identity country that differs from the run context is
 * `context-mismatch`.
 */
export async function fetchCart(
  api: StorefrontApi,
  cartId: string,
  context: StorefrontContext,
  signal: AbortSignal,
): Promise<CartFetch> {
  const requestedToken = parseCartId(cartId)?.token;
  const query = cartQuery(context);
  const lines: CartLine[] = [];
  let first: CartPage | undefined;
  let after: string | undefined;
  for (let page = 0; page < MAX_CART_PAGES; page++) {
    const result = await api.query(
      query.document,
      { id: cartId, first: CART_LINES_PER_PAGE, after: after ?? null, ...query.variables },
      parseCartPage,
      signal,
      context,
    );
    if (result === undefined) {
      return page === 0
        ? { status: "missing" }
        : { status: "incomplete", reason: "Cart disappeared during pagination." };
    }
    const identityProblem = checkCartIdentity(result, first, requestedToken);
    if (identityProblem !== undefined) {
      return { status: "incomplete", reason: identityProblem };
    }
    const countryProblem = first === undefined ? checkCartCountry(result, context) : undefined;
    if (countryProblem !== undefined) {
      return { status: "context-mismatch", reason: countryProblem };
    }
    first ??= result;
    lines.push(...result.lines);
    if (!result.hasNextPage) {
      return { status: "complete", cart: completeCart(first, lines) };
    }
    if (result.endCursor === undefined) {
      return { status: "incomplete", reason: "Cart pagination returned no cursor." };
    }
    after = result.endCursor;
  }
  return {
    status: "incomplete",
    reason: `Cart has more than ${MAX_CART_PAGES * CART_LINES_PER_PAGE} lines.`,
  };
}

function completeCart(first: CartPage, lines: CartLine[]): CheckoutCart {
  return {
    id: first.id,
    token: parseCartId(first.id)?.token,
    checkoutUrl: first.checkoutUrl,
    totalQuantity: first.totalQuantity,
    buyerCountry: first.buyerCountry,
    lines,
  };
}

/**
 * A set buyer identity country overrides the `@inContext` country for the cart, so it must be
 * the run country. A null country is not a conflict, but it does not confirm the cart country.
 */
function checkCartCountry(page: CartPage, context: StorefrontContext): string | undefined {
  return page.buyerCountry === null || page.buyerCountry === context.country
    ? undefined
    : `The cart buyer identity country is ${page.buyerCountry}, but the run context country is ${context.country}. The cart country overrides @inContext.`;
}

/**
 * When both IDs are Cart GIDs, the returned token must be the requested token on every page.
 * The key is not compared, and neither is the raw ID, because the key changes per response.
 * Later pages must keep the same token (when readable), raw checkout URL, total, and buyer
 * identity country.
 */
function checkCartIdentity(
  page: CartPage,
  first: CartPage | undefined,
  requestedToken: string | undefined,
): string | undefined {
  const token = parseCartId(page.id)?.token;
  const firstToken = first === undefined ? undefined : parseCartId(first.id)?.token;
  const expected = requestedToken ?? firstToken;
  if (expected !== undefined && token !== undefined && token !== expected) {
    return first === undefined
      ? "The Storefront API returned a different cart."
      : "The cart changed during pagination.";
  }
  if (first === undefined) {
    return undefined;
  }
  return token === firstToken && sameCartState(page, first)
    ? undefined
    : "The cart changed during pagination.";
}

function sameCartState(page: CartPage, first: CartPage): boolean {
  return (
    page.checkoutUrl === first.checkoutUrl &&
    page.totalQuantity === first.totalQuantity &&
    page.buyerCountry === first.buyerCountry
  );
}

function parseCartPage(data: unknown): CartPage | undefined {
  const cartValue = expectRecord(data, "data").cart;
  if (cartValue === null || cartValue === undefined) {
    return undefined;
  }
  const cart = expectRecord(cartValue, "cart");
  const connection = expectRecord(cart.lines, "cart.lines");
  const buyerIdentity = expectRecord(cart.buyerIdentity, "cart.buyerIdentity");
  return {
    id: expectString(cart.id, "cart.id"),
    checkoutUrl: expectString(cart.checkoutUrl, "cart.checkoutUrl"),
    totalQuantity: expectNumber(cart.totalQuantity, "cart.totalQuantity"),
    buyerCountry:
      optionalString(buyerIdentity.countryCode, "cart.buyerIdentity.countryCode") ?? null,
    ...expectPageInfo(connection.pageInfo, "cart.lines.pageInfo"),
    lines: expectArray(connection.nodes, "cart.lines.nodes").map((node, index) => {
      const line = expectRecord(node, `cart.lines.nodes[${index}]`);
      const merchandise = line.merchandise;
      return {
        quantity: expectNumber(line.quantity, `cart.lines.nodes[${index}].quantity`),
        variantId: isRecord(merchandise)
          ? optionalString(merchandise.id, `cart.lines.nodes[${index}].merchandise.id`)
          : undefined,
      };
    }),
  };
}
