import {Money, Image} from '@shopify/hydrogen';
import {Link} from '@remix-run/react';
import type {SectionFeaturedProductsFragment} from 'storefrontapi.generated';

export function SectionFeaturedProducts(
  props: SectionFeaturedProductsFragment,
) {
  const {heading, body, products, withProductPrices} = props;
  return (
    <section>
      {heading && <h2>{heading.value}</h2>}
      {body && <p>{body.value}</p>}
      {products?.references?.nodes && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridGap: '1rem',
            paddingTop: '1rem',
          }}
        >
          {products.references.nodes.map((product) => {
            const {variants, priceRange, title} = product;
            const variant = variants?.nodes?.[0];
            return (
              <Link
                key={product.id}
                to={`/products/${product.handle}`}
                prefetch="intent"
              >
                {variant.image && (
                  <Image data={variant.image} style={{width: 'auto'}} />
                )}
                <h5 style={{marginBottom: '.5rem'}}>{title}</h5>
                {withProductPrices && (
                  <small style={{display: 'flex', marginTop: '.5rem'}}>
                    <span>From</span> &nbsp;
                    <Money data={priceRange.minVariantPrice} />
                  </small>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

const FEATURED_PRODUCT_FRAGMENT = `#graphql
  fragment FeaturedProduct on Product {
    id
    title
    handle
    productType
    variants(first: 1) {
      nodes {
        title
        image {
          altText
          width
          height
          url
        }
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`;

export const SECTION_FEATURED_PRODUCTS_FRAGMENT = `#graphql
  fragment SectionFeaturedProducts on Metaobject {
    type
    heading: field(key: "heading") {
      key
      value
    }
    body: field(key: "body") {
      key
      value
    }
    products: field(key: "products") {
      key
      references(first: 10) {
        nodes {
          ... on Product {
            ...FeaturedProduct
          }
        }
      }
    }
    withProductPrices: field(key: "with_product_prices") {
      key
      value
    }
  }
  ${FEATURED_PRODUCT_FRAGMENT}
`;

/*
function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery>;
}) {
  return (
    <div className="recommended-products">
      <h2>Recommended Products</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {({products}) => (
            <div className="recommended-products-grid">
              {products.nodes.map((product) => (
                <Link
                  key={product.id}
                  className="recommended-product"
                  to={`/products/${product.handle}`}
                >
                  <Image
                    data={product.images.nodes[0]}
                    aspectRatio="1/1"
                    sizes="(min-width: 45em) 20vw, 50vw"
                  />
                  <h4>{product.title}</h4>
                  <small>
                    <Money data={product.priceRange.minVariantPrice} />
                  </small>
                </Link>
              ))}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </div>
  );
}
*/
