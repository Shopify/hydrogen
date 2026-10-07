/**
 * Source guardrail for non-signifier locators.
 *
 * Only `src/signifiers.ts` may build locators directly. Every other legacy use
 * is listed in `selector-ratchet-allowlist.json`. The list can only shrink.
 */

export type SelectorRule =
  | "get-by-locator"
  | "raw-locator"
  | "xpath"
  | "dom-evaluate"
  | "dom-query";

export type SelectorViolation = {
  readonly file: string;
  readonly rule: SelectorRule;
  readonly code: string;
};

export type RatchetResult = {
  readonly added: readonly SelectorViolation[];
  readonly stale: readonly SelectorViolation[];
};

/** Matches optional type arguments, such as `<HTMLElement>`, before a call. */
const TYPE_ARGUMENTS = String.raw`(?:<[^>()]*>)?`;

const SELECTOR_RULES: readonly { readonly rule: SelectorRule; readonly pattern: RegExp }[] = [
  {
    rule: "get-by-locator",
    pattern: callPattern(String.raw`\.getBy(?:Role|Text|Label|Placeholder|AltText|Title|TestId)`),
  },
  { rule: "raw-locator", pattern: callPattern(String.raw`\.locator`) },
  { rule: "xpath", pattern: /xpath\s*=/g },
  /*
   * Non-DOM evaluation is allowed: `page.evaluate(() => window.events)` and
   * `locator.evaluate(...)` on a signifier element do not select DOM nodes.
   * Only evaluation APIs that take a selector and query the DOM themselves are
   * rejected here.
   */
  { rule: "dom-evaluate", pattern: callPattern(String.raw`\.(?:\$eval|\$\$eval)`) },
  /*
   * DOM query calls and direct document traversal are always rejected,
   * whatever wraps them, including `page.evaluate` callbacks. Other `document`
   * use, such as event subscriptions, stays allowed.
   */
  {
    rule: "dom-query",
    pattern: callPattern(
      String.raw`\b(?:querySelector|querySelectorAll|getElementById|getElementsBy[A-Za-z]+|closest)`,
    ),
  },
  { rule: "dom-query", pattern: /\bdocument\s*\.\s*(?:body|documentElement)\b/g },
];

/** The only file that may build locators without an allowlist entry. */
export const SIGNIFIER_LOCATOR_FILE = "src/signifiers.ts";

/** Package-relative directories that the guardrail scans. */
export const SCANNED_DIRECTORIES = ["src", "specs"] as const;

/** Unit tests hold detector fixture strings, so the production scan skips them. */
export function isScannedFile(file: string): boolean {
  if (!/\.(?:ts|tsx|mts)$/.test(file)) return false;
  if (/\.test\.(?:ts|tsx|mts)$/.test(file)) return false;
  if (file === SIGNIFIER_LOCATOR_FILE) return false;
  return SCANNED_DIRECTORIES.some((directory) => file.startsWith(`${directory}/`));
}

/**
 * Returns one violation for each match, so a second call on one line is new.
 * Matches can span lines. Each violation records the trimmed line where the match starts.
 */
export function findSelectorViolations(file: string, source: string): SelectorViolation[] {
  const matches = SELECTOR_RULES.flatMap(({ rule, pattern }) =>
    [...source.matchAll(pattern)].map((match) => ({ rule, index: match.index })),
  ).toSorted((left, right) => left.index - right.index);

  return matches.map(({ rule, index }) => ({ file, rule, code: lineAt(source, index) }));
}

function lineAt(source: string, index: number): string {
  const start = source.lastIndexOf("\n", index - 1) + 1;
  const end = source.indexOf("\n", index);
  return source.slice(start, end === -1 ? undefined : end).trim();
}

/** Compares found violations with the allowlist as multisets. */
export function compareWithAllowlist(
  found: readonly SelectorViolation[],
  allowlist: readonly SelectorViolation[],
): RatchetResult {
  const remaining = new Map<string, SelectorViolation[]>();
  for (const entry of allowlist) {
    const key = violationKey(entry);
    remaining.set(key, [...(remaining.get(key) ?? []), entry]);
  }

  const added: SelectorViolation[] = [];
  for (const violation of found) {
    const matches = remaining.get(violationKey(violation));
    if (matches === undefined || matches.length === 0) {
      added.push(violation);
    } else {
      matches.pop();
    }
  }

  return { added, stale: [...remaining.values()].flat() };
}

export function formatRatchetResult(result: RatchetResult): string {
  const lines: string[] = [];
  if (result.added.length > 0) {
    lines.push(
      "New non-signifier locators. Use requireH3() from src/signifiers.ts instead:",
      ...result.added.map(formatViolation),
    );
  }
  if (result.stale.length > 0) {
    lines.push(
      "Stale allowlist entries. Remove them from src/selector-ratchet-allowlist.json:",
      ...result.stale.map(formatViolation),
    );
  }
  return lines.join("\n");
}

function callPattern(callee: string): RegExp {
  return new RegExp(String.raw`${callee}\s*${TYPE_ARGUMENTS}\s*\(`, "g");
}

function violationKey(violation: SelectorViolation): string {
  return JSON.stringify([violation.file, violation.rule, violation.code]);
}

function formatViolation(violation: SelectorViolation): string {
  return `- ${violation.file} [${violation.rule}] ${violation.code}`;
}
