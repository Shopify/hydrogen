import {diff} from 'fast-array-diff';
import React, {forwardRef, useCallback, useEffect, useId, useRef} from 'react';
import {useFetcher, useFetchers, useLocation} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import type {PartialDeep} from 'type-fest';
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
import {isLocalPath, usePrefixPathWithLocale} from '~/lib/utils';

interface DiscountCodesUpdateProps {
  discountCodes?: string[];
  className?: string;
  children: ({
    state,
    errors,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    errors: PartialDeep<UserError>[];
  }) => React.ReactNode;
  onSuccess?: (event: DiscountCodesUpdateEvent) => void;
}

interface DiscountCodesUpdateEventPayload {
  discountCodes: Cart['discountCodes'];
  codesAdded: Cart['discountCodes'];
  codesNotAdded: string[];
  codesRemoved: Cart['discountCodes'];
}

interface DiscountCodesUpdateEvent {
  type: 'discount_codes_update';
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

const ACTION_PATH = `/cart/CartDiscountCodesUpdate`;

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

  let cart: Cart;

  // we fetch teh previous discountCodes to
  // diff them after mutating for analytics
  const prevCart = await getCartDiscounts({cartId, context});

  const {cart: firstCart, errors: graphqlErrors} =
    await cartDiscountCodesUpdate({
      cartId,
      discountCodes,
      context,
    });

  if (graphqlErrors?.length) {
    return json({errors: graphqlErrors});
  }

  cart = firstCart;

  const sortedDiscountCodes: {applicables: string[]; notApplicables: string[]} =
    {applicables: [], notApplicables: []};

  // after the first mutation we find which discounts are actually applicable vs which ones are not
  const {applicables, notApplicables} = cart.discountCodes.reduce(
    (sort, discount) => {
      if (discount.applicable) {
        sort.applicables.push(discount.code);
      } else {
        sort.notApplicables.push(discount.code);
      }
      return sort;
    },
    sortedDiscountCodes,
  );

  if (notApplicables?.length) {
    // update cart with just the applicable discounts
    const {cart: secondCart, errors: graphqlErrors} =
      await cartDiscountCodesUpdate({
        cartId,
        discountCodes: applicables,
        context,
      });

    if (graphqlErrors?.length) {
      return json({errors: graphqlErrors});
    }

    cart = secondCart;
  }

  // if no js, we essentially reload to avoid being routed to the actions route
  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string' && isLocalPath(redirectTo)) {
    return redirect(redirectTo);
  }

  const {event, errors} = instrumentEvent({
    addingDiscountCodes: discountCodes,
    currentDiscountCodes: cart.discountCodes,
    prevDiscountCodes: prevCart.discountCodes,
  });

  return json({event, errors});
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
}: PrevCurrentDiscountCodes) {
  // diff codes being updated with codes that existed before the mutation
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

  let errors: null | UserError[] = null;
  if (codesNotAdded?.length) {
    errors = codesNotAdded.map((code) => ({
      code: 'DISCOUNT_CODE_NOT_ADDED',
      message: code,
    }));
  }

  return {event, errors};
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
          applicable
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
        applicable
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
  invariant(storefront, 'missing storefront client in cart discounts query');

  const {cart} = await storefront.query<{cart: Cart}>(CART_DISCOUNTS_QUERY, {
    variables: {cartId},
  });

  invariant(cart, 'No data returned from cart discounts query');
  return cart;
}

/**
 * Mutation that updates the cart discounts
 * @param discountCodes Array of discount codes
 * @see https://shopify.dev/api/storefront/2022-10/mutations/cartDiscountCodesUpdate
 * @returns mutated cart
 */
async function cartDiscountCodesUpdate({
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
    'missing storefront client in cartDiscountCodesUpdate mutation',
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
    'No data returned from the cartDiscountCodesUpdate mutation',
  );

  return cartDiscountCodesUpdate;
}

/**
 * Form that updates the discount codes applied to the cart
 * @param discountCodes Array of discount codes
 */
const CartDiscountCodesUpdateForm = forwardRef<
  HTMLFormElement,
  DiscountCodesUpdateProps
>(({discountCodes, children, onSuccess, className}, ref) => {
  const discountCodesInProps = typeof discountCodes !== 'undefined';
  const formId = useId();
  const lastEventId = useRef<string | undefined>();
  const isHydrated = useIsHydrated();
  const fetcher = useFetcher();
  const {pathname, search} = useLocation();
  const eventId = fetcher.data?.event?.id;
  const event = fetcher.data?.event;
  const errors = fetcher.data?.errors;
  const localizedCurrentPath = usePrefixPathWithLocale(`${pathname}${search}`);

  useEffect(() => {
    if (!eventId) return;
    if (eventId === lastEventId.current) return;
    onSuccess?.(event);
    lastEventId.current = eventId;
  }, [eventId, event, onSuccess]);

  return (
    <fetcher.Form
      id={formId}
      method="post"
      action={ACTION_PATH}
      className={className}
      ref={ref}
    >
      {/* used to trigger a redirect back to the same url when JS is disabled */}
      {isHydrated ? null : (
        <input
          type="hidden"
          name="redirectTo"
          defaultValue={localizedCurrentPath}
        />
      )}
      {discountCodesInProps &&
        discountCodes.map((code, i) => (
          <input
            key={`${code}-${i}`}
            type="hidden"
            name="discountCodes"
            defaultValue={code}
          />
        ))}
      {children({state: fetcher.state, errors})}
    </fetcher.Form>
  );
});

/*
  A hook to programmatically update the discount codes applied to a cart
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartDiscountCodesUpdate
  returns {cartDiscountCodesUpdate, fetcher}
*/
function useCartDiscountCodesUpdate(
  onSuccess: (event: DiscountCodesUpdateEvent) => void = () => {},
) {
  const fetcher = useFetcher();
  const lastEventId = useRef<string | undefined>();

  const cartDiscountCodesUpdate = useCallback(
    ({discountCodes}: {discountCodes: string[]}) => {
      const form = new FormData();
      Array.isArray(discountCodes) &&
        form.set('discountCodes', JSON.stringify(discountCodes));
      fetcher.submit(form, {
        method: 'post',
        action: ACTION_PATH,
        replace: false,
      });
    },
    [fetcher, ACTION_PATH],
  );

  useEffect(() => {
    if (!fetcher?.data?.event) return;
    if (lastEventId.current === fetcher?.data?.event?.id) return;
    onSuccess?.(fetcher.data.event);
    lastEventId.current = fetcher.data.event.id;
  }, [fetcher?.data?.event, onSuccess]);

  return {cartDiscountCodesUpdate, fetcher};
}

/**
 * Utility hook to get the active discountCodesUpdate fetcher
 * @returns fetcher
 */
function useCartDiscountCodesUpdateFetcher() {
  const fetchers = useFetchers();
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );
}

/**
 * Utility hook to retrieve the discountCodes currently being updated
 * @returns {discountCodesUpdating, fetcher}
 */
function useCartDiscountCodesUpdating() {
  const fetcher = useCartDiscountCodesUpdateFetcher();
  let discountCodesUpdating: CartDiscountCode[] | null = null;

  if (fetcher?.submission) {
    const discountCodes =
      fetcher?.submission?.formData?.getAll('discountCodes');

    if (discountCodes && Array.isArray(discountCodes)) {
      // @ts-ignore help me
      discountCodesUpdating = discountCodes as CartDiscountCode[];
    }
  }

  return {discountCodesUpdating, fetcher};
}

export {
  action,
  cartDiscountCodesUpdate,
  CartDiscountCodesUpdateForm,
  useCartDiscountCodesUpdate,
  useCartDiscountCodesUpdating,
};
