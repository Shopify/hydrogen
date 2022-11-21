import clsx from 'clsx';
import {useRef} from 'react';
import {useScroll} from 'react-use';
import {flattenConnection, Image, Money} from '@shopify/hydrogen-react';
import {
  type FetcherWithComponents,
  useFetcher,
  useLocation,
} from '@remix-run/react';
import {Button, Heading, IconRemove, Text, Link} from '~/components';
import type {
  Cart,
  CartCost,
  CartLine,
} from '@shopify/hydrogen-react/storefront-api-types';
import {useOptimisticLinesAdd} from '~/routes/__resources/cart/LinesAdd';
import {
  LinesRemoveForm,
  useLinesRemove,
  useOptimisticLineRemove,
} from '~/routes/__resources/cart/LinesRemove';
import {FeaturedProducts} from '~/components/FeaturedProducts';

enum Action {
  SetQuantity = 'set-quantity',
}

type Layouts = 'page' | 'drawer';

export function Cart({
  layout,
  onClose,
  cart,
}: {
  layout: Layouts;
  onClose?: () => void;
  cart: Cart | null;
}) {
  const linesCount = cart?.lines?.edges?.length || 0;
  const {linesAdding} = useOptimisticLinesAdd();
  const {linesRemoving} = useLinesRemove();
  const addingFirstLine = Boolean(linesCount === 0 && linesAdding.length);
  const removingLastLine = Boolean(linesCount === 1 && linesRemoving.length);

  // a lines condition based on optimistic lines
  const hasLines = Boolean(
    (linesCount || addingFirstLine) && !removingLastLine,
  );

  return (
    <>
      <CartEmpty hidden={hasLines} onClose={onClose} layout={layout} />
      <CartDetails cart={cart} layout={layout} />
    </>
  );
}

export function CartDetails({
  layout,
  cart,
}: {
  layout: Layouts;
  cart: Cart | null;
}) {
  // @todo: get optimistic cart cost
  const isZeroCost = !cart || cart?.cost?.subtotalAmount?.amount === '0.0';

  const container = {
    drawer: 'grid grid-cols-1 h-screen-no-nav grid-rows-[1fr_auto]',
    page: 'w-full pb-12 grid md:grid-cols-2 md:items-start gap-8 md:gap-8 lg:gap-12',
  };

  return (
    <div className={container[layout]}>
      <CartLines lines={cart?.lines} layout={layout} />
      {!isZeroCost && (
        <CartSummary cost={cart.cost} layout={layout}>
          <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
        </CartSummary>
      )}
    </div>
  );
}

function CartLines({
  layout = 'drawer',
  lines: cartLines,
}: {
  layout: Layouts;
  lines: Cart['lines'] | undefined;
}) {
  const currentLines = cartLines ? flattenConnection(cartLines) : [];
  const {optimisticLinesAdd} = useOptimisticLinesAdd(currentLines);

  const scrollRef = useRef(null);
  const {y} = useScroll(scrollRef);
  const lineItemFetcher = useFetcher();

  const className = clsx([
    y > 0 ? 'border-t' : '',
    layout === 'page'
      ? 'flex-grow md:translate-y-4'
      : 'px-6 pb-6 sm-max:pt-2 overflow-auto transition md:px-12',
  ]);

  return (
    <section
      ref={scrollRef}
      aria-labelledby="cart-contents"
      className={className}
    >
      <ul className="grid gap-6 md:gap-10">
        {optimisticLinesAdd.map((line) => {
          return (
            <CartLineItem
              key={line.id}
              line={line as CartLine}
              fetcher={lineItemFetcher}
              optimistic
            />
          );
        })}
        {currentLines.map((line) => {
          return (
            <CartLineItem
              key={line.id}
              line={line as CartLine}
              fetcher={lineItemFetcher}
            />
          );
        })}
      </ul>
    </section>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl: string}) {
  if (!checkoutUrl) return null;

  return (
    <div className="flex flex-col">
      <a href={checkoutUrl} target="_self">
        <Button as="span" width="full">
          Continue to Checkout
        </Button>
      </a>
      {/* @todo: <CartShopPayButton cart={cart} /> */}
    </div>
  );
}

function CartSummary({
  cost,
  layout,
  children = null,
}: {
  children?: React.ReactNode;
  cost: CartCost;
  layout: Layouts;
}) {
  const summary = {
    drawer: 'grid gap-6 p-6 border-t md:px-12',
    page: 'sticky top-nav grid gap-6 p-4 md:px-6 md:translate-y-4 bg-primary/5 rounded w-full',
  };

  return (
    <section aria-labelledby="summary-heading" className={summary[layout]}>
      <h2 id="summary-heading" className="sr-only">
        Order summary
      </h2>
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
      {children}
    </section>
  );
}

function CartLineItem({
  line,
  fetcher,
  optimistic = false,
}: {
  line: CartLine;
  fetcher: FetcherWithComponents<any>;
  optimistic?: boolean;
}) {
  const {id: lineId, quantity, merchandise} = line;
  const {optimisticLineRemove} = useOptimisticLineRemove(line);
  let optimisticQuantity = quantity;

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
    }
  }

  return (
    <li
      key={lineId}
      className={clsx(['flex gap-4', optimisticLineRemove ? 'hidden' : ''])}
    >
      <div className="flex-shrink">
        {merchandise.image && (
          <Image
            width={220}
            height={220}
            data={merchandise.image}
            className="object-cover object-center w-24 h-24 border rounded md:w-28 md:h-28"
            alt={merchandise.title}
          />
        )}
      </div>

      <div className="flex justify-between flex-grow">
        <div className="grid gap-2">
          <Heading as="h3" size="copy">
            {merchandise?.product?.handle ? (
              <Link to={`/products/${merchandise.product.handle}`}>
                {merchandise?.product?.title || ''}
              </Link>
            ) : (
              <Text>{merchandise?.product?.title || ''}</Text>
            )}
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
                optimistic={optimistic}
              />
            </div>
            <CartLineRemove lineIds={[lineId]} />
          </div>
        </div>
        <Text>
          <CartLinePrice line={line} as="span" />
        </Text>
      </div>
    </li>
  );
}

function CartLineRemove({lineIds}: {lineIds: CartLine['id'][]}) {
  return (
    <LinesRemoveForm lineIds={lineIds}>
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
  );
}

function CartLineQuantityAdjust({
  lineId,
  quantity,
  fetcher,
  optimistic,
}: {
  optimistic: boolean;
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
          disabled={quantity <= 1 || optimistic}
          className="w-10 h-10 transition text-primary/50 hover:text-primary disabled:text-primary/10"
        >
          &#8722;
        </button>
        <div className="px-2 w-8 text-center">{quantity}</div>
        <button
          name="quantity"
          value={(quantity + 1).toFixed(0)}
          aria-label="Increase quantity"
          className="w-10 h-10 transition text-primary/50 hover:text-primary"
          disabled={optimistic}
        >
          &#43;
        </button>
      </fetcher.Form>
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
  if (!line?.cost?.totalAmount) return null;

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
  layout = 'drawer',
  onClose,
}: {
  hidden: boolean;
  layout?: Layouts;
  onClose?: () => void;
}) {
  const scrollRef = useRef(null);
  const {y} = useScroll(scrollRef);

  const container = {
    drawer: clsx([
      'content-start gap-4 px-6 pb-8 transition overflow-y-scroll md:gap-12 md:px-12 h-screen-no-nav md:pb-12',
      y > 0 ? 'border-t' : '',
    ]),
    page: clsx([
      hidden ? '' : 'grid',
      `pb-12 w-full md:items-start gap-4 md:gap-8 lg:gap-12`,
    ]),
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
        <FeaturedProducts
          count={4}
          heading="Shop Best Sellers"
          layout={layout}
          onClose={onClose}
          sortKey="BEST_SELLING"
        />
      </section>
    </div>
  );
}
