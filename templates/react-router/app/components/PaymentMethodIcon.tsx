import { useState } from "react";

import { getPaymentMethodIconUrl } from "~/lib/payment-icons";
import type { PaymentMethodLabel } from "~/lib/storefront-shop";

export function PaymentMethodIcon({ method }: { method: PaymentMethodLabel }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = getPaymentMethodIconUrl(method);

  if (!src || src === failedSrc) {
    return (
      <span className="border-border text-on-surface-secondary inline-flex min-h-6 max-w-full items-center rounded-sm border px-2 text-xs wrap-anywhere">
        {method}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={method}
      title={method}
      width={38}
      height={24}
      className="block h-6 w-[38px]"
      onError={() => setFailedSrc(src)}
    />
  );
}
