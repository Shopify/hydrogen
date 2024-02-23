import {useLocation, useOutlet, useParams } from "@remix-run/react";
import {type ReactNode, useMemo, createContext, useContext, useRef, useEffect} from "react";

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
}

type AnalyticsContextValue = {
  eventParamsMap: EventParamsMap;
  publish: (event: string, payload: Record<string, unknown>) => void;
  subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => void;
}

export const defaultAnalyticsContext: AnalyticsContextValue = {
  eventParamsMap: {
    collection_viewed: {},
    product_viewed: {},
  },
  publish: () => {},
  subscribe: () => {},
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
}: AnalyticsProviderProps): JSX.Element {
  const finalConfig = useMemo<AnalyticsContextValue>(() => {
    return {
      eventParamsMap,
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
  const lastLocationKey = useRef<string>('');
  const outlet = useOutlet();
  const {publish, eventParamsMap} = useAnalyticsProvider();

  // Page view analytics
  // We want useEffect to execute only when location changes
  // which represents a page view
  useEffect(() => {
    if (lastLocationKey.current === location.pathname) return;

    lastLocationKey.current = location.pathname;

    const payload = {
      url: location.pathname,
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
  }, [location.pathname]);

  return null;
}
