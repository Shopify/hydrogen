import {VariantSelector} from '@shopify/hydrogen';
import {Link} from '@remix-run/react';

const ProductForm = ({product}) => {
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
            {option.values.map(({value, isAvailable, path, isActive}) => (
              <Link
                to={path}
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
