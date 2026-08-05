import type { CartData, MoneyV2 } from "@shopify/hydrogen";
import { useId } from "react";

import type { CartLayout } from "~/components/CartMain";
import { useCart, useCartForm } from "~/lib/cart";
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
      <CartGiftMessage attributes={cart.attributes} />
      <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
    </div>
  );
}

const GIFT_MESSAGE_ATTRIBUTE = "gift-message";

function CartGiftMessage({ attributes }: { attributes: CartData["attributes"] }) {
  const { formProps, register } = useCartForm();
  const attributesPending = useCart((state) => state.pending.attributes);
  const giftMessageId = useId();
  const giftMessage = attributes.find(({ key }) => key === GIFT_MESSAGE_ATTRIBUTE)?.value ?? "";
  const preservedAttributes = attributes.filter(({ key }) => key !== GIFT_MESSAGE_ATTRIBUTE);

  return (
    <form {...formProps()} className="cart-attribute">
      {preservedAttributes.map(({ key, value }) => (
        <div key={key}>
          <input type="hidden" {...register("attributeKey", { value: key })} />
          <input type="hidden" {...register("attributeValue", { value: value ?? "" })} />
        </div>
      ))}
      <input type="hidden" {...register("attributeKey", { value: GIFT_MESSAGE_ATTRIBUTE })} />
      <label htmlFor={giftMessageId}>Gift message</label>
      <textarea
        id={giftMessageId}
        rows={3}
        {...register("attributeValue", { defaultValue: giftMessage })}
        placeholder="Add a message for the recipient"
      />
      <button
        type="submit"
        {...register("attributes-update")}
        disabled={attributesPending}
        aria-busy={attributesPending}
      >
        {attributesPending ? "Saving…" : "Save message"}
      </button>
    </form>
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
