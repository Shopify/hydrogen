/** A significant GraphQL token and its offsets in the source text. */
export type Token = { value: string; start: number; end: number };

// Significant GraphQL tokens plus comments, which are dropped. Matching whole
// strings keeps their contents from being read as syntax.
const TOKEN_RE =
  /"""(?:\\"""|[^])*?"""|"(?:\\.|[^"\\\n\r])*"|#[^\n\r]*|[_A-Za-z][_0-9A-Za-z]*|[^\s,]/g;

/**
 * Yields the significant tokens of a GraphQL text, skipping whitespace, commas, and comments.
 * A string that never closes leaves a lone `"` token.
 */
export function* tokenize(source: string): Generator<Token> {
  for (const match of source.matchAll(TOKEN_RE)) {
    const value = match[0];
    if (value[0] !== "#") yield { value, start: match.index, end: match.index + value.length };
  }
}
