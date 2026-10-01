/**
 * Variables the client fills from `requestContext.i18n`, with the named type
 * each must be declared as. Same-named variables of any other type belong to
 * the caller.
 */
export const I18N_VARIABLE_TYPES = {
  country: "CountryCode",
  language: "LanguageCode",
} as const;

export type I18nVariableName = keyof typeof I18N_VARIABLE_TYPES;

// Significant GraphQL tokens plus comments, which are dropped. Matching whole
// strings keeps their contents from being read as declarations.
const TOKEN_RE =
  /"""(?:\\"""|[^])*?"""|"(?:\\.|[^"\\\n\r])*"|#[^\n\r]*|[_A-Za-z][_0-9A-Za-z]*|[^\s,]/g;
const NAME_RE = /^[_A-Za-z]/;
const OPERATION_TYPES = new Set(["query", "mutation", "subscription"]);
const OPENING = new Set(["(", "[", "{"]);
const CLOSING = new Set([")", "]", "}"]);

/**
 * Returns the i18n variables that the document's first operation declares as
 * `$country: CountryCode` or `$language: LanguageCode`, nullable or non-null.
 * This is the same rule the `graphql()` variables type applies.
 */
export function getI18nVariableNames(source: string): I18nVariableName[] {
  const names: I18nVariableName[] = [];
  for (const [name, colon, ...rest] of readFirstOperationVariables(tokenize(source))) {
    if (colon !== ":" || !isI18nVariableName(name)) continue;
    const typeEnd = rest.findIndex((token) => token === "=" || token === "@");
    const type = rest.slice(0, typeEnd === -1 ? undefined : typeEnd).join("");
    const expected = I18N_VARIABLE_TYPES[name];
    if (type === expected || type === `${expected}!`) names.push(name);
  }
  return names;
}

function isI18nVariableName(name: string | undefined): name is I18nVariableName {
  return name !== undefined && Object.hasOwn(I18N_VARIABLE_TYPES, name);
}

function* tokenize(source: string): Generator<string> {
  for (const [token] of source.matchAll(TOKEN_RE)) {
    if (token[0] !== "#") yield token;
  }
}

function readFirstOperationVariables(tokens: Generator<string>): string[][] {
  let depth = 0;
  let inFragment = false;
  for (const token of tokens) {
    if (depth === 0 && !inFragment) {
      if (OPERATION_TYPES.has(token)) return readOperationVariables(tokens);
      if (token === "{") return [];
      inFragment = token === "fragment";
    }
    if (OPENING.has(token)) depth++;
    else if (CLOSING.has(token) && --depth === 0 && token === "}") inFragment = false;
  }
  return [];
}

function readOperationVariables(tokens: Generator<string>): string[][] {
  let next = tokens.next().value;
  if (next && NAME_RE.test(next)) next = tokens.next().value;
  return next === "(" ? readVariableDefinitions(tokens) : [];
}

// Default values and directive arguments can nest `$` and `)`, so only depth 0 delimits definitions.
function readVariableDefinitions(tokens: Generator<string>): string[][] {
  const definitions: string[][] = [];
  let depth = 0;
  for (const token of tokens) {
    if (depth === 0 && token === ")") break;
    if (depth === 0 && token === "$") definitions.push([]);
    else definitions.at(-1)?.push(token);
    if (OPENING.has(token)) depth++;
    else if (CLOSING.has(token)) depth--;
  }
  return definitions;
}
