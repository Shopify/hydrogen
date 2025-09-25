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
  // force an error by modifying the line with an invalid merchandiseId
  const troubledLines = Array.isArray(lines)
    ? lines.map((line) => ({
        ...line,
        // change the last merchandiseId character to trigger an error
        // merchandiseId: `${line.merchandiseId.slice(0, 1)`
        quantity: 7999,
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
