import { expect, type Locator, type Page } from "@playwright/test";
import type { AvailableFilter, AvailableFilterValue } from "@shopify/hydrogen";

import { createContractError } from "./contract";
import { locateSignifier } from "./signifiers";
import { EXPECT_TIMEOUT_MS } from "./timeouts";

// Bound each actionability probe so one covered value does not block later API candidates.
const FILTER_ACTION_PROBE_TIMEOUT_MS = 500;

/** Select API values that can narrow this rendered page, without reading display labels. */
export function getNarrowingFilterValues(
  filters: readonly AvailableFilter[],
  renderedProductCount: number,
): AvailableFilterValue[] {
  return filters.flatMap((filter) =>
    filter.type === "LIST" || filter.type === "BOOLEAN"
      ? filter.values.filter(
          (value) => value.input !== "" && value.count > 0 && value.count < renderedProductCount,
        )
      : [],
  );
}

export type CollectionFilterCandidate = {
  readonly value: AvailableFilterValue;
  readonly control: Locator;
  readonly actionTarget: Locator;
};

/** A storefront may show only some API values. Find one usable checkbox before choosing a value. */
export async function requireActionableCollectionFilter(
  page: Page,
  values: readonly AvailableFilterValue[],
  actionTargetOf: (filter: { control: Locator }) => Promise<Locator>,
): Promise<CollectionFilterCandidate> {
  let candidate: CollectionFilterCandidate | undefined;
  let problems: string[] = [];
  try {
    await expect
      .poll(
        async () => {
          problems = [];
          for (const value of values) {
            const controls = locateSignifier(page, "collection-filter-value", {
              filterId: value.id,
            });
            const count = await controls.count();
            const usable: CollectionFilterCandidate[] = [];
            if (count === 0) problems.push(`${value.id}: no attached signifier`);
            for (let index = 0; index < count; index += 1) {
              const control = controls.nth(index);
              let reason: string | undefined;
              const isCheckbox = await control.evaluate(
                (element) => element instanceof HTMLInputElement && element.type === "checkbox",
              );
              if (!isCheckbox)
                reason = "signifier is not on a native checkbox (check its placement)";
              else if (!(await control.isEnabled())) reason = "checkbox is disabled";
              else if (await control.isChecked()) reason = "checkbox is already selected";
              if (reason !== undefined) {
                problems.push(`${value.id}: ${reason}`);
                continue;
              }
              const actionTarget = await actionTargetOf({ control });
              if (!(await actionTarget.isVisible())) {
                problems.push(`${value.id}: hidden-only checkbox with no visible wrapping label`);
                continue;
              }
              try {
                await actionTarget.click({ trial: true, timeout: FILTER_ACTION_PROBE_TIMEOUT_MS });
              } catch {
                problems.push(
                  `${value.id}: checkbox or wrapping label cannot receive a click (hidden-only, covered, or unstable)`,
                );
                continue;
              }
              usable.push({ value, control, actionTarget });
            }
            if (usable.length === 1) {
              candidate = usable[0];
              return true;
            }
            if (usable.length > 1) problems.push(`${value.id}: multiple actionable checkboxes`);
          }
          return false;
        },
        { timeout: EXPECT_TIMEOUT_MS },
      )
      .toBe(true);
  } catch (cause) {
    throw createContractError(
      {
        capability: "collection-filter",
        routePath: routePath(page),
        expectation:
          "At least one known narrowing API value has an enabled, unchecked native checkbox with a visible control or wrapping label.",
        likelyFix: `Put getFilterValueAttributes(value) on the actual input[type=checkbox], not its label or a button. Show the checkbox or its wrapping label, and keep one actionable checkbox per value ID. Probed values: ${problems.join("; ")}`,
        docsAnchor: "#collection-filter-value",
      },
      { cause },
    );
  }
  if (candidate === undefined) throw new Error("No collection filter candidate resolved");
  return candidate;
}

/** Count visible signified cards once per handle, not links or the API's total result count. */
export async function renderedProductCardCount(page: Page): Promise<number> {
  const handles = await locateSignifier(page, "product-card")
    .filter({ visible: true })
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("data-shopify-product-handle")));
  if (handles.some((handle) => !handle)) {
    throw createContractError({
      capability: "product-results",
      routePath: routePath(page),
      expectation: "Every visible product-card signifier has a non-empty product handle.",
      likelyFix:
        "Spread getProductCardAttributes(product) on each card root. Supply product.handle, not a product ID, and forward data-shopify-product-handle through wrappers.",
      docsAnchor: "#product-card",
    });
  }
  return new Set(handles).size;
}

function routePath(page: Page): string {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}
