import type { SignifierStates } from "@shopify/hydrogen";

export const CONTRACT_CAPABILITIES = [
  "collection-route",
  "collection-filter",
  "product-results",
  "product-route",
  "product-variant",
  "product-cart",
  "cart-route",
  "cart-line",
  "cart-status",
  "checkout-handoff",
  "search-route",
] as const;

export type ContractCapability = (typeof CONTRACT_CAPABILITIES)[number];

export type SignifierName = keyof SignifierStates;

export type SignifierProblem = "missing" | "ambiguous";

export type ContractSignifierDetails = {
  readonly name: SignifierName;
  readonly problem: SignifierProblem;
  readonly state: Readonly<Record<string, unknown>>;
  readonly attachedCount: number;
  readonly visibleCount: number;
  readonly bindingFix: string;
  readonly nonBindingFix: string;
  readonly commonCauses: readonly string[];
  readonly minimumHydrogenVersion: string;
};

export type ContractErrorInput = {
  readonly capability: ContractCapability;
  readonly routePath: string;
  readonly expectation: string;
  readonly likelyFix: string;
  readonly docsAnchor: string;
  readonly signifier?: ContractSignifierDetails;
};

export const CONTRACT_DOC_PATH = "packages/storefront-e2e/docs/storefront-contract.md";

export class StorefrontContractError extends Error {
  readonly capability: ContractCapability;
  readonly routePath: string;
  readonly expectation: string;
  readonly likelyFix: string;
  readonly docsAnchor: string;
  readonly signifier: ContractSignifierDetails | undefined;

  constructor(input: ContractErrorInput, options?: ErrorOptions) {
    super(formatContractError(input), options);
    this.name = "StorefrontContractError";
    this.capability = input.capability;
    this.routePath = input.routePath;
    this.expectation = input.expectation;
    this.likelyFix = input.likelyFix;
    this.docsAnchor = input.docsAnchor;
    this.signifier = input.signifier;
  }
}

export function createContractError(
  input: ContractErrorInput,
  options?: ErrorOptions,
): StorefrontContractError {
  return new StorefrontContractError(input, options);
}

function formatContractError(input: ContractErrorInput): string {
  const { signifier } = input;
  if (signifier === undefined) {
    return [
      `Missing storefront e2e contract capability: ${input.capability}`,
      `Route/page: ${input.routePath}`,
      `Expected: ${input.expectation}`,
      `Likely fix: ${input.likelyFix}`,
      `Docs: ${CONTRACT_DOC_PATH}${input.docsAnchor}`,
    ].join("\n");
  }

  const problemLabel = signifier.problem === "missing" ? "Missing" : "Ambiguous";
  return [
    `${problemLabel} storefront e2e signifier: ${signifier.name}`,
    `Capability: ${input.capability}`,
    `Route/page: ${input.routePath}`,
    `Signifier: ${signifier.name} ${JSON.stringify(signifier.state)}`,
    `Found: ${signifier.attachedCount} attached, ${signifier.visibleCount} visible`,
    `Expected: ${input.expectation}`,
    `Likely fix: ${input.likelyFix}`,
    `Fix with Hydrogen form binding: ${signifier.bindingFix}`,
    `Fix without Hydrogen form binding: ${signifier.nonBindingFix}`,
    "Common causes:",
    ...signifier.commonCauses.map((cause) => `- ${cause}`),
    `Minimum Hydrogen version: ${signifier.minimumHydrogenVersion}`,
    `Docs: ${CONTRACT_DOC_PATH}${input.docsAnchor}`,
  ].join("\n");
}
