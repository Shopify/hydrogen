import {useMemo} from 'react';
import invariant from 'tiny-invariant';
import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {Link, useLoaderData} from '@remix-run/react';
import {Money, Image} from '@shopify/hydrogen';
import type {
  ProductFragment,
  ProductMedia_MediaImage_Fragment,
} from 'storefrontapi.generated';

// TODO: add SEO
// TODO: add analytics

export async function loader({params, request, context}: LoaderArgs) {
  const {productHandle} = params;

  // capture selected options query params
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const selectedOptions =
    Array.from(searchParams.entries()).map(([key, value]) => ({
      name: key,
      value,
    })) || [];

  invariant(productHandle, 'Expected productHandle to be defined');

  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      handle: productHandle,
      selectedOptions,
    },
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return defer({product});
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const firstVariant = product.variants.nodes[0];
  const selectedVariant = product.selectedVariant || firstVariant;

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
      <ProductMain selectedVariant={selectedVariant} product={product} />
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
            aspectRatio={`${media.image.width} / ${media.image.height}`}
            style={{width: '100%', height: '100%'}}
          />
        );
      })}
    </div>
  );
}

function VariantSelector({
  options,
  selectedVariant,
}: Pick<ProductFragment, 'options' | 'selectedVariant'>) {
  return (
    <div className="variant-selector">
      {options.map((option) => {
        return (
          <div key={option.name}>
            <h3>{option.name}</h3>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
              }}
            >
              {option.values.map((value) => {
                const isSelected = selectedVariant?.selectedOptions.find(
                  (current) =>
                    current.name === option.name && current.value === value,
                );
                const selectedOptions =
                  selectedVariant?.selectedOptions.map(({name, value}) => {
                    return [name, value];
                  }) || [];
                const updatedSearchParams = new URLSearchParams(
                  selectedOptions,
                );
                updatedSearchParams.set(option.name, value);
                return (
                  <Link key={value} to={`?${updatedSearchParams.toString()}`}>
                    {isSelected ? <mark>{value}</mark> : value}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductMain({
  selectedVariant,
  product,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedVariant'];
}) {
  const {title, vendor, descriptionHtml} = product;
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
      <h2>{vendor}</h2>
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
      {selectedVariant ? (
        <strong>
          <br />
          <Money data={selectedVariant.price} />
          <br />
        </strong>
      ) : null}
      <VariantSelector
        options={product.options}
        selectedVariant={selectedVariant}
      />
      <br />
      <AddToCartButton selectedVariant={selectedVariant} />
    </div>
  );
}

// TODO: use new cart API
function AddToCartButton({
  selectedVariant,
}: Pick<ProductFragment, 'selectedVariant'>) {
  if (!selectedVariant) return null;
  return (
    <>
      <br />
      <button>Add to cart</button>
    </>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
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
` as const;

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

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    descriptionHtml
    handle
    id
    options {
      name
      values
    }
    media(first: 4) {
      nodes {
        ...ProductMedia
      }
    }
    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
    title
    variants(first: 1) {
      nodes {
        ...ProductVariant
      }
    }
    vendor
  }
  ${PRODUCT_MEDIA_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query StoreProduct(
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
