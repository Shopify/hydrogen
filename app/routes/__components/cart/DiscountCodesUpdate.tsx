import React, {forwardRef, useCallback, useEffect, useId} from 'react';
import {Params, useFetcher, useLocation} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import type {
  Cart,
  CartDiscountCode,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type ActionArgs,
  type AppLoadContext,
  redirect,
  json,
  CacheNone,
} from '@hydrogen/remix';
import invariant from 'tiny-invariant';
import {getSession} from '~/lib/session.server';
import {getLocalizationFromLang} from '~/lib/utils';

interface DiscountCodesUpdateProps {
  discountCodes: CartDiscountCode[];
  children: ({
    state,
    error,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    error: string;
  }) => React.ReactNode;
  onSuccess?: (event: DiscountCodesUpdateEvent) => void;
}

interface DiscountCodesUpdateEventPayload {
  discountCodes: Cart['discountCodes'];
  codesAdded: Cart['discountCodes'];
  codesRemoved: Cart['discountCodes'];
}

interface DiscountCodesUpdateEvent {
  type: 'discount_codes_update';
  id: string;
  payload: DiscountCodesUpdateEventPayload;
}

interface DiscountCodesUpdated {
  codesAdded: CartDiscountCode[];
  codesRemoved: CartDiscountCode[];
}

const ACTION_PATH = `/cart/DiscountCodesUpdate`;

/*
  action ----------------------------------------------------------------
*/
async function action({request, context, params}: ActionArgs) {
  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  const cartId = await session.get('cartId');
  invariant(cartId, 'Missing cartId');

  invariant(formData.get('discountCodes'), 'Missing discountCodes');
  const discountCodes = formData.get('discountCodes')
    ? (JSON.parse(String(formData.get('discountCodes'))) as CartDiscountCode[])
    : ([] as CartDiscountCode[]);

  // we fetch teh previous discountCodes to
  // diff them after mutating for analytics
  const prevCart = await getCartDiscounts({cartId, params, context});

  const {cart, errors} = await discountCodesUpdateMutation({
    cartId,
    discountCodes,
    params,
    context,
  });

  return discountCodesUpdateResponse(cart, prevCart, errors, formData);
}

/*
  action helpers ----------------------------------------------------------------
*/
function discountCodesUpdateResponse(
  cart: Cart,
  prevCart: Cart,
  errors: UserError[],
  formData: FormData,
) {
  const mutationErrorMessage =
    errors?.map(({message}) => message).join('/n') || '';
  invariant(!errors.length, mutationErrorMessage);

  // if no js, we essentially reload to avoid being routed to the actions route
  const redirectTo = JSON.parse(String(formData.get('redirectTo')));
  if (redirectTo) {
    return redirect(redirectTo);
  }

  // determine what codes(s) were added or removed
  const {codesAdded, codesRemoved} = getUpdatedDiscountCodes(
    prevCart.discountCodes,
    cart.discountCodes,
  );

  const event: DiscountCodesUpdateEvent = {
    type: 'discount_codes_update',
    id: crypto.randomUUID(),
    payload: {
      discountCodes: cart.discountCodes,
      codesAdded,
      codesRemoved,
    },
  };

  return json({event});
}

function getUpdatedDiscountCodes(
  prevDiscountCodes: CartDiscountCode[],
  discountCodes: CartDiscountCode[],
): DiscountCodesUpdated {
  const codesRemoved = prevDiscountCodes?.filter((prevDiscountCode) => {
    const prevCodeInCart = discountCodes.find(
      (discountCode) => discountCode.code === prevDiscountCode.code,
    );
    return !prevCodeInCart;
  });
  const codesAdded = discountCodes?.filter((discountCode) => {
    const codeInPrevCart = prevDiscountCodes.find(
      (prevDiscountCode) => prevDiscountCode.code === discountCode.code,
    );
    return !codeInPrevCart;
  });

  return {codesAdded, codesRemoved};
}

/*
  action nutations / queries -----------------------------------------------------------------------------------------
*/
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

async function getCartDiscounts({
  cartId,
  params,
  context,
}: {
  cartId: string;
  params: Params;
  context: AppLoadContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in cart create mutation');

  const {country} = getLocalizationFromLang(params.lang);

  const {cart} = await storefront.query<{cart: Cart}>({
    query: CART_DISCOUNTS_QUERY,
    variables: {
      cartId,
      country,
    },
    cache: CacheNone(),
  });

  invariant(cart, 'No data returned from cart discounts query');
  return cart;
}

async function discountCodesUpdateMutation({
  cartId,
  discountCodes,
  params,
  context,
}: {
  cartId: string;
  discountCodes: CartDiscountCode[];
  params: Params;
  context: AppLoadContext;
}) {
  const {storefront} = context;
  invariant(
    storefront,
    'missing storefront client in discount codes update mutation',
  );

  const {country} = getLocalizationFromLang(params.lang);

  const {cartDiscountCodesUpdate} = await storefront.query<{
    cartDiscountCodesUpdate: {cart: Cart; errors: UserError[]};
  }>({
    query: DISCOUNT_CODES_UPDATE,
    variables: {
      cartId,
      discountCodes,
      country,
    },
    cache: CacheNone(),
  });

  invariant(
    cartDiscountCodesUpdate,
    'No data returned from update discount codes mutation',
  );
  return cartDiscountCodesUpdate;
}

/*
  Component ----------------------------------------------------------------
  Updates the discount codes applied to the cart
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartDiscountCodesUpdate
*/
const DiscountCodesUpdateForm = forwardRef(
  (
    {discountCodes, children, onSuccess = () => {}}: DiscountCodesUpdateProps,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const formId = useId();
    const isHydrated = useIsHydrated();
    const fetcher = useFetcher();
    const {pathname, search} = useLocation();

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
      <fetcher.Form id={formId} method="post" action={ACTION_PATH} ref={ref}>
        {/* used to trigger a redirect back to the same url when JS is disabled */}
        {isHydrated ? null : (
          <input
            type="hidden"
            name="redirectTo"
            defaultValue={`${pathname}${search}`}
          />
        )}
        <input
          type="hidden"
          name="discountCodes"
          defaultValue={JSON.stringify(discountCodes)}
        />
        {children({state: fetcher.state, error})}
      </fetcher.Form>
    );
  },
);

/*
  Hook ----------------------------------------------------------------
  Programmatically update the discount codes applied to the cart
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartDiscountCodesUpdate
*/
function useDiscountCodesUpdate(
  onSuccess: (event: DiscountCodesUpdateEvent) => void = () => {},
) {
  const fetcher = useFetcher();
  const discountCodesUpdate = useCallback(
    ({discountCodes}: {discountCodes: string[]}) => {
      const form = new FormData();
      form.set('discountCodes', JSON.stringify(discountCodes));
      fetcher.submit(form, {
        method: 'post',
        action: ACTION_PATH,
        replace: false,
      });
    },
    [fetcher],
  );

  useEffect(() => {
    if (!fetcher?.data?.event) return;
    onSuccess?.(fetcher.data.event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher?.data?.event]);

  return {
    discountCodesUpdate,
    data: fetcher.data || null,
    state: fetcher.state,
  };
}

export {
  action,
  DiscountCodesUpdateForm,
  discountCodesUpdateMutation,
  useDiscountCodesUpdate,
};
