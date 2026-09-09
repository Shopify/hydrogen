import { useEffect, useState } from "react";

import { useCartForm } from "~/lib/cart";

type AddToCartLine = {
  merchandiseId: string;
  quantity: number;
  selectedVariant?: unknown;
};

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: AddToCartLine[];
  onClick?: () => void;
}) {
  const { formProps, register } = useCartForm();
  const [isHydrated, setIsHydrated] = useState(false);
  const line = lines[0];

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <form {...formProps({ afterSubmit: onClick ? () => onClick() : undefined })}>
      <input name="analytics" type="hidden" value={JSON.stringify(analytics)} />
      {line ? (
        <>
          <input type="hidden" {...register("merchandiseId", { value: line.merchandiseId })} />
          <input type="hidden" {...register("quantity", { value: line.quantity })} />
        </>
      ) : null}
      <button type="submit" disabled={!isHydrated || disabled || !line} {...register("add")}>
        {children}
      </button>
    </form>
  );
}
