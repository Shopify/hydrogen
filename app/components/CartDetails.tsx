import clsx from 'clsx';
import {useRef} from 'react';
import {useScroll} from 'react-use';
import {flattenConnection, Money} from '@shopify/hydrogen-react';
import {
  Button,
  Heading,
  IconRemove,
  ProductCard,
  Skeleton,
  Text,
  Link,
} from '~/components';
import type {
  Cart,
  CartCost,
  CartLine,
  Product,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  LinesRemoveForm,
  useOptimisticLineRemove,
  useOptimisticLinesRemove,
} from '~/routes/__components/cart/LinesRemove';
import {
  LinesUpdateForm,
  useOptimisticLineUpdate,
} from '~/routes/__components/cart/LinesUpdate';
import {useOptimisticLinesAdd} from '~/routes/__components/cart/LinesAdd';
import {Products} from '~/routes/__components/GetProducts';

export function CartDetails({
  layout,
  onClose,
  cart,
}: {
  layout: 'drawer' | 'page';
  onClose?: () => void;
  cart: Cart;
}) {
  const scrollRef = useRef(null);
  const lines = flattenConnection(cart?.lines ?? {}) as CartLine[];
  const {y} = useScroll(scrollRef);
  const {optimisticLastLineRemove} = useOptimisticLinesRemove(lines);
  const {optimisticLinesAdd} = useOptimisticLinesAdd(lines);
  const isCartEmpty =
    (lines.length === 0 && !optimisticLinesAdd.length) ||
    optimisticLastLineRemove;

  const container = {
    drawer: 'grid grid-cols-1 h-screen-no-nav grid-rows-[1fr_auto]',
    page: 'pb-12 grid md:grid-cols-2 md:items-start gap-8 md:gap-8 lg:gap-12',
  };

  const content = {
    drawer: 'px-6 pb-6 sm-max:pt-2 overflow-auto transition md:px-12',
    page: 'flex-grow md:translate-y-4',
  };

  const summary = {
    drawer: 'grid gap-6 p-6 border-t md:px-12',
    page: 'sticky top-nav grid gap-6 p-4 md:px-6 md:translate-y-4 bg-primary/5 rounded w-full',
  };

  return (
    <>
      <CartEmpty hidden={!isCartEmpty} onClose={onClose} layout={layout} />
      <div className={container[layout]} hidden={isCartEmpty}>
        <section
          ref={scrollRef}
          aria-labelledby="cart-contents"
          className={`${content[layout]} ${y > 0 ? 'border-t' : ''}`}
        >
          {cart.discountCodes?.length ? (
            <p>Discount: {cart.discountCodes[0].code}</p>
          ) : null}
          <ul className="grid gap-6 md:gap-10">
            {/* Optimistic lines will be replaced with actual lines when ready */}
            {optimisticLinesAdd?.length
              ? optimisticLinesAdd.map((line) => (
                  <CartLineItem
                    key={line.merchandise.id}
                    optimistic
                    line={line as CartLine}
                  />
                ))
              : null}
            {lines.map((line) => {
              return (
                <CartLineItem
                  key={line.merchandise.id}
                  line={line as CartLine}
                />
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="summary-heading" className={summary[layout]}>
          <h2 id="summary-heading" className="sr-only">
            Order summary
          </h2>
          <CarSummary cost={cart.cost} />
          <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
        </section>
      </div>
    </>
  );
}

export function CartEmpty({
  onClose,
  layout = 'drawer',
  hidden = false,
}: {
  onClose?: () => void;
  layout?: 'page' | 'drawer';
  hidden?: boolean;
}) {
  const scrollRef = useRef(null);
  const {y} = useScroll(scrollRef);

  const container = {
    drawer: clsx([
      hidden ? 'hidden' : 'grid',
      'content-start gap-4 px-6 pb-8 transition overflow-y-scroll md:gap-12 md:px-12 h-screen-no-nav md:pb-12',
      y > 0 ? 'border-t' : '',
    ]),
    page: `grid pb-12 w-full md:items-start gap-4 md:gap-8 lg:gap-12`,
  };

  return (
    <div ref={scrollRef} className={container[layout]} hidden={hidden}>
      <section className="grid gap-6">
        <Text format>
          Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
          started!
        </Text>
        <div>
          <Button onClick={onClose}>Continue shopping</Button>
        </div>
      </section>
      <section className="grid gap-8 pt-4">
        <Heading format size="copy">
          Shop Best Sellers
        </Heading>
        <BestSellingProducts onClose={onClose} layout={layout} />
      </section>
    </div>
  );
}

function BestSellingProducts({
  onClose,
  layout,
}: {
  onClose?: () => void;
  layout: 'page' | 'drawer';
}) {
  const container = {
    drawer: '',
    page: 'md:grid-cols-4 sm:grid-col-4',
  };

  return (
    <Products count={4} sortKey="BEST_SELLING">
      {({products, count, state}) => {
        if (state === 'loading') {
          return (
            <>
              {[...new Array(count)].map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className="grid gap-2">
                  <Skeleton className="aspect-[3/4]" />
                  <Skeleton className="w-32 h-4" />
                </div>
              ))}
            </>
          );
        }

        if (products.length === 0) {
          return <Text format>No products found.</Text>;
        }

        return (
          <div
            className={clsx([
              `grid grid-cols-2 gap-x-6 gap-y-8`,
              container[layout],
            ])}
          >
            {products.map((product) => (
              <ProductCard
                product={product as Product}
                key={product.id}
                onClick={onClose}
              />
            ))}
          </div>
        );
      }}
    </Products>
  );
}

function CartLineItem({
  line,
  optimistic = false,
}: {
  line: CartLine;
  optimistic?: boolean;
}) {
  const {id: lineId, merchandise} = line;
  const {optimisticLineRemove} = useOptimisticLineRemove(line);
  const {optimisticLineUpdateQuantity} = useOptimisticLineUpdate(line);

  return (
    <li
      key={lineId}
      className={clsx([
        'flex gap-4',
        optimistic ? 'border border-primary/10' : 'border border-black/10',
        optimisticLineRemove ? 'hidden' : '',
      ])}
    >
      <div className="flex-shrink">
        {merchandise.image && (
          <img
            width={112}
            height={112}
            src={merchandise.image.url}
            className="object-cover object-center w-24 h-24 border rounded md:w-28 md:h-28"
            alt={merchandise.title}
          />
        )}
      </div>

      <div className="flex justify-between flex-grow">
        <div className="grid gap-2">
          <Heading as="h3" size="copy">
            <Link to={`/products/${merchandise.product.handle}`}>
              {merchandise.product.title}
            </Link>
          </Heading>

          <div className="grid pb-2">
            {(merchandise?.selectedOptions || []).map((option) => (
              <Text color="subtle" key={option.name}>
                {option.name}: {option.value}
              </Text>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex justify-start text-copy">
              <CartLineQuantityAdjust
                lineId={lineId}
                quantity={optimisticLineUpdateQuantity}
              />
            </div>
            <LinesRemoveForm
              lineIds={[lineId]}
              onSuccess={(event) => {
                console.log('Removed line(s)', event);
              }}
            >
              {({state}) => (
                <button
                  className="flex items-center justify-center w-10 h-10 border rounded"
                  type="submit"
                  disabled={state !== 'idle'}
                >
                  <span className="sr-only">
                    {state === 'loading' ? 'Removing' : 'Remove'}
                  </span>
                  <IconRemove aria-hidden="true" />
                </button>
              )}
            </LinesRemoveForm>
          </div>
        </div>
        <Text>
          <CartLinePrice cost={line.cost} as="span" />
        </Text>
      </div>
    </li>
  );
}

function CartLineQuantityAdjust({
  lineId,
  quantity,
}: {
  lineId: CartLine['id'];
  quantity: number;
}) {
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));
  return (
    <>
      <label htmlFor={`quantity-${lineId}`} className="sr-only">
        Quantity, {quantity}
      </label>
      <div className="flex items-center border rounded">
        <LinesUpdateForm
          lines={[{id: lineId, quantity: prevQuantity}]}
          onSuccess={(event) => {
            console.log('Reduced line quantity', event);
          }}
        >
          {({state, error}) => (
            <button
              name="decrease-quantity"
              aria-label="Decrease quantity"
              className="w-10 h-10 transition text-primary/50 hover:text-primary disabled:text-primary/10"
              value={prevQuantity}
              disabled={quantity <= 1}
            >
              <span>&#8722;</span>
            </button>
          )}
        </LinesUpdateForm>

        <div className="px-2 text-center">{quantity}</div>

        <LinesUpdateForm
          lines={[{id: lineId, quantity: nextQuantity}]}
          onSuccess={(event) => {
            console.log('Increased line quantity', event);
          }}
        >
          {({state, error}) => (
            <button
              className="w-10 h-10 transition text-primary/50 hover:text-primary"
              name="increase-quantity"
              value={nextQuantity}
              aria-label="Increase quantity"
            >
              <span>&#43;</span>
            </button>
          )}
        </LinesUpdateForm>
      </div>
    </>
  );
}

function CartLinePrice({
  cost,
  priceType = 'regular',
  ...passthroughProps
}: {
  cost: CartLine['cost'];
  priceType?: 'regular' | 'compareAt';
  [key: string]: any;
}) {
  const moneyV2 =
    priceType === 'regular'
      ? cost.totalAmount
      : cost.compareAtAmountPerQuantity;

  if (moneyV2 == null) {
    return null;
  }

  return <Money {...passthroughProps} data={moneyV2} />;
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl: string}) {
  return (
    <>
      <div className="grid gap-4">
        {checkoutUrl ? (
          <Link to={checkoutUrl} prefetch="intent" target="_self">
            <Button as="span" width="full">
              Continue to Checkout
            </Button>
          </Link>
        ) : null}
        {/* TODO: Shop Pay */}
        {/* <CartShopPayButton /> */}
      </div>
    </>
  );
}

function CarSummary({cost}: {cost: CartCost}) {
  return (
    <>
      <dl className="grid">
        <div className="flex items-center justify-between font-medium">
          <Text as="dt">Subtotal</Text>
          <Text as="dd">
            {cost?.subtotalAmount?.amount ? (
              <Money data={cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </Text>
        </div>
      </dl>
    </>
  );
}
