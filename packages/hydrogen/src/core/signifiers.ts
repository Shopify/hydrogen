/**
 * Attribute that names the signifier on an element. State attributes use it as a prefix.
 *
 * @publicDocs
 */
export const SIGNIFIER_ATTRIBUTE = "data-h3";

// The canonical schema. The sample values only give each state field its widened type.
const SIGNIFIER_SCHEMA = {
  "product-add-to-cart": { variantId: "", available: false },
};

type SignifierValue = string | number | boolean;

/** The state that each signifier must carry, by signifier name. */
export type SignifierStates = typeof SIGNIFIER_SCHEMA;

type SignifierName = keyof SignifierStates;

/**
 * All signifier names.
 *
 * @publicDocs
 */
export const SIGNIFIER_NAMES: readonly SignifierName[] = keysOf(SIGNIFIER_SCHEMA);

type KebabCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? `${Head extends Lowercase<Head> ? Head : `-${Lowercase<Head>}`}${KebabCase<Tail>}`
  : S;

/** The attributes that {@link signifier} returns for a signifier name. */
export type SignifierAttributes<Name extends SignifierName> = {
  [SIGNIFIER_ATTRIBUTE]: Name;
} & {
  [Key in keyof SignifierStates[Name] &
    string as `${typeof SIGNIFIER_ATTRIBUTE}-${KebabCase<Key>}`]: string;
};

function keysOf<T extends object>(object: T): Array<keyof T & string> {
  return Object.keys(object).filter((key): key is keyof T & string => key in object);
}

// Converts a signifier to attribute entries. Only schema keys with a defined value are included.
function toAttributeEntries(
  name: SignifierName,
  state: Partial<Record<string, SignifierValue>>,
): Array<[string, string]> {
  const entries: Array<[string, string]> = [[SIGNIFIER_ATTRIBUTE, name]];
  for (const key of keysOf(SIGNIFIER_SCHEMA[name])) {
    const value = state[key];
    if (value === undefined) continue;
    const suffix = key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    entries.push([`${SIGNIFIER_ATTRIBUTE}-${suffix}`, String(value)]);
  }
  return entries;
}

/**
 * Returns the attributes that mark an element as the named signifier with its state.
 *
 * @publicDocs
 */
export function signifier<Name extends SignifierName>(
  name: Name,
  state: SignifierStates[Name],
): SignifierAttributes<Name>;
export function signifier(
  name: SignifierName,
  state: SignifierStates[SignifierName],
): Record<string, string> {
  return Object.fromEntries(toAttributeEntries(name, state));
}

// Escapes a value for a double-quoted CSS string. Control characters use hex escapes.
function escapeCssString(value: string): string {
  let escaped = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === '"' || char === "\\") escaped += `\\${char}`;
    else if (code < 0x20 || code === 0x7f) escaped += `\\${code.toString(16)} `;
    else escaped += char;
  }
  return escaped;
}

/**
 * Returns a CSS selector for the named signifier. Each given state field narrows the match.
 *
 * @publicDocs
 */
export function signifierSelector<Name extends SignifierName>(
  name: Name,
  state: Partial<SignifierStates[Name]> = {},
): string {
  return toAttributeEntries(name, state)
    .map(([attribute, value]) => `[${attribute}="${escapeCssString(value)}"]`)
    .join("");
}
