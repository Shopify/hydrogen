import { Disclosure, Listbox } from "@headlessui/react";
import {
  type ActionFunction,
  defer,
  type LoaderArgs,
  redirect,
} from "@remix-run/cloudflare";
import {
  Link,
  useLoaderData,
  Await,
  useSearchParams,
  Form,
  useTransition,
} from "@remix-run/react";
import { Money, ShopPayButton } from "@shopify/hydrogen-ui-alpha";
import { type ReactNode, Suspense, useRef, useMemo } from "react";
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
} from "~/components";
import {
  addLineItem,
  createCart,
  getProductData,
  getProductMediaData,
  getPolicyData,
  getSelectedVariantData,
  getRecommendedProductsData,
  getFullProductData,
} from "~/data";
import { getExcerpt } from "~/lib/utils";
import invariant from "tiny-invariant";
import clsx from "clsx";
import { getSession } from "~/lib/session.server";
import memoizee from "memoizee";

// memoize individual data fetching calls
const getPolicies = memoizee(getPolicyData, { promise: true, maxAge: 1000 * 60 * 60 * 24 }); // fetch policy once a day for all product routes
const getProduct = memoizee(getProductData, { promise: true, length: 1, maxAge: 1000 * 60 * 10 }); // only update when the product handle changes or after 10 minutes
const getProductMedia = memoizee(getProductMediaData, { promise: true, length: 1, maxAge: 1000 * 60 * 10 }); // only update when the product handle changes or after 10 minutes
const getSelectedVariant = memoizee(getSelectedVariantData, { promise: true, length: 2, maxAge: 1000 * 60 * 5 }); // update when the handle or searchParams change or after 5 minutes
const getRecommendedProducts = memoizee(getRecommendedProductsData, { promise: true, length: 1, maxAge: 1000 * 60 * 60 * 12 }); // update when the product id changes or every 12 hours

export const loader = async ({ params, request, context }: LoaderArgs) => {
  const { handle } = params;
  const start = new Date().getTime()
  invariant(handle, "Missing handle param, check route filename");

  const selectedOptions = new URL(request.url).searchParams;
  const queriedOptions = selectedOptions.toString();

  let [fullProduct, { product }, {media}, { selectedVariant: _selectedVariant }] = await Promise.all([
    getFullProductData(handle, selectedOptions || []),
    getProduct(handle),
    getProductMedia(handle),
     // only attempt to fetch selectedVariant if we have searchParams
    queriedOptions
      ? getSelectedVariant(handle, selectedOptions)
      : {selectedVariant: null},
  ]);

  _selectedVariant = _selectedVariant ?? product.firstVariant;

    /**
   * Likewise, we're defaulting to the first variant for purposes
   * of add to cart if there is none returned from the loader.
   * A developer can opt out of this, too.
   */
  const isOutOfStock = !_selectedVariant?.availableForSale;
  const isOnSale =
    _selectedVariant?.priceV2?.amount &&
    _selectedVariant?.compareAtPriceV2?.amount &&
    _selectedVariant?.priceV2?.amount <
    _selectedVariant?.compareAtPriceV2?.amount;

  const selectedVariant = {
    ..._selectedVariant,
    isOutOfStock,
    isOnSale
  }

  return defer({
    start,
    product,
    media,
    selectedVariant,
    shop: getPolicies(),
    recommended: getRecommendedProducts(product.id),
  });
};

export const action: ActionFunction = async ({ request, context, params }) => {
  const [body, session] = await Promise.all([
    request.text(),
    getSession(request, context),
  ]);
  const formData = new URLSearchParams(body);

  const variantId = formData.get("variantId");

  invariant(variantId, "Missing variantId");

  // 1. Grab the cart ID from the session
  const cartId = await session.get("cartId");

  // We only need a Set-Cookie header if we're creating a new cart (aka adding cartId to the session)
  let headers = new Headers();

  // 2. If none exists, create a cart (SFAPI)
  if (!cartId) {
    const cart = await createCart({
      cart: { lines: [{ merchandiseId: variantId }] },
    });

    session.set("cartId", cart.id);
    headers.set("Set-Cookie", await session.commit());
  } else {
    // 3. Else, update the cart with the variant ID (SFAPI)
    await addLineItem({
      cartId,
      lines: [{ merchandiseId: variantId }],
    });
  }

  // 4. Update the session with the cart ID (response headers)
  return redirect(`/products/${params.handle}`, {
    headers,
  });
};

export default function Product() {
  const { start, media, product, shop, recommended } = useLoaderData<typeof loader>();
  const { title, vendor, descriptionHtml } = product;
  const end = useRef(new Date().getTime());

  useMemo(() => {
    console.log('🎯 time', `${end.current - start}ms`);
  }, [start])

  return (
    <>
      <Section padding="x" className="px-0">
        <div className="grid items-start md:gap-6 lg:gap-20 md:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<Skeleton className="h-32" />}>
            <Await
              errorElement="There was a problem loading product media"
              resolve={media}
            >
              {({nodes}) =>  {
                return (
                  <ProductGallery
                    media={nodes || []}
                    className="w-screen md:w-full lg:col-span-2"
                  />
                )
              }}
            </Await>
          </Suspense>
          <div className="sticky md:-mb-nav md:top-nav md:-translate-y-nav md:h-screen md:pt-nav hiddenScroll md:overflow-y-scroll">
            <section className="flex flex-col w-full max-w-xl gap-8 p-6 md:mx-auto md:max-w-sm md:px-0">
              <div className="grid gap-2">
                <Heading as="h1" format className="whitespace-normal">
                  {title}
                </Heading>
                {vendor && (
                  <Text className={"opacity-50 font-medium"}>{vendor}</Text>
                )}
              </div>
              <ProductForm />

              <Suspense fallback={<Skeleton className="h-32" />}>
                <Await
                  errorElement="There was a problem loading policies"
                  resolve={shop}
                >
                  {({shop: { shippingPolicy, refundPolicy }}) =>  {
                    return (
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
                    )
                  }}
                </Await>
              </Suspense>
            </section>
          </div>
        </div>
      </Section>
      <Suspense fallback={<Skeleton className="h-32" />}>
        <Await
          errorElement="There was a problem loading related products"
          resolve={recommended}
        >
          {(data) => <ProductSwimlane title="Related Products" data={data} />}
        </Await>
      </Suspense>
    </>
  );
}

export function ProductForm() {
  const [currentSearchParams] = useSearchParams();
  const transition = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);

  /**
   * We update `searchParams` with in-flight request data from `transition` (if available)
   * to create an optimistic UI, e.g. check the product option before the
   * request has completed.
   */
  const searchParams = useMemo(() => {
    return transition.state === "loading" && transition.location
      ? new URLSearchParams(transition.location.search)
      : currentSearchParams;
  }, [currentSearchParams, transition]);

  const { product, selectedVariant } = useLoaderData<typeof loader>();
  const {firstVariant} = product;

  /**
   * We're making an explicit choice here to display the product options
   * UI with a default variant, rather than wait for the user to select
   * options first. Developers are welcome to opt-out of this behavior.
   * By default, the first variant's options are used.
   */
  const searchParamsWithDefaults = useMemo<URLSearchParams>(() => {
    const clonedParams = new URLSearchParams(searchParams);

    for (const { name, value } of firstVariant.selectedOptions) {
      if (!searchParams.has(name)) {
        clonedParams.set(name, value);
      }
    }

    return clonedParams;
  }, [searchParams, firstVariant.selectedOptions]);

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
                      {({ open }) => (
                        <>
                          <Listbox.Button
                            ref={closeRef}
                            className={clsx(
                              "flex items-center justify-between w-full py-3 px-4 border border-primary",
                              open
                                ? "rounded-b md:rounded-t md:rounded-b-none"
                                : "rounded"
                            )}
                          >
                            <span>
                              {searchParamsWithDefaults.get(option.name)}
                            </span>
                            <IconCaret direction={open ? "up" : "down"} />
                          </Listbox.Button>
                          <Listbox.Options
                            className={clsx(
                              "border-primary bg-contrast absolute bottom-12 z-30 grid h-48 w-full overflow-y-scroll rounded-t border px-2 py-2 transition-[max-height] duration-150 sm:bottom-auto md:rounded-b md:rounded-t-none md:border-t-0 md:border-b",
                              open ? "max-h-48" : "max-h-0"
                            )}
                          >
                            {option.values.map((value) => (
                              <Listbox.Option
                                key={`option-${option.name}-${value}`}
                                value={value}
                              >
                                {({ active }) => (
                                  <ProductOptionLink
                                    optionName={option.name}
                                    optionValue={value}
                                    className={clsx(
                                      "text-primary w-full p-2 transition rounded flex justify-start items-center text-left cursor-pointer",
                                      active && "bg-primary/10"
                                    )}
                                    searchParams={searchParamsWithDefaults}
                                    onClick={() => {
                                      if (!closeRef.current) return;
                                      closeRef.current.click();
                                    }}
                                  >
                                    {value}
                                    {searchParamsWithDefaults.get(
                                      option.name
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
                              "leading-none py-1 border-b-[1.5px] cursor-pointer transition-all duration-200",
                              checked ? "border-primary/50" : "border-primary/0"
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
            <Form replace method="post">
              <input
                type="hidden"
                name="variantId"
                defaultValue={selectedVariant?.id}
              />
              <Button
                width="full"
                variant={selectedVariant.isOutOfStock ? "secondary" : "primary"}
                disabled={selectedVariant.isOutOfStock}
                as="button"
              >
                {selectedVariant.isOutOfStock ? (
                  <Text>Sold out</Text>
                ) : (
                  <Text
                    as="span"
                    className="flex items-center justify-center gap-2"
                  >
                    <span>Add to bag</span> <span>·</span>{" "}
                    <Money
                      withoutTrailingZeros
                      data={selectedVariant?.priceV2!}
                      as="span"
                    />
                    {selectedVariant.isOnSale && (
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
            </Form>
          )}
          {!selectedVariant.isOutOfStock && (
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
  const clonedSearchParams = new URLSearchParams(searchParams);
  clonedSearchParams.set(optionName, optionValue);

  return (
    <Link
      {...props}
      prefetch="intent"
      replace
      to={{
        pathname: ".",
        search: clonedSearchParams.toString(),
      }}
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
      {({ open }) => (
        <>
          <Disclosure.Button className="text-left">
            <div className="flex justify-between">
              <Text size="lead" as="h4">
                {title}
              </Text>
              <IconClose
                className={clsx(
                  "transition-transform transform-gpu duration-200",
                  !open && "rotate-[45deg]"
                )}
              />
            </div>
          </Disclosure.Button>

          <Disclosure.Panel className={"pb-4 pt-2 grid gap-2"}>
            <div
              className="prose dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: content }}
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
