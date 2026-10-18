import { errors, type Locator, type Page } from "@playwright/test";
import { signifierSelector, type SignifierStates } from "@shopify/hydrogen";

import { createContractError, type SignifierProblem, type SignifierTestId } from "./contract";
import { SIGNIFIER_REMEDIATION } from "./signifier-remediation";
import { EXPECT_TIMEOUT_MS } from "./timeouts";

type SignifierScope = Page | Locator;

type MatchCounts = {
  readonly attached: number;
  readonly visible: number;
};

/**
 * Returns a locator for every attached element with the signifier inside `scope`,
 * visible or not. State fields narrow the match. The selector comes only from Hydrogen.
 */
export function locateSignifier<TestId extends SignifierTestId>(
  scope: SignifierScope,
  testId: TestId,
  state: Partial<SignifierStates[TestId]> = {},
): Locator {
  return scope.locator(signifierSelector(testId, state));
}

/**
 * Waits for a visible element with the signifier and returns a live locator for the
 * first visible match in DOM order. Playwright actions do their usual checks.
 *
 * - One or more visible elements: returns the first visible element.
 * - No visible element at the timeout and no attached element: fails as missing.
 * - No visible element at the timeout but attached elements: fails as not visible.
 */
export async function requireSignifier<TestId extends SignifierTestId>(
  scope: SignifierScope,
  testId: TestId,
  state: Partial<SignifierStates[TestId]> = {},
): Promise<Locator> {
  const all = locateSignifier(scope, testId, state);
  const visible = all.filter({ visible: true });
  const target = visible.first();

  try {
    await target.waitFor({ state: "visible", timeout: EXPECT_TIMEOUT_MS });
  } catch (waitError) {
    if (!(waitError instanceof errors.TimeoutError)) throw waitError;
    const counts: MatchCounts = { attached: await all.count(), visible: await visible.count() };
    throw signifierError(scope, testId, state, counts, { cause: waitError });
  }

  return target;
}

function signifierError(
  scope: SignifierScope,
  testId: SignifierTestId,
  state: Readonly<Record<string, unknown>>,
  counts: MatchCounts,
  options?: ErrorOptions,
): Error {
  const remediation = SIGNIFIER_REMEDIATION[testId];
  const problem: SignifierProblem = counts.attached === 0 ? "missing" : "not-visible";

  return createContractError(
    {
      capability: remediation.capability,
      routePath: routePathOf(scope),
      expectation: `At least one visible element with the "${testId}" signifier appears within ${EXPECT_TIMEOUT_MS}ms.`,
      likelyFix:
        problem === "missing"
          ? "Add the signifier to the control with a Hydrogen form binding or signifier()."
          : "Make the control with this signifier visible before the test uses it. Open the UI that contains it, or put the signifier on the control that is visible.",
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
