import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Link, type MetaFunction} from '@remix-run/react';
import {Image, Money} from '@shopify/hydrogen';
import type {RecommendedProductsQuery} from 'storefrontapi.generated';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;
  const recommendedProducts = await storefront.query(
    RECOMMENDED_PRODUCTS_QUERY,
  );
  return json({recommendedProducts});
}

export default function Homepage() {
  const {recommendedProducts} = useLoaderData<typeof loader>();
  return (
    <div className="home">
      <RecommendedProducts products={recommendedProducts.products} />
    </div>
  );
}

function RecommendedProducts({
  products,
}: {
  products: RecommendedProductsQuery['products'];
}) {
  return (
    <div className="recommended-products">
      <h2>Recommended Products</h2>
      <div className="recommended-products-grid">
        {products.nodes.map((product) => (
          <Link
            key={product.id}
            className="recommended-product"
            to={`/products/${product.handle}`}
          >
            <Image
              data={product.images.nodes[0]}
              sizes="(min-width: 45em) 20vw, 50vw"
            />
            <h4>{product.title}</h4>
            <small>
              <Money data={product.priceRange.minVariantPrice} />
            </small>
          </Link>
        ))}
      </div>
    </div>
  );
}

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 1) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
