type Token = { value: string; start: number; end: number };

/**
 * A top-level definition of a GraphQL text. A fragment is keyed by its name, any other definition
 * by its canonical form. `canonical` joins the definition's tokens with single spaces, so two copies
 * that differ only in whitespace, commas, or comments compare equal. `text` is the definition as written.
 */
type Definition = { key: string; canonical: string; text: string };

// GraphQL ignores whitespace, line terminators, commas, the byte order mark, and `#` comments between tokens.
const IGNORED_RE = /[\s,\uFEFF]+|#[^\n\r]*/y;
const BLOCK_STRING_RE = /"""(?:\\"""|(?!""")[^])*"""/y;
const STRING_RE = /"(?:\\.|[^"\\\n\r])*"/y;
const WORD_RE = /[_0-9A-Za-z]+/y;

function matchAt(pattern: RegExp, text: string, index: number): string | undefined {
  pattern.lastIndex = index;
  return pattern.exec(text)?.[0];
}

function tokenAt(text: string, index: number): string | undefined {
  if (text.startsWith('"""', index)) return matchAt(BLOCK_STRING_RE, text, index);
  if (text[index] === '"') return matchAt(STRING_RE, text, index);
  return matchAt(WORD_RE, text, index) ?? text[index];
}

/** The tokens of a GraphQL text, or `undefined` when a string never closes. */
function tokenize(text: string): Token[] | undefined {
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const ignored = matchAt(IGNORED_RE, text, index);
    if (ignored) {
      index += ignored.length;
      continue;
    }

    const value = tokenAt(text, index);
    if (value === undefined) return undefined;
    tokens.push({ value, start: index, end: index + value.length });
    index += value.length;
  }
  return tokens;
}

/** `tokens` runs from a definition's first token to the brace that closes it. */
function definitionOf(text: string, tokens: readonly Token[]): Definition {
  const canonical = tokens.map((token) => token.value).join(" ");
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const key = first.value === "fragment" ? tokens[1].value : canonical;
  return { key, canonical, text: text.slice(first.start, last.end) };
}

/** Splits a text at each closing brace that returns to the top level. */
function splitDefinitions(text: string, tokens: readonly Token[]): Definition[] | undefined {
  const definitions: Definition[] = [];
  let first = 0;
  let depth = 0;
  for (const [index, token] of tokens.entries()) {
    if (token.value === "{") depth += 1;
    if (token.value !== "}") continue;

    depth -= 1;
    if (depth < 0) return undefined;
    if (depth === 0) {
      definitions.push(definitionOf(text, tokens.slice(first, index + 1)));
      first = index + 1;
    }
  }

  const complete = depth === 0 && first === tokens.length && definitions.length > 0;
  return complete ? definitions : undefined;
}

function definitionsOf(text: string): Definition[] {
  const tokens = tokenize(text);
  // `gql` doesn't check syntax, so a text that doesn't split into definitions is kept whole, as
  // written, and the API reports the syntax error when the document runs.
  return (tokens && splitDefinitions(text, tokens)) ?? [{ key: text, canonical: text, text }];
}

/**
 * Appends fragment texts to a document, skipping any fragment definition whose name the
 * document already contains. Composed fragments carry their own sub-fragments, so two of
 * them that spread the same sub-fragment would otherwise define it twice.
 *
 * A fragment text whose definitions are all new is appended whole. A text that repeats a known
 * definition contributes only its new definitions.
 *
 * Two definitions that share a name but differ in canonical form are a programming error: the API would
 * reject the document, and skipping one would silently change which fields the spread selects.
 */
export function appendFragments(source: string, fragments: readonly string[]): string {
  const canonicalByKey = new Map<string, string>();
  for (const definition of definitionsOf(source)) {
    canonicalByKey.set(definition.key, definition.canonical);
  }

  let query = source;
  for (const text of fragments) {
    const definitions = definitionsOf(text);
    const added: Definition[] = [];
    for (const definition of definitions) {
      const known = canonicalByKey.get(definition.key);
      if (known === undefined) {
        canonicalByKey.set(definition.key, definition.canonical);
        added.push(definition);
      } else if (known !== definition.canonical) {
        throw new TypeError(
          `Fragment "${definition.key}" has two different definitions. Define the fragment once and pass the same document wherever it is spread.`,
        );
      }
    }

    if (added.length === definitions.length) {
      query += "\n" + text;
    } else if (added.length > 0) {
      query += "\n" + added.map((definition) => definition.text).join("\n");
    }
  }

  return query;
}

type Includes<Items extends readonly string[], Item extends string> = Items extends readonly [
  infer First,
  ...infer Rest extends readonly string[],
]
  ? [First] extends [Item]
    ? [Item] extends [First]
      ? true
      : Includes<Rest, Item>
    : Includes<Rest, Item>
  : false;

/**
 * Each part of a document once, in first-seen order, compared as exact text. A list of unknown
 * length, such as `string[]`, stays as it is.
 */
export type Dedupe<
  Items extends readonly string[],
  Seen extends readonly string[] = readonly [],
> = number extends Items["length"]
  ? Items
  : Items extends readonly [infer First extends string, ...infer Rest extends readonly string[]]
    ? Includes<Seen, First> extends true
      ? Dedupe<Rest, Seen>
      : readonly [First, ...Dedupe<Rest, readonly [...Seen, First]>]
    : readonly [];

/** The parts of a document joined with newlines. A list of unknown length joins to `string`. */
export type JoinParts<Parts extends readonly string[]> = number extends Parts["length"]
  ? string
  : Parts extends readonly [infer Only extends string]
    ? Only
    : Parts extends readonly [infer First extends string, ...infer Rest extends readonly string[]]
      ? `${First}\n${JoinParts<Rest>}`
      : "";
