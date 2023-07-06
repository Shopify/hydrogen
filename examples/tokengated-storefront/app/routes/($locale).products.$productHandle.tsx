import {Disclosure, Listbox} from '@headlessui/react';
import {
  useLoaderData,
  Await,
  useSearchParams,
  useLocation,
  useNavigation,
} from '@remix-run/react';
import {ConnectButton} from '@shopify/connect-wallet';
import type {ShopifyAnalyticsProduct} from '@shopify/hydrogen';
import {AnalyticsPageType, Money, ShopPayButton} from '@shopify/hydrogen';
import type {
  ProductVariant,
  SelectedOptionInput,
  Product as ProductType,
  Shop,
  ProductConnection,
} from '@shopify/hydrogen/storefront-api-types';
import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {Tokengate} from '@shopify/tokengate';
import type {Reaction, Requirements, UnlockingToken} from '@shopify/tokengate';
import clsx from 'clsx';
import {type ReactNode, useRef, Suspense, useMemo} from 'react';
import invariant from 'tiny-invariant';

import {
  Heading,
  IconCaret,
  IconCheck,
  IconClose,
  ProductGallery,
  ProductSwimlane,
  Section,
  Skeleton,
  Text,
  Link,
  AddToCartButton,
  Button,
} from '~/components';
import {MEDIA_FRAGMENT, PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import type {
  Metafield,
  Product as UnstableProductType,
} from '~/generated/storefront-api-types';
import {writeContextToAttributes} from '~/lib/attributes.server';
import {evaluateGate} from '~/lib/evaluateGate.server';
import {seoPayload} from '~/lib/seo.server';
import type {Storefront} from '~/lib/type';
import {getExcerpt} from '~/lib/utils';
import {walletSession} from '~/lib/wallet.server';

export async function loader({params, request, context}: LoaderArgs) {
  const headers = new Headers();

  const {getWallet} = await walletSession(request);
  const wallet = getWallet();

  const {productHandle} = params;
  invariant(productHandle, 'Missing productHandle param, check route filename');

  const searchParams = new URL(request.url).searchParams;

  const selectedOptions: SelectedOptionInput[] = [];
  searchParams.forEach((value, name) => {
    selectedOptions.push({name, value});
  });

  const {shop, product} = await context.storefront.query<{
    product: UnstableProductType & {selectedVariant?: ProductVariant};
    shop: Shop;
  }>(PRODUCT_QUERY, {
    variables: {
      handle: productHandle,
      selectedOptions,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });

  if (!product?.id) {
    throw new Response('product', {status: 404});
  }

  /**
   * While the example below is only filtering on gates which are active, you could optionally
   * add a filter against `configuration.handle`.
   *
   * An example for this might be if you are participating in a cross-brand collab where you want
   * to offer exclusive purchasing benefits to loyal buyers of another brand.
   */
  const gates = product.gates.filter(({active}) => active);

  const gateConfiguration = gates.length ? gates[0].configuration : undefined;

  let unlockingTokens: UnlockingToken[] = [];

  if (gateConfiguration) {
    const gateEvaluation = await evaluateGate({
      context,
      gateConfiguration,
      wallet,
    });

    unlockingTokens = gateEvaluation.unlockingTokens;

    // If an hmac key was returned in gateContext, use the hmac to write context to cart attributes.
    if (gateEvaluation.gateContext?.hmac) {
      try {
        const id = await writeContextToAttributes({
          context,
          gateContext: gateEvaluation.gateContext,
          request,
        });

        // Set the cart cookie to the id returned from writeContextToAttributes
        headers.append('Set-Cookie', `cart=${id.split('/').pop()};path=/`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);

        throw new Response(
          'Error caught while attempting to write context to cart attributes.',
          {
            status: 410,
          },
        );
      }
    }
  }

  const recommended = getRecommendedProducts(context.storefront, product.id);
  const firstVariant = product.variants.nodes[0];
  const selectedVariant = product.selectedVariant ?? firstVariant;

  const productAnalytics: ShopifyAnalyticsProduct = {
    productGid: product.id,
    variantGid: selectedVariant.id,
    name: product.title,
    variantName: selectedVariant.title,
    brand: product.vendor,
    price: selectedVariant.price.amount,
  };

  const seo = seoPayload.product({
    product: product as ProductType,
    selectedVariant: selectedVariant as ProductVariant,
    url: request.url,
  });

  return defer(
    {
      product,
      gateConfiguration,
      unlockingTokens,
      wallet,
      shop,
      storeDomain: shop.primaryDomain.url,
      recommended,
      analytics: {
        pageType: AnalyticsPageType.product,
        resourceId: product.id,
        products: [productAnalytics],
        totalValue: parseFloat(selectedVariant.price.amount),
      },
      seo,
    },
    {
      headers,
    },
  );
}

export default function Product() {
  const {product, shop, recommended} = useLoaderData<typeof loader>();
  const {media, title, vendor, descriptionHtml} = product;
  const {shippingPolicy, refundPolicy} = shop;

  return (
    <>
      <Section className="px-0 md:px-8 lg:px-12">
        <div className="grid items-start md:gap-6 lg:gap-20 md:grid-cols-2 lg:grid-cols-3">
          <ProductGallery
            media={media.nodes}
            className="w-full lg:col-span-2"
          />
          <div className="sticky md:-mb-nav md:top-nav md:-translate-y-nav md:h-screen md:pt-nav hiddenScroll md:overflow-y-scroll">
            <section className="flex flex-col w-full max-w-xl gap-8 p-6 md:mx-auto md:max-w-sm md:px-0">
              <div className="grid gap-2">
                <Heading as="h1" className="whitespace-normal">
                  {title}
                </Heading>
                {vendor && (
                  <Text className={'opacity-50 font-medium'}>{vendor}</Text>
                )}
              </div>
              <ProductForm />
              <div className="grid gap-4 py-4">
                {descriptionHtml && (
                  <ProductDetail
                    title="Product Details"
                    content={descriptionHtml}
                  />
                )}
                {shippingPolicy?.body && (
                  <ProductDetail
                    title="Shipping"
                    content={getExcerpt(shippingPolicy.body)}
                    learnMore={`/policies/${shippingPolicy.handle}`}
                  />
                )}
                {refundPolicy?.body && (
                  <ProductDetail
                    title="Returns"
                    content={getExcerpt(refundPolicy.body)}
                    learnMore={`/policies/${refundPolicy.handle}`}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </Section>
      <Suspense fallback={<Skeleton className="h-32" />}>
        <Await
          errorElement="There was a problem loading related products"
          resolve={recommended}
        >
          {(products) => (
            <ProductSwimlane title="Related Products" products={products} />
          )}
        </Await>
      </Suspense>
    </>
  );
}

export function ProductForm() {
  const {
    analytics,
    gateConfiguration,
    product,
    storeDomain,
    unlockingTokens,
    wallet,
  } = useLoaderData<typeof loader>();

  const [currentSearchParams] = useSearchParams();
  const {location} = useNavigation();

  /**
   * We update `searchParams` with in-flight request data from `location` (if available)
   * to create an optimistic UI, e.g. check the product option before the
   * request has completed.
   */
  const searchParams = useMemo(() => {
    return location
      ? new URLSearchParams(location.search)
      : currentSearchParams;
  }, [currentSearchParams, location]);

  const firstVariant = product.variants.nodes[0];

  /**
   * We're making an explicit choice here to display the product options
   * UI with a default variant, rather than wait for the user to select
   * options first. Developers are welcome to opt-out of this behavior.
   * By default, the first variant's options are used.
   */
  const searchParamsWithDefaults = useMemo<URLSearchParams>(() => {
    const clonedParams = new URLSearchParams(searchParams);

    for (const {name, value} of firstVariant.selectedOptions) {
      if (!searchParams.has(name)) {
        clonedParams.set(name, value);
      }
    }

    return clonedParams;
  }, [searchParams, firstVariant.selectedOptions]);

  /**
   * Likewise, we're defaulting to the first variant for purposes
   * of add to cart if there is none returned from the loader.
   * A developer can opt out of this, too.
   */
  const selectedVariant = product.selectedVariant ?? firstVariant;
  const isOutOfStock = !selectedVariant?.availableForSale;
  const allVariantsSoldOut = product.variants.nodes.every(
    (node: ProductVariant) => !node.availableForSale,
  );

  const isOnSale =
    selectedVariant?.price?.amount &&
    selectedVariant?.compareAtPrice?.amount &&
    selectedVariant?.price?.amount < selectedVariant?.compareAtPrice?.amount;

  const productAnalytics: ShopifyAnalyticsProduct = {
    ...analytics.products[0],
    quantity: 1,
  };

  const gateMetafields: Metafield[] = gateConfiguration?.metafields || [];

  // Create an array of collection addresses for the provided gateConfiguration.
  const gateReaction = gateMetafields.filter((metafield) => {
    return metafield && metafield.key === 'reaction';
  })[0]?.value;

  const reaction = gateReaction
    ? (JSON.parse(gateReaction) as Reaction)
    : undefined;

  const gateRequirements = gateMetafields.filter((metafield) => {
    return metafield && metafield.key === 'requirements';
  })[0]?.value;

  const requirements = gateRequirements
    ? (JSON.parse(gateRequirements) as Requirements)
    : undefined;

  // Use this variable for conditional rendering based on the variables above.
  const isGated = reaction && requirements;

  return (
    <div className="grid gap-10">
      {isGated ? (
        <Tokengate
          connectButton={<ConnectButton />}
          isConnected={Boolean(wallet)}
          reaction={reaction}
          requirements={requirements}
          unlockingTokens={unlockingTokens}
          isSoldOut={allVariantsSoldOut}
        />
      ) : null}
      <div className="grid gap-4">
        {!isGated || reaction.type === 'discount' || unlockingTokens.length ? (
          <>
            <ProductOptions
              options={product.options}
              searchParamsWithDefaults={searchParamsWithDefaults}
            />
            {selectedVariant && (
              <div className="grid items-stretch gap-4">
                {isOutOfStock ? (
                  <Button variant="secondary" disabled>
                    <Text>Sold out</Text>
                  </Button>
                ) : (
                  <AddToCartButton
                    lines={[
                      {
                        merchandiseId: selectedVariant.id,
                        quantity: 1,
                      },
                    ]}
                    variant="primary"
                    data-test="add-to-cart"
                    analytics={{
                      products: [productAnalytics],
                      totalValue: parseFloat(productAnalytics.price),
                    }}
                  >
                    <Text
                      as="span"
                      className="flex items-center justify-center gap-2"
                    >
                      <span>Add to Cart</span> <span>·</span>{' '}
                      <Money
                        withoutTrailingZeros
                        data={selectedVariant?.price!}
                        as="span"
                      />
                      {isOnSale && (
                        <Money
                          withoutTrailingZeros
                          data={selectedVariant?.compareAtPrice!}
                          as="span"
                          className="opacity-50 strike"
                        />
                      )}
                    </Text>
                  </AddToCartButton>
                )}
                {!isOutOfStock && (
                  <ShopPayButton
                    width="100%"
                    variantIds={[selectedVariant?.id!]}
                    storeDomain={storeDomain}
                  />
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProductOptions({
  options,
  searchParamsWithDefaults,
}: {
  options: ProductType['options'];
  searchParamsWithDefaults: URLSearchParams;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      {options
        .filter((option) => option.values.length > 1)
        .map((option) => (
          <div
            key={option.name}
            className="flex flex-col flex-wrap mb-4 gap-y-2 last:mb-0"
          >
            <Heading as="legend" size="lead" className="min-w-[4rem]">
              {option.name}
            </Heading>
            <div className="flex flex-wrap items-baseline gap-4">
              {/**
               * First, we render a bunch of <Link> elements for each option value.
               * When the user clicks one of these buttons, it will hit the loader
               * to get the new data.
               *
               * If there are more than 7 values, we render a dropdown.
               * Otherwise, we just render plain links.
               */}
              {option.values.length > 7 ? (
                <div className="relative w-full">
                  <Listbox>
                    {({open}) => (
                      <>
                        <Listbox.Button
                          ref={closeRef}
                          className={clsx(
                            'flex items-center justify-between w-full py-3 px-4 border border-primary',
                            open
                              ? 'rounded-b md:rounded-t md:rounded-b-none'
                              : 'rounded',
                          )}
                        >
                          <span>
                            {searchParamsWithDefaults.get(option.name)}
                          </span>
                          <IconCaret direction={open ? 'up' : 'down'} />
                        </Listbox.Button>
                        <Listbox.Options
                          className={clsx(
                            'border-primary bg-contrast absolute bottom-12 z-30 grid h-48 w-full overflow-y-scroll rounded-t border px-2 py-2 transition-[max-height] duration-150 sm:bottom-auto md:rounded-b md:rounded-t-none md:border-t-0 md:border-b',
                            open ? 'max-h-48' : 'max-h-0',
                          )}
                        >
                          {option.values.map((value) => (
                            <Listbox.Option
                              key={`option-${option.name}-${value}`}
                              value={value}
                            >
                              {({active}) => (
                                <ProductOptionLink
                                  optionName={option.name}
                                  optionValue={value}
                                  className={clsx(
                                    'text-primary w-full p-2 transition rounded flex justify-start items-center text-left cursor-pointer',
                                    active && 'bg-primary/10',
                                  )}
                                  searchParams={searchParamsWithDefaults}
                                  onClick={() => {
                                    if (!closeRef?.current) return;
                                    closeRef.current.click();
                                  }}
                                >
                                  {value}
                                  {searchParamsWithDefaults.get(option.name) ===
                                    value && (
                                    <span className="ml-2">
                                      <IconCheck />
                                    </span>
                                  )}
                                </ProductOptionLink>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </>
                    )}
                  </Listbox>
                </div>
              ) : (
                <>
                  {option.values.map((value) => {
                    const checked =
                      searchParamsWithDefaults.get(option.name) === value;
                    const id = `option-${option.name}-${value}`;

                    return (
                      <Text key={id}>
                        <ProductOptionLink
                          optionName={option.name}
                          optionValue={value}
                          searchParams={searchParamsWithDefaults}
                          className={clsx(
                            'leading-none py-1 border-b-[1.5px] cursor-pointer transition-all duration-200',
                            checked ? 'border-primary/50' : 'border-primary/0',
                          )}
                        />
                      </Text>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        ))}
    </>
  );
}

function ProductOptionLink({
  optionName,
  optionValue,
  searchParams,
  children,
  ...props
}: {
  optionName: string;
  optionValue: string;
  searchParams: URLSearchParams;
  children?: ReactNode;
  [key: string]: any;
}) {
  const {pathname} = useLocation();
  const isLocalePathname = /\/[a-zA-Z]{2}-[a-zA-Z]{2}\//g.test(pathname);
  // fixes internalized pathname
  const path = isLocalePathname
    ? `/${pathname.split('/').slice(2).join('/')}`
    : pathname;

  const clonedSearchParams = new URLSearchParams(searchParams);
  clonedSearchParams.set(optionName, optionValue);

  return (
    <Link
      {...props}
      preventScrollReset
      prefetch="intent"
      replace
      to={`${path}?${clonedSearchParams.toString()}`}
    >
      {children ?? optionValue}
    </Link>
  );
}

function ProductDetail({
  title,
  content,
  learnMore,
}: {
  title: string;
  content: string;
  learnMore?: string;
}) {
  return (
    <Disclosure key={title} as="div" className="grid w-full gap-2">
      {({open}) => (
        <>
          <Disclosure.Button className="text-left">
            <div className="flex justify-between">
              <Text size="lead" as="h4">
                {title}
              </Text>
              <IconClose
                className={clsx(
                  'transition-transform transform-gpu duration-200',
                  !open && 'rotate-[45deg]',
                )}
              />
            </div>
          </Disclosure.Button>

          <Disclosure.Panel className={'pb-4 pt-2 grid gap-2'}>
            <div
              className="prose dark:prose-invert"
              dangerouslySetInnerHTML={{__html: content}}
            />
            {learnMore && (
              <div className="">
                <Link
                  className="pb-px border-b border-primary/30 text-primary/50"
                  to={learnMore}
                >
                  Learn more
                </Link>
              </div>
            )}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantFragment on ProductVariant {
    id
    availableForSale
    selectedOptions {
      name
      value
    }
    image {
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
  }
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      vendor
      handle
      descriptionHtml
      description
      gates {
        active
        configuration {
          appId
          id
          metafields(identifiers: [
            {
              # Replace this with your namespace
            	namespace: "headless_gating_example",
            	key: "reaction",
            },
            {
              # Replace this with your namespace
            	namespace: "headless_gating_example",
            	key: "requirements",
            },
          ]) {
            id
            key
            value
          }
          name
        }
        id
      }
      options {
        name
        values
      }
      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
        ...ProductVariantFragment
      }
      media(first: 7) {
        nodes {
          ...Media
        }
      }
      variants(first: 1) {
        nodes {
          ...ProductVariantFragment
        }
      }
      seo {
        description
        title
      }
    }
    shop {
      name
      primaryDomain {
        url
      }
      shippingPolicy {
        body
        handle
      }
      refundPolicy {
        body
        handle
      }
    }
  }
  ${MEDIA_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  query productRecommendations(
    $productId: ID!
    $count: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    recommended: productRecommendations(productId: $productId) {
      ...ProductCard
    }
    additional: products(first: $count, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

async function getRecommendedProducts(
  storefront: Storefront,
  productId: string,
) {
  const products = await storefront.query<{
    recommended: ProductType[];
    additional: ProductConnection;
  }>(RECOMMENDED_PRODUCTS_QUERY, {
    variables: {productId, count: 12},
  });

  invariant(products, 'No data returned from Shopify API');

  const mergedProducts = products.recommended
    .concat(products.additional.nodes)
    .filter(
      (value, index, array) =>
        array.findIndex((value2) => value2.id === value.id) === index,
    );

  const originalProduct = mergedProducts
    .map((item: ProductType) => item.id)
    .indexOf(productId);

  mergedProducts.splice(originalProduct, 1);

  return mergedProducts;
}
