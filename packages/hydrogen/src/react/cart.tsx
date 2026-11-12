"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type FormHTMLAttributes,
  type ReactNode,
  type RefCallback,
  type SubmitEvent,
} from "react";

import { trackCartAnalytics } from "../core/analytics/cart-tracker";
import { attachQuantityInput } from "../core/cart/attach-quantity-input";
import {
  assertSellerHandle,
  configureCartEndpoint as configureCoreCartEndpoint,
  createCartStore,
  getSellerCartEndpoint,
  type CreateCartStoreOptions,
  type CartActions,
  type CartStore,
} from "../core/cart/cart";
import { createCartFormRegister, type CartFormRegister } from "../core/cart/form";
import { createSellerCarts, type CartsState, type SellerCarts } from "../core/cart/seller-carts";
import type { CartDataFromHandlers } from "../core/cart/server-handlers";
import { type CartData, type CartState } from "../core/cart/state";

const DEFAULT_CART_ENDPOINT = "/api/cart";
const NOOP = () => {};

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return typeof (value as { then?: unknown } | null | undefined)?.then === "function";
}

let cartEndpoint = DEFAULT_CART_ENDPOINT;

interface CartContextValue {
  store: CartStore;
  hydrationSnapshot: CartState;
  sellers: SellerCarts;
}

const CartContext = createContext<CartContextValue | null>(null);

export function configureCartEndpoint(endpoint: string): void {
  cartEndpoint = endpoint;
  configureCoreCartEndpoint(endpoint);
}

export function getCartEndpoint(): string {
  return cartEndpoint;
}

/**
 * Props for the cart provider that `createCartComponents` returns.
 */
type TypedCartProviderProps<TData extends CartData> = {
  /**
   * The `data` property of the cart GET handler's result, or a promise of that data. Without initial data, the store loads the cart from `/api/cart` after the provider mounts, and the server-rendered page shows an empty cart. The provider creates its store from the first value and ignores later changes.
   */
  initialData?: CartInitialData<TData>;
  /** Content that can read the cart through the cart hooks. */
  children?: ReactNode;
};

type CartInitialData<TData extends CartData = CartData> =
  CreateCartStoreOptions<TData>["initialData"];

export type { CartActions, CartsState };

/** Picks a seller's cart instead of your own store's cart. */
type SellerOptions = {
  /** The seller's handle, such as `my-shop` for `my-shop.myshopify.com`. Without a seller, the hook uses your own store's cart. */
  seller?: string;
};

/** Options for reading a cart with `useCart`. */
type CartSelectorOptions<S> = SellerOptions & {
  /** Compares the previous and next selected values. Return `true` to skip the re-render. Without the function, the hook compares the values by reference. */
  isEqual?: (a: S, b: S) => boolean;
};

/** A hook that returns the slice of your store's cart, or a seller's cart, that your selector picks. */
type CartHook<TData extends CartData> =
  /**
   * @param selector - Picks the value to return from the cart state.
   * @param isEqualOrOptions - The `isEqual` function, or options with the `seller` whose cart to read and the `isEqual` function. Return `true` from `isEqual` to skip the re-render. Without the function, the hook compares the values by reference.
   * @returns The selected value.
   */
  <S>(
    selector: (state: CartState<TData>) => S,
    isEqualOrOptions?: ((a: S, b: S) => boolean) | CartSelectorOptions<S>,
  ) => S;

/** A hook that returns the slice of every cart on the page that your selector picks. */
type CartsHook<TData extends CartData> =
  /**
   * @param selector - Picks the value to return from your store's cart and the seller carts.
   * @param isEqual - Compares the previous and next selected values. Return `true` to skip the re-render. Without the function, the hook compares the values by reference.
   * @returns The selected value.
   */
  <S>(selector: (carts: CartsState<TData>) => S, isEqual?: (a: S, b: S) => boolean) => S;

/** A hook that returns the slice of cart state that your selector picks. */
type CartStateHook<TData extends CartData> =
  /**
   * @param selector - Picks the value to return from the cart state.
   * @param isEqual - Compares the previous and next selected values. Return `true` to skip the re-render. Without the function, the hook compares the values by reference.
   * @returns The selected value.
   */
  <S>(selector: (state: CartState<TData>) => S, isEqual?: (a: S, b: S) => boolean) => S;

/** A hook that returns the slice of cart state that your selector picks, or `undefined` outside the cart provider. */
type OptionalCartStateHook<TData extends CartData> =
  /**
   * @param selector - Picks the value to return from the cart state.
   * @param isEqual - Compares the previous and next selected values. Return `true` to skip the re-render. Without the function, the hook compares the values by reference.
   * @returns The selected value, or `undefined` outside the cart provider.
   */
  <S>(selector: (state: CartState<TData>) => S, isEqual?: (a: S, b: S) => boolean) => S | undefined;

/** Callbacks that run around a cart form submission. */
interface CartFormPropsOptions {
  /** Runs before the cart store handles the submission. Call `event.preventDefault()` to skip the cart submission. */
  beforeSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
  /** Runs as soon as the cart change starts, before the server responds. */
  afterSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
}

/** The form props function and the register function for a cart form. */
interface CartFormBindings {
  /** Returns the `method`, `action`, and `onSubmit` props to spread on the form. The form posts to the cart endpoint, and the cart store handles each submission. */
  formProps: (opts?: CartFormPropsOptions) => FormHTMLAttributes<HTMLFormElement>;
  /** Returns the attributes for a cart field or action button. Register the quantity field with `interactive: true` to submit the form when the quantity changes. The interactive input takes the quantity as a default value and stays uncontrolled. */
  register: CartFormRegister;
}

/**
 * The cart provider and hooks that `createCartComponents` returns, typed with the custom cart fields from your cart server handlers.
 */
type TypedCartComponents<TData extends CartData> = {
  /** Creates the cart store and shares the store with the cart hooks inside the provider. The provider connects the store on mount and destroys the store on unmount. */
  CartProvider: (props: TypedCartProviderProps<TData>) => ReactNode;
  /**
   * Returns the slice of cart state that the selector picks. Pass `{ seller }` to read a seller's cart, which is empty until the seller's cart appears. The component re-renders when the selected value changes by reference, or when your `isEqual` function reports a change. A selector that returns the full state re-renders on every cart update.
   */
  useCart: CartHook<TData>;
  /** Returns the slice of your store's cart and every seller cart that the selector picks. The component re-renders when a seller cart appears or a cart changes. */
  useCarts: CartsHook<TData>;
  /** Suspends while the full cart loads, then returns the slice of cart state that the selector picks. Wrap the component in a `Suspense` boundary. */
  useSuspenseCart: CartStateHook<TData>;
  /**
   * Returns the slice of cart state that the selector picks, or `undefined` outside the provider. Use the hook in a component that also renders above the provider, such as a cart badge on an error page.
   */
  useOptionalCart: OptionalCartStateHook<TData>;
  /** Returns the `refresh()` action for your store's cart, or for a seller's cart with `{ seller }`. Call `refresh()` after a server-side cart change that skips cart forms. */
  useCartActions: typeof useCartActions;
  /** Returns form props and a register function for cart forms. Pass `{ seller }` to change a seller's cart. */
  useCartForm: typeof useCartForm;
};

/**
 * Returns a cart provider and cart hooks typed to the cart fragment in your cart server handlers.
 * Pass `typeof cartServerHandlers` as the `THandlers` type argument. Every hook's cart state then includes your custom cart fields.
 *
 * On mount, the provider sends cart requests to `/api/cart` and connects the store. Every hook except `useOptionalCart` throws when you call it outside the provider.
 *
 * @returns The cart provider, the cart state hooks, and the cart actions and form hooks.
 *
 * @example
 * ```tsx
 * import type { cartServerHandlers } from "./server/cart.server";
 *
 * const {
 *   CartProvider,
 *   useCart,
 *   useCarts,
 *   useSuspenseCart,
 *   useOptionalCart,
 *   useCartActions,
 *   useCartForm,
 * } = createCartComponents<typeof cartServerHandlers>();
 * ```
 * @publicDocs
 */
export function createCartComponents<THandlers>(): TypedCartComponents<
  CartDataFromHandlers<THandlers>
> {
  type TData = CartDataFromHandlers<THandlers>;

  function TypedCartProvider({ initialData, children }: TypedCartProviderProps<TData>) {
    return (
      <CartProvider initialData={initialData as CartInitialData | undefined}>
        {children}
      </CartProvider>
    );
  }

  function useTypedCart<S>(
    selector: (state: CartState<TData>) => S,
    isEqualOrOptions?: ((a: S, b: S) => boolean) | CartSelectorOptions<S>,
  ): S {
    return useCart<CartData, S>((state) => selector(state as CartState<TData>), isEqualOrOptions);
  }

  function useTypedCarts<S>(
    selector: (carts: CartsState<TData>) => S,
    isEqual?: (a: S, b: S) => boolean,
  ): S {
    return useCarts<CartData, S>((carts) => selector(carts as CartsState<TData>), isEqual);
  }

  function useTypedOptionalCart<S>(
    selector: (state: CartState<TData>) => S,
    isEqual?: (a: S, b: S) => boolean,
  ): S | undefined {
    return useOptionalCart<CartData, S>((state) => selector(state as CartState<TData>), isEqual);
  }

  function useSuspenseCart<S>(
    selector: (state: CartState<TData>) => S,
    isEqual?: (a: S, b: S) => boolean,
  ): S {
    return useSuspenseCartSelector(selector, isEqual);
  }

  return {
    CartProvider: TypedCartProvider,
    useCart: useTypedCart,
    useCarts: useTypedCarts,
    useSuspenseCart,
    useOptionalCart: useTypedOptionalCart,
    useCartActions,
    useCartForm,
  } as const;
}

export function useCartStore(hookName = "useCart"): CartStore {
  return useCartContext(hookName).store;
}

function useCartContext(hookName = "useCart"): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error(`${hookName} must be used inside <CartProvider>.`);
  return context;
}

function useOptionalCartContext(): CartContextValue | null {
  return useContext(CartContext);
}

/**
 * Creates a cart store and shares the store with the cart hooks inside the provider.
 *
 * Render every cart hook inside the provider. On mount, the provider sends cart requests to `/api/cart` and connects the store. On unmount, the provider destroys the store. The provider creates its store from the first initial data and ignores later changes.
 *
 * The provider also holds one store per seller. It creates seller stores from the `sellers` in the initial data, and when a seller's cart form submits or a seller's `refresh()` runs for the first time.
 *
 * @example
 * ```tsx
 * // In your root layout
 * <CartProvider initialData={{ cart: loaderData.cart }}>
 *   <App />
 * </CartProvider>
 * ```
 * @param props - The initial cart data and the content that uses the cart hooks.
 * @returns A context provider that shares the cart store with its children.
 * @publicDocs
 */
export function CartProvider({
  initialData,
  children,
}: {
  initialData?: CartInitialData;
  children?: ReactNode;
}) {
  const context = useMemo(() => {
    const store = createCartStore({ initialData });
    // Plain consumers must hydrate from the state used for SSR, even if the live store settles first.
    const hydrationSnapshot = store.getState();
    const syncSellers = isPromiseLike(initialData) ? undefined : initialData?.sellers;
    const sellers = createSellerCarts({ store, hydrationSnapshot }, syncSellers);
    if (isPromiseLike(initialData)) {
      Promise.resolve(initialData).then((data) => sellers.seed(data.sellers), NOOP);
    }
    return { store, hydrationSnapshot, sellers };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- provider initialData seeds one store for its lifetime
  }, []);
  const { store, sellers } = context;

  useEffect(() => {
    configureCoreCartEndpoint(cartEndpoint);
    store.connect();
    sellers.connect();
    return () => {
      store.destroy();
      sellers.destroy();
    };
  }, [store, sellers]);

  return <CartContext.Provider value={context}>{children}</CartContext.Provider>;
}

/**
 * Returns the slice of cart state that the selector picks.
 *
 * The component re-renders when the selected value changes by reference, or when your `isEqual` function reports a change. A selector that returns the full state re-renders on every cart update.
 *
 * Pass `{ seller }` to read a seller's cart. Until the seller's cart appears on the page, the selector receives an empty cart that isn't loading.
 *
 * @param selector The function that picks a value from the cart state.
 * @param isEqualOrOptions The function that compares the previous and next selected values, or options with the `seller` and the `isEqual` function. Return `true` from `isEqual` to skip the re-render.
 * @returns The selected value.
 *
 * @example
 * ```tsx
 * // Select cart lines
 * const lines = useCart((state) => state.data.lines.nodes);
 *
 * // Select pending state for a specific line
 * const isPending = useCart((state) => state.pending.lines.has(lineId));
 *
 * // Custom equality to avoid re-renders on unchanged totals
 * const total = useCart(
 *   (state) => state.data.cost.totalAmount,
 *   (a, b) => a.amount === b.amount,
 * );
 *
 * // Select a seller's cart lines
 * const sellerLines = useCart((state) => state.data.lines.nodes, { seller: "my-shop" });
 * ```
 * @publicDocs
 */
export function useCart<TData extends CartData = CartData, S = unknown>(
  selector: (state: CartState<TData>) => S,
  isEqualOrOptions?: ((a: S, b: S) => boolean) | CartSelectorOptions<S>,
): S {
  const { store, hydrationSnapshot, sellers } = useCartContext();
  const { seller, isEqual } =
    typeof isEqualOrOptions === "function"
      ? { seller: undefined, isEqual: isEqualOrOptions }
      : (isEqualOrOptions ?? {});
  const source = useMemo(
    () => (seller === undefined ? store : sellers.source(seller)),
    [store, sellers, seller],
  );
  const snapshot = seller === undefined ? hydrationSnapshot : sellers.getHydrationSnapshot(seller);
  return useCartSelector(source, snapshot, selector, isEqual) as S;
}

/**
 * Returns the slice of every cart on the page that the selector picks: your store's cart and one cart per seller.
 *
 * Sellers keep the order in which their carts first appeared. The component re-renders when a seller cart appears, or when the selected value changes by reference or your `isEqual` function reports a change. Never add money across carts: each seller has its own checkout and currency.
 *
 * @param selector The function that picks a value from the carts.
 * @param isEqual The function that compares the previous and next selected values. Return `true` to skip the re-render.
 * @returns The selected value.
 *
 * @example
 * ```tsx
 * // Count items across every cart
 * const count = useCarts(
 *   ({ home, sellers }) =>
 *     sellers.reduce((total, { state }) => total + state.data.totalQuantity, home.data.totalQuantity),
 * );
 * ```
 * @publicDocs
 */
export function useCarts<TData extends CartData = CartData, S = unknown>(
  selector: (carts: CartsState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const { sellers } = useCartContext("useCarts");
  return useSnapshotSelector(
    sellers.subscribe,
    sellers.getState as () => CartsState<TData>,
    sellers.getHydrationState() as CartsState<TData>,
    selector,
    isEqual,
  );
}

/**
 * Returns the cart action that reloads the cart after a cart change outside cart forms.
 *
 * Call `refresh()` after a server-side cart change that skips cart forms, such as a server action that creates the cart. Pass `{ seller }` to refresh a seller's cart.
 *
 * @param options The `seller` whose cart to refresh. Without a seller, the action refreshes your own store's cart.
 * @returns The `refresh()` action.
 *
 * @example
 * ```tsx
 * const { refresh } = useCartActions();
 *
 * async function handleServerAction() {
 *   await createCartOnServer();
 *   refresh(); // re-fetch the cart
 * }
 * ```
 * @publicDocs
 */
export function useCartActions({ seller }: SellerOptions = {}): CartActions {
  const { store, sellers } = useCartContext("useCartActions");
  if (seller !== undefined) assertSellerHandle(seller);

  return useMemo(
    () =>
      seller === undefined
        ? { refresh: store.refresh }
        : { refresh: () => sellers.getOrCreate(seller).store.refresh() },
    [store, sellers, seller],
  );
}

/**
 * Publishes cart analytics events when the customer's cart changes.
 *
 * Call the hook once near the root of your app, inside `CartProvider`. The hook starts tracking on mount and stops on unmount. The hook publishes `cart_updated`, `product_added_to_cart`, and `product_removed_from_cart` events.
 *
 * The hook throws outside `CartProvider`, and when the Shopify analytics bus isn't available. Render `ShopifyScripts` before the hook runs.
 *
 * @returns Nothing. The hook tracks cart analytics for the lifetime of the calling component.
 *
 * @example
 * ```tsx
 * function App() {
 *   useCartAnalytics();
 *   return <Layout />;
 * }
 * ```
 * @publicDocs
 */
export function useCartAnalytics(): void {
  const store = useCartStore("useCartAnalytics");

  useEffect(() => trackCartAnalytics(store), [store]);
}

/**
 * Returns a selected slice of cart state, or `undefined` when the component renders outside the cart provider.
 *
 * Use the hook in a component that also renders above the provider, such as a header cart badge on an error page.
 * Wherever the provider always exists, use `useCart`, which throws when the provider is missing.
 *
 * @param selector The function that picks a value from the cart state.
 * @param isEqual The function that compares the previous and next selected values. Return `true` to skip the re-render.
 * @returns The selected value, or `undefined` outside the provider.
 *
 * @example
 * ```tsx
 * function CartBadge() {
 *   const count = useOptionalCart((state) => state.data.totalQuantity);
 *   if (count === undefined) return null;
 *   return <span>Cart ({count})</span>;
 * }
 * ```
 * @publicDocs
 */
export function useOptionalCart<TData extends CartData = CartData, S = unknown>(
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S | undefined {
  const context = useOptionalCartContext();
  if (!context) return undefined;
  return useCartSelector(context.store, context.hydrationSnapshot, selector, isEqual);
}

function useCartSelector<TData extends CartData = CartData, S = unknown>(
  store: { subscribe(listener: () => void): () => void; getState(): CartState },
  hydrationSnapshot: CartState,
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  return useSnapshotSelector(
    store.subscribe,
    store.getState as () => CartState<TData>,
    hydrationSnapshot as CartState<TData>,
    selector,
    isEqual,
  );
}

function useSnapshotSelector<T, S>(
  subscribe: (listener: () => void) => () => void,
  getState: () => T,
  hydrationState: T,
  selector: (state: T) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const liveCacheRef = useRef<SelectorCache<S> | null>(null);
  const hydrationCacheRef = useRef<SelectorCache<S> | null>(null);

  const getSnapshot = () => selectCartSnapshot(getState(), selector, isEqual, liveCacheRef);
  const getServerSnapshot = () =>
    selectCartSnapshot(hydrationState, selector, isEqual, hydrationCacheRef);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

interface SelectorCache<S> {
  state: unknown;
  selector: unknown;
  value: S;
}

function selectCartSnapshot<T, S>(
  state: T,
  selector: (state: T) => S,
  isEqual: ((a: S, b: S) => boolean) | undefined,
  cacheRef: { current: SelectorCache<S> | null },
): S {
  if (cacheRef.current?.state === state && cacheRef.current.selector === selector) {
    return cacheRef.current.value;
  }

  const next = selector(state);

  if (cacheRef.current && isEqual?.(cacheRef.current.value, next)) {
    cacheRef.current = { state, selector, value: cacheRef.current.value };
    return cacheRef.current.value;
  }

  cacheRef.current = { state, selector, value: next };
  return next;
}

type SuspenseSnapshot<S> =
  | { status: "pending"; promise: PromiseLike<void> }
  | { status: "ready"; value: S };

interface SuspenseSelectorCache<S> {
  state: unknown;
  selector: unknown;
  snapshot: SuspenseSnapshot<S>;
}

function useSuspenseCartSelector<TData extends CartData, S>(
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const { store } = useCartContext();
  const cacheRef = useRef<SuspenseSelectorCache<S> | null>(null);

  // Suspense retries must read live readiness and data; the hydration snapshot would freeze the fallback.
  const getSnapshot = () => {
    const state = store.getState() as CartState<TData>;

    if (cacheRef.current?.state === state && cacheRef.current.selector === selector) {
      return cacheRef.current.snapshot;
    }

    if (state.readyPromise) {
      const snapshot: SuspenseSnapshot<S> = { status: "pending", promise: state.readyPromise };
      cacheRef.current = { state, selector, snapshot };
      return snapshot;
    }

    const value = selector(state);
    const previous = cacheRef.current?.snapshot;

    if (previous?.status === "ready" && isEqual?.(previous.value, value)) {
      cacheRef.current = { state, selector, snapshot: previous };
      return previous;
    }

    const snapshot: SuspenseSnapshot<S> = { status: "ready", value };
    cacheRef.current = { state, selector, snapshot };
    return snapshot;
  };

  const snapshot = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
  if (snapshot.status === "pending") throw snapshot.promise;
  return snapshot.value;
}

/**
 * Returns form props and a field register function for building cart forms.
 *
 * Spread `formProps()` on the form. The form posts to the cart endpoint. On submit, the form props stop the browser's navigation and send the form through the cart store.
 * The submit handler ignores a failed cart change. Read failures from the cart state's `errors`.
 * To skip the cart submission, call `event.preventDefault()` in a `beforeSubmit` callback. The `afterSubmit` callback runs as soon as the cart change starts, before the server responds.
 * The register function returns the HTML attributes for each cart field and action.
 *
 * Register the quantity field with `interactive: true` to submit the form when the quantity changes. The interactive input takes the quantity as a default value and stays uncontrolled.
 *
 * Pass `{ seller }` to change a seller's cart. The form then posts to the cart endpoint with a `?seller=` query, and the first submission creates the seller's store.
 *
 * @param options The `seller` whose cart the form changes. Without a seller, the form changes your own store's cart.
 * @returns The form props function and the register function.
 *
 * @example
 * ```tsx
 * function LineItem({ line }) {
 *   const { formProps, register } = useCartForm();
 *
 *   return (
 *     <form {...formProps()}>
 *       <input {...register("lineId", { value: line.id })} />
 *       <input {...register("quantity", { value: line.quantity, interactive: true })} />
 *       <button {...register("set")} />
 *       <button {...register("increase")}>+</button>
 *       <button {...register("decrease")}>−</button>
 *       <button {...register("remove")}>Remove</button>
 *     </form>
 *   );
 * }
 * ```
 * @publicDocs
 */
export function useCartForm({ seller }: SellerOptions = {}): CartFormBindings {
  const { store, sellers } = useCartContext("useCartForm");
  const action = seller === undefined ? cartEndpoint : getSellerCartEndpoint(seller, cartEndpoint);
  const coreRegister = useMemo(() => createCartFormRegister(), []);

  const register = useMemo(() => {
    type Register = typeof coreRegister;
    const wrapped = ((...args: Parameters<Register>) => {
      const result = (coreRegister as Function)(...args);
      const [field, opts] = args as [string, { interactive?: boolean }?];

      if (field === "quantity" && opts?.interactive) {
        let cleanup: (() => void) | null = null;
        const ref: RefCallback<HTMLInputElement> = (el) => {
          cleanup?.();
          cleanup = null;
          if (el) {
            const form = el.closest("form");
            if (form) cleanup = attachQuantityInput(el, form);
          }
        };
        const { value: _, ...rest } = result;
        return { ...rest, defaultValue: result.value, ref };
      }

      return result;
    }) as Register;
    return wrapped;
  }, [coreRegister]);

  const formProps = (opts?: CartFormPropsOptions): FormHTMLAttributes<HTMLFormElement> => ({
    onSubmit: (e: SubmitEvent<HTMLFormElement>) => {
      opts?.beforeSubmit?.(e);
      if (e.defaultPrevented) return;
      e.preventDefault();
      const target = seller === undefined ? store : sellers.getOrCreate(seller).store;
      target.handleFormSubmit(e.nativeEvent).catch(() => {});
      opts?.afterSubmit?.(e);
    },
    method: "post",
    action,
  });

  return { formProps, register };
}
