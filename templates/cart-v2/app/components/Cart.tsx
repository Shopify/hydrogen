// import React from 'react';
import {Image, Money, flattenConnection} from '@shopify/hydrogen';
import {Form, Link, useFetchers} from '@remix-run/react';
import type {
  CartLine,
  CartLineUpdateInput,
} from '@shopify/hydrogen/storefront-api-types';

import {useCart} from '~/lib/cart/hooks';
import {CartAction} from '~/lib/cart/components';

type Theme = 'light' | 'dark';

interface CartProps {
  theme?: Theme;
}

export function Cart({theme}: CartProps) {
  const cart = useCart();
  const optimisticData = useOptimisticDataFromActions('optimistic-add-to-cart');

  if (!cart || !optimisticData) return <CartEmpty />;

  const flattenedLines = flattenConnection(cart.lines);

  if (flattenedLines.length === 0) return <CartEmpty />;

  return (
    <div className="Cart">
      <h1>Cart</h1>
      {optimisticData.map((line) => (
        <CartItem theme={theme || 'light'} key={line.id} item={line} />
      ))}
      {flattenedLines.map((line) => (
        <CartItem theme={theme || 'light'} key={line.id} item={line} />
      ))}
      <CartFooter />
    </div>
  );
}

function CartEmpty() {
  return (
    <div className="Cart">
      <div className="Cart__Empty">
        <h3>Your cart is empty.</h3>
        <Link to="/products">Continue Shopping</Link>
      </div>
    </div>
  );
}
interface CartItemProps {
  theme: Theme;
  item: CartLine;
}

function CartItem({item}: CartItemProps) {
  const optimisticData = useOptimisticDataFromActions(item.merchandise.id);
  if (!item?.id) return null;

  const {id, quantity, merchandise} = item;
  const {product, price, image} = merchandise;

  if (typeof quantity === 'undefined' || !product) return null;

  const {handle, title} = product;

  const imageMarkup = image ? (
    <Image width={200} height={200} data={image} alt={merchandise.title} />
  ) : null;

  return (
    <div
      style={{
        display: optimisticData?.type === 'remove' ? 'none' : 'flex',
        padding: 20,
        width: '100%',
        maxWidth: 800,
        margin: '0 auto',
      }}
      key={item.id}
    >
      {imageMarkup}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h3>
          <Link to={`/products/${handle}`}>{title}</Link>
          <small>
            <Money data={price} className="Item__Price" />
          </small>
        </h3>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <QuantityControls
            line={{merchandiseId: merchandise.id, id: item.id}}
            quantity={quantity}
          />
          <CartAction cartInput={{lineIds: [id]}} action="LINES_REMOVE">
            {() => (
              <>
                <input
                  type="hidden"
                  name="optimistic-identifier"
                  value={merchandise.id || ''}
                />
                <input
                  type="hidden"
                  name="optimistic-data"
                  value={JSON.stringify({
                    type: 'remove',
                  })}
                />
                <button aria-label="Remove from cart">remove</button>
              </>
            )}
          </CartAction>
        </div>
        <div
          style={{
            padding: '10px 0',
            display: 'flex',
          }}
        >
          <Money
            data={{
              amount: item.cost.totalAmount.amount,
              currencyCode: item.cost.totalAmount.currencyCode,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CartFooter() {
  const cart = useCart();

  if (!cart) return null;

  const {checkoutUrl, cost} = cart;
  const {totalAmount} = cost;

  return (
    <footer
      style={{
        justifyContent: 'flex-end',
        display: 'flex',
        margin: 'auto',
        width: '100%',
        maxWidth: 800,
      }}
    >
      <div style={{padding: '0 20px'}}>
        Subtotal
        <Money
          className="Cart__SubtotalValue Heading--2"
          data={{
            amount: totalAmount?.amount,
            currencyCode: totalAmount?.currencyCode,
          }}
        />
      </div>

      <Link to={checkoutUrl}>
        <span className="Button__Target">Checkout</span>
      </Link>
    </footer>
  );
}

interface Props {
  line: CartLineUpdateInput;
  inverted?: boolean;
  outline?: boolean;
  quantity: number;
}

export function QuantityControls({quantity, line}: Props) {
  const optimisticData = useOptimisticDataFromActions(line?.merchandiseId);
  const optimisticQuantity = optimisticData
    ? (optimisticData.quantity as number)
    : quantity;

  return (
    <div style={{display: 'flex'}}>
      <CartAction
        cartInput={{lines: [{...line, quantity: optimisticQuantity - 1}]}}
        action="LINES_UPDATE"
      >
        {() => (
          <>
            <input
              type="hidden"
              name="optimistic-identifier"
              value={line?.merchandiseId || ''}
            />
            <input
              type="hidden"
              name="optimistic-data"
              value={JSON.stringify({
                quantity: optimisticQuantity - 1,
              })}
            />
            <button>-</button>
          </>
        )}
      </CartAction>
      <span style={{padding: '0 1em'}}>{optimisticQuantity}</span>
      <CartAction
        cartInput={{lines: [{...line, quantity: optimisticQuantity + 1}]}}
        action="LINES_UPDATE"
      >
        {() => (
          <>
            <input
              type="hidden"
              name="optimistic-identifier"
              value={line?.merchandiseId || ''}
            />
            <input
              type="hidden"
              name="optimistic-data"
              value={JSON.stringify({
                quantity: optimisticQuantity + 1,
              })}
            />
            <button>+</button>
          </>
        )}
      </CartAction>
    </div>
  );
}

function useOptimisticDataFromActions(identifier: string | undefined | null) {
  const fetchers = useFetchers();

  if (!identifier) return;
  const data: Record<string, unknown> = {};

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    if (formData && formData.get('optimistic-identifier') === identifier) {
      try {
        if (formData.has('optimistic-data')) {
          const dataInForm: unknown = JSON.parse(
            String(formData.get('optimistic-data')),
          );
          Object.assign(data, dataInForm);
        }
      } catch {
        // do nothing
      }
    }
  }
  return Object.keys(data).length ? data : undefined;
}
