import { CLOSING, OPENING, TOKEN_RE } from "./i18n-variables";

/**
 * Appends fragment documents to `source`, adding each definition once.
 *
 * A `gql` fragment carries the text of the fragments it was composed with, so two fragments that
 * share a dependency both contain its definition. The API rejects documents that define a
 * fragment name twice, so definitions already in `source` or in an earlier fragment are skipped.
 */
export function appendFragments(source: string, fragments: Iterable<string>): string {
  const seen = new Set(splitDefinitions(source));
  let document = source;
  for (const fragment of fragments) {
    for (const definition of splitDefinitions(fragment)) {
      if (seen.has(definition)) continue;
      seen.add(definition);
      document += "\n" + definition;
    }
  }
  return document;
}

/** Returns the text of each top-level definition, without the comments and whitespace between them. */
function splitDefinitions(document: string): string[] {
  const definitions: string[] = [];
  let depth = 0;
  let start: number | undefined;
  for (const match of document.matchAll(TOKEN_RE)) {
    const [token] = match;
    if (token[0] === "#") continue;
    start ??= match.index;
    if (OPENING.has(token)) depth++;
    else if (CLOSING.has(token) && --depth === 0 && token === "}") {
      definitions.push(document.slice(start, match.index + 1));
      start = undefined;
    }
  }
  if (start !== undefined) definitions.push(document.slice(start).trimEnd());
  return definitions;
}
