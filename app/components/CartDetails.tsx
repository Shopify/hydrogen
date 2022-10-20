import {useRef} from 'react';
import {useScroll} from 'react-use';
import {flattenConnection, Money} from '@shopify/hydrogen-ui-alpha';
import {
  type FetcherWithComponents,
  useFetcher,
  useLocation,
} from '@remix-run/react';

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
  ProductConnection,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

enum Action {
  SetQuantity = 'set-quantity',
  RemoveLineItem = 'remove-line-item',
}

export function CartDetails({
  layout,
  onClose,
  cart,
  fetcher,
}: {
  layout: 'drawer' | 'page';
  onClose?: () => void;
  cart: Cart;
  fetcher: FetcherWithComponents<any>;
}) {
  const lines = flattenConnection(cart?.lines ?? {});
  const scrollRef = useRef(null);
  const {y} = useScroll(scrollRef);
  const lineItemFetcher = useFetcher();

  const optimisticallyDeletingLastLine =
    lines.length === 1 &&
    lineItemFetcher.submission &&
    lineItemFetcher.submission.formData.get('intent') === Action.RemoveLineItem;

  if (lines.length === 0 || optimisticallyDeletingLastLine) {
    return <CartEmpty fetcher={fetcher} onClose={onClose} layout={layout} />;
  }

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
    <div className={container[layout]}>
      <section
        ref={scrollRef}
        aria-labelledby="cart-contents"
        className={`${content[layout]} ${y > 0 ? 'border-t' : ''}`}
      >
        <ul className="grid gap-6 md:gap-10">
          {lines.map((line) => {
            return (
              <CartLineItem
                fetcher={lineItemFetcher}
                key={line.id}
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
        <OrderSummary cost={cart.cost} />
        <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
      </section>
    </div>
  );
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

function OrderSummary({cost}: {cost: CartCost}) {
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

function CartLineItem({
  line,
  fetcher,
}: {
  line: CartLine;
  fetcher: FetcherWithComponents<any>;
}) {
  const {id: lineId, quantity, merchandise} = line;

  const location = useLocation();
  let optimisticQuantity = quantity;
  let optimisticallyDeleting = false;

  if (
    fetcher.submission &&
    fetcher.submission.formData.get('lineId') === lineId
  ) {
    switch (fetcher.submission.formData.get('intent')) {
      case Action.SetQuantity: {
        optimisticQuantity = Number(
          fetcher.submission.formData.get('quantity'),
        );
        break;
      }

      case Action.RemoveLineItem: {
        optimisticallyDeleting = true;
        break;
      }
    }
  }

  return optimisticallyDeleting ? null : (
    <li key={lineId} className="flex gap-4">
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
                fetcher={fetcher}
                lineId={lineId}
                quantity={optimisticQuantity}
              />
            </div>
            <fetcher.Form method="post" action="/cart">
              <input
                type="hidden"
                name="intent"
                value={Action.RemoveLineItem}
              />
              <input type="hidden" name="lineId" value={lineId} />
              <input
                type="hidden"
                name="redirect"
                value={location.pathname + location.search}
              />
              <button
                type="submit"
                className="flex items-center justify-center w-10 h-10 border rounded"
              >
                <span className="sr-only">Remove</span>
                <IconRemove aria-hidden="true" />
              </button>
            </fetcher.Form>
          </div>
        </div>
        <Text>
          <CartLinePrice line={line} as="span" />
        </Text>
      </div>
    </li>
  );
}

function CartLineQuantityAdjust({
  lineId,
  quantity,
  fetcher,
}: {
  lineId: string;
  quantity: number;
  fetcher: FetcherWithComponents<any>;
}) {
  const location = useLocation();

  return (
    <>
      <label htmlFor={`quantity-${lineId}`} className="sr-only">
        Quantity, {quantity}
      </label>
      <fetcher.Form
        method="post"
        action="/cart"
        className="flex items-center border rounded"
      >
        <input type="hidden" name="intent" defaultValue={Action.SetQuantity} />
        <input type="hidden" name="lineId" value={lineId} />
        <input
          type="hidden"
          name="redirect"
          value={location.pathname + location.search}
        />
        <button
          name="quantity"
          value={Math.max(0, quantity - 1).toFixed(0)}
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
          className="w-10 h-10 transition text-primary/50 hover:text-primary disabled:text-primary/10"
        >
          &#8722;
        </button>
        <div className="px-2 text-center">{quantity}</div>
        <button
          name="quantity"
          value={(quantity + 1).toFixed(0)}
          aria-label="Increase quantity"
          className="w-10 h-10 transition text-primary/50 hover:text-primary"
        >
          &#43;
        </button>
      </fetcher.Form>
    </>
  );
}

export function CartEmpty({
  onClose,
  layout = 'drawer',
  fetcher,
}: {
  onClose?: () => void;
  layout?: 'page' | 'drawer';
  fetcher: FetcherWithComponents<any>;
}) {
  const scrollRef = useRef(null);
  const {y} = useScroll(scrollRef);

  const container = {
    drawer: `grid content-start gap-4 px-6 pb-8 transition overflow-y-scroll md:gap-12 md:px-12 h-screen-no-nav md:pb-12 ${
      y > 0 ? 'border-t' : ''
    }`,
    page: `grid pb-12 w-full md:items-start gap-4 md:gap-8 lg:gap-12`,
  };

  const topProductsContainer = {
    drawer: '',
    page: 'md:grid-cols-4 sm:grid-col-4',
  };

  return (
    <div ref={scrollRef} className={container[layout]}>
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
        <div
          className={`grid grid-cols-2 gap-x-6 gap-y-8 ${topProductsContainer[layout]}`}
        >
          <TopProducts fetcher={fetcher} onClose={onClose} />
        </div>
      </section>
    </div>
  );
}

function TopProducts({
  fetcher,
  onClose,
}: {
  fetcher: FetcherWithComponents<any>;
  onClose?: () => void;
}) {
  if (!fetcher.data) {
    return <Loading />;
  }

  const products = flattenConnection(
    fetcher.data.topProducts as ProductConnection,
  );

  if (products.length === 0) {
    return <Text format>No products found.</Text>;
  }

  return (
    <>
      {products.map((product) => (
        <ProductCard
          product={product as Product}
          key={product.id}
          onClick={onClose}
        />
      ))}
    </>
  );
}

function Loading() {
  return (
    <>
      {[...new Array(4)].map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="grid gap-2">
          <Skeleton className="aspect-[3/4]" />
          <Skeleton className="w-32 h-4" />
        </div>
      ))}
    </>
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
  const moneyV2 =
    priceType === 'regular'
      ? line.cost.totalAmount
      : line.cost.compareAtAmountPerQuantity;

  if (moneyV2 == null) {
    return null;
  }

  return <Money {...passthroughProps} data={moneyV2} />;
}
