import React, {forwardRef, useCallback, useEffect, useId} from 'react';
import {useFetcher, useFetchers, useLocation} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import type {
  Cart,
  CartBuyerIdentityInput,
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
import {usePrefixPathWithLocale, withoutFalsyProps} from '~/lib/utils';

interface BuyerIdentityUpdateProps {
  buyerIdentity?: CartBuyerIdentityInput;
  withCustomerAccessToken?: boolean | undefined;
  redirectTo?: string | undefined;
  children: ({
    state,
    error,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    error: string;
  }) => React.ReactNode;
  className?: string;
  onSuccess?: (event: BuyerIdentityUpdateEvent) => void;
}

interface BuyerIdentityUpdateEventPayload {
  buyerIdentity: Cart['buyerIdentity'];
  buyerIdentityUpdate: CartBuyerIdentityInput;
}

interface BuyerIdentityUpdateEvent {
  type: 'buyer_identity_update' | 'buyer_identity_update_error';
  id: string;
  payload: BuyerIdentityUpdateEventPayload;
}

const ACTION_PATH = `/cart/BuyerIdentityUpdate`;

/**
 * action that handles the cart buyer identity update mutation
 */
async function action({request, context}: ActionArgs) {
  const {session} = context;

  const [cartId, customerAccessToken, formData] = await Promise.all([
    session.get('cartId'),
    session.get('customerAccessToken'),
    request.formData(),
  ]);

  invariant(cartId, 'Missing cartId');

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

  const {cart, errors} = await cartBuyerIdentityUpdate({
    cartId,
    buyerIdentity,
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
    addingBuyerIdentity: buyerIdentity,
    currentBuyerIdentity: cart.buyerIdentity,
  });

  return json({event, error});
}

/**
 * Helper function to instrument buyer_identity_update | buyer_identity_update_error events
 * @param prevBuyerIdentity the applied discounts before the update mutation
 * @param currentBuyerIdentity the applied discounts after the update mutation
 * @returns {event, error}
 */
function instrumentEvent({
  addingBuyerIdentity,
  currentBuyerIdentity,
}: {
  addingBuyerIdentity: CartBuyerIdentityInput;
  currentBuyerIdentity: Cart['buyerIdentity'];
}): {
  error: string | null;
  event: BuyerIdentityUpdateEvent;
} {
  const event: BuyerIdentityUpdateEvent = {
    type: 'buyer_identity_update',
    id: crypto.randomUUID(),
    payload: {
      buyerIdentityUpdate: addingBuyerIdentity,
      buyerIdentity: currentBuyerIdentity,
    },
  };

  // we are not diffing buyerIdentity updates
  const error = null;

  return {event, error};
}

const UPDATE_CART_BUYER_COUNTRY = `#graphql
  mutation(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
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
 * @see: https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate
 * @param cartId  Cart['id']
 * @param buyerIdentity CartBuyerIdentityInput
 * @returns {cart: Cart; errors: UserError[]}
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
const BuyerIdentityUpdateForm = forwardRef<
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
    const redirectToInProps = typeof redirectTo !== 'undefined';
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
        {redirectToInProps ? (
          <input type="hidden" name="redirectTo" defaultValue={redirectTo} />
        ) : isHydrated ? null : (
          <input
            type="hidden"
            name="redirectTo"
            defaultValue={
              redirectToInProps ? redirectTo : `${pathname}${search}`
            }
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
              // eslint-disable-next-line react/no-array-index-key
              key={`${key}-${i}`}
              type="hidden"
              name={key}
              defaultValue={`${value}`}
            />
          ))}
        {children({state: fetcher.state, error})}
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
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === localizedActionPath,
  );
}

/*
  Programmatically update a cart's buyerIdentity
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartBuyerIdentityUpdate
  returns { buyerIdentityUpdate, buyerIdentityUpdateFetcher }
*/
function useBuyerIdentityUpdate(
  onSuccess: (event: BuyerIdentityUpdateEvent) => void = () => {},
) {
  const fetcher = useFetcher();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);

  const buyerIdentityUpdate = useCallback(
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
    buyerIdentityUpdate,
    buyerIdentityUpdateFetcher: fetcher,
  };
}

/**
 * Utility hook to retrieve the buyerIdentity currently being updated
 * @returns {buyerIdentityUpdating}
 */
function useBuyerIdentityUpdating() {
  const buyerIdentityUpdateFetcher = useBuyerIdentityUpdateFetcher();
  let buyerIdentityUpdating: CartBuyerIdentityInput | null = null;
  const formData = buyerIdentityUpdateFetcher?.submission?.formData;

  // set linesRemoving
  if (formData) {
    buyerIdentityUpdating = withoutFalsyProps({
      countryCode: formData.get('countryCode'),
      email: formData.get('email'),
      phone: formData.get('phone'),
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
  BuyerIdentityUpdateForm,
  cartBuyerIdentityUpdate,
  useBuyerIdentityUpdate,
  useBuyerIdentityUpdating,
};
