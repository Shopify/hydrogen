import {CartForm, OptimisticInput, useOptimisticData} from '@shopify/hydrogen';
import {CartLine} from '@shopify/hydrogen-react/storefront-api-types';

type OptimisticData = {
  action: string;
};

export default function Cart({line}: {line: CartLine}) {
  const optimisticId = line.id;
  const optimisticData = useOptimisticData<OptimisticData>(optimisticId);

  return (
    <div
      style={{
        // Hide the line item if the optimistic data action is remove
        // Do not remove the form from the DOM
        display: optimisticData?.action === 'remove' ? 'none' : 'block',
      }}
    >
      <CartForm
        route="/cart"
        action={CartForm.ACTIONS.LinesRemove}
        inputs={{
          lineIds: [line.id],
        }}
      >
        <button type="submit">Remove</button>
        <OptimisticInput id={optimisticId} data={{action: 'remove'}} />
      </CartForm>
    </div>
  );
}
