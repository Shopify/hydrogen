import {useEffect, forwardRef, useCallback, useMemo} from 'react';
import {Params, useFetcher, useFetchers, useLocation} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import invariant from 'tiny-invariant';
import {getSession} from '~/lib/session.server';
import {
  type ActionArgs,
  type AppLoadContext,
  redirect,
  json,
  CacheNone,
} from '@hydrogen/remix';
import {getLocalizationFromLang} from '~/lib/utils';
import {
  Cart,
  CartInput,
  CartLine,
  CartLineInput,
  ProductVariant,
  UserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import React from 'react';

interface LinesAddEventPayload {
  linesAdded: CartLineInput[];
  linesNotAdded?: CartLineInput[];
}

interface LinesAddEvent {
  type: 'lines_add';
  id: string;
  payload: LinesAddEventPayload;
}

interface LinesAddLine extends Omit<CartLineInput, 'merchandiseId'> {
  variant: ProductVariant;
}

interface LinesAddProps {
  lines: LinesAddLine[] | [];
  children: ({
    state,
    error,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    error: string;
  }) => React.ReactNode;
  onSuccess?: (event: LinesAddEvent) => void;
}

interface OptimisticLinesAdd {
  linesAdding: LinesAddLine[] | [];
  optimisticLinesAdd: CartLine[] | [];
}

const ACTION_PATH = '/cart/LinesAdd';

/*
  Action ----------------------------------------------------------------
*/
async function action({request, context, params}: ActionArgs) {
  const headers = new Headers();

  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  const rawLines = formData.get('lines')
    ? (JSON.parse(String(formData.get('lines'))) as LinesAddLine[])
    : ([] as LinesAddLine[]);
  invariant(rawLines.length, 'No lines to add');

  // pluck away `variant` which is only needed for optimistic UI
  const lines = rawLines.map(({variant, ...line}) => {
    return {
      ...line,
      merchandiseId: variant.id,
    };
  });

  const cartId = await session.get('cartId');

  // A — no previous cart, create and add line(s)
  if (!cartId) {
    const cart = await cartCreateLinesMutation({
      cart: {lines},
      params,
      context,
    });

    // cart created - we only need a Set-Cookie header if we're creating
    session.set('cartId', cart.id);
    headers.set('Set-Cookie', await session.commit());

    return linesAddResponse(null, cart, lines, formData, headers);
  }

  // we need to query the prevCart so we can validate
  // what was really added or not for analytics
  const prevCart = await getCartLines({cartId, params, context});

  // B — else add line(s) to existing cart
  const cart = await linesAddMutation({
    cartId,
    lines,
    params,
    context,
  });

  return linesAddResponse(prevCart, cart, lines, formData, headers);
}

/*
  helpers ----------------------------------------------------------------
*/
function linesAddResponse(
  prevCart: Cart | null,
  cart: Cart,
  addingLines: CartLineInput[],
  formData: FormData,
  headers: Headers,
) {
  // if JS is disabled, this will redirect back to the referer
  if (formData.get('redirectTo')) {
    return redirect(String(formData.get('redirectTo')), {headers});
  }

  const prevLines = (prevCart?.lines || []) as Cart['lines'];

  // we need to figure out if a particular line failed to add
  const {linesAdded, linesNotAdded} = getLinesAddedStatus(
    addingLines,
    prevLines,
    cart.lines,
  );

  const event: LinesAddEvent = {
    type: 'lines_add',
    id: crypto.randomUUID(),
    payload: {linesAdded},
  };

  let errorMessage = null;
  if (linesNotAdded.length) {
    event.payload.linesNotAdded = linesNotAdded;

    const failedVariantIds = linesNotAdded
      .map((line) => line.merchandiseId.split('/').pop())
      .join(', ');
    errorMessage = `Failed to add variant(s): ${failedVariantIds}`;
  }

  if (linesAdded.length) {
    return json({event, error: errorMessage}, {headers});
  }

  // failed to add one or more
  return json({error: errorMessage}, {headers});
}

// Temporary workaround for analytics until we land
// https://github.com/Shopify/storefront-api-feedback/discussions/151
function getLinesAddedStatus(
  addingLines: CartLineInput[],
  prevLines: Cart['lines'],
  lines: Cart['lines'],
) {
  return addingLines.reduce(
    (result, line) => {
      const prevLine = prevLines?.edges?.length
        ? prevLines.edges.find(
            ({node: prevLine}) =>
              prevLine.merchandise.id === line.merchandiseId,
          )
        : null;
      const cartLine = lines.edges.find(
        ({node: updatedLine}) =>
          updatedLine.merchandise.id === line.merchandiseId,
      );

      // new line added?
      if (!prevLine) {
        if (cartLine?.node?.quantity === line.quantity) {
          result.linesAdded.push(line);
        } else {
          result.linesNotAdded.push(line);
        }
        return result;
      }

      if (!cartLine) {
        result.linesNotAdded = [...result.linesNotAdded, line];
        return result;
      }

      // existing line updated?
      if (
        prevLine.node.quantity + (line.quantity || 1) ===
        cartLine.node.quantity
      ) {
        result.linesAdded = [...result.linesAdded, line];
      } else {
        result.linesNotAdded = [...result.linesNotAdded, line];
      }
      return result;
    },
    {linesAdded: [], linesNotAdded: []} as {
      linesAdded: CartLineInput[];
      linesNotAdded: CartLineInput[];
    },
  );
}

/*
  Action mutations & queries -----------------------------------------------------------------------------------------
*/
const USER_ERROR_FRAGMENT = `#graphql
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

const LINES_CART_FRAGMENT = `#graphql
  fragment CartLinesFragment on Cart {
    id
    totalQuantity
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ...on ProductVariant {
              id
            }
          }
        }
      }
    }
  }
`;

const CART_LINES_QUERY = `#graphql
  query CartQuery($cartId: ID!, $country: CountryCode = ZZ)
  @inContext(country: $country) {
    cart(id: $cartId) {
      ...CartLinesFragment
    }
  }

  ${LINES_CART_FRAGMENT}
`;

const CREATE_CART_ADD_LINES_MUTATION = `#graphql
  mutation CartCreate($input: CartInput!, $country: CountryCode = ZZ)
  @inContext(country: $country) {
    cartCreate(input: $input) {
      cart {
        ...CartLinesFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${LINES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

const ADD_LINES_MUTATION = `#graphql
  mutation CartLineAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode = ZZ)
  @inContext(country: $country) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartLinesFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${LINES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

async function getCartLines({
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
    query: CART_LINES_QUERY,
    variables: {
      cartId,
      country,
    },
    cache: CacheNone(),
  });

  invariant(cart, 'No data returned from cart lines query');
  return cart;
}

async function cartCreateLinesMutation({
  cart,
  params,
  context,
}: {
  cart: CartInput;
  params: Params;
  context: AppLoadContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in cart create mutation');

  const {country} = getLocalizationFromLang(params.lang);

  const {cartCreate} = await storefront.query<{
    cartCreate: {
      cart: Cart;
      errors: UserError[];
    };
    errors: UserError[];
  }>({
    query: CREATE_CART_ADD_LINES_MUTATION,
    variables: {
      input: cart,
      country,
    },
    cache: CacheNone(),
  });

  invariant(cartCreate, 'No data returned from cart create mutation');

  if (cartCreate.errors?.length) {
    const errorMessage = cartCreate.errors
      .map(({message}) => message)
      .join('\n');
    return json({addedToCart: false, error: errorMessage});
  }

  return cartCreate.cart;
}

async function linesAddMutation({
  cartId,
  lines,
  params,
  context,
}: {
  cartId: string;
  lines: CartLineInput[];
  params: Params;
  context: AppLoadContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in lines add mutation');

  const {country} = getLocalizationFromLang(params.lang);

  const {cartLinesAdd} = await storefront.query<{
    cartLinesAdd: {
      cart: Cart;
      errors: UserError[];
    };
  }>({
    query: ADD_LINES_MUTATION,
    variables: {cartId, lines, country},
    cache: CacheNone(),
  });

  invariant(cartLinesAdd, 'No data returned from line(s) add mutation');

  if (cartLinesAdd?.errors?.length) {
    const errorMessage = cartLinesAdd.errors
      .map(({message}) => message)
      .join('\n');
    throw new Error(errorMessage);
  }

  return cartLinesAdd.cart;
}

/*
  Component ----------------------------------------------------------------
  Add a set of line(s) to the cart
  @see: https://shopify.dev/api/storefront/2022-10/mutations/cartLinesAdd
*/
const LinesAddForm = forwardRef<HTMLFormElement, LinesAddProps>(
  ({children, lines = [], onSuccess}, ref) => {
    const {pathname, search} = useLocation();
    const fetcher = useFetcher();
    const isHydrated = useIsHydrated();
    const error = fetcher?.data?.error;
    const event = fetcher?.data?.event;
    const eventId = fetcher?.data?.event?.id;

    useEffect(() => {
      if (!eventId) return;
      onSuccess?.(event);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    // @todo: maybe throw if no lines are provided?
    if (!lines?.length) return null;

    return (
      <fetcher.Form method="post" action={ACTION_PATH} ref={ref}>
        <input
          type="hidden"
          name="lines"
          defaultValue={JSON.stringify(lines)}
        />
        {/* used to trigger a redirect back to the PDP when JS is disabled */}
        {isHydrated ? null : (
          <input
            type="hidden"
            name="redirectTo"
            defaultValue={`${pathname}${search}`}
          />
        )}
        {children({state: fetcher.state, error})}
      </fetcher.Form>
    );
  },
);

/*
  Hooks ---------------
  -------------------------------------------------
*/
function useLinesAdd(onSuccess: (event: LinesAddEvent) => void = () => {}) {
  const fetcher = useFetcher();
  const fetchers = useFetchers();
  const linesAddFetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );

  let linesAdding;

  if (linesAddFetcher?.submission) {
    const linesAddingStr = linesAddFetcher?.submission?.formData?.get('lines');
    if (linesAddingStr && typeof linesAddingStr === 'string') {
      linesAdding = JSON.parse(linesAddingStr);
    }
  }

  const linesAdd = useCallback(
    ({lines}: {lines: LinesAddProps['lines']}) => {
      const form = new FormData();
      form.set('lines', JSON.stringify(lines));
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
    linesAdd,
    linesAddFetcher,
    linesAdding,
  };
}

function useOptimisticLinesAdd(lines: CartLine[]): OptimisticLinesAdd {
  const fetchers = useFetchers();
  const linesAddFetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === ACTION_PATH,
  );
  const linesAddingStr = linesAddFetcher?.submission?.formData?.get('lines');

  return useMemo(() => {
    let linesAdding: LinesAddLine[] | [] = [];

    // get lines currently being added
    if (linesAddingStr && typeof linesAddingStr === 'string') {
      linesAdding = JSON.parse(linesAddingStr);
    } else {
      return {linesAdding, optimisticLinesAdd: []};
    }

    // default response
    const result: OptimisticLinesAdd = {linesAdding, optimisticLinesAdd: []};

    if (!linesAdding?.length) return result;

    // convert all variants being added to cart lines that can
    // be rendered as optimistic <CartLine />
    const cartLinesAdding = linesAdding
      .map((line) => {
        const {variant} = line;
        const lineTotalAmount = String(
          parseFloat(variant.price.amount) * (line.quantity || 1),
        );
        return {
          id: crypto.randomUUID(),
          quantity: line.quantity,
          cost: {
            totalAmount: {
              amount: lineTotalAmount,
              currencyCode: variant.price.currencyCode,
            },
            compareAtAmountPerQuantity: variant.compareAtPrice,
          },
          merchandise: {
            id: variant.id,
            image: variant.image,
            product: variant.product,
            selectedOptions: variant.selectedOptions,
          },
        };
      })
      .reverse() as CartLine[];

    if (!cartLinesAdding || !cartLinesAdding?.length) return result;

    // filter just the new optimistic lines
    const addedIds = lines.map((line) => line.merchandise.id);
    const addingIds = cartLinesAdding.map((line) => line.merchandise.id);
    const addingIdsNew = addingIds.filter((id) => !addedIds.includes(id));

    if (!addedIds.length) {
      // assign all adding lines: empty cart
      result.optimisticLinesAdd = cartLinesAdding;
      return result;
    }

    if (addingIds?.length) {
      // assign new lines only: existing cart with lines
      const addingLinesNew = addingIdsNew
        .map((lineId) => {
          const line = cartLinesAdding.find(
            (line) => line.merchandise.id === lineId,
          );
          return line || null;
        })
        .filter(Boolean) as CartLine[];
      result.optimisticLinesAdd = addingLinesNew;
      return result;
    }

    return result;
  }, [linesAddingStr, lines]);
}

export {
  action,
  cartCreateLinesMutation,
  getCartLines,
  LINES_CART_FRAGMENT,
  LinesAddForm,
  linesAddMutation,
  useLinesAdd,
  useOptimisticLinesAdd,
  USER_ERROR_FRAGMENT,
};
