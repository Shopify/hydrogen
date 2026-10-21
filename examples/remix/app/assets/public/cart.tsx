import {
  attachQuantityInput,
  createCartFormRegister,
  type CartData,
  type CartErrorGroup,
  type CartErrorState,
  type CartLine,
  type CartState,
} from "@shopify/hydrogen";
import { clientEntry, on, ref, type Handle } from "remix/component";

import type { CartInitialData } from "../../lib/cart.ts";
import { cartApiPath } from "../../lib/public/cart-routes.ts";
import { localizePath } from "../../lib/public/i18n.ts";
import { formatMoney } from "../../lib/public/money.ts";
import { AsideDialog, closeAsides } from "../../ui/public/aside.tsx";
import { Image } from "../../ui/public/image.tsx";
import { publishCartViewed } from "./analytics.ts";
import { getCartStore } from "./cart-store.ts";

const register = createCartFormRegister();
const GIFT_MESSAGE_ATTRIBUTE = "gift-message";
// Hydrogen's prefix for a new line's temporary ID (see `CartState["pending"]["lines"]`).
const OPTIMISTIC_LINE_ID_PREFIX = "optimistic:";

type CartLayout = "page" | "aside";

/** The cart drawer. It opens after add to cart and from the header's cart link. */
export const CartAside = clientEntry(
  import.meta.url,
  function CartAside(handle: Handle<{ initialData: CartInitialData; pathPrefix: string }>) {
    return () => (
      <AsideDialog type="cart" heading="CART">
        <CartMain
          initialData={handle.props.initialData}
          layout="aside"
          pathPrefix={handle.props.pathPrefix}
        />
      </AsideDialog>
    );
  },
);

/** The full `/cart` page. It server-renders the cart so it works before hydration. */
export const CartPage = clientEntry(
  import.meta.url,
  function CartPage(handle: Handle<{ initialData: CartInitialData; pathPrefix: string }>) {
    handle.queueTask((signal) => {
      const store = getCartStore(handle.props.initialData, handle.props.pathPrefix);
      if (!signal.aborted && store) publishCartViewed(store);
    });

    return () => (
      <CartMain
        initialData={handle.props.initialData}
        layout="page"
        pathPrefix={handle.props.pathPrefix}
      />
    );
  },
);

/**
 * Cart lines and summary, shared by the page and the drawer. Before hydration it renders
 * the server cart; after, it renders the live store, including optimistic changes.
 */
function CartMain(
  handle: Handle<{ initialData: CartInitialData; layout: CartLayout; pathPrefix: string }>,
) {
  const store = getCartStore(handle.props.initialData, handle.props.pathPrefix);
  let state = store?.getState();
  let sawPendingTotals = false;
  let dismissedErrorsAt = 0;

  if (store) {
    const unsubscribe = store.subscribe((next) => {
      state = next;
      handle.update();
    });
    handle.signal.addEventListener("abort", unsubscribe, { once: true });
  }

  return () => {
    const { layout, pathPrefix } = handle.props;
    // Before the store loads, render the server cart instead of an empty cart.
    const cart: CartData | null =
      state && !state.loading ? (state.data.id ? state.data : null) : handle.props.initialData.cart;
    const lines = cart?.lines.nodes ?? [];
    const totalsPending = Boolean(state?.pending.cost || state?.revalidating);
    if (totalsPending) sawPendingTotals = true;
    const hasNetworkErrors = Boolean(state?.errors.network.length);
    const statusMessage = totalsPending
      ? "Updating cart totals"
      : sawPendingTotals && !hasNetworkErrors
        ? "Cart totals updated"
        : "";
    const bannerMessages = state ? getBannerMessages(state.errors, lines) : [];
    const showBanner =
      bannerMessages.length > 0 && (state?.errors.lastUpdatedAt ?? 0) > dismissedErrorsAt;

    const topLevelLines = lines.filter((line) => !getParentLineId(line));
    const childLines = new Map<string, CartLine[]>();
    for (const line of lines) {
      const parentId = getParentLineId(line);
      if (parentId) childLines.set(parentId, [...(childLines.get(parentId) ?? []), line]);
    }

    return (
      <section
        class={`cart-main ${cart?.discountCodes.some((code) => code.applicable) ? "with-discount" : ""}`}
        aria-label={layout === "page" ? "Cart page" : "Cart drawer"}
        mix={on("submit", (event) => {
          if (!store) return;
          // With the store connected, cart forms run through Hydrogen's optimistic
          // store. Without JavaScript, the same forms post to the cart endpoint.
          event.preventDefault();
          store.handleFormSubmit(event).catch((error: unknown) => {
            if (error instanceof Error && error.name === "AbortError") return;
            console.error("[hydrogen] Cart update failed", error);
          });
        })}
      >
        <span role="status" class="sr-only">
          {statusMessage}
        </span>
        {showBanner ? (
          <div role="alert" class="cart-errors">
            {bannerMessages.map((message, index) => (
              <p key={`${message}-${index}`}>{message}</p>
            ))}
            <button
              type="button"
              class="reset"
              mix={on("click", () => {
                dismissedErrorsAt = state?.errors.lastUpdatedAt ?? Date.now();
                handle.update();
              })}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {state?.loading && !cart ? (
          <p aria-busy="true">Loading cart…</p>
        ) : lines.length === 0 ? (
          <CartEmpty layout={layout} pathPrefix={pathPrefix} />
        ) : null}
        {cart && lines.length > 0 ? (
          <div class="cart-details">
            <p id={`cart-lines-${layout}`} class="sr-only">
              Line items
            </p>
            <ul aria-labelledby={`cart-lines-${layout}`}>
              {topLevelLines.map((line) => (
                <CartLineItem
                  key={line.id}
                  childLines={childLines.get(line.id) ?? []}
                  layout={layout}
                  line={line}
                  pathPrefix={pathPrefix}
                  state={state}
                />
              ))}
            </ul>
            <CartSummary
              cart={cart}
              layout={layout}
              pathPrefix={pathPrefix}
              state={state}
              totalsPending={totalsPending}
            />
          </div>
        ) : null}
      </section>
    );
  };
}

function CartEmpty(handle: Handle<{ layout: CartLayout; pathPrefix: string }>) {
  return () => (
    <div>
      <br />
      <p>Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you started!</p>
      <br />
      <a
        href={localizePath("/collections", handle.props.pathPrefix)}
        mix={handle.props.layout === "aside" ? on("click", closeAsides) : undefined}
      >
        Continue shopping →
      </a>
    </div>
  );
}

function CartLineItem(
  handle: Handle<{
    childLines: CartLine[];
    layout: CartLayout;
    line: CartLine;
    pathPrefix: string;
    state: CartState | undefined;
  }>,
) {
  return () => {
    const { childLines, layout, line, pathPrefix, state } = handle.props;
    const merchandise = line.merchandise;
    if (!merchandise) return null;

    const pending = state?.pending.lines.has(line.id) ?? false;
    const errors = errorMessages(state?.errors.lines.get(line.id));
    const errorId = `cart-line-${layout}-${encodeURIComponent(line.id)}-errors`;
    const productUrl = productPath(
      merchandise.product.handle ?? "",
      merchandise.selectedOptions ?? [],
      pathPrefix,
    );

    return (
      <li class="cart-line" aria-busy={pending || undefined}>
        <div class="cart-line-inner">
          {merchandise.image ? (
            <Image
              data={merchandise.image}
              alt={merchandise.title}
              width={100}
              height={100}
              loading="lazy"
            />
          ) : null}
          <div>
            <a href={productUrl} mix={layout === "aside" ? on("click", closeAsides) : undefined}>
              <p>
                <strong>{merchandise.product.title}</strong>
              </p>
            </a>
            <p class={pending ? "pending" : undefined}>{formatMoney(line.cost.totalAmount)}</p>
            {merchandise.title && merchandise.title !== "Default Title" ? (
              <p>
                <small>{merchandise.title}</small>
              </p>
            ) : null}
            {(line.attributes ?? [])
              .filter((attribute) => !attribute.key.startsWith("_"))
              .map((attribute) => (
                <p key={attribute.key}>
                  <small>
                    {attribute.key}: {attribute.value}
                  </small>
                </p>
              ))}
            {childLines.length ? (
              <ul
                class="cart-line-children"
                aria-label={`Line items with ${merchandise.product.title}`}
              >
                {childLines.map((child) => (
                  <CartLineItem
                    key={child.id}
                    childLines={[]}
                    layout={layout}
                    line={child}
                    pathPrefix={pathPrefix}
                    state={state}
                  />
                ))}
              </ul>
            ) : null}
            <CartLineQuantity
              errorId={errorId}
              hasErrors={errors.length > 0}
              line={line}
              pathPrefix={pathPrefix}
              pending={pending}
            />
            {errors.length ? (
              <div id={errorId} role="alert">
                {errors.map((message, index) => (
                  <p key={`${message}-${index}`}>{message}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </li>
    );
  };
}

/**
 * One form per line, following Hydrogen's progressive-enhancement contract: the hidden
 * `set` button comes first so Enter (or a change) in the quantity input sets the
 * quantity, and the decrease, increase, and remove buttons are extra submitters.
 */
function CartLineQuantity(
  handle: Handle<{
    errorId: string;
    hasErrors: boolean;
    line: CartLine;
    pathPrefix: string;
    pending: boolean;
  }>,
) {
  // Remix inputs with a `value` are controlled, so typing goes through a local draft.
  // The draft yields to the store once the line's quantity or pending state changes.
  let draft: string | undefined;
  let draftQuantity: number | undefined;
  let wasPending = false;

  return () => {
    const { errorId, hasErrors, line, pathPrefix, pending } = handle.props;
    if (draft !== undefined && (line.quantity !== draftQuantity || (wasPending && !pending))) {
      draft = undefined;
    }
    wasPending = pending;
    // A just-added line has a temporary ID until the server confirms it, so the cart
    // endpoint can't change it yet.
    const isOptimistic = line.id.startsWith(OPTIMISTIC_LINE_ID_PREFIX);

    return (
      <form action={cartApiPath(pathPrefix)} method="post" class="cart-line-quantity">
        <button {...register("set")}>Update quantity</button>
        <input type="hidden" {...register("lineId", { value: line.id })} />
        <label>
          <small>Quantity:&nbsp;</small>
          <input
            {...register("quantity", { value: draft ?? line.quantity, interactive: true })}
            size={3}
            readOnly={isOptimistic}
            class={pending ? "pending" : undefined}
            aria-invalid={hasErrors || undefined}
            aria-describedby={hasErrors ? errorId : undefined}
            mix={[
              ref((input, signal) => {
                if (!input.form) return;
                // Submits the hidden `set` button when the quantity changes.
                const detach = attachQuantityInput(input, input.form);
                signal.addEventListener("abort", detach, { once: true });
              }),
              on("input", (event) => {
                draft = event.currentTarget.value;
                draftQuantity = line.quantity;
                handle.update();
              }),
            ]}
          />
        </label>
        &nbsp;
        <button
          type="submit"
          aria-label="Decrease quantity"
          disabled={isOptimistic}
          {...register("decrease")}
        >
          <span>&#8722;</span>
        </button>
        &nbsp;
        <button
          type="submit"
          aria-label="Increase quantity"
          disabled={isOptimistic}
          {...register("increase")}
        >
          <span>&#43;</span>
        </button>
        &nbsp;
        <button type="submit" disabled={pending || isOptimistic} {...register("remove")}>
          Remove
        </button>
      </form>
    );
  };
}

function CartSummary(
  handle: Handle<{
    cart: CartData;
    layout: CartLayout;
    pathPrefix: string;
    state: CartState | undefined;
    totalsPending: boolean;
  }>,
) {
  return () => {
    const { cart, layout, pathPrefix, state, totalsPending } = handle.props;
    const summaryId = `cart-summary-${layout}`;

    return (
      <div
        aria-labelledby={summaryId}
        class={layout === "page" ? "cart-summary-page" : "cart-summary-aside"}
      >
        <h4 id={summaryId}>Totals {totalsPending ? <span>(updating)</span> : null}</h4>
        <div aria-label="Subtotal" aria-busy={totalsPending} role="group">
          <dl class="cart-subtotal">
            <dt>Subtotal</dt>
            <dd class={totalsPending ? "pending" : undefined}>
              {cart.cost.subtotalAmount.amount ? formatMoney(cart.cost.subtotalAmount) : "-"}
            </dd>
          </dl>
        </div>
        <CartDiscounts cart={cart} layout={layout} pathPrefix={pathPrefix} state={state} />
        <CartGiftMessage cart={cart} layout={layout} pathPrefix={pathPrefix} state={state} />
        {cart.checkoutUrl ? (
          <div>
            <a href={cart.checkoutUrl} target="_self">
              <p>Continue to Checkout &rarr;</p>
            </a>
            <br />
          </div>
        ) : null}
      </div>
    );
  };
}

function CartDiscounts(
  handle: Handle<{
    cart: CartData;
    layout: CartLayout;
    pathPrefix: string;
    state: CartState | undefined;
  }>,
) {
  return () => {
    const { cart, layout, pathPrefix, state } = handle.props;
    const headingId = `cart-discounts-${layout}`;
    const inputId = `cart-discount-code-${layout}`;
    const action = cartApiPath(pathPrefix);

    return (
      <section aria-label="Discounts">
        {cart.discountCodes.length ? (
          <dl>
            <div>
              <dt id={headingId}>Discounts</dt>
              {cart.discountCodes.map(({ applicable, code }) => {
                const pending = state?.pending.discountCodes.has(code) ?? false;
                const errors = errorMessages(state?.errors.discountCodes.get(code));
                return (
                  <form key={code} action={action} method="post">
                    <input type="hidden" {...register("discountCode", { value: code })} />
                    <div class="cart-discount" role="group" aria-labelledby={headingId}>
                      <code class={pending ? "pending" : undefined}>{code}</code>
                      {applicable ? null : <small>&nbsp;(not applicable)</small>}
                      &nbsp;
                      <button
                        type="submit"
                        aria-label={`Remove discount ${code}`}
                        {...register("discount-remove")}
                      >
                        Remove
                      </button>
                    </div>
                    {errors.length ? (
                      <div role="alert">
                        {errors.map((message, index) => (
                          <p key={`${message}-${index}`}>{message}</p>
                        ))}
                      </div>
                    ) : null}
                  </form>
                );
              })}
            </div>
          </dl>
        ) : null}
        <form
          action={action}
          method="post"
          mix={on("submit", (event) => {
            // Skip empty and duplicate codes before they reach the cart store.
            const code = String(new FormData(event.currentTarget).get("discountCode") ?? "").trim();
            if (!code || cart.discountCodes.some((discount) => discount.code === code)) {
              event.preventDefault();
              event.stopPropagation();
            }
          })}
        >
          <label for={inputId} class="sr-only">
            Discount code
          </label>
          <input
            id={inputId}
            type="text"
            placeholder="Discount code"
            {...register("discountCode", { defaultValue: "" })}
          />
          &nbsp;
          <button type="submit" aria-label="Apply discount code" {...register("discount-apply")}>
            Apply
          </button>
        </form>
      </section>
    );
  };
}

/**
 * A cart attribute editor. Attribute updates replace the whole list, so the form resubmits
 * every unrelated attribute as a hidden field.
 */
function CartGiftMessage(
  handle: Handle<{
    cart: CartData;
    layout: CartLayout;
    pathPrefix: string;
    state: CartState | undefined;
  }>,
) {
  return () => {
    const { cart, layout, pathPrefix, state } = handle.props;
    const inputId = `cart-gift-message-${layout}`;
    const errorId = `${inputId}-errors`;
    const pending = state?.pending.attributes ?? false;
    const errors = errorMessages(state?.errors.attributes.get(GIFT_MESSAGE_ATTRIBUTE));
    const giftMessage =
      cart.attributes.find(({ key }) => key === GIFT_MESSAGE_ATTRIBUTE)?.value ?? "";

    return (
      <form action={cartApiPath(pathPrefix)} method="post" class="cart-attribute">
        {cart.attributes
          .filter(({ key }) => key !== GIFT_MESSAGE_ATTRIBUTE)
          .map(({ key, value }) => (
            <input
              key={key}
              type="hidden"
              {...register("attributeValue", { key, value: value ?? "" })}
            />
          ))}
        <label for={inputId}>Gift message</label>
        <textarea
          id={inputId}
          rows={3}
          placeholder="Add a message for the recipient"
          aria-invalid={errors.length > 0 || undefined}
          aria-describedby={errors.length ? errorId : undefined}
          {...register("attributeValue", {
            key: GIFT_MESSAGE_ATTRIBUTE,
            defaultValue: giftMessage,
          })}
        />
        {errors.length ? (
          <div id={errorId} role="alert">
            {errors.map((message, index) => (
              <p key={`${message}-${index}`}>{message}</p>
            ))}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          {...register("attributes-update")}
        >
          {pending ? "Saving…" : "Save message"}
        </button>
      </form>
    );
  };
}

function productPath(
  handle: string,
  selectedOptions: Array<{ name: string; value: string }>,
  pathPrefix: string,
) {
  const params = new URLSearchParams(selectedOptions.map(({ name, value }) => [name, value]));
  const query = params.size ? `?${params}` : "";
  return localizePath(`/products/${encodeURIComponent(handle)}${query}`, pathPrefix);
}

function getParentLineId(line: CartLine): string | undefined {
  const parent = (line as { parentRelationship?: { parent?: { id?: string } } | null })
    .parentRelationship?.parent;
  return parent?.id;
}

function errorMessages(group: CartErrorGroup | undefined): string[] {
  if (!group) return [];
  return [...group.userErrors, ...group.warnings].map(({ message }) => message);
}

/** Errors without an inline home: transport failures, cart-level errors, removed lines. */
function getBannerMessages(errors: CartErrorState, lines: CartLine[]): string[] {
  const lineIds = new Set(lines.map((line) => line.id));
  const messages = [
    ...errors.network.map(({ message }) => message),
    ...errorMessages(errors.cart),
    ...errorMessages(errors.note),
  ];
  for (const [lineId, group] of errors.lines) {
    if (!lineIds.has(lineId)) messages.push(...errorMessages(group));
  }
  return [...new Set(messages)];
}
