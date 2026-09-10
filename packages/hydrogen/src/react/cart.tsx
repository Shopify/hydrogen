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
  type CartStore,
} from "../core/cart/cart";
import { createCartFormRegister } from "../core/cart/form";
import type { CartDataFromHandlers } from "../core/cart/server-handlers";
import { type CartData, type CartState } from "../core/cart/state";

const DEFAULT_CART_ENDPOINT = "/api/cart";

let cartEndpoint = DEFAULT_CART_ENDPOINT;

interface CartContextValue {
  store: CartStore;
  hydrationSnapshot: CartState;
}

const CartContext = createContext<CartContextValue | null>(null);

export function configureCartEndpoint(endpoint: string): void {
  cartEndpoint = endpoint;
  configureCoreCartEndpoint(endpoint);
}

export function getCartEndpoint(): string {
  return cartEndpoint;
}

type TypedCartProviderProps<TData extends CartData> = {
  initialData?: CartInitialData<TData>;
  children?: ReactNode;
};

type CartInitialData<TData extends CartData = CartData> =
  CreateCartStoreOptions<TData>["initialData"];

/** Actions for reconciling cart state after updates outside Standard Actions. */
export type CartActions = Pick<CartStore, "refresh">;

type TypedCartComponents<TData extends CartData> = {
  CartProvider: (props: TypedCartProviderProps<TData>) => ReactNode;
  useCart: <S>(selector: (state: CartState<TData>) => S, isEqual?: (a: S, b: S) => boolean) => S;
  useSuspenseCart: <S>(
    selector: (state: CartState<TData>) => S,
    isEqual?: (a: S, b: S) => boolean,
  ) => S;
  useOptionalCart: <S>(
    selector: (state: CartState<TData>) => S,
    isEqual?: (a: S, b: S) => boolean,
  ) => S | undefined;
  useCartActions: typeof useCartActions;
  useCartForm: typeof useCartForm;
};

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
    return useSuspenseCartSelector(selector, isEqual);
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
    return { store, hydrationSnapshot: store.getState() };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- provider initialData seeds one store for its lifetime
  }, []);
  const { store } = context;

  useEffect(() => {
    configureCoreCartEndpoint(cartEndpoint);
    store.connect();
    return () => {
      store.destroy();
    };
  }, [store]);

  return <CartContext.Provider value={context}>{children}</CartContext.Provider>;
}

export function useCart<TData extends CartData = CartData, S = unknown>(
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const { store, hydrationSnapshot } = useCartContext();
  return useCartSelector(store, hydrationSnapshot, selector, isEqual) as S;
}

export function useCartActions(): CartActions {
  const store = useCartStore("useCartActions");

  return useMemo(() => ({ refresh: store.refresh }), [store]);
}

export function useCartAnalytics(): void {
  const store = useCartStore();

  useEffect(() => trackCartAnalytics(store), [store]);
}

/**
 * Like `useCart`, but returns `undefined` when rendered outside a `<CartProvider>`.
 * @internal
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
  store: CartStore,
  hydrationSnapshot: CartState,
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const liveCacheRef = useRef<SelectorCache<S> | null>(null);
  const hydrationCacheRef = useRef<SelectorCache<S> | null>(null);

  const getSnapshot = () =>
    selectCartSnapshot(store.getState() as CartState<TData>, selector, isEqual, liveCacheRef);
  const getServerSnapshot = () =>
    selectCartSnapshot(hydrationSnapshot as CartState<TData>, selector, isEqual, hydrationCacheRef);

  return useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot);
}

interface SelectorCache<S> {
  state: unknown;
  selector: unknown;
  value: S;
}

function selectCartSnapshot<TData extends CartData, S>(
  state: CartState<TData>,
  selector: (state: CartState<TData>) => S,
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

export function useCartForm() {
  const store = useCartStore();
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

  const formProps = (opts?: {
    beforeSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
    afterSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
  }): FormHTMLAttributes<HTMLFormElement> => ({
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
