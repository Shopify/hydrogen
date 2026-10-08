/**
 * Oxlint JS plugin for the storefront e2e signifier guardrail.
 *
 * It re-exports ESLint's `no-restricted-syntax` rule from oxlint-plugin-eslint
 * under the same name (`eslint-js/no-restricted-syntax`). The AST selectors in
 * `.oxlintrc.json` find the non-signifier locators. This adapter only filters
 * the reports of that rule against the central allowlist:
 *
 * - A report that matches an allowlist entry (file, rule, trimmed source line)
 *   uses that entry. Entries are a multiset, so a second identical report is new.
 * - All other reports are forwarded unchanged.
 * - Entries that are not used when a file is done are reported as stale.
 * - An entry for a file that does not exist stops the lint with an error.
 *
 * Each selector message starts with its rule in brackets, for example
 * `[get-by-locator]`. The rule matches the `rule` field of allowlist entries.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import eslintJs from "oxlint-plugin-eslint";

const PACKAGE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "storefront-e2e",
);
const ALLOWLIST_FILE = "src/selector-ratchet-allowlist.json";
const LINE_TERMINATOR = /\r\n|[\n\r\u2028\u2029]/;

const nativeRule = eslintJs.rules["no-restricted-syntax"];

/** @type {Map<string, Map<string, number>> | undefined} */
let allowlistByFile;

function loadAllowlist() {
  /** @type {{ file: string; rule: string; code: string }[]} */
  const entries = JSON.parse(readFileSync(join(PACKAGE_ROOT, ALLOWLIST_FILE), "utf8"));
  const byFile = new Map();
  for (const { file, rule, code } of entries) {
    const counts = byFile.get(file) ?? new Map();
    const key = entryKey(rule, code);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    byFile.set(file, counts);
  }
  const missing = [...byFile.keys()].filter((file) => !existsSync(join(PACKAGE_ROOT, file)));
  if (missing.length > 0) {
    throw new Error(
      `${ALLOWLIST_FILE} lists files that do not exist. Remove or update their entries: ${missing.join(", ")}`,
    );
  }
  return byFile;
}

function entryKey(rule, code) {
  return JSON.stringify([rule, code]);
}

function ruleOf(descriptor) {
  const match = /^\[([\w-]+)\]/.exec(descriptor.data?.message ?? "");
  return match === null ? "" : match[1];
}

/** For a member call, use the line of the property so chained calls on separate lines differ. */
function reportedLine(node) {
  if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
    return node.callee.property.loc.start.line;
  }
  return node.loc.start.line;
}

const rule = {
  meta: nativeRule.meta,
  create(context) {
    allowlistByFile ??= loadAllowlist();
    const file = relative(PACKAGE_ROOT, context.filename).split(sep).join("/");
    if (file.startsWith("..") || isAbsolute(file)) return nativeRule.create(context);

    const remaining = new Map(allowlistByFile.get(file));
    let lines;
    const codeAt = (line) => {
      lines ??= context.sourceCode.text.split(LINE_TERMINATOR);
      return lines[line - 1].trim();
    };

    const filteringContext = Object.create(context, {
      report: {
        value(descriptor) {
          const key = entryKey(ruleOf(descriptor), codeAt(reportedLine(descriptor.node)));
          const count = remaining.get(key) ?? 0;
          if (count > 0) {
            remaining.set(key, count - 1);
            return;
          }
          context.report(descriptor);
        },
      },
    });

    const listeners = nativeRule.create(filteringContext);
    const nativeExit = listeners["Program:exit"];
    return {
      ...listeners,
      "Program:exit"(node) {
        nativeExit?.call(listeners, node);
        for (const [key, count] of remaining) {
          const [entryRule, code] = JSON.parse(key);
          for (let index = 0; index < count; index += 1) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: "restrictedSyntax",
              data: {
                message: `[stale-allowlist] Remove this entry from ${ALLOWLIST_FILE}: ${file} [${entryRule}] ${code}`,
              },
            });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: eslintJs.meta.name },
  rules: { "no-restricted-syntax": rule },
};
