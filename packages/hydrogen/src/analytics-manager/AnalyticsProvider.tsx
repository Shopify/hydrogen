import {Await, useLocation, useOutlet, useParams } from "@remix-run/react";
import {type ReactNode, useMemo, createContext, useContext, useRef, useEffect, Suspense} from "react";
import {type CartReturn} from "../cart/queries/cart-types";
import { CartLine, ComponentizableCartLine } from "@shopify/hydrogen-react/storefront-api-types";

type EventConfig = {
  routeId?: string;
  paramName?: string;
}

type EventParamsMap = {
  collection_viewed: EventConfig;
  product_viewed: EventConfig;
  [eventName: string]: EventConfig;
};

type AnalyticsProviderProps = {
  /** React children to render. */
  children?: ReactNode;
  eventDataRoute: string;
  eventParamsMap: EventParamsMap;
  canTrack: () => boolean;
  cart: Promise<CartReturn | null>;
}

type AnalyticsContextValue = {
  eventParamsMap: EventParamsMap;
  publish: (event: string, payload: Record<string, unknown>) => void;
  subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => void;
  getCart: () => CartReturn | null;
}

export const defaultAnalyticsContext: AnalyticsContextValue = {
  eventParamsMap: {
    collection_viewed: {},
    product_viewed: {},
  },
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
  eventDataRoute,
  eventParamsMap,
  canTrack,
  cart,
}: AnalyticsProviderProps): JSX.Element {
  const cartRef = useRef<CartReturn | null>(null);
  const finalConfig = useMemo<AnalyticsContextValue>(() => {
    return {
      eventParamsMap,
      getCart: () => cartRef.current,
      publish: (event: string, payload: Record<string, unknown>) => {
        const stampedPayload = {
          eventTimestamp: Date.now(),
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
  }, [eventParamsMap]);

  return (
    <AnalyticsContext.Provider value={finalConfig}>
      {children}
      <AnalyticsCart cart={cart} cartRef={cartRef}/>
      <PageViewed eventDataRoute={eventDataRoute} />
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

function PageViewed({eventDataRoute}: {eventDataRoute: string}) {
  const params = useParams();
  const location = useLocation();
  const lastLocationPathname = useRef<string>('');
  const outlet = useOutlet();
  const {publish, eventParamsMap} = useAnalyticsProvider();
  const url = location.pathname + location.search

  // Page view analytics
  // We want useEffect to execute only when location changes
  // which represents a page view
  useEffect(() => {
    if (lastLocationPathname.current === url) return;

    lastLocationPathname.current = url;

    const payload = {
      url,
    };

    setTimeout(() => {
      publish('pageViewed', payload);

      Object.keys(eventParamsMap).forEach((eventName) => {
        const eventConfig = eventParamsMap[eventName];
        const paramName = eventConfig.paramName;
        const routeId = `routes/${eventConfig.routeId}`;
        const outletId = outlet?.props.children?.props.match?.route.id;

        if (paramName && routeId) {
          if (params.hasOwnProperty(paramName) && outletId === routeId) {
            if (eventName === 'product_viewed' || eventName === 'collection_viewed') {
              const search = new URLSearchParams(location.search);
              search.append('_data', `routes${eventDataRoute}`);
              search.append('eventType', eventName === 'product_viewed' ? 'product' : 'collection');
              search.append('eventHandle', params[paramName] || '');

              fetch(`${eventDataRoute}?${search.toString()}`)
                .then(res => res.json())
                .then((data) => {
                  publish(eventName, {
                    [paramName]: params[paramName],
                    ...data as Object,
                  });
                });
            } else {
              publish(eventName, {[paramName]: params[paramName]});
            }
          }
        } else if (paramName && params.hasOwnProperty(paramName)) {
          publish(eventName, {[paramName]: params[paramName]});
        } else if (routeId && outletId === routeId) {
          publish(eventName, {});
        }
      });
    }, 0);
  }, [url]);

  return null;
}

function AnalyticsCart({
  cart,
  cartRef,
}: {
  cart: Promise<CartReturn | null>
  cartRef: React.MutableRefObject<CartReturn | null>
}) {
  return (
    <Suspense fallback={<p>Loading cart ...</p>}>
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

    // Product removed from cart
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

    // Product added to cart
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
