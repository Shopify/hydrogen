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
  "cart-line": {
    capability: "cart-line",
    bindingFix:
      "Spread lineProps(line) from useCartForm() on the line container, with its quantity, increase, decrease, and remove controls inside it.",
    nonBindingFix:
      "Spread getCartLineAttributes(line, cartState) from @shopify/hydrogen on the line container, or signifier('cart-line', { merchandiseId, quantity, pending }) without the cart store.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "A wrapper does not forward lineProps to the rendered container.",
      "The merchandise ID must be the product variant ID, not the cart line ID. Missing merchandise metadata produces an empty ID.",
      "More than one visible line has the same merchandise ID. Keep hidden drawer copies hidden and do not choose the first visible match.",
    ],
    docsAnchor: "#cart-line",
  },
  "cart-line-quantity": {
    capability: "cart-line",
    bindingFix:
      "Spread register('quantity', { value: line.quantity }) on the native quantity input inside its cart-line container. The interactive and defaultValue overloads also add the signifier.",
    nonBindingFix:
      "Spread signifier('cart-line-quantity', {}) from @shopify/hydrogen on the native quantity input inside its cart-line container.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "The quantity control is outside its cart-line container; a page-level signifier cannot replace a line-scoped control.",
      "An input wrapper does not forward the registered attributes to the native input.",
      "More than one quantity input is visible inside the same line container.",
    ],
    docsAnchor: "#cart-line-controls",
  },
  "cart-line-increase": {
    capability: "cart-line",
    bindingFix:
      "Spread register('increase') on the increase control inside its cart-line container.",
    nonBindingFix:
      "Spread signifier('cart-line-increase', {}) from @shopify/hydrogen on the increase control inside its cart-line container.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "The increase control is outside its cart-line container.",
      "A button wrapper does not forward the registered attributes to the rendered control.",
      "More than one increase control is visible inside the same line container.",
    ],
    docsAnchor: "#cart-line-controls",
  },
  "cart-line-decrease": {
    capability: "cart-line",
    bindingFix:
      "Spread register('decrease') on the decrease control inside its cart-line container.",
    nonBindingFix:
      "Spread signifier('cart-line-decrease', {}) from @shopify/hydrogen on the decrease control inside its cart-line container.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "The decrease control is outside its cart-line container.",
      "A button wrapper does not forward the registered attributes to the rendered control.",
      "More than one decrease control is visible inside the same line container.",
    ],
    docsAnchor: "#cart-line-controls",
  },
  "cart-line-remove": {
    capability: "cart-line",
    bindingFix: "Spread register('remove') on the remove control inside its cart-line container.",
    nonBindingFix:
      "Spread signifier('cart-line-remove', {}) from @shopify/hydrogen on the remove control inside its cart-line container.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "The remove control is outside its cart-line container, for example in a sibling form instead of a form within the container.",
      "A button wrapper does not forward the registered attributes to the rendered control.",
      "More than one remove control is visible inside the same line container.",
    ],
    docsAnchor: "#cart-line-controls",
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
