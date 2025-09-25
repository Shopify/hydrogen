import {type FetcherWithComponents} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  fetcherKey = CartForm.ACTIONS.LinesAdd,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
  fetcherKey: string;
}) {
  // force an error by modifying the line with an invalid quantity
  const troubledLines = Array.isArray(lines)
    ? lines.map((line) => ({
        ...line,
        quantity: 9999,
      }))
    : [];

  return (
    <CartForm
      route="/cart"
      inputs={{lines: troubledLines}}
      action={CartForm.ACTIONS.LinesAdd}
      fetcherKey={fetcherKey}
    >
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          <button
            type="submit"
            onClick={onClick}
            disabled={disabled ?? fetcher.state !== 'idle'}
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  );
}
