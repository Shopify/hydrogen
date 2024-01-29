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
