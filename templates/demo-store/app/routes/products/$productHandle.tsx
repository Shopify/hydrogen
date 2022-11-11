import {Disclosure, Listbox} from '@headlessui/react';
import {defer, type LoaderArgs} from '@shopify/hydrogen-remix';
import {
  useLoaderData,
  Await,
  useSearchParams,
  useLocation,
  useTransition,
  useFetcher,
} from '@remix-run/react';
import {Money, ShopPayButton} from '@shopify/hydrogen-react';
import {type ReactNode, useRef, Suspense, useMemo} from 'react';
import {
  Button,
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
} from '~/components';
import {getExcerpt, getLocalizationFromLang} from '~/lib/utils';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import invariant from 'tiny-invariant';
import clsx from 'clsx';
import {
  ProductVariant,
  SelectedOptionInput,
  Product as ProductType,
  Shop,
  ProductConnection,
  LanguageCode,
  CountryCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  MEDIA_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
  PRODUCT_VARIANT_FRAGMENT,
} from '~/data';

export const loader = async ({
  params,
  request,
  context: {storefront},
}: LoaderArgs) => {
  const {productHandle} = params;
  invariant(productHandle, 'Missing productHandle param, check route filename');

  const {language, country} = getLocalizationFromLang(params.lang);
  const searchParams = new URL(request.url).searchParams;

  const selectedOptions: SelectedOptionInput[] = [];
  searchParams.forEach((value, name) => {
    selectedOptions.push({name, value});
  });

  const {shop, product} = await storefront.query<{
    product: ProductType & {selectedVariant?: ProductVariant};
    shop: Shop;
  }>({
    query: PRODUCT_QUERY,
    variables: {
      handle: productHandle,
      country,
      language,
      selectedOptions,
    },
  });

  return defer({
    product,
    shop,
    recommended: getRecommendedProducts(
      storefront,
      language,
      country,
      product.id,
    ),
  });
};

async function getRecommendedProducts(
  storefront: LoaderArgs['context']['storefront'],
  language: LanguageCode,
  country: CountryCode,
  productId: string,
) {
  const products = await storefront.query<{
    recommended: ProductType[];
    additional: ProductConnection;
  }>({
    query: RECOMMENDED_PRODUCTS_QUERY,
    variables: {
      productId,
      count: 12,
      language,
      country,
    },
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

export default function Product() {
  const {product, shop, recommended} = useLoaderData<typeof loader>();
  const {media, title, vendor, descriptionHtml} = product;
  const {shippingPolicy, refundPolicy} = shop;

  return (
    <>
      <Section padding="x" className="px-0">
        <div className="grid items-start md:gap-6 lg:gap-20 md:grid-cols-2 lg:grid-cols-3">
          <ProductGallery
            media={media.nodes}
            className="w-screen md:w-full lg:col-span-2"
          />
          <div className="sticky md:-mb-nav md:top-nav md:-translate-y-nav md:h-screen md:pt-nav hiddenScroll md:overflow-y-scroll">
            <section className="flex flex-col w-full max-w-xl gap-8 p-6 md:mx-auto md:max-w-sm md:px-0">
              <div className="grid gap-2">
                <Heading as="h1" format className="whitespace-normal">
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
  const addToCartFetcher = useFetcher();
  const isHydrated = useIsHydrated();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [currentSearchParams] = useSearchParams();
  const transition = useTransition();
  const isNavigationPending = transition.state === 'loading';

  /**
   * We update `searchParams` with in-flight request data from `transition` (if available)
   * to create an optimistic UI, e.g. check the product option before the
   * request has completed.
   */
  const searchParams = useMemo(() => {
    return isNavigationPending && transition.location
      ? new URLSearchParams(transition.location.search)
      : currentSearchParams;
  }, [isNavigationPending, currentSearchParams, transition]);

  const {product} = useLoaderData<typeof loader>();
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
  const isOnSale =
    selectedVariant?.priceV2?.amount &&
    selectedVariant?.compareAtPriceV2?.amount &&
    selectedVariant?.priceV2?.amount <
      selectedVariant?.compareAtPriceV2?.amount;

  return (
    <div className="grid gap-10">
      <div className="grid gap-4">
        {product.options
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
                                    {searchParamsWithDefaults.get(
                                      option.name,
                                    ) === value && (
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
                              checked
                                ? 'border-primary/50'
                                : 'border-primary/0',
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
        <div className="grid items-stretch gap-4">
          {selectedVariant && (
            <addToCartFetcher.Form method="post" action="/cart">
              <input
                type="hidden"
                name="variantId"
                defaultValue={selectedVariant?.id}
              />
              <input type="hidden" name="intent" defaultValue="addToCart" />

              {/* used to trigger a redirect back to the PDP when JS is disabled */}
              {isHydrated ? null : (
                <input
                  type="hidden"
                  name="redirectTo"
                  defaultValue={`products/${
                    product.handle
                  }?${searchParamsWithDefaults.toString()}`}
                />
              )}
              {/* @todo: add optimistic state when transitioning between selectedVariant via isNavigationPending */}
              <Button
                width="full"
                variant={isOutOfStock ? 'secondary' : 'primary'}
                disabled={isOutOfStock || isNavigationPending}
                as="button"
              >
                {isOutOfStock ? (
                  <Text>Sold out</Text>
                ) : (
                  <Text
                    as="span"
                    className="flex items-center justify-center gap-2"
                  >
                    <span>Add to bag</span> <span>·</span>{' '}
                    <Money
                      withoutTrailingZeros
                      data={selectedVariant?.priceV2!}
                      as="span"
                    />
                    {isOnSale && (
                      <Money
                        withoutTrailingZeros
                        data={selectedVariant?.compareAtPriceV2!}
                        as="span"
                        className="opacity-50 strike"
                      />
                    )}
                  </Text>
                )}
              </Button>
            </addToCartFetcher.Form>
          )}
          {!isOutOfStock && (
            <ShopPayButton variantIds={[selectedVariant?.id!]} />
          )}
        </div>
      </div>
    </div>
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
  const isLangPathname = /\/[a-zA-Z]{2}-[a-zA-Z]{2}\//g.test(pathname);
  // fixes internalized pathname
  const path = isLangPathname
    ? `/${pathname.split('/').slice(2).join('/')}`
    : pathname;

  const clonedSearchParams = new URLSearchParams(searchParams);
  clonedSearchParams.set(optionName, optionValue);

  return (
    <Link
      {...props}
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

const PRODUCT_QUERY = `#graphql
  ${MEDIA_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
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
`;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
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
`;
