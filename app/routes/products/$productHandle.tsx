import { Disclosure } from "@headlessui/react";
import type { LoaderFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData, useLocation } from "@remix-run/react";
import {
  ProductProvider,
  ShopPayButton,
  useProduct,
} from "@shopify/hydrogen-ui-alpha";
// TODO: Where is this?
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  Heading,
  IconClose,
  ProductGallery,
  ProductOptions,
  ProductSwimlane,
  Section,
  Text,
} from "~/components";
import { getProductData, getRecommendedProducts } from "~/data";
import { getExcerpt } from "~/lib/utils";
import invariant from "tiny-invariant";

export const loader: LoaderFunction = async ({ params }) => {
  const { productHandle } = params;
  invariant(productHandle, "Product handle is required");

  const product = await getProductData(productHandle);

  return {
    product,
    recommended: await getRecommendedProducts(product.product.id),
  };
};

// TODO: Import from storefront-api-types if/when it's available.
interface OptionWithValues {
  name: string;
  values: string[];
}

export default function Product() {
  const { product, shop } = useLoaderData<typeof loader>().product;
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
      <Suspense>
        {/* TODO: Await data using dataLoader */}
        <ProductSwimlane
          title="Related Products"
          data={useLoaderData<typeof loader>().recommended.recommended}
        />
      </Suspense>
    </ProductProvider>
  );
}

// TODO: Rewrite this to use Remix Form API
export function ProductForm() {
  const { pathname, search } = useLocation();
  const [params, setParams] = useState(new URLSearchParams(search));

  const { options, setSelectedOption, selectedOptions, selectedVariant } =
    useProduct();

  const isOutOfStock = !selectedVariant?.availableForSale || false;
  // const isOnSale =
  //   selectedVariant?.priceV2?.amount <
  //     selectedVariant?.compareAtPriceV2?.amount || false;

  useEffect(() => {
    if (params || !search) return;
    setParams(new URLSearchParams(search));
  }, [params, search]);

  useEffect(() => {
    (options as OptionWithValues[]).map(({ name, values }) => {
      if (!params) return;
      const currentValue = params.get(name.toLowerCase()) || null;
      if (currentValue) {
        const matchedValue = values.filter(
          (value) => encodeURIComponent(value.toLowerCase()) === currentValue
        );
        setSelectedOption(name, matchedValue[0]);
      } else {
        params.set(
          encodeURIComponent(name.toLowerCase()),
          encodeURIComponent(selectedOptions![name]!.toLowerCase())
        ),
          window.history.replaceState(
            null,
            "",
            `${pathname}?${params.toString()}`
          );
      }
    });
  }, []);

  const handleChange = useCallback(
    (name: string, value: string) => {
      setSelectedOption(name, value);
      if (!params) return;
      params.set(
        encodeURIComponent(name.toLowerCase()),
        encodeURIComponent(value.toLowerCase())
      );
      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `${pathname}?${params.toString()}`
        );
      }
    },
    [setSelectedOption, params, pathname]
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
        {/* TODO: Build add to cart features using Remix Form API, probably */}
        {/* <AddToCartButton
          variantId={selectedVariant?.id}
          quantity={1}
          accessibleAddingToCartLabel="Adding item to your cart"
          disabled={isOutOfStock}
          type="button"
        >
          <Button
            width="full"
            variant={isOutOfStock ? "secondary" : "primary"}
            as="span"
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
                  data={selectedVariant.priceV2!}
                  as="span"
                />
                {isOnSale && (
                  <Money
                    withoutTrailingZeros
                    data={selectedVariant.compareAtPriceV2!}
                    as="span"
                    className="opacity-50 strike"
                  />
                )}
              </Text>
            )}
          </Button>
        </AddToCartButton> */}
        {!isOutOfStock && <ShopPayButton variantIds={[selectedVariant.id!]} />}
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
