import { Disclosure } from "@headlessui/react";
import { defer, type LoaderArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData, Await, useSearchParams } from "@remix-run/react";
import {
  Money,
  ProductProvider,
  ShopPayButton,
} from "@shopify/hydrogen-ui-alpha";
import { Suspense, useCallback } from "react";
import {
  Button,
  Heading,
  IconClose,
  ProductGallery,
  ProductOptions,
  ProductSwimlane,
  Section,
  Skeleton,
  Text,
} from "~/components";
import { getProductData, getRecommendedProducts } from "~/data";
import { getExcerpt } from "~/lib/utils";
import invariant from "tiny-invariant";

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

// TODO: Import from storefront-api-types if/when it's available.
interface OptionWithValues {
  name: string;
  values: string[];
}

export default function Product() {
  const { product, shop, recommended } = useLoaderData<typeof loader>();
  const { media, title, vendor, descriptionHtml } = product;
  const { shippingPolicy, refundPolicy } = shop;

  return (
    <ProductProvider data={product}>
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
    </ProductProvider>
  );
}

export function ProductForm() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { product } = useLoaderData<typeof loader>();
  const options = product.options;

  const isOutOfStock = !product.selectedVariant?.availableForSale || false;
  const isOnSale =
    // @ts-ignore
    product.selectedVariant?.priceV2?.amount <
      // @ts-ignore
      product.selectedVariant?.compareAtPriceV2?.amount || false;

  const handleChange = useCallback(
    (name: string, value: string) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set(name, value);
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return (
    <form className="grid gap-10">
      {
        <div className="grid gap-4">
          {(options as OptionWithValues[]).map(({ name, values }) => {
            if (values.length === 1) {
              return null;
            }
            return (
              <div
                key={name}
                className="flex flex-col flex-wrap mb-4 gap-y-2 last:mb-0"
              >
                <Heading as="legend" size="lead" className="min-w-[4rem]">
                  {name}
                </Heading>
                <div className="flex flex-wrap items-baseline gap-4">
                  <ProductOptions
                    name={name}
                    handleChange={handleChange}
                    values={values}
                  />
                </div>
              </div>
            );
          })}
        </div>
      }
      <div className="grid items-stretch gap-4">
        <Button
          width="full"
          variant={isOutOfStock ? "secondary" : "primary"}
          disabled={isOutOfStock}
          as="button"
        >
          {isOutOfStock ? (
            <Text>Sold out</Text>
          ) : (
            <Text as="span" className="flex items-center justify-center gap-2">
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
        {!isOutOfStock && (
          <ShopPayButton variantIds={[product.selectedVariant?.id!]} />
        )}
      </div>
    </form>
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
