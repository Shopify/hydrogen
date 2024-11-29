import {Link, useNavigate} from '@remix-run/react';
import {MappedProductOptions} from "@shopify/hydrogen";
import {Maybe, ProductOptionValueSwatch} from '@shopify/hydrogen/storefront-api-types';

export function ProductFormV2({productOptions}: {
  productOptions: MappedProductOptions[]
}) {
  const navigate = useNavigate();
  return (
    <>
      {productOptions.map((option) => (
        <div className="product-options" key={option.name}>
          <h5>{option.name}</h5>
          <div className="product-options-grid">
            {option.optionValues.map((value) => {
              const {
                name,
                handle,
                variantUriQuery,
                selected,
                available,
                isDifferentProduct,
                swatch,
              } = value;

              if (isDifferentProduct) {
                return (
                  <Link
                    className="product-options-item"
                    key={option.name + name}
                    prefetch="intent"
                    preventScrollReset
                    replace
                    to={`/products/${handle}?${variantUriQuery}`}
                    style={{
                      border: selected ? '1px solid black' : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </Link>
                );
              } else {
                return (
                  <button
                    type="button"
                    className={`product-options-item${!selected ? ' link' : ''}`}
                    key={option.name + name}
                    style={{
                      border: selected ? '1px solid black' : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                    onClick={() => {
                      if (!selected) {
                        navigate(`?${variantUriQuery}`, {
                          replace: true,
                        });
                      }
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </button>
                );
              }
            })}
          </div>
          <br />
        </div>
      ))}
    </>
  )
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} /> }
    </div>
  );
}
