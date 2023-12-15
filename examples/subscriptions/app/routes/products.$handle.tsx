import {json, redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {
  Link,
  useLoaderData,
  type MetaFunction,
  type FetcherWithComponents,
} from '@remix-run/react';
import type {
  ProductFragment,
  ProductVariantFragment,
  SellingPlanFragment,
} from 'storefrontapi.generated';
import {Image, Money, CartForm} from '@shopify/hydrogen';
import type {
  CartLineInput,
  CurrencyCode,
} from '@shopify/hydrogen/storefront-api-types';

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

  // 3. Get the selected selling plan from the product
  const selectedSellingPlan =
    product.sellingPlanGroups.nodes?.[0]?.sellingPlans.nodes?.find(
      (sellingPlan) => sellingPlan.id === selectedSellingPlanId,
    ) ?? null;

  /**
    4. If the product includes selling plans but no selling plan is selected, we
    redirect to the first selling plan, so that's is selected by default
  **/
  if (product.sellingPlanGroups.nodes?.length && !selectedSellingPlan) {
    const firstSellingPlanId =
      product.sellingPlanGroups.nodes[0].sellingPlans.nodes[0].id;
    return redirect(
      `/products/${product.handle}?selling_plan=${firstSellingPlanId}`,
    );
  }

  const selectedVariant = product.variants.nodes[0];

  // 5. Pass the selectedSellingPlan to the client
  return json({product, selectedVariant, selectedSellingPlan});
}

export default function Product() {
  const {product, selectedSellingPlan, selectedVariant} =
    useLoaderData<typeof loader>();
  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <ProductMain
        selectedVariant={selectedVariant}
        selectedSellingPlan={selectedSellingPlan}
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
  selectedSellingPlan,
  product,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['variants']['nodes'][0];
  selectedSellingPlan: SellingPlanFragment | null;
}) {
  const {title, descriptionHtml, sellingPlanGroups} = product;

  return (
    <div className="product-main">
      <h1>{title}</h1>
      <ProductPrice
        selectedVariant={selectedVariant}
        selectedSellingPlan={selectedSellingPlan}
      />
      <br />
      <ProductForm
        selectedVariant={selectedVariant}
        selectedSellingPlan={selectedSellingPlan}
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
  selectedSellingPlan,
}: {
  selectedVariant: ProductVariantFragment;
  selectedSellingPlan: SellingPlanFragment | null;
}) {
  return (
    <div className="product-price">
      {selectedSellingPlan ? (
        <SellingPlanPrice
          selectedSellingPlan={selectedSellingPlan}
          selectedVariant={selectedVariant}
        />
      ) : (
        <ProductVariantPrice selectedVariant={selectedVariant} />
      )}
    </div>
  );
}

type SellingPlanPrice = {
  amount: number;
  currencyCode: CurrencyCode;
};

/*
  Render the selected selling plan price is available
*/
function SellingPlanPrice({
  selectedSellingPlan,
  selectedVariant,
}: {
  selectedSellingPlan: SellingPlanFragment;
  selectedVariant: ProductVariantFragment;
}) {
  const sellingPlanPriceAdjustments = selectedSellingPlan?.priceAdjustments;

  if (!sellingPlanPriceAdjustments?.length) {
    return <Money data={selectedVariant.price} />;
  }

  const selectedVariantPrice: SellingPlanPrice = {
    amount: parseFloat(selectedVariant.price.amount),
    currencyCode: selectedVariant.price.currencyCode,
  };

  const sellingPlanPrice: SellingPlanPrice = sellingPlanPriceAdjustments.reduce(
    (acc, adjustment) => {
      switch (adjustment.adjustmentValue.__typename) {
        case 'SellingPlanFixedAmountPriceAdjustment':
          return {
            amount:
              acc.amount +
              parseFloat(adjustment.adjustmentValue.adjustmentAmount.amount),
            currencyCode: acc.currencyCode,
          };
        case 'SellingPlanFixedPriceAdjustment':
          return {
            amount: parseFloat(adjustment.adjustmentValue.price.amount),
            currencyCode: acc.currencyCode,
          };
        case 'SellingPlanPercentagePriceAdjustment':
          return {
            amount:
              acc.amount *
              (1 - adjustment.adjustmentValue.adjustmentPercentage),
            currencyCode: acc.currencyCode,
          };
        default:
          return acc;
      }
    },
    selectedVariantPrice,
  );

  return (
    <div className="selling-plan-price">
      <Money
        data={{
          amount: `${sellingPlanPrice.amount}`,
          currencyCode: sellingPlanPrice.currencyCode,
        }}
      />
    </div>
  );
}

/**
  Render the price of a product that does not have selling plans
**/
function ProductVariantPrice({
  selectedVariant,
}: {
  selectedVariant: ProductVariantFragment;
}) {
  return selectedVariant?.compareAtPrice ? (
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
  );
}

function ProductForm({
  selectedSellingPlan,
  selectedVariant,
  sellingPlanGroups,
}: {
  selectedSellingPlan: SellingPlanFragment | null;
  selectedVariant: ProductVariantFragment;
  sellingPlanGroups: ProductFragment['sellingPlanGroups'];
}) {
  return (
    <div className="product-form">
      {/* 4. Add the SellingPlanSelector component inside the ProductForm */}
      <SellingPlanSelector
        sellingPlanGroups={sellingPlanGroups}
        selectedSellingPlan={selectedSellingPlan}
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
          !selectedSellingPlan
        }
        onClick={() => {
          window.location.href = window.location.href + '#cart-aside';
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant?.id,
                  sellingPlanId: selectedSellingPlan?.id,
                  quantity: 1,
                },
              ]
            : []
        }
      >
        {sellingPlanGroups.nodes
          ? selectedSellingPlan
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
  fragment SellingPlanMoney on MoneyV2 {
    amount
    currencyCode
  }
  fragment SellingPlan on SellingPlan {
    id
    options {
      name
      value
    }
    priceAdjustments {
      adjustmentValue {
        ... on SellingPlanFixedAmountPriceAdjustment {
          __typename
          adjustmentAmount {
            ... on MoneyV2 {
               ...SellingPlanMoney
            }
          }
        }
        ... on SellingPlanFixedPriceAdjustment {
          __typename
          price {
            ... on MoneyV2 {
              ...SellingPlanMoney
            }
          }
        }
        ... on SellingPlanPercentagePriceAdjustment {
          __typename
          adjustmentPercentage
        }
      }
      orderCount
    }
    recurringDeliveries
    checkoutCharge {
      type
      value {
        ... on MoneyV2 {
          ...SellingPlanMoney
        }
        ... on SellingPlanCheckoutChargePercentageValue {
          percentage
        }
      }
    }
 }
` as const;

//  8. Add the SellingPlanGroup fragment to the Product fragment
const SELLING_PLAN_GROUP_FRAGMENT = `#graphql
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
  ${SELLING_PLAN_FRAGMENT}
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
  ${PRODUCT_VARIANT_FRAGMENT}
  ${SELLING_PLAN_GROUP_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
