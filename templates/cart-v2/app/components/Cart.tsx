// import React from 'react';
import {Image, Money, flattenConnection} from '@shopify/hydrogen';
import {Form, Link} from '@remix-run/react';
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

  if (!cart) return <CartEmpty />;

  const flattenedLines = flattenConnection(cart.lines);

  if (flattenedLines.length === 0) return <CartEmpty />;

  return (
    <div className="Cart">
      <h1>Cart</h1>
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

function CartItem({item, theme}: CartItemProps) {
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
        display: 'flex',
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
          <CartAction inputs={{lineIds: [id]}} action="LINES_REMOVE">
            {() => <button aria-label="Remove from cart">remove</button>}
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
  return (
    <div style={{display: 'flex'}}>
      <CartAction
        inputs={[{...line, quantity: quantity - 1}]}
        action="LINES_UPDATE"
      >
        {() => <button>-</button>}
      </CartAction>
      <span style={{padding: '0 1em'}}>{quantity}</span>
      <CartAction
        inputs={[{...line, quantity: quantity + 1}]}
        action="LINES_UPDATE"
      >
        {() => <button>+</button>}
      </CartAction>
    </div>
  );
}
