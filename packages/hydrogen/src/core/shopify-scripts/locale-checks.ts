import { getLogger } from "../logging";
import { normalizePathPrefix, stripI18nPathPrefix } from "../standard-routes/path";

// Development-only checks that a document keeps the one locale it was served for. Hydrogen's
// scripts read that locale once, from the `ShopifyScripts` bootstrap, so a second locale in the
// same document sends cart and analytics requests for the wrong market.

type LocaleProblem = "missing-provider" | "locale-change";

const log = getLogger("i18n");
const reportedProblems = new Set<LocaleProblem>();

function warnOnce(problem: LocaleProblem, message: string): void {
  if (reportedProblems.has(problem)) return;
  reportedProblems.add(problem);
  log.warn(message);
}

/** The locale path prefix the page was served under, or `undefined` without `ShopifyScripts`. */
function getPagePathPrefix(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const root = window.Shopify?.routes?.root;
  return root === undefined ? undefined : normalizePathPrefix(root);
}

function describePathPrefix(pathPrefix: string): string {
  return pathPrefix ? `the locale path prefix "${pathPrefix}"` : "no locale path prefix";
}

export function warnOnMissingLocaleProvider(): void {
  const pagePathPrefix = getPagePathPrefix();
  if (!pagePathPrefix) return;

  warnOnce(
    "missing-provider",
    `this page is served under the locale path prefix "${pagePathPrefix}", but no LocaleProvider wraps the cart and predictive search providers, so their requests go to the default locale. Render LocaleProvider above them with the request's locale.`,
  );
}

export function warnOnLocalePathPrefixMismatch(pathPrefix: string): void {
  const pagePathPrefix = getPagePathPrefix();
  if (pagePathPrefix === undefined) return;
  // The server matches prefixes without regard to case, so only a different prefix is a mismatch.
  if (normalizePathPrefix(pathPrefix).toLowerCase() === pagePathPrefix.toLowerCase()) return;

  warnOnce(
    "locale-change",
    `LocaleProvider received ${describePathPrefix(pathPrefix)}, but the page was loaded with ${describePathPrefix(pagePathPrefix)}. Hydrogen keeps one locale per page load. Pass the same locale to ShopifyScripts and LocaleProvider, and change locale with a full page load.`,
  );
}

export function warnOnLocaleChangingNavigation(): void {
  const pagePathPrefix = getPagePathPrefix();
  if (!pagePathPrefix) return;

  const { pathname } = window.location;
  const isUnderPagePathPrefix = stripI18nPathPrefix(pathname, pagePathPrefix) !== pathname;
  if (isUnderPagePathPrefix) return;

  warnOnce(
    "locale-change",
    `client-side navigation to "${pathname}" left the locale path prefix "${pagePathPrefix}" that the page was loaded under. Hydrogen keeps one locale per page load. Keep links under the prefix, and change locale with a full page load.`,
  );
}
