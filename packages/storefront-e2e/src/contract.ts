export const CONTRACT_CAPABILITIES = [
  "collection-route",
  "collection-filter",
  "product-results",
  "product-route",
  "product-variant",
  "product-cart",
  "cart-route",
  "cart-line",
  "checkout-handoff",
  "search-route",
] as const;

export type ContractCapability = (typeof CONTRACT_CAPABILITIES)[number];

export type ContractErrorInput = {
  readonly capability: ContractCapability;
  readonly routePath: string;
  readonly expectation: string;
  readonly likelyFix: string;
  readonly docsAnchor: string;
};

export const CONTRACT_DOC_PATH = "packages/storefront-e2e/docs/storefront-contract.md";

export class StorefrontContractError extends Error {
  readonly capability: ContractCapability;
  readonly routePath: string;
  readonly expectation: string;
  readonly likelyFix: string;
  readonly docsAnchor: string;

  constructor(input: ContractErrorInput) {
    super(formatContractError(input));
    this.name = "StorefrontContractError";
    this.capability = input.capability;
    this.routePath = input.routePath;
    this.expectation = input.expectation;
    this.likelyFix = input.likelyFix;
    this.docsAnchor = input.docsAnchor;
  }
}

export function createContractError(input: ContractErrorInput): StorefrontContractError {
  return new StorefrontContractError(input);
}

function formatContractError(input: ContractErrorInput): string {
  return [
    `Missing storefront e2e contract capability: ${input.capability}`,
    `Route/page: ${input.routePath}`,
    `Expected: ${input.expectation}`,
    `Likely fix: ${input.likelyFix}`,
    `Docs: ${CONTRACT_DOC_PATH}${input.docsAnchor}`,
  ].join("\n");
}
