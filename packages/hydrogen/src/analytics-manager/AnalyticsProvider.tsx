import {Await} from "@remix-run/react";
import {type ReactNode, useMemo, createContext, useContext, useRef, useEffect, Suspense} from "react";
import {type CartReturn} from "../cart/queries/cart-types";
import { AnalyticsView } from "./AnalyticsView";

type AnalyticsProviderProps = {
  /** React children to render. */
  children?: ReactNode;
  canTrack: () => boolean;
  cart: Promise<CartReturn | null>;
  staticPayload?: Record<string, unknown>;
}

type AnalyticsContextValue = {
  canTrack: () => boolean;
  publish: (event: string, payload: Record<string, unknown>) => void;
  subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => void;
  getCart: () => CartReturn | null;
}

export const defaultAnalyticsContext: AnalyticsContextValue = {
  canTrack: () => false,
  publish: () => {},
  subscribe: () => {},
  getCart: () => null,
};

const AnalyticsContext = createContext<AnalyticsContextValue>(
  defaultAnalyticsContext,
);

const subscribers = new Map<string, Map<String, (payload: Record<string, unknown>) => void>>();
const eventsHoldQueue = Array<{event: string, payload: Record<string, unknown>}>();

export function AnalyticsProvider({
  children,
  canTrack,
  cart,
  staticPayload = {},
}: AnalyticsProviderProps): JSX.Element {
  const cartRef = useRef<CartReturn | null>(null);
  const finalConfig = useMemo<AnalyticsContextValue>(() => {
    return {
      canTrack,
      getCart: () => cartRef.current,
      publish: (event: string, payload: Record<string, unknown>) => {
        const stampedPayload = {
          eventTimestamp: Date.now(),
          ...staticPayload,
          ...payload
        };
        if (canTrack()) {
          if (eventsHoldQueue.length > 0) {
            // Flush hold queue
            eventsHoldQueue.forEach((holdEvent) => {
              (subscribers.get(holdEvent.event) ?? new Map()).forEach((callback) => {
                callback(holdEvent.payload);
              });
            });
            eventsHoldQueue.length = 0;
          }
          (subscribers.get(event) ?? new Map()).forEach((callback) => {
            callback(stampedPayload);
          });
        } else {
          eventsHoldQueue.push({event, payload: stampedPayload});
        }
      },
      subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => {
        if (!subscribers.has(event)) {
          subscribers.set(event, new Map());
        }
        subscribers.get(event)?.set(callback.toString(), callback);
      },
    };
  }, [staticPayload, canTrack]);

  return (
    <AnalyticsContext.Provider value={finalConfig}>
      {children}
      <AnalyticsCart cart={cart} cartRef={cartRef}/>
      <AnalyticsView eventName={AnalyticsView.PAGE_VIEWED} />
    </AnalyticsContext.Provider>
  );
};

export function useAnalyticsProvider(): AnalyticsContextValue {
  const analyticsContext = useContext(AnalyticsContext);
  if (!analyticsContext) {
    throw new Error(`'useAnalyticsProvider()' must be a descendent of <AnalyticsProvider/>`);
  }
  return analyticsContext;
}

function AnalyticsCart({
  cart,
  cartRef,
}: {
  cart: Promise<CartReturn | null>
  cartRef: React.MutableRefObject<CartReturn | null>
}) {
  return (
    <Suspense>
      <Await resolve={cart}>
        {(cart) => {
          if (cartRef.current === null) {
            cartRef.current = cart;
            return null;
          } else {
            return <AnalyticDiffCartLines cartRef={cartRef} previousCart={cartRef.current} currentCart={cart} />;
          }
        }}
      </Await>
    </Suspense>
  );
}

function AnalyticDiffCartLines({
  cartRef,
  previousCart,
  currentCart,
}: {
  cartRef: React.MutableRefObject<CartReturn | null>
  previousCart: CartReturn | null;
  currentCart: CartReturn | null;
}) {
  const {publish} = useAnalyticsProvider();

  useEffect(() => {
    cartRef.current = currentCart;
    if (!previousCart || !currentCart) return;

    // Compare previous cart against current cart lines
    // Detect quantity changes and missing cart lines
    previousCart?.lines.nodes.forEach((line) => {
      const matchedLineId = currentCart?.lines.nodes.filter((currentLine) => line.id === currentLine.id);
      if (matchedLineId.length === 1) {
        const matchedLine = matchedLineId[0];
        if (line.quantity < matchedLine.quantity) {
          publish('product_added_to_cart', {
            line,
            quantity: matchedLine.quantity,
          });
        } else if (line.quantity > matchedLine.quantity) {
          publish('product_removed_from_cart', {
            line,
            quantity: matchedLine.quantity,
          });
        }
      } else {
        publish('product_removed_from_cart', {
          line,
          quantity: 0,
        });
      }
    });

    // Compare current cart against previous cart lines
    // Detect new cart lines
    currentCart?.lines.nodes.forEach((line) => {
      const matchedLineId = previousCart?.lines.nodes.filter((previousLine) => line.id === previousLine.id);
      if (matchedLineId.length === 0) {
        publish('product_added_to_cart', {
          line,
          quantity: 1,
        });
      }
    });

  }, [previousCart, currentCart]);
  return null;
}
