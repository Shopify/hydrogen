import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {
  Link,
  useLoaderData,
  type MetaFunction,
  type FetcherWithComponents,
} from '@remix-run/react';
import type {
  ProductFragment,
  ProductVariantFragment,
} from 'storefrontapi.generated';
import {Image, Money, CartForm} from '@shopify/hydrogen';
import type {CartLineInput} from '@shopify/hydrogen/storefront-api-types';

// 1. Import the SellingPlanSelector component and type
import {
  SellingPlanSelector,
  type SellingPlanGroup,
} from '~/components/SellingPlanSelector';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Hydrogen | ${data?.product.title ?? ''}`}];
};

export async function loader({params, request, context}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront} = context;

  // 2. Get the selected selling plan id from the request url
  const selectedSellingPlanId =
    new URL(request.url).searchParams.get('selling_plan') ?? null;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {handle},
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const selectedVariant = product.variants.nodes[0];

  // 3. Pass the selectedSellingPlanId to the client
  return json({product, selectedVariant, selectedSellingPlanId});
}

export default function Product() {
  const {product, selectedSellingPlanId, selectedVariant} =
    useLoaderData<typeof loader>();
  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <ProductMain
        selectedVariant={selectedVariant}
        selectedSellingPlanId={selectedSellingPlanId}
        product={product}
      />
    </div>
  );
}

function ProductImage({image}: {image: ProductVariantFragment['image']}) {
  if (!image) {
    return <div className="product-image" />;
  }
  return (
    <div className="product-image">
      <Image
        alt={image.altText || 'Product Image'}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
    </div>
  );
}

function ProductMain({
  selectedVariant,
  selectedSellingPlanId,
  product,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['variants']['nodes'][0];
  selectedSellingPlanId: string | null;
}) {
  const {title, descriptionHtml, sellingPlanGroups} = product;
  return (
    <div className="product-main">
      <h1>{title}</h1>
      <ProductPrice selectedVariant={selectedVariant} />
      <br />
      <ProductForm
        selectedVariant={selectedVariant}
        selectedSellingPlanId={selectedSellingPlanId}
        sellingPlanGroups={sellingPlanGroups}
      />
      <br />
      <p>
        <strong>Description</strong>
      </p>
      <br />
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
      <br />
    </div>
  );
}

function ProductPrice({
  selectedVariant,
}: {
  selectedVariant: ProductFragment['variants']['nodes'][0];
}) {
  return (
    <div className="product-price">
      {selectedVariant?.compareAtPrice ? (
        <>
          <p>Sale</p>
          <br />
          <div className="product-price-on-sale">
            {selectedVariant ? <Money data={selectedVariant.price} /> : null}
            <s>
              <Money data={selectedVariant.compareAtPrice} />
            </s>
          </div>
        </>
      ) : (
        selectedVariant?.price && <Money data={selectedVariant?.price} />
      )}
    </div>
  );
}

function ProductForm({
  selectedSellingPlanId,
  selectedVariant,
  sellingPlanGroups,
}: {
  selectedSellingPlanId: string | null;
  selectedVariant: ProductFragment['variants']['nodes'][0];
  sellingPlanGroups: ProductFragment['sellingPlanGroups'];
}) {
  return (
    <div className="product-form">
      {/* 4. Add the SellingPlanSelector component inside the ProductForm */}
      <SellingPlanSelector
        sellingPlanGroups={sellingPlanGroups}
        selectedSellingPlanId={selectedSellingPlanId}
      >
        {({sellingPlanGroup}) => (
          /* 5. Render the SellingPlanGroup component inside the SellingPlanSelector */
          <SellingPlanGroup
            key={sellingPlanGroup.name}
            sellingPlanGroup={sellingPlanGroup}
          />
        )}
      </SellingPlanSelector>
      <br />

      {/* 6. Update the AddToCart button text and pass in the sellingPlanId */}
      <AddToCartButton
        disabled={
          !selectedVariant ||
          !selectedVariant.availableForSale ||
          !selectedSellingPlanId
        }
        onClick={() => {
          window.location.href = window.location.href + '#cart-aside';
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant?.id,
                  sellingPlanId: selectedSellingPlanId,
                  quantity: 1,
                },
              ]
            : []
        }
      >
        {sellingPlanGroups.nodes
          ? selectedSellingPlanId
            ? 'Subscribe'
            : 'Select a subscription'
          : selectedVariant?.availableForSale
          ? 'Add to cart'
          : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}

// Update as you see fit to match your design and requirements
function SellingPlanGroup({
  sellingPlanGroup,
}: {
  sellingPlanGroup: SellingPlanGroup;
}) {
  return (
    <div key={sellingPlanGroup.name}>
      <p className="mb-2">
        <strong>{sellingPlanGroup.name}:</strong>
      </p>
      {sellingPlanGroup.sellingPlans.nodes.map((sellingPlan) => {
        return (
          <Link
            key={sellingPlan.id}
            prefetch="intent"
            to={sellingPlan.url}
            className={`border inline-block p-4 mr-2 leading-none py-1 border-b-[1.5px] hover:no-underline cursor-pointer transition-all duration-200
                  ${
                    sellingPlan.isSelected
                      ? 'border-gray-500'
                      : 'border-neutral-50'
                  }`}
            preventScrollReset
            replace
          >
            <p>
              {sellingPlan.options.map(
                (option) => `${option.name} ${option.value}`,
              )}
            </p>
          </Link>
        );
      })}
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
            className="bg-gray-400 inline-block p-2 px-4 hover:bg-black hover:text-white"
            disabled={disabled ?? fetcher.state !== 'idle'}
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
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
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

// 7. Add the SellingPlanGroup fragment to the Product fragment
const SELLING_PLAN_FRAGMENT = `#graphql
  fragment SellingPlan on SellingPlan {
    id
    options {
      name
      value
    }
  }
` as const;

//  8. Add the SellingPlanGroup fragment to the Product fragment
const SELLING_PLAN_GROUP_FRAGMENT = `#graphql
  ${SELLING_PLAN_FRAGMENT}
  fragment SellingPlanGroup on SellingPlanGroup {
    name
    options {
      name
      values
    }
    sellingPlans(first:10) {
      nodes {
        ...SellingPlan
      }
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  ${PRODUCT_VARIANT_FRAGMENT}
  ${SELLING_PLAN_GROUP_FRAGMENT}

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
    variants(first: 1) {
      nodes {
        ...ProductVariant
      }
    }
    seo {
      description
      title
    }

    # 9. Add the SellingPlanGroups fragment to the Product fragment
    sellingPlanGroups(first:10) {
      nodes {
        ...SellingPlanGroup
      }
    }
  }
` as const;

const PRODUCT_QUERY = `#graphql
  ${PRODUCT_FRAGMENT}
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
` as const;
