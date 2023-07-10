import {CartForm, Image, Money} from '@shopify/hydrogen';
import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import {Link} from '@remix-run/react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

type CartMainProps = {
  layout: 'page' | 'aside';
  cart: CartApiQueryFragment | null;
};

type CartLine = CartApiQueryFragment['lines']['nodes'][0];

export function CartMain({layout, cart}: CartMainProps) {
  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);

  return (
    <>
      <CartEmpty hidden={linesCount} layout={layout} />
      <CartDetails cart={cart} layout={layout} />
    </>
  );
}

export function CartDetails({layout, cart}: CartMainProps) {
  const cartHasItems = !!cart && cart.totalQuantity > 0;

  return (
    <div>
      <CartLines lines={cart?.lines} layout={layout} />
      {cartHasItems && (
        <CartSummary cost={cart.cost} layout={layout}>
          <CartDiscounts discountCodes={cart.discountCodes} />
          <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
        </CartSummary>
      )}
    </div>
  );
}

function CartDiscounts({
  discountCodes,
}: {
  discountCodes: CartApiQueryFragment['discountCodes'];
}) {
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <>
      {/* Have existing discount, display it with a remove option */}
      <dl className={codes && codes.length !== 0 ? 'grid' : 'hidden'}>
        <div>
          <dt>Discount(s)</dt>
          <div>
            <UpdateDiscountForm>
              <button>Remove</button>
            </UpdateDiscountForm>
            <dd>{codes?.join(', ')}</dd>
          </div>
        </div>
      </dl>

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm discountCodes={codes}>
        <div>
          <input type="text" name="discountCode" placeholder="Discount code" />
          <button>Apply Discount</button>
        </div>
      </UpdateDiscountForm>
    </>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

function CartLines({
  layout = 'aside',
  lines,
}: {
  layout: CartMainProps['layout'];
  lines: CartApiQueryFragment['lines'] | undefined;
}) {
  if (!lines) return null;
  return (
    <div aria-labelledby="cart-contents">
      <ul>
        {lines.nodes.map((line) => (
          <CartLineItem key={line.id} line={line as CartLine} />
        ))}
      </ul>
    </div>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl: string}) {
  if (!checkoutUrl) return null;

  return (
    <div>
      <a href={checkoutUrl} target="_self">
        Continue to Checkout
      </a>
    </div>
  );
}

function CartSummary({
  cost,
  layout,
  children = null,
}: {
  children?: React.ReactNode;
  cost: CartApiQueryFragment['cost'];
  layout: CartMainProps['layout'];
}) {
  return (
    <div aria-labelledby="summary-heading">
      <h2 id="summary-heading">Order summary</h2>
      <dl>
        <div className="flex items-center justify-between font-medium">
          <dt>Subtotal</dt>
          <dd>
            {cost?.subtotalAmount?.amount ? (
              <Money data={cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </dd>
        </div>
      </dl>
      {children}
    </div>
  );
}

function CartLineItem({
  line,
}: {
  line: CartApiQueryFragment['lines']['nodes'][0];
}) {
  const {id, quantity, merchandise} = line;
  if (typeof quantity === 'undefined' || !merchandise?.product) return null;

  return (
    <li key={id}>
      <div>
        {merchandise.image && (
          <Image
            alt={merchandise.title}
            // FIX: replace className
            className="object-cover object-center w-24 h-24 border rounded md:w-28 md:h-28"
            data={merchandise.image}
            height={110}
            width={110}
          />
        )}
      </div>

      <div>
        <div>
          <h3>
            {merchandise?.product?.handle ? (
              <Link to={`/products/${merchandise.product.handle}`}>
                {merchandise?.product?.title || ''}
              </Link>
            ) : (
              <p>{merchandise?.product?.title || ''}</p>
            )}
          </h3>

          <div>
            {(merchandise?.selectedOptions || []).map((option) => (
              <p key={option.name}>
                {option.name}: {option.value}
              </p>
            ))}
          </div>

          <div>
            <div>
              <CartLineQuantityAdjust line={line} />
            </div>
            <ItemRemoveButton lineIds={[id]} />
          </div>
        </div>
        <p>
          <CartLinePrice line={line} as="span" />
        </p>
      </div>
    </li>
  );
}

function ItemRemoveButton({lineIds}: {lineIds: string[]}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button type="submit">Remove</button>
    </CartForm>
  );
}

function CartLineQuantityAdjust({
  line,
}: {
  line: CartApiQueryFragment['lines']['nodes'][0];
}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <>
      <label htmlFor={`quantity-${lineId}`} className="sr-only">
        Quantity, {quantity}
      </label>
      <div>
        <UpdateCartButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
            name="decrease-quantity"
            value={prevQuantity}
          >
            <span>&#8722;</span>
          </button>
        </UpdateCartButton>

        <p>{quantity}</p>

        <UpdateCartButton lines={[{id: lineId, quantity: nextQuantity}]}>
          <button
            aria-label="Increase quantity"
            name="increase-quantity"
            value={nextQuantity}
          >
            <span>&#43;</span>
          </button>
        </UpdateCartButton>
      </div>
    </>
  );
}

function UpdateCartButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

function CartLinePrice({
  line,
  priceType = 'regular',
  ...passthroughProps
}: {
  line: CartLine;
  priceType?: 'regular' | 'compareAt';
  [key: string]: any;
}) {
  if (!line?.cost?.amountPerQuantity || !line?.cost?.totalAmount) return null;

  const moneyV2 =
    priceType === 'regular'
      ? line.cost.totalAmount
      : line.cost.compareAtAmountPerQuantity;

  if (moneyV2 == null) {
    return null;
  }

  return <Money withoutTrailingZeros {...passthroughProps} data={moneyV2} />;
}

export function CartEmpty({
  hidden = false,
  layout = 'aside',
}: {
  hidden: boolean;
  layout?: CartMainProps['layout'];
}) {
  return (
    <div hidden={hidden}>
      <p>
        Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
        started!
      </p>
      <button>Continue shopping</button>
    </div>
  );
}
