const FRAGMENT_DEFINITION_RE = /\bfragment\s+([_A-Za-z][_0-9A-Za-z]*)\s+on\b/g;

/**
 * `text` is the slice appended to a document, which keeps any comment or blank line before the
 * next definition. `body` runs from `fragment` to the closing brace of the selection set, so the
 * same definition compares equal wherever it sits in a document.
 */
type FragmentDefinition = { name: string; text: string; body: string };

// GraphQL comments run from `#` to the end of the line, so a keyword after a `#` on its line is not a definition.
function isInsideComment(text: string, index: number): boolean {
  const lineStart = text.lastIndexOf("\n", index) + 1;
  return text.slice(lineStart, index).includes("#");
}

function findFragmentDefinitions(text: string): RegExpExecArray[] {
  return Array.from(text.matchAll(FRAGMENT_DEFINITION_RE)).filter(
    (match) => !isInsideComment(text, match.index),
  );
}

function selectionSetEnd(text: string, from: number): number {
  const open = text.indexOf("{", from);
  if (open === -1) return text.length;

  let depth = 0;
  for (let index = open; index < text.length; index++) {
    const char = text[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return text.length;
}

function splitFragmentDefinitions(text: string): FragmentDefinition[] {
  const matches = findFragmentDefinitions(text);
  // A text without a fragment definition is one part keyed by its whole text, so a repeated copy is still appended once.
  if (matches.length === 0) return [{ name: text, text, body: text }];

  return matches.map((match, index) => ({
    name: match[1] ?? "",
    text: text.slice(index === 0 ? 0 : match.index, matches[index + 1]?.index ?? text.length),
    body: text.slice(match.index, selectionSetEnd(text, match.index)),
  }));
}

/**
 * Appends fragment texts to a document, skipping any fragment definition whose name the
 * document already contains. Composed fragments carry their own sub-fragments, so two of
 * them that spread the same sub-fragment would otherwise define it twice.
 *
 * Two definitions that share a name but differ in body are a programming error: the API would
 * reject the document, and skipping one would silently change which fields the spread selects.
 */
export function appendFragments(source: string, fragments: readonly string[]): string {
  const seen = new Map<string, string>();
  for (const definition of splitFragmentDefinitions(source)) {
    seen.set(definition.name, definition.body);
  }

  let query = source;
  for (const fragment of fragments) {
    let unseen = "";
    for (const definition of splitFragmentDefinitions(fragment)) {
      const known = seen.get(definition.name);
      if (known === undefined) {
        seen.set(definition.name, definition.body);
        unseen += definition.text;
      } else if (known !== definition.body) {
        throw new TypeError(
          `Fragment "${definition.name}" has two different definitions. Define the fragment once and pass the same document wherever it is spread.`,
        );
      }
    }
    if (unseen) query += "\n" + unseen;
  }

  return query;
}
