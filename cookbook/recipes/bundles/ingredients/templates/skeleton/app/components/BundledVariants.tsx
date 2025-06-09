import {Link} from '@remix-run/react';
import {Image} from '@shopify/hydrogen';
import type {
  ProductVariantComponent,
  Image as ShopifyImage,
} from '@shopify/hydrogen/storefront-api-types';

export function BundledVariants({
  variants,
}: {
  variants: ProductVariantComponent[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '1rem',
      }}
    >
      {variants
        ?.map(({productVariant: bundledVariant, quantity}) => {
          const url = `/products/${bundledVariant.product.handle}`;
          return (
            <Link
              style={{
                display: 'flex',
                flexDirection: 'row',
                marginBottom: '.5rem',
              }}
              to={url}
              key={bundledVariant.id}
            >
              <Image
                alt={bundledVariant.title}
                aspectRatio="1/1"
                height={60}
                loading="lazy"
                width={60}
                data={bundledVariant.image as ShopifyImage}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingLeft: '1rem',
                }}
              >
                <small>
                  {bundledVariant.product.title}
                  {bundledVariant.title !== 'Default Title'
                    ? `- ${bundledVariant.title}`
                    : null}
                </small>
                <small>Qty: {quantity}</small>
              </div>
            </Link>
          );
        })
        .filter(Boolean)}
    </div>
  );
}
