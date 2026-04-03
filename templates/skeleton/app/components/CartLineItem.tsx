import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {
  href,
  Link,
  useActionData,
  useFetcher,
  type FetcherWithComponents,
} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {action as cartAction} from '~/routes/cart';
import {useCallback, useEffect, useMemo, useRef} from 'react';

type CartActionResponse = Awaited<typeof useActionData<typeof cartAction>>;
export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * If the line is a parent line that has child components (like warranties or gift wrapping), they are
 * rendered nested below the parent line.
 */
export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  return (
    <li key={id} className="cart-line">
      <div className="cart-line-inner">
        {image && (
          <Image
            alt={title}
            aspectRatio="1/1"
            data={image}
            height={100}
            loading="lazy"
            width={100}
          />
        )}

        <div>
          <Link
            prefetch="intent"
            to={lineItemUrl}
            onClick={() => {
              if (layout === 'aside') {
                close();
              }
            }}
          >
            <p>
              <strong>{product.title}</strong>
            </p>
          </Link>
          <ProductPrice price={line?.cost?.totalAmount} />
          <ul>
            {selectedOptions.map((option) => (
              <li key={option.name}>
                <small>
                  {option.name}: {option.value}
                </small>
              </li>
            ))}
          </ul>
          <CartLineQuantity line={line} />
        </div>
      </div>

      {lineItemChildren ? (
        <div>
          <p id={childrenLabelId} className="sr-only">
            Line items with {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="cart-line-children">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 */
function CartLineQuantity({line}: {line: CartLine}) {
  if (!line || typeof line?.quantity === 'undefined') return null;

  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));
  return (
    <div className="cart-line-quantity">
      <span>Quantity: &nbsp;&nbsp;</span>
      <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
        <button
          aria-label="Decrease quantity"
          disabled={quantity <= 1 || !!isOptimistic}
          name="decrease-quantity"
          value={prevQuantity}
        >
          <span>&#8722; </span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineQuantityInput disabled={!!isOptimistic} line={line} />
      &nbsp;
      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
        >
          <span>&#43;</span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  lineIds,
  disabled,
}: {
  lineIds: string[];
  disabled: boolean;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button disabled={disabled} type="submit">
        Remove
      </button>
    </CartForm>
  );
}

function isTextChangingEvent(
  e: React.ChangeEvent<HTMLInputElement>,
): e is typeof e & {nativeEvent: InputEvent} {
  if (e.nativeEvent instanceof InputEvent) {
    if (
      e.nativeEvent.inputType === 'insertText' ||
      e.nativeEvent.inputType === 'deleteContentBackward' ||
      e.nativeEvent.inputType === 'deleteContentForward'
    ) {
      return true;
    }
  }

  return false;
}

function CartLineQuantityInput({
  line,
  disabled,
}: {
  line: CartLine;
  disabled: boolean;
}) {
  const fetcher = useFetcher({key: getUpdateKey([line.id])});
  const inputRef = useRef<HTMLInputElement>(null);

  const submitQuantity = useMemo(() => {
    let lastSubmittedValue: number = line.quantity;
    return async function submitQuantity(
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.KeyboardEvent<HTMLInputElement>,
      fetcher: FetcherWithComponents<CartActionResponse>,
      line: CartLine,
    ) {
      let value = e.currentTarget.valueAsNumber;
      /** we revert to a valid value if it was invalid */
      if (Number.isNaN(value) || value < 1) {
        e.currentTarget.value = line.quantity.toString();
        value = line.quantity;
      }
      /** we don't submit the same value twice */
      if (value === lastSubmittedValue) return;
      const formData = new FormData();
      lastSubmittedValue = value;
      formData.set(
        CartForm.INPUT_NAME,
        JSON.stringify({
          action: CartForm.ACTIONS.LinesUpdate,
          inputs: {lines: [{id: line.id, quantity: value}]},
        }),
      );
      await fetcher.submit(formData, {method: 'post', action: href('/cart')});
    };
  }, [line.quantity]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.value = line.quantity.toString();
  }, [line.quantity]);

  return (
    <input
      ref={inputRef}
      aria-label="Quantity"
      min={1}
      className="cart-line-quantity-input"
      disabled={disabled}
      type="number"
      defaultValue={line.quantity}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          void submitQuantity(e, fetcher, line);
        }
      }}
      onChange={(e) => {
        if (isTextChangingEvent(e)) return;
        void submitQuantity(e, fetcher, line);
      }}
      onBlur={(e) => {
        void submitQuantity(e, fetcher, line);
      }}
    />
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @param lineIds - line ids affected by the update
 * @returns
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
