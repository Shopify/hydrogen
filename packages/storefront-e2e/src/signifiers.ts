import { expect, type Locator, type Page } from "@playwright/test";
import { signifierSelector, type SignifierStates } from "@shopify/hydrogen";

import { createContractError, type SignifierProblem, type SignifierTestId } from "./contract";
import { SIGNIFIER_REMEDIATION } from "./signifier-remediation";
import { EXPECT_TIMEOUT_MS } from "./timeouts";

type SignifierScope = Page | Locator;

type MatchCounts = {
  readonly attached: number;
  readonly visible: number;
};

type MatchResolution = "visible" | "attached" | SignifierProblem;

/**
 * Returns a locator for every element with the signifier inside `scope`.
 * State fields narrow the match. The selector comes only from Hydrogen.
 */
export function locateSignifier<TestId extends SignifierTestId>(
  scope: SignifierScope,
  testId: TestId,
  state: Partial<SignifierStates[TestId]> = {},
): Locator {
  return scope.locator(signifierSelector(testId, state));
}

/**
 * Waits for exactly one usable element with the signifier.
 *
 * - One visible element wins, also when hidden copies are attached.
 * - With no visible element, exactly one attached element wins.
 * - More than one visible element, or more than one hidden element, is ambiguous.
 * - No attached element is missing.
 *
 * Pass `visible: true` to require one visible match without the attached-hidden fallback.
 * The optional timeout bounds this lookup's wait budget.
 */
export async function requireSignifier<TestId extends SignifierTestId>(
  scope: SignifierScope,
  testId: TestId,
  state: Partial<SignifierStates[TestId]> = {},
  options: { timeout?: number; visible?: boolean } = {},
): Promise<Locator> {
  const timeout = options.timeout ?? EXPECT_TIMEOUT_MS;
  const requireVisible = options.visible ?? false;
  const all = locateSignifier(scope, testId, state);
  const visible = all.filter({ visible: true });
  let counts: MatchCounts = { attached: 0, visible: 0 };
  let countFailure: { readonly error: unknown } | undefined;

  try {
    await expect
      .poll(
        async () => {
          try {
            counts = { attached: await all.count(), visible: await visible.count() };
          } catch (error) {
            countFailure = { error };
            return "count-failed";
          }
          return isResolved(resolveMatch(counts, requireVisible)) ? "resolved" : "pending";
        },
        {
          message: `Waiting for one resolvable "${testId}" signifier.`,
          timeout,
        },
      )
      .not.toBe("pending");
  } catch (pollError) {
    throw signifierError(scope, testId, state, counts, timeout, requireVisible, {
      cause: pollError,
    });
  }

  if (countFailure !== undefined) throw countFailure.error;

  const resolution = resolveMatch(counts, requireVisible);
  if (resolution === "visible") return visible;
  if (resolution === "attached") return all;
  throw signifierError(scope, testId, state, counts, timeout, requireVisible);
}

function resolveMatch(counts: MatchCounts, requireVisible: boolean): MatchResolution {
  if (counts.visible === 1) return "visible";
  if (counts.visible > 1) return "ambiguous";
  if (requireVisible) return "missing";
  if (counts.attached === 1) return "attached";
  if (counts.attached > 1) return "ambiguous";
  return "missing";
}

function isResolved(resolution: MatchResolution): boolean {
  return resolution === "visible" || resolution === "attached";
}

function signifierError(
  scope: SignifierScope,
  testId: SignifierTestId,
  state: Readonly<Record<string, unknown>>,
  counts: MatchCounts,
  timeout: number,
  requireVisible: boolean,
  options?: ErrorOptions,
): Error {
  const remediation = SIGNIFIER_REMEDIATION[testId];
  const resolution = resolveMatch(counts, requireVisible);
  const problem: SignifierProblem = resolution === "ambiguous" ? "ambiguous" : "missing";
  const expectation = requireVisible
    ? `Exactly one visible element with the "${testId}" signifier appears within ${timeout}ms.`
    : problem === "missing"
      ? `An element with the "${testId}" signifier is attached within ${timeout}ms.`
      : `Exactly one visible element, or exactly one attached element when none is visible, has the "${testId}" signifier.`;

  return createContractError(
    {
      capability: remediation.capability,
      routePath: routePathOf(scope),
      expectation,
      likelyFix:
        problem === "missing"
          ? requireVisible && counts.attached > 0
            ? "Make the matching element visible in the searched scope; keep inactive copies hidden and allow page content to render."
            : "Add the signifier to the control with a Hydrogen form binding or signifier()."
          : "Keep only one visible control with this signifier on the page.",
      docsAnchor: remediation.docsAnchor,
      signifier: {
        name: testId,
        problem,
        state,
        attachedCount: counts.attached,
        visibleCount: counts.visible,
        bindingFix: remediation.bindingFix,
        nonBindingFix: remediation.nonBindingFix,
        commonCauses: remediation.commonCauses,
        minimumHydrogenVersion: remediation.minimumHydrogenVersion,
      },
    },
    options,
  );
}

function routePathOf(scope: SignifierScope): string {
  const page = "page" in scope ? scope.page() : scope;
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}
