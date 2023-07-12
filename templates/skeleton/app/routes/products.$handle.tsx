import {Suspense, useMemo} from 'react';
import {defer, redirect, type LoaderArgs} from '@shopify/remix-oxygen';
import {
  Await,
  FetcherWithComponents,
  Link,
  useLoaderData,
} from '@remix-run/react';
import type {
  ProductFragment,
  ProductMedia_MediaImage_Fragment,
  ProductVariantsQuery,
  ProductVariantFragment,
} from 'storefrontapi.generated';

// TODO: add SEO
import {
  AnalyticsPageType,
  Image,
  Money,
  ShopPayButton,
  VariantSelector__unstable as VariantSelector,
  getSelectedProductOptions__unstable as getSelectedProductOptions,
  getFirstAvailableVariant__unstable as getFirstAvailableVariant,
  CartForm,
} from '@shopify/hydrogen';
import {CartLineInput} from '@shopify/hydrogen/storefront-api-types';

export async function loader({params, request, context}: LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  const selectedOptions = getSelectedProductOptions(request);

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  // await the query for the critical product data
  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {handle, selectedOptions},
  });

  // In order to show which variants are available in the UI, we need to query
  // all of them. But there might be a *lot*, so instead separate the variants
  // into it's own separate query that is deferred. So there's a brief moment
  // where variant options might show as available when they're not, but after
  // this deffered query resolves, the UI will update.
  const variants = context.storefront.query(VARIANTS_QUERY, {
    variables: {handle},
  });

  if (!product?.id || !product.variants.nodes.length) {
    throw new Response(null, {status: 404});
  }

  // // if no selected variant was returned from the selected options,
  // // we redirect to the first variant's url with it's selected options applied
  // if (!product.selectedVariant) {
  //   const searchParams = new URLSearchParams(new URL(request.url).search);
  //   const firstVariant = product.variants.nodes[0];
  //   for (const option of firstVariant.selectedOptions) {
  //     searchParams.set(option.name, option.value);
  //   }
  //
  //   // log the request referrer to see where the redirect is coming from
  //   throw redirect(`/products/${handle}?${searchParams.toString()}`, {});
  // }

  return defer({product, variants});
}

export default function Product() {
  const {product, variants} = useLoaderData<typeof loader>();
  const {selectedVariant} = product;
  console.log({selectedVariant});

  return (
    <section
      className="product"
      style={{
        display: 'grid',
        gridGap: '4rem',
        gridTemplateColumns: 'repeat(2, 1fr)',
      }}
    >
      <ProductImages selectedVariant={selectedVariant} media={product.media} />
      <ProductMain
        selectedVariant={selectedVariant}
        product={product}
        variants={variants}
      />
    </section>
  );
}

function ProductImages({
  selectedVariant,
  media,
}: Pick<ProductFragment, 'media' | 'selectedVariant'>) {
  // We want to show the selected variant's image first, followed by the other
  const images = useMemo(() => {
    const selectedVariantImage = selectedVariant?.image
      ? {
          alt: selectedVariant?.title,
          image: selectedVariant?.image || null,
          id: selectedVariant?.id,
        }
      : null;
    const otherProductImages = media.nodes.filter(
      (media) =>
        media.__typename === 'MediaImage' &&
        media?.image?.url !== selectedVariantImage?.image.url,
    );
    return [selectedVariantImage, ...otherProductImages].filter(Boolean);
  }, [media, selectedVariant]) as Array<ProductMedia_MediaImage_Fragment>;

  return (
    <div
      className="product-images"
      style={{
        display: 'grid',
        gridGap: '1rem',
      }}
    >
      {images.map((media) => {
        if (!media?.image) return null;
        return (
          <Image
            key={media.id}
            alt={media.alt || selectedVariant?.title}
            data={media.image}
            sizes="(min-width: 45em) 50vw, 100vw"
            aspectRatio={`${media.image.width} / ${media.image.height}`}
            style={{width: '100%', height: '100%'}}
          />
        );
      })}
    </div>
  );
}

function ProductMain({
  selectedVariant,
  product,
  variants,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedVariant'];
  variants: Promise<ProductVariantsQuery>;
}) {
  const {title, descriptionHtml} = product;
  return (
    <div
      className="product-main"
      style={{
        position: 'sticky',
        top: '6rem',
        alignSelf: 'start',
      }}
    >
      <h1>{title}</h1>
      {selectedVariant ? (
        <strong>
          <Money data={selectedVariant.price} />
        </strong>
      ) : null}
      <br />
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
      <br />
      <Suspense
        fallback={
          <ProductForm
            product={product}
            selectedVariant={selectedVariant}
            variants={[]}
          />
        }
      >
        <Await
          errorElement="There was a problem loading product variants"
          resolve={variants}
        >
          {(data) => (
            <ProductForm
              product={product}
              selectedVariant={selectedVariant}
              variants={data.product?.variants.nodes || []}
            />
          )}
        </Await>
      </Suspense>
    </div>
  );
}

function ProductForm({
  product,
  selectedVariant,
  variants,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedVariant'];
  variants: Array<ProductVariantFragment>;
}) {
  return (
    <div className="product-form">
      <VariantSelector
        defaultVariant={selectedVariant as ProductVariantFragment}
        options={product.options}
        variants={variants}
      >
        {({option}) => {
          return (
            <div key={option.name}>
              <h5>{option.name}</h5>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gridGap: '.5rem',
                }}
              >
                {option.values.map(({value, isAvailable, isActive, path}) => {
                  return (
                    <Link
                      key={option.name + value}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={path}
                      style={{
                        border: isActive
                          ? '1px solid black'
                          : '1px solid transparent',
                        padding: '.25rem .5rem',
                        opacity: isAvailable ? 1 : 0.3,
                      }}
                    >
                      {value}
                    </Link>
                  );
                })}
              </div>
              <br />
            </div>
          );
        }}
      </VariantSelector>
      <br />
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          window.location.href = window.location.href + '#cart-aside';
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}

function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: CartLineInput[];
  onClick?: () => void;
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          <button
            type="submit"
            onClick={onClick}
            disabled={disabled ?? fetcher.state !== 'idle'}
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  );
}

const PRODUCT_MEDIA_FRAGMENT = `#graphql
  fragment ProductMedia on Media {
    __typename
    alt
    mediaContentType
    previewImage {
      url
    }
    ... on MediaImage {
      id
      image {
        id
        url
        width
        height
      }
    }
    ... on Video {
      id
      sources {
        mimeType
        url
      }
    }
    ... on Model3d {
      id
      sources {
        mimeType
        url
      }
    }
    ... on ExternalVideo {
      id
      embedUrl
      host
    }
  }
` as const;

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    id
    availableForSale
    quantityAvailable
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
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    options {
      name
      values
    }
    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    media(first: 7) {
      nodes {
        ...ProductMedia
      }
    }
    variants(first: 1) {
      nodes {
        ...ProductVariant
      }
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_MEDIA_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const PRODUCT_VARIANTS_FRAGMENT = `#graphql
  fragment ProductVariants on Product {
    variants(first: 250) {
      nodes {
        ...ProductVariant
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const VARIANTS_QUERY = `#graphql
  query ProductVariants(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ProductVariants
    }
  }
  ${PRODUCT_VARIANTS_FRAGMENT}
` as const;
