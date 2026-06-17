import { getSelectedProductOptions, gql } from "@shopify/hydrogen";
import { Title } from "@solidjs/meta";
import { createAsync, query, useLocation, useParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, For, Show } from "solid-js";

import { ProductCard } from "../../components/ProductCard";
import { ProductPurchasePanel } from "../../components/ProductPurchasePanel";
import { AnalyticsEvent, analyticsShop, getAnalytics } from "../../lib/analytics";
import { getRequestStorefrontClient } from "../../lib/request-storefront";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment SolidProductVariantFragment on ProductVariant {
    id
    title
    availableForSale
    selectedOptions {
      name
      value
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      id
      url
      altText
      width
      height
    }
    product {
      title
      handle
    }
    sku
  }
`);

const PRODUCT_FRAGMENT = gql(
  `
  fragment SolidProductFragment on Product {
    id
    handle
    title
    vendor
    requiresSellingPlan
    encodedVariantExistence
    encodedVariantAvailability
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...SolidProductVariantFragment
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...SolidProductVariantFragment
    }
    adjacentVariants(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...SolidProductVariantFragment
    }
  }
`,
  [PRODUCT_VARIANT_FRAGMENT],
);

const PRODUCT_QUERY = gql(
  `
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      ...SolidProductFragment
      description
      images(first: 10) {
        nodes {
          url
          altText
        }
      }
    }
    products(first: 4) {
      nodes {
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`,
  [PRODUCT_FRAGMENT],
);

const fetchProduct = query(async (handle: string, search: string) => {
  "use server";
  const storefrontClient = getRequestStorefrontClient();
  const { data } = await storefrontClient.graphql(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions: getSelectedProductOptions(new URLSearchParams(search)),
    },
  });
  if (!data?.product) {
    throw new Error(`Product not found: ${handle}`);
  }
  return {
    product: data.product,
    related: data.products?.nodes ?? [],
  };
}, "product");

export const route = {
  preload: ({ params }) => params.handle && fetchProduct(params.handle, ""),
} satisfies RouteDefinition;

export default function Product() {
  const params = useParams<{ handle: string }>();
  const location = useLocation();
  const data = createAsync(() => fetchProduct(params.handle, location.search));

  createEffect(() => {
    const loaded = data();
    if (!loaded) return;
    const p = loaded.product;
    getAnalytics()?.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: p.id,
          title: p.title,
          price:
            p.selectedOrFirstAvailableVariant?.price.amount ?? p.priceRange.minVariantPrice.amount,
          vendor: p.vendor,
          variantId: p.selectedOrFirstAvailableVariant?.id ?? p.id,
          variantTitle: p.selectedOrFirstAvailableVariant?.title ?? p.title,
          quantity: 1,
          sku: p.selectedOrFirstAvailableVariant?.sku,
        },
      ],
      url: window.location.href,
      shop: analyticsShop,
    });
  });

  return (
    <Show when={data()}>
      {(loaded) => {
        const product = () => loaded().product;
        const related = () => loaded().related;

        return (
          <main>
            <Title>{product().title} — Mock.shop</Title>
            <section class="grid grid-cols-1 gap-12 px-6 py-10 md:grid-cols-[minmax(0,1fr)_420px] md:gap-16 md:px-10 md:py-12">
              <div class="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2">
                <For each={product().images.nodes}>
                  {(image, i) => (
                    <div class="aspect-square overflow-hidden bg-neutral-100">
                      <img
                        src={image.url}
                        alt={image.altText ?? `${product().title} — image ${i() + 1}`}
                        class="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </For>
              </div>

              <ProductPurchasePanel product={product()} />
            </section>

            <section class="border-t border-black/10 px-6 py-16 md:px-10 md:py-20">
              <h2 class="text-2xl font-black tracking-tight">You may also like</h2>
              <div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
                <For
                  each={related()
                    .filter((p) => p.handle !== product().handle)
                    .slice(0, 4)}
                >
                  {(p) => <ProductCard product={p} />}
                </For>
              </div>
            </section>
          </main>
        );
      }}
    </Show>
  );
}
