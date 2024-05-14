import {VariantSelector} from '@shopify/hydrogen';
import type {Product} from '@shopify/hydrogen/storefront-api-types';
import {Link} from '@remix-run/react';

export const ProductForm = ({product}: {product: Product}) => {
  return (
    <VariantSelector
      handle={product.handle}
      options={product.options}
      variants={product.variants}
    >
      {({option}) => (
        <>
          <div>{option.name}</div>
          <div>
            {option.values.map(
              ({value, isAvailable, to, isActive, variant}) => (
                <Link
                  to={to}
                  prefetch="intent"
                  className={
                    isActive ? 'active' : isAvailable ? '' : 'opacity-80'
                  }
                >
                  {value}
                  <br />
                  {variant && `SKU: ${variant.sku}`}
                </Link>
              ),
            )}
          </div>
        </>
      )}
    </VariantSelector>
  );
};
