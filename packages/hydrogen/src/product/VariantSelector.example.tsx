import {VariantSelector} from '@shopify/hydrogen';
import type {Product} from '@shopify/hydrogen/storefront-api-types';
import {Link} from '@remix-run/react';

const ProductForm = ({product}: {product: Product}) => {
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
            {option.values.map(({value, isAvailable, to, isActive}) => (
              <Link
                to={to}
                prefetch="intent"
                className={
                  isActive ? 'active' : isAvailable ? '' : 'opacity-80'
                }
              >
                {value}
              </Link>
            ))}
          </div>
        </>
      )}
    </VariantSelector>
  );
};
