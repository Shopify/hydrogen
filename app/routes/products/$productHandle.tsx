import { Disclosure, Listbox } from "@headlessui/react";
import { ActionFunction, defer, type LoaderArgs } from "@remix-run/cloudflare";
import {
  Link,
  useLoaderData,
  Await,
  useSearchParams,
  Form,
  useLocation,
  useTransition,
} from "@remix-run/react";
import { Money, ShopPayButton } from "@shopify/hydrogen-ui-alpha";
import { Suspense, type SyntheticEvent } from "react";
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
import { getProductData, getRecommendedProducts } from "~/data";
import { getExcerpt } from "~/lib/utils";
import invariant from "tiny-invariant";
import clsx from "clsx";

export const loader = async ({ params, request }: LoaderArgs) => {
  const { productHandle } = params;
  invariant(productHandle, "Missing productHandle param, check route filename");

  const { shop, product } = await getProductData(
    productHandle,
    new URL(request.url).searchParams
  );

  return defer({
    product,
    shop,
    recommended: getRecommendedProducts(product.id),
  });
};

export const action: ActionFunction = async ({ request }) => {
  const body = await request.text();
  const formData = new URLSearchParams(body);

  const variantId = formData.get("variantId");

  // TODO: Interact with cart!

  console.log({ variantId });

  return null;
};

export default function Product() {
  const { product, shop, recommended } = useLoaderData<typeof loader>();
  const { media, title, vendor, descriptionHtml } = product;
  const { shippingPolicy, refundPolicy } = shop;

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
                  <Text className={"opacity-50 font-medium"}>{vendor}</Text>
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
          {(data) => <ProductSwimlane title="Related Products" data={data} />}
        </Await>
      </Suspense>
    </>
  );
}

export function ProductForm() {
  const [currentSearchParams] = useSearchParams();
  const transition = useTransition();
  const searchParams =
    transition.type === "loaderSubmission" && transition.submission?.formData
      ? (transition.submission.formData as URLSearchParams)
      : currentSearchParams;
  const location = useLocation();

  const { product } = useLoaderData<typeof loader>();

  const isOutOfStock = !product.selectedVariant?.availableForSale || false;
  const isOnSale =
    // @ts-ignore
    product.selectedVariant?.priceV2?.amount <
      // @ts-ignore
      product.selectedVariant?.compareAtPriceV2?.amount || false;

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
              <Form
                replace
                action={location.pathname}
                className="flex flex-wrap items-baseline gap-4"
                id={`form-${option.name}`}
              >
                {option.values.length > 7 ? (
                  <div className="relative w-full">
                    <Listbox>
                      {({ open }) => (
                        <>
                          <Listbox.Button
                            className={`flex items-center justify-between w-full py-3 px-4 border border-primary ${
                              open
                                ? "rounded-b md:rounded-t md:rounded-b-none"
                                : "rounded"
                            }`}
                          >
                            <span>{searchParams.get(option.name)}</span>
                            <IconCaret direction={open ? "up" : "down"} />
                          </Listbox.Button>
                          <Listbox.Options
                            className={`border-primary bg-contrast absolute bottom-12 z-30 grid
                h-48 w-full overflow-y-scroll rounded-t border px-2 py-2 transition-[max-height]
                duration-150 sm:bottom-auto md:rounded-b md:rounded-t-none md:border-t-0 md:border-b ${
                  open ? "max-h-48" : "max-h-0"
                }`}
                          >
                            {option.values.map((value) => (
                              <Listbox.Option
                                key={`option-${option.name}-${value}`}
                                value={value}
                              >
                                {({ active }) => (
                                  <button
                                    type="submit"
                                    name={option.name}
                                    value={value}
                                    className={clsx(
                                      "text-primary w-full p-2 transition rounded flex justify-start items-center text-left cursor-pointer",
                                      active && "bg-primary/10"
                                    )}
                                    onClick={(
                                      e: SyntheticEvent<HTMLButtonElement>
                                    ) => e.currentTarget.click()}
                                  >
                                    {value}
                                    {searchParams.get(option.name) ===
                                      value && (
                                      <span className="ml-2">
                                        <IconCheck />
                                      </span>
                                    )}
                                  </button>
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
                      const checked = searchParams.get(option.name) === value;
                      const id = `option-${option.name}-${value}`;

                      return (
                        <Text key={id}>
                          <button
                            type="submit"
                            name={option.name}
                            value={value}
                            className={`leading-none py-1 border-b-[1.5px] cursor-pointer transition-all duration-200 ${
                              checked ? "border-primary/50" : "border-primary/0"
                            }`}
                          >
                            {value}
                          </button>
                        </Text>
                      );
                    })}
                  </>
                )}
                {/**
                 * Then, inject all of the _other_ options as hidden inputs.
                 * This allows us to GET the form without having to collect
                 * all of the other current selections in some hacky way, like
                 * appending them to the Form action or in the action itself. */}
                {Array.from(searchParams.entries())
                  .filter(([key]) => key !== option.name)
                  .map(([key, value]) => (
                    <input
                      type="hidden"
                      name={key}
                      defaultValue={value}
                      key={key + value}
                    />
                  ))}
              </Form>
            </div>
          ))}
        <div className="grid items-stretch gap-4">
          <Form replace method="post">
            <input
              type="hidden"
              name="variantId"
              defaultValue={product.selectedVariant?.id}
            />
            <Button
              width="full"
              variant={isOutOfStock ? "secondary" : "primary"}
              disabled={isOutOfStock}
              as="button"
            >
              {isOutOfStock ? (
                <Text>Sold out</Text>
              ) : (
                <Text
                  as="span"
                  className="flex items-center justify-center gap-2"
                >
                  <span>Add to bag</span> <span>·</span>{" "}
                  <Money
                    withoutTrailingZeros
                    data={product.selectedVariant?.priceV2!}
                    as="span"
                  />
                  {isOnSale && (
                    <Money
                      withoutTrailingZeros
                      data={product.selectedVariant?.compareAtPriceV2!}
                      as="span"
                      className="opacity-50 strike"
                    />
                  )}
                </Text>
              )}
            </Button>
          </Form>
          {!isOutOfStock && (
            <ShopPayButton variantIds={[product.selectedVariant?.id!]} />
          )}
        </div>
      </div>
    </div>
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
                className={`${
                  open ? "" : "rotate-[45deg]"
                } transition-transform transform-gpu duration-200`}
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
