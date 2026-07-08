import type { CartData, MoneyV2 } from "@shopify/hydrogen";
import { useId } from "react";

import type { CartLayout } from "~/components/CartMain";
import { useCartForm } from "~/lib/cart";
import { formatMoney } from "~/lib/money";

type CartSummaryProps = {
  cart: CartData;
  layout: CartLayout;
};

export function CartSummary({ cart, layout }: CartSummaryProps) {
  const className = layout === "page" ? "cart-summary-page" : "cart-summary-aside";
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const subtotalAmount = toHydrogenMoney(cart.cost.subtotalAmount);

  return (
    <div aria-labelledby={summaryId} className={className}>
      <h4 id={summaryId}>Totals</h4>
      <div aria-label="Subtotal" role="group">
        <dl className="cart-subtotal">
          <dt>Subtotal</dt>
          <dd>{subtotalAmount ? formatMoney(subtotalAmount) : "-"}</dd>
        </dl>
      </div>
      <CartDiscounts
        discountCodes={cart.discountCodes}
        discountsHeadingId={discountsHeadingId}
        discountCodeInputId={discountCodeInputId}
      />
      <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
    </div>
  );
}

function toHydrogenMoney(value: CartData["cost"]["subtotalAmount"]): MoneyV2 | null {
  if (!value.amount || !value.currencyCode) return null;
  return { amount: value.amount, currencyCode: value.currencyCode };
}

function CartCheckoutActions({ checkoutUrl }: { checkoutUrl?: string | null }) {
  if (!checkoutUrl) return null;

  return (
    <div>
      <a href={checkoutUrl} target="_self">
        <p>Continue to Checkout &rarr;</p>
      </a>
      <br />
    </div>
  );
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}: {
  discountCodes: CartData["discountCodes"];
  discountsHeadingId: string;
  discountCodeInputId: string;
}) {
  const codes = discountCodes.filter((discount) => discount.applicable).map(({ code }) => code);

  return (
    <section aria-label="Discounts">
      <dl hidden={!codes.length}>
        <div>
          <dt id={discountsHeadingId}>Discounts</dt>
          {codes.map((code) => (
            <RemoveDiscountForm key={code} code={code} discountsHeadingId={discountsHeadingId} />
          ))}
        </div>
      </dl>

      <ApplyDiscountForm discountCodeInputId={discountCodeInputId} />
    </section>
  );
}

function ApplyDiscountForm({ discountCodeInputId }: { discountCodeInputId: string }) {
  const { formProps, register } = useCartForm();

  return (
    <form {...formProps()}>
      <div>
        <label htmlFor={discountCodeInputId} className="sr-only">
          Discount code
        </label>
        <input
          id={discountCodeInputId}
          type="text"
          {...register("discountCode", { defaultValue: "" })}
          placeholder="Discount code"
        />
        &nbsp;
        <button type="submit" aria-label="Apply discount code" {...register("discount-apply")}>
          Apply
        </button>
      </div>
    </form>
  );
}

function RemoveDiscountForm({
  code,
  discountsHeadingId,
}: {
  code: string;
  discountsHeadingId: string;
}) {
  const { formProps, register } = useCartForm();

  return (
    <form {...formProps()}>
      <input type="hidden" {...register("discountCode", { value: code })} />
      <div className="cart-discount" role="group" aria-labelledby={discountsHeadingId}>
        <code>{code}</code>
        &nbsp;
        <button
          type="submit"
          aria-label={`Remove discount ${code}`}
          {...register("discount-remove")}
        >
          Remove
        </button>
      </div>
    </form>
  );
}
