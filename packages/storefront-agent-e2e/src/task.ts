import { gql, type StorefrontClient } from "@shopify/hydrogen";

import {
  assertNoGraphQLErrors,
  createStorefrontApiClient,
  requestSignal,
  type CountryCode,
} from "./storefront-api";

export type SelectedOption = { readonly name: string; readonly value: string };

export type AddToCartTask = {
  /** What the agent is asked to do, in buyer language. */
  readonly goal: string;
  readonly productTitle: string;
  readonly productHandle: string;
  readonly variantId: string;
  readonly variantTitle: string;
  readonly selectedOptions: readonly SelectedOption[];
  readonly defaultVariantTitle: string;
  readonly quantity: number;
  /** The market discovery probed the cart in. */
  readonly country: CountryCode;
};

type Variant = {
  readonly id: string;
  readonly title: string;
  readonly availableForSale: boolean;
  readonly selectedOptions: readonly SelectedOption[];
};

const COLLECTION_PRODUCTS_QUERY = gql(`
  query AgentTaskCollections {
    collections(first: 10) {
      nodes {
        products(first: 25) {
          nodes {
            handle
            title
            requiresSellingPlan
            options {
              name
              optionValues {
                name
              }
            }
          }
        }
      }
    }
  }
`);

const PRODUCT_VARIANTS_QUERY = gql(`
  query AgentTaskVariants($handle: String!) {
    product(handle: $handle) {
      variants(first: 100) {
        nodes {
          id
          title
          availableForSale
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`);

const TITLE_MATCHES_QUERY = gql(`
  query AgentTaskTitleMatches($query: String!) {
    products(first: 5, query: $query) {
      nodes {
        title
      }
    }
  }
`);

// availableForSale doesn't guarantee a cart accepts the line (for example when no delivery
// zone covers the market), and tokenless access can't read stock, so probe with a real cart.
const CART_PROBE_MUTATION = gql(`
  mutation AgentTaskCartProbe($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        totalQuantity
      }
      warnings {
        code
      }
      userErrors {
        message
      }
    }
  }
`);

export async function generateAddToCartTask(options: {
  shopDomain: string;
  country: CountryCode;
  quantity: number;
  seed: number;
}): Promise<AddToCartTask> {
  const { shopDomain, country, quantity, seed } = options;
  const client = createStorefrontApiClient(shopDomain, country);

  const collections = await client.graphql(COLLECTION_PRODUCTS_QUERY, { signal: requestSignal() });
  assertNoGraphQLErrors("Collection products", collections.errors);
  const listed = collections.data?.collections.nodes.flatMap((c) => c.products.nodes) ?? [];
  const products = [...new Map(listed.map((p) => [p.handle, p])).values()]
    .filter((p) => !p.requiresSellingPlan && p.options.some((o) => o.optionValues.length > 1))
    .toSorted((a, b) => a.handle.localeCompare(b.handle));

  const rejections: string[] = [];
  for (const product of products) {
    if (!(await hasUniqueTitle(client, product.title))) {
      rejections.push(`${product.handle}: title is not unique`);
      continue;
    }
    const detail = await client.graphql(PRODUCT_VARIANTS_QUERY, {
      signal: requestSignal(),
      variables: { handle: product.handle },
    });
    assertNoGraphQLErrors(`Variants for ${product.handle}`, detail.errors);
    const variants = detail.data?.product?.variants.nodes ?? [];
    const defaultVariant = variants[0];
    if (!defaultVariant) continue;

    for (const variant of rankTargetVariants(variants, defaultVariant, seed)) {
      if (await cartAccepts(client, variant.id, quantity)) {
        return {
          goal: describeGoal(product.title, variant.selectedOptions, quantity),
          productTitle: product.title,
          productHandle: product.handle,
          variantId: variant.id,
          variantTitle: variant.title,
          selectedOptions: variant.selectedOptions,
          defaultVariantTitle: defaultVariant.title,
          quantity,
          country,
        };
      }
      rejections.push(`${product.handle} ${variant.title}: cart rejected ${quantity}`);
    }
  }

  throw new Error(
    "No product in a collection has a non-default variant a cart accepts at quantity " +
      `${quantity}. Checked: ${rejections.join("; ") || "no multi-option products found"}`,
  );
}

// Prefer variants that differ from the default in every option, so the agent must change
// each option, then rotate by seed for reproducible variety.
function rankTargetVariants(
  variants: readonly Variant[],
  defaultVariant: Variant,
  seed: number,
): Variant[] {
  const candidates = variants
    .filter((v) => v.id !== defaultVariant.id && v.availableForSale)
    .toSorted((a, b) => a.title.localeCompare(b.title));
  const differsEverywhere = (v: Variant) =>
    v.selectedOptions.every((o) =>
      defaultVariant.selectedOptions.some((d) => d.name === o.name && d.value !== o.value),
    );
  const preferred = candidates.filter(differsEverywhere);
  const rest = candidates.filter((v) => !differsEverywhere(v));
  const offset = preferred.length === 0 ? 0 : seed % preferred.length;
  return [...preferred.slice(offset), ...preferred.slice(0, offset), ...rest];
}

async function hasUniqueTitle(client: StorefrontClient, title: string): Promise<boolean> {
  const result = await client.graphql(TITLE_MATCHES_QUERY, {
    signal: requestSignal(),
    variables: { query: `title:${JSON.stringify(title)}` },
  });
  assertNoGraphQLErrors("Title matches", result.errors);
  return (result.data?.products.nodes ?? []).filter((p) => p.title === title).length === 1;
}

async function cartAccepts(
  client: StorefrontClient,
  variantId: string,
  quantity: number,
): Promise<boolean> {
  const result = await client.graphql(CART_PROBE_MUTATION, {
    signal: requestSignal(),
    variables: { lines: [{ merchandiseId: variantId, quantity }] },
  });
  assertNoGraphQLErrors("Cart probe", result.errors);
  const probe = result.data?.cartCreate;
  return (
    probe !== null &&
    probe !== undefined &&
    probe.userErrors.length === 0 &&
    probe.warnings.length === 0 &&
    probe.cart?.totalQuantity === quantity
  );
}

function describeGoal(title: string, options: readonly SelectedOption[], quantity: number) {
  const optionText = options.map((o) => `${o.name}: ${o.value}`).join(", ");
  return `Add ${quantity} of "${title}" (${optionText}) to the cart, then go to checkout.`;
}
