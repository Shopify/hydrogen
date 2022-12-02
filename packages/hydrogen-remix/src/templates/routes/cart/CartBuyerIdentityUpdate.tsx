import React, {forwardRef, useCallback, useEffect, useId, useRef} from 'react';
import {useFetcher, useFetchers, useLocation} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import type {PartialDeep} from 'type-fest';
import type {
  Cart,
  CartBuyerIdentityInput,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type ActionArgs,
  type HydrogenContext,
  redirect,
  json,
} from '@shopify/hydrogen-remix';
import invariant from 'tiny-invariant';
import {
  isLocalPath,
  usePrefixPathWithLocale,
  withoutFalsyProps,
} from '~/lib/utils';
import {cartCreate} from './CartLinesAdd';

interface BuyerIdentityUpdateProps {
  buyerIdentity?: CartBuyerIdentityInput;
  withCustomerAccessToken?: boolean | undefined;
  redirectTo?: string | undefined;
  className?: string;
  children: ({
    state,
    errors,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    errors: PartialDeep<UserError>[];
  }) => React.ReactNode;
  onSuccess?: (event: BuyerIdentityUpdateEvent) => void;
}

interface BuyerIdentityUpdateEventPayload {
  buyerIdentity: Cart['buyerIdentity'];
  buyerIdentityUpdate: CartBuyerIdentityInput;
}

interface BuyerIdentityUpdateEvent {
  type: 'buyer_identity_update';
  id: string;
  payload: BuyerIdentityUpdateEventPayload;
}

const ACTION_PATH = `/cart/CartBuyerIdentityUpdate`;

/**
 * action that handles the cart buyer identity update mutation
 */
async function action({request, context}: ActionArgs) {
  const {session} = context;
  const headers = new Headers();

  const [cartId, customerAccessToken, formData] = await Promise.all([
    session.get('cartId'),
    session.get('customerAccessToken'),
    request.formData(),
  ]);

  const buyerIdentity = withoutFalsyProps({
    countryCode: formData.get('countryCode'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    deliveryAddressPreferences: formData
      .getAll('deliveryAddressPreferences')
      .map((address) =>
        typeof address === 'string' ? JSON.parse(address) : address,
      ),
    // @todo: confirm with storefront api team
    // when we update the cart identity passing the `customerAccessToken`
    // we get the buyerIdentity.customer populated (which is great), but
    // if this customer has a default address then it's countryCode get set
    // and it's then no longer possible to update the countryCode (needed to localize the cart)
    customerAccessToken:
      formData.get('withCustomerAccessToken') && customerAccessToken, // we don't pass customerAccessToken by default
  }) as CartBuyerIdentityInput;

  invariant(
    Object.keys(buyerIdentity),
    'No buyerIdentity properties to update',
  );

  // if we have an existing cart, we update the identity,
  // else we create a new cart with the passed identity
  const {cart, errors: graphqlErrors} = cartId
    ? await cartBuyerIdentityUpdate({
        cartId,
        buyerIdentity,
        context,
      })
    : await cartCreate({
        input: {buyerIdentity},
        context,
      });

  if (graphqlErrors?.length) {
    return json({errors: graphqlErrors});
  }

  session.set('cartId', cart.id);
  headers.set('Set-Cookie', await session.commit());

  // if no js, we essentially reload to avoid being routed to the actions route
  // or if user passes redirectTo we use that
  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string' && isLocalPath(redirectTo)) {
    return redirect(redirectTo, {headers});
  }

  const {event, errors} = instrumentEvent({
    addingBuyerIdentity: buyerIdentity,
    updatedBuyerIdentity: cart.buyerIdentity,
  });

  return json({event, errors}, {headers});
}

/**
 * Helper function to instrument buyer_identity_update | buyer_identity_update_error events
 * @param prevBuyerIdentity the applied discounts before the update mutation
 * @param updatedBuyerIdentity the applied discounts after the update mutation
 * @returns {event, errors}
 */
function instrumentEvent({
  addingBuyerIdentity,
  updatedBuyerIdentity,
}: {
  addingBuyerIdentity: CartBuyerIdentityInput;
  updatedBuyerIdentity: Cart['buyerIdentity'];
}): {
  errors: UserError[] | null;
  event: BuyerIdentityUpdateEvent;
} {
  const event: BuyerIdentityUpdateEvent = {
    type: 'buyer_identity_update',
    id: crypto.randomUUID(),
    payload: {
      buyerIdentityUpdate: addingBuyerIdentity,
      buyerIdentity: updatedBuyerIdentity,
    },
  };

  // we are not diffing buyerIdentity updates
  const errors = null;

  return {event, errors};
}

/**
 * @see https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate
 */
const UPDATE_CART_BUYER_COUNTRY = `#graphql
  mutation(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
        buyerIdentity {
          email
          phone
          countryCode
        }
      }
      errors: userErrors {
        message
        field
        code
      }
    }
  }
`;

/**
 * Mutation to update a cart buyerIdentity
 * @param cartId  Cart['id']
 * @param buyerIdentity CartBuyerIdentityInput
 * @returns {cart: Cart; errors: UserError[]}
 * @see API https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate
 */
async function cartBuyerIdentityUpdate({
  cartId,
  buyerIdentity,
  context,
}: {
  cartId: string;
  buyerIdentity: CartBuyerIdentityInput;
  context: HydrogenContext;
}) {
  const {storefront} = context;

  const {cartBuyerIdentityUpdate} = await storefront.mutate<{
    cartBuyerIdentityUpdate: {cart: Cart; errors: UserError[]};
  }>(UPDATE_CART_BUYER_COUNTRY, {
    variables: {
      cartId,
      buyerIdentity,
    },
  });

  invariant(
    cartBuyerIdentityUpdate,
    'No data returned from cart buyer identity update mutation',
  );

  return cartBuyerIdentityUpdate;
}

/**
 * Form that updates a cart's buyer identity
 * @param buyerIdentity? (optional) CartBuyerIdentityInput. If not passed, input tags should be provided with the name matching the desired BuyerIdentity input. e.g email, countryCode..
 * @param withCustomerAccessToken? (optional) a prop to apply/not apply the customerAccessToken to the buyerIdentity if available
 * @param redirectTo? (optional) url to redirect to after the form is submitted. Defaults to the current path.
 * @param onSuccess? a callback that gets executed after a successful form submit
 */
const CartBuyerIdentityUpdateForm = forwardRef<
  HTMLFormElement,
  BuyerIdentityUpdateProps
>(
  (
    {
      buyerIdentity,
      withCustomerAccessToken,
      children,
      redirectTo,
      onSuccess,
      className,
    },
    ref,
  ) => {
    const buyerIdentityInProps = typeof buyerIdentity !== 'undefined';
    const redirectToInProps = typeof redirectTo === 'string';
    const formId = useId();
    const lastEventId = useRef<string | undefined>();
    const isHydrated = useIsHydrated();
    const fetcher = useFetcher();
    const eventId = fetcher.data?.event?.id;
    const event = fetcher.data?.event;
    const errors = fetcher.data?.errors;
    const {pathname, search} = useLocation();
    const localizedCurrentPath = usePrefixPathWithLocale(
      `${pathname}${search}`,
    );

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
        ref={ref}
        className={className}
      >
        {redirectToInProps ? (
          <input type="hidden" name="redirectTo" defaultValue={redirectTo} />
        ) : isHydrated ? null : (
          <input
            type="hidden"
            name="redirectTo"
            defaultValue={redirectToInProps ? redirectTo : localizedCurrentPath}
          />
        )}
        {typeof withCustomerAccessToken !== 'undefined' && (
          <input
            type="hidden"
            name="withCustomerAccessToken"
            defaultValue="true"
          />
        )}
        {buyerIdentityInProps &&
          Object.entries(buyerIdentity).map(([key, value], i) => (
            <input
              key={`${key}-${i}`}
              type="hidden"
              name={key}
              defaultValue={`${value}`}
            />
          ))}
        {children({state: fetcher.state, errors})}
      </fetcher.Form>
    );
  },
);

/**
 * Utility hook to get the active buyerIdentityUpdate fetcher
 * @returns fetcher
 */
function useBuyerIdentityUpdateFetcher() {
  const fetchers = useFetchers();
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );
}

/*
  Programmatically update a cart's buyerIdentity
  @see https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate
  returns { cartBuyerIdentityUpdate, fetcher }
*/
function useCartBuyerIdentityUpdate(
  onSuccess: (event: BuyerIdentityUpdateEvent) => void = () => {},
) {
  const fetcher = useFetcher();
  const lastEventId = useRef<string | undefined>();

  const cartBuyerIdentityUpdate = useCallback(
    ({
      buyerIdentity,
      withCustomerAccessToken,
      redirectTo,
    }: {
      buyerIdentity: CartBuyerIdentityInput;
      withCustomerAccessToken?: boolean;
      redirectTo?: string;
    }) => {
      const form = new FormData();
      for (const name in {
        ...buyerIdentity,
        withCustomerAccessToken,
        redirectTo,
      }) {
        const value = String(buyerIdentity[name as keyof typeof buyerIdentity]);
        if (value !== 'undefined') {
          form.set(name, value);
        }
      }
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

  return {cartBuyerIdentityUpdate, fetcher};
}

/**
 * Utility hook to retrieve the buyerIdentity currently being updated
 * @returns {buyerIdentityUpdating}
 */
function useCartBuyerIdentityUpdating() {
  const buyerIdentityUpdateFetcher = useBuyerIdentityUpdateFetcher();
  let buyerIdentityUpdating: CartBuyerIdentityInput | null = null;
  const formData = buyerIdentityUpdateFetcher?.submission?.formData;

  // set linesRemoving
  if (formData) {
    buyerIdentityUpdating = withoutFalsyProps({
      countryCode: formData.get('countryCode'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      deliveryAddressPreferences: formData
        .getAll('deliveryAddressPreferences')
        .map((address) =>
          typeof address === 'string' ? JSON.parse(address) : address,
        ),
    }) as CartBuyerIdentityInput;
  }

  return {buyerIdentityUpdating};
}

export {
  action,
  cartBuyerIdentityUpdate,
  CartBuyerIdentityUpdateForm,
  useCartBuyerIdentityUpdate,
  useCartBuyerIdentityUpdating,
};
