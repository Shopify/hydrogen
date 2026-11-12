import { assertSellerHandle, createCartStore, type CartStore } from "./cart";
import type { CartData, CartState } from "./state";
import { createEmptyCartState } from "./state";

/** A cart store and the state the server rendered it with. */
export type CartEntry = { store: CartStore; hydrationSnapshot: CartState };

/**
 * Your store's cart and each seller's cart. Sellers keep the order in which their carts first appeared on the page.
 *
 * @publicDocs
 */
export type CartsState<TData extends CartData = CartData> = {
  /** Your own store's cart. */
  home: CartState<TData>;
  /** One entry per seller cart on the page. */
  sellers: ReadonlyArray<{ seller: string; state: CartState<TData> }>;
};

type SellerCartsData = Array<{ seller: string; cart: CartData }> | undefined;

type CartSource<T> = {
  subscribe(listener: () => void): () => void;
  getState(): T;
};

/** The seller cart stores next to the home store, keyed by seller handle. */
export type SellerCarts = CartSource<CartsState> & {
  get(seller: string): CartEntry | undefined;
  /** Returns the seller's store, creating it on first use. Call it from event handlers only. */
  getOrCreate(seller: string): CartEntry;
  /** Adds stores for sellers that a resolved loader promise returned. */
  seed(sellers: SellerCartsData): void;
  /** Reads one seller's cart, or a frozen empty cart until that seller's store exists. */
  source(seller: string): CartSource<CartState>;
  /** The state the server rendered: the home cart and the sellers known when the stores were created. */
  getHydrationState(): CartsState;
  getHydrationSnapshot(seller: string): CartState;
  connect(): void;
  destroy(): void;
};

const EMPTY_SELLER_CART_STATE: CartState = Object.freeze(createEmptyCartState({ loading: false }));

/**
 * Creates the seller stores from the sellers in synchronous initial data. Stores that appear later
 * render empty during hydration, because the server rendered without them.
 */
export function createSellerCarts(home: CartEntry, initialSellers: SellerCartsData): SellerCarts {
  const entries = new Map<string, CartEntry>();
  const sellerListeners = new Set<() => void>();
  let connected = false;
  let cache: CartsState | null = null;

  // The loader returns every seller cart with lines, so a seller it left out starts with no cart.
  function add(seller: string, cart: CartData | null, hydrated = false): CartEntry {
    const store = createCartStore({ seller, initialData: { cart } });
    const entry = {
      store,
      hydrationSnapshot: hydrated ? store.getState() : EMPTY_SELLER_CART_STATE,
    };
    entries.set(seller, entry);
    if (connected) store.connect();
    for (const listener of Array.from(sellerListeners)) listener();
    return entry;
  }

  for (const { seller, cart } of initialSellers ?? []) {
    if (!entries.has(seller)) add(seller, cart, true);
  }

  const hydrationState: CartsState = Object.freeze({
    home: home.hydrationSnapshot,
    sellers: Object.freeze(
      [...entries].map(([seller, entry]) => ({ seller, state: entry.hydrationSnapshot })),
    ),
  });

  function subscribeSellers(listener: () => void): () => void {
    sellerListeners.add(listener);
    return () => {
      sellerListeners.delete(listener);
    };
  }

  return {
    get: (seller) => entries.get(seller),
    getOrCreate: (seller) => entries.get(seller) ?? add(seller, null),
    seed(sellers) {
      for (const { seller, cart } of sellers ?? []) {
        const existing = entries.get(seller);
        if (existing) existing.store.hydrate(cart);
        else add(seller, cart);
      }
    },
    source(seller) {
      assertSellerHandle(seller);
      return {
        subscribe(listener) {
          let unsubscribeStore = entries.get(seller)?.store.subscribe(listener);
          const unsubscribeSellers = subscribeSellers(() => {
            if (unsubscribeStore) return;
            unsubscribeStore = entries.get(seller)?.store.subscribe(listener);
            listener();
          });
          return () => {
            unsubscribeSellers();
            unsubscribeStore?.();
          };
        },
        getState: () => entries.get(seller)?.store.getState() ?? EMPTY_SELLER_CART_STATE,
      };
    },
    subscribe(listener) {
      const unsubscribes = new Map<CartStore, () => void>();
      const watch = () => {
        for (const store of [home.store, ...[...entries.values()].map((entry) => entry.store)]) {
          if (!unsubscribes.has(store)) unsubscribes.set(store, store.subscribe(listener));
        }
      };
      watch();
      const unsubscribeSellers = subscribeSellers(() => {
        watch();
        listener();
      });
      return () => {
        unsubscribeSellers();
        for (const unsubscribe of unsubscribes.values()) unsubscribe();
      };
    },
    getState() {
      const homeState = home.store.getState();
      const sellers = [...entries];
      if (
        cache?.home === homeState &&
        cache.sellers.length === sellers.length &&
        cache.sellers.every(
          (entry, index) =>
            entry.seller === sellers[index][0] &&
            entry.state === sellers[index][1].store.getState(),
        )
      ) {
        return cache;
      }
      cache = {
        home: homeState,
        sellers: sellers.map(([seller, entry]) => ({ seller, state: entry.store.getState() })),
      };
      return cache;
    },
    getHydrationState: () => hydrationState,
    getHydrationSnapshot: (seller) =>
      entries.get(seller)?.hydrationSnapshot ?? EMPTY_SELLER_CART_STATE,
    connect() {
      connected = true;
      for (const entry of entries.values()) entry.store.connect();
    },
    destroy() {
      connected = false;
      for (const entry of entries.values()) entry.store.destroy();
    },
  };
}
