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

import { attachQuantityInput } from "../core/cart/attach-quantity-input";
import {
  configureCartEndpoint as configureCoreCartEndpoint,
  createCartStore,
  type CartStore,
} from "../core/cart/cart";
import { createCartFormRegister } from "../core/cart/form";
import type { CartDataFromHandlers } from "../core/cart/server-handlers";
import type { CartData, CartState } from "../core/cart/state";

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

type TypedCartProviderProps<TData extends CartData> = {
  initialData?: TData;
  children?: ReactNode;
};

type TypedCartComponents<TData extends CartData> = {
  CartProvider: (props: TypedCartProviderProps<TData>) => ReactNode;
  useCart: <S>(selector: (state: CartState<TData>) => S, isEqual?: (a: S, b: S) => boolean) => S;
  useOptionalCart: <S>(
    selector: (state: CartState<TData>) => S,
    isEqual?: (a: S, b: S) => boolean,
  ) => S | undefined;
  useCartForm: typeof useCartForm;
};

export function createCartComponents<THandlers>(): TypedCartComponents<
  CartDataFromHandlers<THandlers>
> {
  type TData = CartDataFromHandlers<THandlers>;

  function TypedCartProvider({ initialData, children }: TypedCartProviderProps<TData>) {
    return (
      <CartProvider initialData={initialData as CartData | undefined}>{children}</CartProvider>
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

  return {
    CartProvider: TypedCartProvider,
    useCart: useTypedCart,
    useOptionalCart: useTypedOptionalCart,
    useCartForm,
  } as const;
}

export function useCartStore(): CartStore {
  const store = useContext(CartContext);
  if (!store) throw new Error("useCart must be used inside <CartProvider>.");
  return store;
}

function useOptionalCartStore(): CartStore | null {
  return useContext(CartContext);
}

export function CartProvider({
  initialData,
  children,
}: {
  initialData?: CartData;
  children?: ReactNode;
}) {
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- store is created once with the initial server data
  const store = useMemo(() => createCartStore({ initialData }), []);
  const hydrated = useRef(Boolean(initialData));

  useEffect(() => {
    configureCoreCartEndpoint(cartEndpoint);
    store.connect();
    return () => {
      store.destroy();
    };
  }, [store]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    store.fetch().catch(() => {});
  }, [store]);

  return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
}

export function useCart<TData extends CartData = CartData, S = unknown>(
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const store = useCartStore();
  return useCartSelector(store, selector, isEqual) as S;
}

/**
 * Like `useCart`, but returns `undefined` when rendered outside a `<CartProvider>`.
 * @internal
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
