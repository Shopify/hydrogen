import type { ContractCapability, SignifierName } from "./contract";

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
  "product-add-to-cart": {
    capability: "product-cart",
    bindingFix: "Spread register('addToCart', {}) on the add-to-cart control.",
    nonBindingFix:
      "Spread signifier('product-add-to-cart', { variantId, available }) from @shopify/hydrogen on the add-to-cart control.",
    minimumHydrogenVersion: "unreleased",
    commonCauses: [
      "A wrapper component renders the control but does not forward props to the rendered element.",
      "More than one visible add-to-cart control is rendered on the product page.",
    ],
    docsAnchor: "#product-add-to-cart",
  },
} as const satisfies { readonly [Name in SignifierName]: SignifierRemediation };
