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
  configureCartEndpoint as configureCoreCartEndpoint,
  createCartStore,
  type CreateCartStoreOptions,
  type CartActions,
  type CartStore,
} from "../core/cart/cart";
import { createCartFormRegister, type CartFormRegister } from "../core/cart/form";
import type { CartDataFromHandlers } from "../core/cart/server-handlers";
import { type CartData, type CartState } from "../core/cart/state";

const DEFAULT_CART_ENDPOINT = "/api/cart";

let cartEndpoint = DEFAULT_CART_ENDPOINT;

const CartContext = createContext<CartStore | null>(null);

export function configureCartEndpoint(endpoint: string): void {
  cartEndpoint = endpoint;
  configureCoreCartEndpoint(endpoint);
}

export function getCartEndpoint(): string {
  return cartEndpoint;
}

/**
 * Props for the cart provider that createCartComponents returns.
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

export type { CartActions };

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
 * The cart provider and hooks that createCartComponents returns, typed with the custom cart fields from your cart server handlers.
 */
type TypedCartComponents<TData extends CartData> = {
  /** Creates the cart store and shares the store with the cart hooks inside the provider. The provider connects the store on mount and destroys the store on unmount. */
  CartProvider: (props: TypedCartProviderProps<TData>) => ReactNode;
  /**
   * Returns the slice of cart state that the selector picks. The component re-renders when the selected value changes by reference, or when your `isEqual` function reports a change. A selector that returns the full state re-renders on every cart update.
   */
  useCart: CartStateHook<TData>;
  /** Suspends while the full cart loads, then returns the slice of cart state that the selector picks. Wrap the component in a `Suspense` boundary. */
  useSuspenseCart: CartStateHook<TData>;
  /**
   * Returns the slice of cart state that the selector picks, or `undefined` outside the provider. Use the hook in a component that also renders above the provider, such as a cart badge on an error page.
   */
  useOptionalCart: OptionalCartStateHook<TData>;
  /** Returns the `refresh` action. Call `refresh` after a server-side cart change that skips cart forms. */
  useCartActions: typeof useCartActions;
  /** Returns form props and a register function for cart forms. */
  useCartForm: typeof useCartForm;
};

/**
 * Returns a cart provider and cart hooks typed to the cart fragment in your cart server handlers.
 * Pass `typeof cartServerHandlers` as the `THandlers` type argument. Every hook's cart state then includes your custom cart fields.
 *
 * On mount, the provider sends cart requests to `/api/cart` and connects the store. Every hook except useOptionalCart throws when you call it outside the provider.
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
    isEqual?: (a: S, b: S) => boolean,
  ): S {
    return useCart<CartData, S>((state) => selector(state as CartState<TData>), isEqual);
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
    const readyPromise = useCart((state) => state.readyPromise);
    if (readyPromise) throw readyPromise;
    return useCart(selector, isEqual);
  }

  return {
    CartProvider: TypedCartProvider,
    useCart: useTypedCart,
    useSuspenseCart,
    useOptionalCart: useTypedOptionalCart,
    useCartActions,
    useCartForm,
  } as const;
}

export function useCartStore(hookName = "useCart"): CartStore {
  const store = useContext(CartContext);
  if (!store) throw new Error(`${hookName} must be used inside <CartProvider>.`);
  return store;
}

function useOptionalCartStore(): CartStore | null {
  return useContext(CartContext);
}

/**
 * Creates a cart store and shares the store with the cart hooks inside the provider.
 *
 * Render every cart hook inside the provider. On mount, the provider sends cart requests to `/api/cart` and connects the store. On unmount, the provider destroys the store. The provider creates its store from the first initial data and ignores later changes.
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
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- store is created once with the initial server data
  const store = useMemo(() => createCartStore({ initialData }), []);

  useEffect(() => {
    configureCoreCartEndpoint(cartEndpoint);
    store.connect();
    return () => {
      store.destroy();
    };
  }, [store]);

  return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
}

/**
 * Returns the slice of cart state that the selector picks.
 *
 * The component re-renders when the selected value changes by reference, or when your `isEqual` function reports a change. A selector that returns the full state re-renders on every cart update.
 *
 * @param selector The function that picks a value from the cart state.
 * @param isEqual The function that compares the previous and next selected values. Return `true` to skip the re-render.
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
 * ```
 * @publicDocs
 */
export function useCart<TData extends CartData = CartData, S = unknown>(
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const store = useCartStore();
  return useCartSelector(store, selector, isEqual) as S;
}

/**
 * Returns the cart action that reloads the cart after a cart change outside cart forms.
 *
 * Call `refresh` after a server-side cart change that skips cart forms, such as a server action that creates the cart.
 *
 * @returns The `refresh` action.
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
export function useCartActions(): CartActions {
  const store = useCartStore("useCartActions");

  return useMemo(() => ({ refresh: store.refresh }), [store]);
}

/**
 * Publishes cart analytics events when the customer's cart changes.
 *
 * Call the hook once near the root of your app, inside CartProvider. The hook starts tracking on mount and stops on unmount. The hook publishes `cart_updated`, `product_added_to_cart`, and `product_removed_from_cart` events.
 *
 * The hook throws outside CartProvider, and when the Shopify analytics bus isn't available. Render ShopifyScripts before the hook runs.
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
 * Wherever the provider always exists, use useCart, which throws when the provider is missing.
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
  const store = useOptionalCartStore();
  if (!store) return undefined;
  return useCartSelector(store, selector, isEqual);
}

function useCartSelector<TData extends CartData = CartData, S = unknown>(
  store: CartStore,
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const cachedRef = useRef<{ state: unknown; selector: typeof selector; value: S } | null>(null);

  const getSnapshot = () => {
    const state = store.getState() as CartState<TData>;

    if (
      cachedRef.current &&
      cachedRef.current.state === state &&
      cachedRef.current.selector === selector
    ) {
      return cachedRef.current.value;
    }

    const next = selector(state);

    if (cachedRef.current && isEqual?.(cachedRef.current.value, next)) {
      cachedRef.current = { state, selector, value: cachedRef.current.value };
      return cachedRef.current.value;
    }

    cachedRef.current = { state, selector, value: next };
    return next;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
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
export function useCartForm(): CartFormBindings {
  const store = useCartStore("useCartForm");
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
      store.handleFormSubmit(e.nativeEvent).catch(() => {});
      opts?.afterSubmit?.(e);
    },
    method: "post",
    action: cartEndpoint,
  });

  return { formProps, register };
}
