import {diff} from 'fast-array-diff';
import React, {forwardRef, useCallback, useEffect, useId} from 'react';
import {useFetcher, useFetchers, useLocation} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import type {
  Cart,
  CartDiscountCode,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type ActionArgs,
  type HydrogenContext,
  redirect,
  json,
} from '@shopify/hydrogen-remix';
import invariant from 'tiny-invariant';
import {usePrefixPathWithLocale} from '~/lib/utils';

interface DiscountCodesUpdateProps {
  discountCodes?: string[];
  children: ({
    state,
    error,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    error: string;
  }) => React.ReactNode;
  className?: string;
  onSuccess?: (event: DiscountCodesUpdateEvent) => void;
}

interface DiscountCodesUpdateEventPayload {
  discountCodes: Cart['discountCodes'];
  codesAdded: Cart['discountCodes'];
  codesNotAdded: string[];
  codesRemoved: Cart['discountCodes'];
}

interface DiscountCodesUpdateEvent {
  type: 'discount_codes_update' | 'discount_codes_update_error';
  id: string;
  payload: DiscountCodesUpdateEventPayload;
}

interface DiscountCodesUpdated {
  codesAdded: CartDiscountCode[];
  codesNotAdded: string[];
  codesRemoved: CartDiscountCode[];
}

interface PrevCurrentDiscountCodes {
  addingDiscountCodes: string[];
  prevDiscountCodes: Cart['discountCodes'];
  currentDiscountCodes: Cart['discountCodes'];
}

const ACTION_PATH = `/cart/DiscountCodesUpdate`;

/**
 * action that handles the discountCodes update mutation
 */
async function action({request, context}: ActionArgs) {
  const {session} = context;

  const [cartId, formData] = await Promise.all([
    session.get('cartId'),
    request.formData(),
  ]);

  invariant(cartId, 'Missing cartId');

  const formDiscountCodes = formData.getAll('discountCodes');
  invariant(formDiscountCodes, 'Missing discountCodes');
  const discountCodes = (formDiscountCodes || []) as string[];

  // we fetch teh previous discountCodes to
  // diff them after mutating for analytics
  const prevCart = await getCartDiscounts({cartId, context});

  const {cart, errors} = await discountCodesUpdateMutation({
    cartId,
    discountCodes,
    context,
  });

  if (errors?.length) {
    const errorMessage = errors.map(({message}) => message).join('\n');
    return json({error: errorMessage});
  }

  // if no js, we essentially reload to avoid being routed to the actions route
  if (formData.get('redirectTo')) {
    return redirect(String(formData.get('redirectTo')));
  }

  const {event, error} = instrumentEvent({
    addingDiscountCodes: discountCodes,
    currentDiscountCodes: cart.discountCodes,
    prevDiscountCodes: prevCart.discountCodes,
  });

  return json({event, error});
}

/**
 * Helper function to instrument discount_codes_update | discount_codes_update_error events
 * @param prevDiscountCodes the applied discounts before the update mutation
 * @param currentDiscountCodes the applied discounts after the update mutation
 * @returns {event, error}
 */
function instrumentEvent({
  addingDiscountCodes,
  prevDiscountCodes,
  currentDiscountCodes,
}: PrevCurrentDiscountCodes): {
  error: string | null;
  event: DiscountCodesUpdateEvent;
} {
  const {codesAdded, codesNotAdded, codesRemoved} = diffDiscountCodes({
    addingDiscountCodes,
    prevDiscountCodes,
    currentDiscountCodes,
  });

  const event: DiscountCodesUpdateEvent = {
    type: 'discount_codes_update',
    id: crypto.randomUUID(),
    payload: {
      discountCodes: currentDiscountCodes,
      codesAdded,
      codesNotAdded,
      codesRemoved,
    },
  };

  if (codesNotAdded?.length) {
    event.type = 'discount_codes_update_error';
  }

  // How can we determine there was an error
  const error = null;

  return {error, event};
}

/**
 * Find what discount codes were added or removed
 * @param prevDiscountCodes an array of discountCodes before the mutation
 * @param currentDiscountCodes an array of discountCodes after the mutation
 * @returns
 */
function diffDiscountCodes({
  addingDiscountCodes,
  prevDiscountCodes,
  currentDiscountCodes,
}: PrevCurrentDiscountCodes): DiscountCodesUpdated {
  // compare discounts
  function comparer(
    prevDiscount: CartDiscountCode,
    discount: CartDiscountCode,
  ) {
    return prevDiscount.code === discount.code;
  }

  const {added, removed} = diff(
    prevDiscountCodes,
    currentDiscountCodes,
    comparer,
  );

  const codesNotAdded = addingDiscountCodes.filter((code) => {
    return !currentDiscountCodes.find((discount) => discount.code === code);
  });

  return {codesAdded: added, codesNotAdded, codesRemoved: removed};
}

const DISCOUNT_CODES_UPDATE = `#graphql
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!], $country: CountryCode = ZZ)
    @inContext(country: $country) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id
        discountCodes {
          code
        }
      }
      errors: userErrors {
        field
        message
      }
    }
  }
`;

const CART_DISCOUNTS_QUERY = `#graphql
  query CartQuery($cartId: ID!, $country: CountryCode = ZZ)
  @inContext(country: $country) {
    cart(id: $cartId) {
      discountCodes {
        code
      }
    }
  }
`;

/**
 * Fetch the current discountCodes applied to the cart
 * @see https://shopify.dev/api/storefront/2022-01/objects/Cart#field-cart-discountcodes
 * @param param0
 * @returns
 */
async function getCartDiscounts({
  cartId,
  context,
}: {
  cartId: string;
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in cart create mutation');

  const {cart} = await storefront.query<{cart: Cart}>(CART_DISCOUNTS_QUERY, {
    variables: {cartId},
  });

  invariant(cart, 'No data returned from cart discounts query');
  return cart;
}

/**
 * Mutation that updates the cart discounts
 * @param discountCodes Array of discount codes
 * @returns mutated cart
 */
async function discountCodesUpdateMutation({
  cartId,
  discountCodes,
  context,
}: {
  cartId: string;
  discountCodes: string[];
  context: HydrogenContext;
}) {
  const {storefront} = context;
  invariant(
    storefront,
    'missing storefront client in discount codes update mutation',
  );

  const {cartDiscountCodesUpdate} = await storefront.mutate<{
    cartDiscountCodesUpdate: {cart: Cart; errors: UserError[]};
  }>(DISCOUNT_CODES_UPDATE, {
    variables: {
      cartId,
      discountCodes,
    },
  });

  invariant(
    cartDiscountCodesUpdate,
    'No data returned from update discount codes mutation',
  );

  return cartDiscountCodesUpdate;
}

/**
 * Form that updates the discount codes applied to the cart
 * @param discountCodes Array of discount codes
 */
const DiscountCodesUpdateForm = forwardRef<
  HTMLFormElement,
  DiscountCodesUpdateProps
>(({discountCodes, children, onSuccess, className}, ref) => {
  const discountCodesInProps = typeof discountCodes !== 'undefined';
  const formId = useId();
  const isHydrated = useIsHydrated();
  const fetcher = useFetcher();
  const {pathname, search} = useLocation();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  const eventId = fetcher.data?.event?.id;
  const event = fetcher.data?.event;
  const error = fetcher.data?.error;

  // Adding onSuccess or event causes the event to fire multiple times
  // despite no change
  useEffect(() => {
    if (!eventId) return;
    onSuccess?.(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <fetcher.Form
      id={formId}
      method="post"
      action={localizedActionPath}
      ref={ref}
      className={className}
    >
      {/* used to trigger a redirect back to the same url when JS is disabled */}
      {isHydrated ? null : (
        <input
          type="hidden"
          name="redirectTo"
          defaultValue={`${pathname}${search}`}
        />
      )}
      {discountCodesInProps &&
        discountCodes.map((code, i) => (
          <input
            // eslint-disable-next-line react/no-array-index-key
            key={`${code}-${i}`}
            type="hidden"
            name="discountCodes"
            defaultValue={code}
          />
        ))}
      {children({state: fetcher.state, error})}
    </fetcher.Form>
  );
});

/**
 * Utility hook to get the active discountCodesUpdate fetcher
 * @returns fetcher
 */
function useDiscountCodesUpdateFetcher() {
  const fetchers = useFetchers();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === localizedActionPath,
  );
}

/*
  Programmatically update the discount codes applied to the cart
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartDiscountCodesUpdate
  returns { discountCodesUpdate, discountCodesUpdateFetcher }
*/
function useDiscountCodesUpdate(
  onSuccess: (event: DiscountCodesUpdateEvent) => void = () => {},
) {
  const fetcher = useFetcher();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  const discountCodesUpdate = useCallback(
    ({discountCodes}: {discountCodes: string[]}) => {
      const form = new FormData();
      form.set('discountCodes', JSON.stringify(discountCodes));
      fetcher.submit(form, {
        method: 'post',
        action: localizedActionPath,
        replace: false,
      });
    },
    [fetcher, localizedActionPath],
  );

  useEffect(() => {
    if (!fetcher?.data?.event) return;
    onSuccess?.(fetcher.data.event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher?.data?.event]);

  return {
    discountCodesUpdate,
    discountCodesUpdateFetcher: fetcher,
  };
}

/**
 * Utility hook to retrieve the discountCodes currently being updated
 * @returns {discountCodesUpdating}
 */
function useDiscountCodesUpdating() {
  const discountCodesUpdateFetcher = useDiscountCodesUpdateFetcher();
  let discountCodesUpdating: CartDiscountCode[] | null = null;

  // set linesRemoving
  if (discountCodesUpdateFetcher?.submission) {
    const discountCodesStr =
      discountCodesUpdateFetcher?.submission?.formData?.get('discountCodes');
    if (discountCodesStr && typeof discountCodesStr === 'string') {
      try {
        const codesUpdating = JSON.parse(discountCodesStr) as string[];
        if (Array.isArray(codesUpdating)) {
          discountCodesUpdating = codesUpdating.map((code) => ({
            code,
          })) as CartDiscountCode[];
        }
      } catch (_) {
        // noop
      }
    }
  }

  return {discountCodesUpdating};
}

export {
  action,
  DiscountCodesUpdateForm,
  discountCodesUpdateMutation,
  useDiscountCodesUpdate,
  useDiscountCodesUpdating,
};
