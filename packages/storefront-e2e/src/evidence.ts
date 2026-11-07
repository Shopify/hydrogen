/**
 * Evidence is the shared record shape for everything observed during a run.
 * Records hold raw values in memory only. Every path to disk or terminal must
 * go through a `Redactor` first.
 */
export type EvidenceRecord = {
  kind: string;
  timestamp: number;
  data: Record<string, unknown>;
};

export type EvidenceSink = (record: EvidenceRecord) => void | Promise<void>;

export type Redactor = {
  /** Registers a literal secret, such as an observed checkout URL or cart ID. */
  addSecret(value: string): void;
  text(value: string): string;
  /** JSON-serializes a value with every string and sensitive key redacted. */
  serialize(value: unknown, indent?: number): string;
};

export const REDACTED = "[REDACTED]";

const MIN_LITERAL_SECRET_LENGTH = 6;
const SAFE_QUERY_PARAMS = new Set(["variant"]);
const SENSITIVE_KEY = /token|secret|password|passwd|authorization|cookie|api[-_]?key|^key$|cartid/i;

const TEXT_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // Cart IDs carry the cart token and key, plain or URL-encoded.
  [
    /gid(?::|%3A)(?:\/\/|%2F%2F)shopify(?:\/|%2F)Cart(?:\/|%2F)[^\s"'<>&]+/gi,
    `gid://shopify/Cart/${REDACTED}`,
  ],
  // Cart references in checkout URL paths, of any token format: `/cart/c/<token>`,
  // `/checkouts/(cn|co)/<token>`, and `/checkout/<shop>/(cn|co)/<token>`. Masked route shapes
  // (`:segment`) are kept.
  [
    /(\/(?:cart\/c|checkouts(?:\/[a-z]{1,3}(?=\/))?|checkout\/[^/?#\s"'<>]+\/(?:cn|co)))\/(?![a-z]{1,3}\/)[^:/?#\s"<>&][^/?#\s"<>&]*/g,
    `$1/${REDACTED}`,
  ],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${REDACTED}`],
  [
    /\b(authorization|cookie|set-cookie|x-shopify-storefront-access-token|shopify-storefront-private-token)(["']?\s*[:=]\s*)[^\n,}]+/gi,
    `$1$2${REDACTED}`,
  ],
  // Common model provider key shapes.
  [/\bsk-[A-Za-z0-9_-]{16,}/g, REDACTED],
  [/\bAIza[0-9A-Za-z_-]{30,}/g, REDACTED],
];

const QUERY_PARAM = /([?&])([^=&\s"'#<>]+)=([^&\s"'#<>]*)/g;

export function createRedactor(initialSecrets: readonly string[] = []): Redactor {
  const secrets = new Set<string>();

  const addSecret = (value: string): void => {
    if (value.length < MIN_LITERAL_SECRET_LENGTH) {
      return;
    }
    secrets.add(value);
    secrets.add(encodeURIComponent(value));
  };

  const text = (value: string): string => {
    let result = value;
    // Longest first, so a full URL is replaced before its parts.
    for (const secret of [...secrets].toSorted((a, b) => b.length - a.length)) {
      result = result.split(secret).join(REDACTED);
    }
    for (const [pattern, replacement] of TEXT_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result.replace(QUERY_PARAM, (_match, prefix: string, name: string, paramValue: string) =>
      SAFE_QUERY_PARAMS.has(name.toLowerCase()) || paramValue === REDACTED
        ? `${prefix}${name}=${paramValue}`
        : `${prefix}${name}=${REDACTED}`,
    );
  };

  const serialize = (value: unknown, indent?: number): string =>
    JSON.stringify(
      value,
      (key: string, entry: unknown) => {
        if (key !== "" && SENSITIVE_KEY.test(key) && entry !== undefined && entry !== null) {
          return REDACTED;
        }
        // A cart ID can have any format and any length, so the `id` of a `cart` object is
        // always masked, independent of the Cart GID pattern.
        if (key === "cart" && isPlainRecord(entry) && entry.id !== undefined && entry.id !== null) {
          return { ...entry, id: REDACTED };
        }
        if (entry instanceof Error) {
          return { name: entry.name, message: text(entry.message) };
        }
        return typeof entry === "string" ? text(entry) : entry;
      },
      indent,
    );

  for (const secret of initialSecrets) {
    addSecret(secret);
  }

  return { addSecret, text, serialize };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Unknown error";
}
