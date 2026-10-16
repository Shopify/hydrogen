const SIGNIFIER_ATTRIBUTE = "data-shopify-testid";

const SIGNIFIER_NAMESPACE = "data-shopify";

// The canonical schema. The sample values only give each state field its widened type.
const SIGNIFIER_SCHEMA = {
  "product-add-to-cart": { variantId: "", available: false },
  "product-option-value": { optionName: "", optionValue: "", selected: false },
  "product-quantity": {},
  "cart-line": { merchandiseId: "", quantity: 0, pending: false },
  "cart-line-quantity": {},
  "cart-line-increase": {},
  "cart-line-decrease": {},
  "cart-line-remove": {},
};

type SignifierValue = string | number | boolean;

/** The state that each signifier must carry, by signifier name. */
export type SignifierStates = typeof SIGNIFIER_SCHEMA;

type SignifierTestId = keyof SignifierStates;

/**
 * All signifier names.
 *
 * @publicDocs
 */
export const SIGNIFIER_TEST_IDS: readonly SignifierTestId[] = keysOf(SIGNIFIER_SCHEMA);

type KebabCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? `${Head extends Lowercase<Head> ? Head : `-${Lowercase<Head>}`}${KebabCase<Tail>}`
  : S;

/** The attributes that {@link signifier} returns for a signifier name. */
export type SignifierAttributes<TestId extends SignifierTestId> = {
  [SIGNIFIER_ATTRIBUTE]: TestId;
} & {
  [Key in keyof SignifierStates[TestId] &
    string as `${typeof SIGNIFIER_NAMESPACE}-${KebabCase<Key>}`]: string;
};

function keysOf<T extends object>(object: T): Array<keyof T & string> {
  return Object.keys(object).filter((key): key is keyof T & string => key in object);
}

// Converts a signifier to attribute entries. Only schema keys with a defined value are included.
function toAttributeEntries(
  testId: SignifierTestId,
  state: Partial<Record<string, SignifierValue>>,
): Array<[string, string]> {
  const entries: Array<[string, string]> = [[SIGNIFIER_ATTRIBUTE, testId]];
  for (const key of Object.keys(SIGNIFIER_SCHEMA[testId])) {
    const value = state[key];
    if (value === undefined) continue;
    const suffix = key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    entries.push([`${SIGNIFIER_NAMESPACE}-${suffix}`, String(value)]);
  }
  return entries;
}

/**
 * Returns the attributes that mark an element as the named signifier with its state.
 *
 * @publicDocs
 */
export function signifier<TestId extends SignifierTestId>(
  testId: TestId,
  state: SignifierStates[TestId],
): SignifierAttributes<TestId>;
export function signifier(
  testId: SignifierTestId,
  state: SignifierStates[SignifierTestId],
): Record<string, string> {
  return Object.fromEntries(toAttributeEntries(testId, state));
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
export function signifierSelector<TestId extends SignifierTestId>(
  testId: TestId,
  state: Partial<SignifierStates[TestId]> = {},
): string {
  return toAttributeEntries(testId, state)
    .map(([attribute, value]) => `[${attribute}="${escapeCssString(value)}"]`)
    .join("");
}
