import {useFetchers, useMatches} from '@remix-run/react';

/**
 * Collects data under a certain key from useMatches
 * @param dataKey - The key in `event.data` to collect data from
 * @returns A merged object of the specified key
 *
 * @example
 * ```tsx
 * import {
 *   useDataFromMatches
 * } from '@shopify/hydrogen';
 *
 * export async function loader({request, context}: LoaderArgs) {
 *   return defer({
 *     analytics: {
 *       shopId: 'gid://shopify/Shop/1',
 *     },
 *   });
 * }
 *
 * export default function App() {
 *   const analytics = useDataFromMatches('analytics');
 *
 *   console.log(analytics);
 *   // {
 *   //   shopId: 'gid://shopify/Shop/1',
 *   // }
 * ```
 **/
export function useDataFromMatches(dataKey: string): Record<string, unknown> {
  const matches = useMatches();
  const data: Record<string, unknown> = {};

  matches.forEach((event) => {
    const eventData = event?.data;
    if (eventData && eventData[dataKey]) {
      Object.assign(data, eventData[dataKey]);
    }
  });

  return data;
}

/**
 * Collects data under a certain key from useFetches.
 *
 * @param formDataKey - The form data key
 * @param formDataValue - The value of formDataKey
 * @param dataKey - the key in `fetcher.data` to collect data from
 * @returns A merged object of the specified key
 *
 * @example
 * ```tsx
 * // In routes/cart.tsx
 * import {
 *   useDataFromFetchers
 * } from '@shopify/hydrogen';
 *
 * export async function action({request, context}: ActionArgs) {
 *   const cartId = await session.get('cartId');
 *   ...
 *   return json({
 *     analytics: {
 *       cartId,
 *     },
 *   });
 * }
 *
 * // Anywhere when an action can be requested, make sure there is a form input and value
 * // to identify the fetcher
 * export function AddToCartButton({
 *   ...
 *   return (
 *     <fetcher.Form action="/cart" method="post">
 *       <input type="hidden" name="cartAction" value={CartAction.ADD_TO_CART} />
 *
 * // In root.tsx
 * export default function App() {
 *   const cartData = useDataFromFetchers({
 *     formDataKey: 'cartAction',
 *     formDataValue: CartAction.ADD_TO_CART,
 *     dataKey: 'analytics',
 *   });
 *
 *   console.log(cartData);
 *   // {
 *   //   cartId: 'gid://shopify/Cart/abc123',
 *   // }
 * ```
 **/
export function useDataFromFetchers({
  formDataKey,
  formDataValue,
  dataKey,
}: {
  formDataKey: string;
  formDataValue: unknown;
  dataKey: string;
}): Record<string, unknown> | undefined {
  const fetchers = useFetchers();
  const data: Record<string, unknown> = {};

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    const fetcherData = fetcher.data;
    if (
      formData &&
      formData.get(formDataKey) === formDataValue &&
      fetcherData &&
      fetcherData[dataKey]
    ) {
      Object.assign(data, fetcherData[dataKey]);
    }
  }
  return Object.keys(data).length ? data : undefined;
}
