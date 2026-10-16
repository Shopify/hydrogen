import type { ContractCapability, SignifierTestId } from "./contract";

/**
 * `unreleased` until the first changeset that adds signifiers is published.
 * Replace it with that published `@shopify/hydrogen` version. Do not guess it.
 */
export type MinimumHydrogenVersion =
  | "unreleased"
  | `${number}.${number}.${number}`
  | `${number}.${number}.${number}-${string}`;

export type SignifierRemediation = {
  readonly capability: ContractCapability;
  readonly bindingFix: string;
  readonly nonBindingFix: string;
  readonly minimumHydrogenVersion: MinimumHydrogenVersion;
  readonly commonCauses: readonly string[];
  readonly docsAnchor: `#${string}`;
};

export const SIGNIFIER_REMEDIATION = {
  "product-option-value": {
    capability: "product-variant",
    bindingFix:
      "Spread register('optionValue', { optionName, value }) on buttons or inputs. Spread getProductOptionValueAttributes(optionName, value) on all option links, including hydrated same-product links; keep guarded same-product selection handlers and native or ARIA state. Core register callers must pass state.selectedOptions from store.getState() as the third argument for unresolved selections.",
    nonBindingFix:
      "Spread getProductOptionValueAttributes(optionName, value) from @shopify/hydrogen on all option links, or signifier('product-option-value', { optionName, optionValue, selected }) on your own buttons or inputs. Never spread register props onto links.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "A wrapper component does not forward attributes to the native option control.",
      "Option names, values, or selected state are stale, especially when a selection has no loaded variant.",
      "A select picker is used instead of supported per-value links, buttons, radios, or checkboxes.",
    ],
    docsAnchor: "#product-option-value",
  },
  "product-quantity": {
    capability: "product-cart",
    bindingFix:
      "Spread register('quantity', { value }) or register('quantity', { defaultValue }) on the product quantity input.",
    nonBindingFix:
      "Spread signifier('product-quantity', {}) from @shopify/hydrogen on the editable product quantity input.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "A quantity stepper does not forward attributes to its input.",
      "The signifier is on a wrapper or button instead of the editable input.",
      "The signifier is on a hidden quantity input instead of a visible, buyer-editable input.",
    ],
    docsAnchor: "#product-quantity",
  },
  "product-add-to-cart": {
    capability: "product-cart",
    bindingFix: "Spread register('addToCart', {}) on the add-to-cart control.",
    nonBindingFix:
      "Spread signifier('product-add-to-cart', { variantId, available }) from @shopify/hydrogen on the add-to-cart control.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "A wrapper component renders the control but does not forward props to the rendered element.",
      "More than one visible add-to-cart control is rendered on the product page.",
      "The signifier attributes exist but do not match the requested state, for example data-shopify-available is false when the query asks for true, or the variant ID is stale.",
    ],
    docsAnchor: "#product-add-to-cart",
  },
} as const satisfies { readonly [TestId in SignifierTestId]: SignifierRemediation };
