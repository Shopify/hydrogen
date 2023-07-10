import {useEffect, useMemo, useRef} from 'react';
import invariant from 'tiny-invariant';
import {defer, redirect, type LoaderArgs} from '@shopify/remix-oxygen';
import {Link, useFetcher, useLoaderData} from '@remix-run/react';
import {Money, Image} from '@shopify/hydrogen';
import type {
  StoreProductFragment,
  ProductMedia_MediaImage_Fragment,
  StoreProductQuery,
} from 'storefrontapi.generated';

// TODO: add SEO

export async function loader({params, request, context}: LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  // capture selected options query params
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const selectedOptions =
    Array.from(searchParams.entries()).map(([key, value]) => ({
      name: decodeURIComponent(key),
      value: decodeURIComponent(value),
    })) || [];

  invariant(handle, 'Expected productHandle to be defined');

  const {product} = await storefront.query<StoreProductQuery>(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions,
    },
    cache: storefront.CacheNone(),
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // if we couldn't retrieve a variant from the selected options,
  // redirect to the first variant with the selected options
  if (!product.selectedVariant) {
    const firstVariant = product.variants.nodes[0];
    if (!firstVariant) {
      throw new Error('No variants found for product');
    }
    const firstVariantOptions = firstVariant.selectedOptions.map(
      (option) => `${option.name}=${option.value}`,
    );
    throw redirect(`/products/${handle}?${firstVariantOptions.join('&')}`);
  }

  return defer({product});
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const selectedVariant = product.selectedVariant;

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
}: Pick<StoreProductFragment, 'media' | 'selectedVariant'>) {
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

type VariantSelectorProps = Pick<
  StoreProductFragment,
  'handle' | 'options' | 'selectedVariant'
> & {
  children: ({
    value,
    handle,
    name,
    selectedVariant,
  }: {
    value: string;
    handle: string;
    name: string;
    selectedVariant: StoreProductFragment['selectedVariant'];
  }) => JSX.Element;
};

function VariantSelector({
  options,
  selectedVariant,
  handle,
  children,
}: VariantSelectorProps) {
  return (
    <div className="variant-selector">
      {options.map((option) => {
        return (
          <div key={option.name + selectedVariant?.id}>
            <h3>{option.name}</h3>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
              }}
            >
              {option.values.map((value) =>
                children({value, handle, name: option.name, selectedVariant}),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type VariantOptionProps = Pick<StoreProductFragment, 'selectedVariant'> & {
  name: string;
  value: string;
  handle?: string;
  children: ({
    value,
    isSelected,
    variant,
  }: {
    value: string;
    isSelected: boolean;
    variant: StoreProductFragment['selectedVariant'];
  }) => JSX.Element;
};

function VariantOption({
  name,
  value,
  selectedVariant,
  handle,
  children,
}: VariantOptionProps) {
  const init = useRef(false);
  const {load, data, state} = useFetcher();

  const selectedOptions =
    selectedVariant?.selectedOptions?.map(({name, value}) => {
      return [name, value];
    }) || [];

  const isSelected = Boolean(
    selectedVariant?.selectedOptions.find(
      (current) => current.name === name && current.value === value,
    ),
  );

  // combine the selected options with the current option value to
  // determine the variant availability
  const variantSearchParams = new URLSearchParams(selectedOptions);
  variantSearchParams.set(name, value);

  const variantQueryParams = `?${variantSearchParams.toString()}`;
  const variantUrl = `/products/${handle}/variant/${variantQueryParams}`;

  const requestedVariant = data?.requestedVariant;

  useEffect(() => {
    if (init.current || isSelected) return;
    load(variantUrl);
    init.current = true;
  }, [isSelected, variantUrl, load]);

  useEffect(() => {
    if (state === 'loading') return;
    init.current = false;
  }, [state]);

  return (
    <Link key={variantQueryParams} to={variantQueryParams} prefetch="intent">
      {children({value, isSelected, variant: requestedVariant})}
    </Link>
  );
}

function Option({
  value,
  isSelected,
  isAvailableForSale,
}: {
  value: string;
  isSelected: boolean;
  isAvailableForSale: boolean;
}) {
  return isSelected ? (
    isAvailableForSale ? (
      <mark>{value}</mark>
    ) : (
      <mark>
        <s>{value}</s>
      </mark>
    )
  ) : isAvailableForSale ? (
    <span>{value}</span>
  ) : (
    <s>{value}</s>
  );
}

function ProductMain({
  selectedVariant,
  product,
}: {
  product: StoreProductFragment;
  selectedVariant: StoreProductFragment['selectedVariant'];
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

      <br />
      <ProductForm product={product} selectedVariant={selectedVariant} />
    </div>
  );
}

function ProductForm({
  product,
  selectedVariant,
}: {
  product: StoreProductFragment;
  selectedVariant: StoreProductFragment['selectedVariant'];
}) {
  return (
    <>
      <VariantSelector
        handle={product.handle}
        options={product.options}
        selectedVariant={selectedVariant}
      >
        {(props) => (
          <VariantOption {...props} key={props.value + props.name}>
            {({value, isSelected, variant}) => {
              return (
                <Option
                  value={value}
                  isSelected={isSelected}
                  isAvailableForSale={
                    isSelected
                      ? selectedVariant?.availableForSale ?? true
                      : variant?.availableForSale ?? true
                  }
                />
              );
            }}
          </VariantOption>
        )}
      </VariantSelector>
      <AddToCartButton selectedVariant={selectedVariant} />
    </>
  );
}

// TODO: use new cart API
function AddToCartButton({
  selectedVariant,
}: Pick<StoreProductFragment, 'selectedVariant'>) {
  return (
    <>
      <br />
      <button disabled={!selectedVariant?.availableForSale}>Add to cart</button>
    </>
  );
}

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
  fragment StoreProduct on Product {
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
      ...StoreProduct
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
