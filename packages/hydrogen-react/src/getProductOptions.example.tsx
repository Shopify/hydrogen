import React from 'react';
import {
  getProductOptions,
  type MappedProductOptions,
} from '@shopify/hydrogen-react';
import type {
  ProductOptionValueSwatch,
  Maybe,
} from '@shopify/hydrogen-react/storefront-api-types';

// Make sure you are querying for the following fields:
// - product.handle
// - product.encodedVariantExistence
// - product.encodedVariantAvailability
// - product.options.name
// - product.options.optionValues.name
// - product.options.optionValues.firstSelectableVariant
// - product.selectedOrFirstAvailableVariant
// - product.adjacentVariants
//
// For any fields that are ProductVariant type, make sure to query for:
// - variant.product.handle
// - variant.selectedOptions.name
// - variant.selectedOptions.value

export default function ProductForm() {
  const product = {
    /* Result from querying the SFAPI for a product */
  };

  const productOptions: MappedProductOptions[] = getProductOptions(product);

  return (
    <>
      {productOptions.map((option) => (
        <div key={option.name}>
          <h5>{option.name}</h5>
          <div>
            {option.optionValues.map((value) => {
              const {
                name,
                handle,
                variantUriQuery,
                selected,
                available,
                exists,
                isDifferentProduct,
                swatch,
              } = value;

              if (isDifferentProduct) {
                // SEO - When the variant is a
                // combined listing child product
                // that leads to a different url,
                // we need to render it
                // as an anchor tag
                return (
                  <a
                    key={option.name + name}
                    href={`/products/${handle}?${variantUriQuery}`}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </a>
                );
              } else {
                // SEO - When the variant is an
                // update to the search param,
                // render it as a button with
                // javascript navigating to
                // the variant so that SEO bots
                // do not index these as
                // duplicated links
                return (
                  <button
                    type="button"
                    key={option.name + name}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                    disabled={!exists}
                    onClick={() => {
                      if (!selected) {
                        // Navigate to `?${variantUriQuery}`
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
  );
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
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
