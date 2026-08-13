import type { Ref } from "react";

import { useCart, useCartForm } from "~/lib/cart";
import { shopifyImageUrl } from "~/lib/image";
import { formatPrice } from "~/lib/money";

/**
 * A cart line, derived from the typed `useCart` binding (F3: consume typed data,
 * no hand-rolled parallel shape). Narrowed field access stays tolerant of the
 * gql.tada-inferred merchandise union via optional chaining
 * (`hydrogen-cart-ui` / `references/react.md`).
 */
type CartState = Parameters<Parameters<typeof useCart>[0]>[0];
type CartLine = CartState["data"]["lines"]["nodes"][number];

/**
 * Shared cart line-item form — used by both the cart drawer and the `/cart`
 * page (`hydrogen-cart-ui` / `hydrogen-cart-drawer`). Preserves the
 * progressive-enhancement form contract: hidden `register("set")`, scoped
 * `register("lineId", { value })`, and a real editable quantity input from
 * `register("quantity", { value, interactive: true })`. Increase/decrease/remove
 * are additional submit controls, not replacements.
 */
export function CartLineItem({
  line,
  removeControlRef,
  onRemoveSubmit,
}: {
  line: CartLine;
  removeControlRef: Ref<HTMLButtonElement>;
  onRemoveSubmit: () => void;
}) {
  const { formProps, register } = useCartForm();
  const pendingLines = useCart((state) => state.pending.lines);
  const isPending = pendingLines.has(line.id);
  const {
    merchandise,
    productTitle,
    productHandle,
    variantSubtitle,
    amountPerQuantity,
    compareAt,
  } = getCartLineDisplay(line);

  return (
    <div
      className={`grid grid-cols-[var(--spacing-cart-line-thumbnail-width)_1fr_auto] items-stretch gap-3 py-4`}
      aria-busy={isPending || undefined}
    >
      <CartLineImage
        merchandise={merchandise}
        productTitle={productTitle}
        variantSubtitle={variantSubtitle}
      />

      <div className="min-w-0">
        <CartLineTitle productHandle={productHandle} productTitle={productTitle} />
        {variantSubtitle ? (
          <p className="text-on-surface-secondary mt-1 text-xs">{variantSubtitle}</p>
        ) : null}
        <CartLinePrice
          amountPerQuantity={amountPerQuantity}
          compareAt={compareAt}
          isPending={isPending}
        />

        <form {...formProps()} className="mt-3">
          <button {...register("set")} className="sr-only" tabIndex={-1} />
          <input type="hidden" {...register("lineId", { value: line.id })} />
          <div className="quantity-selector-outlined inline-flex items-center rounded">
            <button
              type="submit"
              {...register("decrease")}
              disabled={line.quantity <= 1}
              className="button-icon h-8 w-9 rounded-s disabled:opacity-40"
              aria-label={`Decrease quantity: ${productTitle}`}
            >
              –
            </button>
            <input
              {...register("quantity", { value: line.quantity, interactive: true })}
              className="number-reset h-8 w-12 text-center text-sm"
              aria-label={`Quantity: ${productTitle}`}
            />
            <button
              type="submit"
              {...register("increase")}
              className="button-icon h-8 w-9 rounded-e"
              aria-label={`Increase quantity: ${productTitle}`}
            >
              +
            </button>
          </div>
        </form>
      </div>

      <form
        {...formProps({
          afterSubmit: onRemoveSubmit,
        })}
      >
        <input type="hidden" {...register("lineId", { value: line.id })} />
        <button
          type="submit"
          {...register("remove")}
          ref={removeControlRef}
          className="button-icon self-start rounded"
          aria-label={`Remove: ${productTitle}`}
        >
          <img
            src="/icons/icon-trash.svg"
            width="20"
            height="20"
            alt=""
            className="size-5"
            aria-hidden="true"
          />
        </button>
      </form>
    </div>
  );
}

function getCartLineDisplay(line: CartLine) {
  const merchandise = line.merchandise;
  const productTitle = merchandise?.product?.title ?? merchandise?.title ?? "Product";
  const selectedOptions = merchandise?.selectedOptions ?? [];

  return {
    merchandise,
    productTitle,
    productHandle: merchandise?.product?.handle,
    variantSubtitle: selectedOptions.map((option) => option.value).join(" / "),
    amountPerQuantity: line.cost.amountPerQuantity,
    compareAt: line.cost.compareAtAmountPerQuantity ?? null,
  };
}

function CartLineImage({
  merchandise,
  productTitle,
  variantSubtitle,
}: {
  merchandise: CartLine["merchandise"];
  productTitle: string;
  variantSubtitle: string;
}) {
  const image = merchandise?.image;
  const fallbackAlt = variantSubtitle ? `${productTitle} in ${variantSubtitle}` : productTitle;

  return (
    <div className="bg-surface-secondary h-full w-full overflow-hidden">
      {image ? (
        <img
          src={shopifyImageUrl(image.url, { width: 128 })}
          alt={image.altText ?? fallbackAlt}
          className="h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}

function CartLineTitle({
  productHandle,
  productTitle,
}: {
  productHandle?: string | null;
  productTitle: string;
}) {
  if (!productHandle) {
    return <p className="type-body-sm text-on-surface font-medium">{productTitle}</p>;
  }

  return (
    <a
      href={`/products/${productHandle}`}
      className="type-body-sm text-on-surface font-medium no-underline hover:opacity-70"
    >
      {productTitle}
    </a>
  );
}

function CartLinePrice({
  amountPerQuantity,
  compareAt,
  isPending,
}: {
  amountPerQuantity: CartLine["cost"]["amountPerQuantity"];
  compareAt: CartLine["cost"]["compareAtAmountPerQuantity"] | null;
  isPending: boolean;
}) {
  const onSale = compareAt != null && Number(compareAt.amount) > Number(amountPerQuantity.amount);

  return (
    <p
      className={`text-on-surface mt-2 text-sm transition-opacity ${isPending ? "opacity-30" : ""}`}
    >
      {onSale ? <span className="sr-only">Sale price: </span> : null}
      <span className={onSale ? "text-sale font-medium" : undefined}>
        {formatPrice(amountPerQuantity)}
      </span>
      <span className="text-on-surface-secondary text-xs"> each</span>
      {onSale && compareAt ? (
        <>
          <span className="sr-only">; original price: </span>{" "}
          <s className="text-compare text-sm">{formatPrice(compareAt)}</s>
          <span className="text-on-surface-secondary text-xs"> each</span>
        </>
      ) : null}
    </p>
  );
}


