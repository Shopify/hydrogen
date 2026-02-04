import {InlineFeedback} from './InlineFeedback';
import {href, useActionData, useFetchers, type Fetcher} from 'react-router';
import type {action as cartAction} from '~/routes/cart';
import {useEffect, useState} from 'react';

function isCartFetcher(
  fetcher: Fetcher,
): fetcher is Fetcher<CartActionData> & {key: string} {
  return fetcher.formAction === href('/cart') && fetcher.formMethod === 'POST';
}

type CartActionData = NonNullable<
  ReturnType<typeof useActionData<typeof cartAction>>
>;
/** Returns the errors and warnings from the cart fetchers
 *  Groups errors and warnings by code to provide better UX.
 */
export function useCartFeedback() {
  const [fetcherDataMap, setFetcherDataMap] = useState<
    Map<string, CartActionData>
  >(new Map());
  const fetchers = useFetchers();

  useEffect(() => {
    setFetcherDataMap((prevMap) => {
      let changed = false;
      const newMap = new Map(prevMap);

      for (const fetcher of fetchers) {
        if (!isCartFetcher(fetcher)) continue;

        switch (fetcher.state) {
          case 'submitting':
            if (prevMap.size > 0) {
              return new Map(); // Clear on new submission
            }
            break;
          case 'loading':
            if (fetcher.data && fetcher.data !== prevMap.get(fetcher.key)) {
              changed = true;
              newMap.set(fetcher.key, fetcher.data);
            }
            break;
        }
      }

      return changed ? newMap : prevMap;
    });
  }, [fetchers]);

  const feedback: {
    warnings: Map<string, NonNullable<CartActionData['warnings']>[number]>;
    userErrors: Map<string, NonNullable<CartActionData['userErrors']>[number]>;
  } = {warnings: new Map(), userErrors: new Map()};
  for (const fetcherData of fetcherDataMap.values()) {
    if (fetcherData.warnings) {
      for (const warning of fetcherData.warnings) {
        feedback.warnings.set(warning.code, warning);
      }
    }
    if (fetcherData.userErrors) {
      for (const userError of fetcherData.userErrors) {
        feedback.userErrors.set(userError.code ?? '_root', userError);
      }
    }
  }
  return {
    warnings: Array.from(feedback.warnings.values()),
    userErrors: Array.from(feedback.userErrors.values()),
  };
}

/** Renders a list of warnings from the cart if there are any */
export function CartWarnings() {
  const feedback = useCartFeedback();
  if (feedback.warnings.length === 0 && feedback.userErrors.length === 0) {
    return null;
  }

  return (
    <div className="cart-warnings">
      {feedback.warnings.map((warning) => (
        <InlineFeedback
          key={warning.code}
          type="warning"
          title={warning.message}
        />
      ))}
      {feedback.userErrors.map((userError) => (
        <InlineFeedback
          key={userError.code}
          type="error"
          title={userError.message}
        />
      ))}
    </div>
  );
}
