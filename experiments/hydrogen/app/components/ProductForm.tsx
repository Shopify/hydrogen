import { canAddToCart } from "@shopify/hydrogen";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

import { useProductForm, type ProductData } from "~/lib/product";
import { getVariantUrl } from "~/lib/variants";

import { useAside } from "./Aside";

type ProductOptionValueSwatch = NonNullable<
  ProductData["options"][number]["optionValues"][number]["swatch"]
>;

export function ProductForm({ product }: { product: ProductData }) {
  const { options, selectedVariant, register, formProps, errors, pending } = useProductForm();
  const { pathname, search } = useLocation();
  const { open } = useAside();
  const [isHydrated, setIsHydrated] = useState(false);
  const addable = canAddToCart(product, options);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <div className="product-form">
      {options.map((option) => {
        if (option.values.length === 1) return null;

        return (
          <div className="product-options" key={option.name}>
            <h5>{option.name}</h5>
            <div className="product-options-grid">
              {option.values.map((value) => {
                if (value.handle !== product.handle) {
                  // SEO
                  // When the variant is a combined listing child product
                  // that leads to a different url, we need to render it
                  // as an anchor tag
                  return (
                    <Link
                      className="product-options-item"
                      key={option.name + value.name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={getVariantUrl({
                        handle: value.handle,
                        optionNames: product.options.map((productOption) => productOption.name),
                        pathname,
                        searchParams: new URLSearchParams(search),
                        selectedOptions: value.selectedOptions,
                      })}
                      style={{
                        border: value.selected ? "1px solid black" : "1px solid transparent",
                        opacity: value.available ? 1 : 0.3,
                      }}
                    >
                      <ProductOptionSwatch swatch={value.swatch} name={value.name} />
                    </Link>
                  );
                } else {
                  // SEO
                  // When the variant is an update to the search param,
                  // render it as a button with javascript navigating to
                  // the variant so that SEO bots do not index these as
                  // duplicated links
                  return (
                    <button
                      type="button"
                      className={`product-options-item${value.exists && !value.selected ? " link" : ""}`}
                      key={option.name + value.name}
                      aria-pressed={value.selected}
                      style={{
                        border: value.selected ? "1px solid black" : "1px solid transparent",
                        opacity: value.available ? 1 : 0.3,
                      }}
                      disabled={!value.exists}
                      {...register("optionValue", {
                        optionName: option.name,
                        value: value.name,
                      })}
                    >
                      <ProductOptionSwatch swatch={value.swatch} name={value.name} />
                    </button>
                  );
                }
              })}
            </div>
            <br />
          </div>
        );
      })}
      <form {...formProps({ afterSubmit: () => open("cart") })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <input type="hidden" {...register("quantity", { value: 1 })} />
        <button {...register("addToCart", {})} disabled={!isHydrated || !addable || pending}>
          {pending ? "Adding..." : selectedVariant?.availableForSale ? "Add to cart" : "Sold out"}
        </button>
      </form>
      {errors.userErrors[0] ? <p>{errors.userErrors[0].message}</p> : null}
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: ProductOptionValueSwatch | null | undefined;
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
        backgroundColor: color || "transparent",
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
