import {useState} from 'react';
import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/customize.$handle';
import {getSelectedProductOptions, Analytics} from '@shopify/hydrogen';
import {ThreeTShirtViewer} from '~/components/ThreeTShirtViewer';
import {FabricDesignEditor, type ExportedDesign} from '~/components/FabricDesignEditor';
import {AddToCartButton} from '~/components/AddToCartButton';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => (
  [{title: `Personalizar | ${data?.product?.title ?? ''}`}]
);

export async function loader(args: Route.LoaderArgs) {
  const critical = await loadCriticalData(args);
  return {...critical};
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) throw new Error('Expected product handle to be defined');

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
  ]);

  if (!product?.id) throw new Response(null, {status: 404});

  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {product};
}

export default function Customize() {
  const {product} = useLoaderData<typeof loader>();
  const [design, setDesign] = useState<ExportedDesign | null>(null);

  const selectedVariant = product.selectedOrFirstAvailableVariant;

  return (
    <div style={{display: 'grid', gap: '1rem'}}>
      <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
        <div style={{flex: '1 1 420px'}}>
          <FabricDesignEditor onExport={(d) => setDesign(d)} />
        </div>
        <div style={{flex: '1 1 420px'}}>
          <ThreeTShirtViewer designUrl={design?.dataUrl} />
        </div>
      </div>

      <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
        <AddToCartButton
          disabled={!selectedVariant || !selectedVariant.availableForSale}
          lines={
            selectedVariant
              ? [
                  {
                    merchandiseId: selectedVariant.id,
                    quantity: 1,
                    selectedVariant,
                    attributes: design?.dataUrl
                      ? [{key: 'Design', value: design.dataUrl}]
                      : [],
                  } as any,
                ]
              : []
          }
        >
          Adicionar ao carrinho
        </AddToCartButton>
        <Link prefetch="intent" to={`/products/${product.handle}`}>
          Voltar ao produto
        </Link>
      </div>

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice { amount currencyCode }
    id
    image { __typename id url altText width height }
    price { amount currencyCode }
    product { title handle }
    selectedOptions { name value }
    sku
    title
    unitPrice { amount currencyCode }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    description
    encodedVariantExistence
    encodedVariantAvailability
    options { name optionValues { name } }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) { ...ProductVariant }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) { ...Product }
  }
  ${PRODUCT_FRAGMENT}
` as const;
