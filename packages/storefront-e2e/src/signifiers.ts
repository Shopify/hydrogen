import { expect, type Locator, type Page } from "@playwright/test";
import { signifierSelector, type SignifierStates } from "@shopify/hydrogen";

import { createContractError, type SignifierName, type SignifierProblem } from "./contract";
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
export function h3<Name extends SignifierName>(
  scope: SignifierScope,
  name: Name,
  state: Partial<SignifierStates[Name]> = {},
): Locator {
  return scope.locator(signifierSelector(name, state));
}

/**
 * Waits for exactly one usable element with the signifier.
 *
 * - One visible element wins, also when hidden copies are attached.
 * - With no visible element, exactly one attached element wins.
 * - More than one visible element, or more than one hidden element, is ambiguous.
 * - No attached element is missing.
 */
export async function requireH3<Name extends SignifierName>(
  scope: SignifierScope,
  name: Name,
  state: Partial<SignifierStates[Name]> = {},
): Promise<Locator> {
  const all = h3(scope, name, state);
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
          return isResolved(resolveMatch(counts)) ? "resolved" : "pending";
        },
        {
          message: `Waiting for one resolvable "${name}" signifier.`,
          timeout: EXPECT_TIMEOUT_MS,
        },
      )
      .not.toBe("pending");
  } catch (pollError) {
    throw signifierError(scope, name, state, counts, { cause: pollError });
  }

  if (countFailure !== undefined) throw countFailure.error;

  const resolution = resolveMatch(counts);
  if (resolution === "visible") return visible;
  if (resolution === "attached") return all;
  throw signifierError(scope, name, state, counts);
}

function resolveMatch(counts: MatchCounts): MatchResolution {
  if (counts.visible === 1) return "visible";
  if (counts.visible > 1) return "ambiguous";
  if (counts.attached === 1) return "attached";
  if (counts.attached > 1) return "ambiguous";
  return "missing";
}

function isResolved(resolution: MatchResolution): boolean {
  return resolution === "visible" || resolution === "attached";
}

function signifierError(
  scope: SignifierScope,
  name: SignifierName,
  state: Readonly<Record<string, unknown>>,
  counts: MatchCounts,
  options?: ErrorOptions,
): Error {
  const remediation = SIGNIFIER_REMEDIATION[name];
  const resolution = resolveMatch(counts);
  const problem: SignifierProblem = resolution === "ambiguous" ? "ambiguous" : "missing";

  return createContractError(
    {
      capability: remediation.capability,
      routePath: routePathOf(scope),
      expectation:
        problem === "missing"
          ? `An element with the "${name}" signifier is attached within ${EXPECT_TIMEOUT_MS}ms.`
          : `Exactly one visible element, or exactly one attached element when none is visible, has the "${name}" signifier.`,
      likelyFix:
        problem === "missing"
          ? "Add the signifier to the control with a Hydrogen form binding or signifier()."
          : "Keep only one visible control with this signifier on the page.",
      docsAnchor: remediation.docsAnchor,
      signifier: {
        name,
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
