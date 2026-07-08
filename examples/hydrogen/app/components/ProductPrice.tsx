import type { MoneyV2 } from "@shopify/hydrogen";

import { formatMoney } from "~/lib/money";

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
}) {
  return (
    <div aria-label="Price" className="product-price" role="group">
      {compareAtPrice ? (
        <div className="product-price-on-sale">
          {price ? formatMoney(price) : null}
          <s>{formatMoney(compareAtPrice)}</s>
        </div>
      ) : price ? (
        formatMoney(price)
      ) : (
        <span>&nbsp;</span>
      )}
    </div>
  );
}
