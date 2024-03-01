import {type ReactNode, useMemo, createContext, useContext, useRef} from "react";
import {type CartReturn} from "../cart/queries/cart-types";
import { AnalyticsView } from "./AnalyticsView";

type AnalyticsProviderProps = {
  /** React children to render. */
  children?: ReactNode;
  canTrack: () => boolean;
  staticPayload?: Record<string, unknown>;
}

type AnalyticsContextValue = {
  canTrack: () => boolean;
  publish: (event: string, payload: Record<string, unknown>) => void;
  subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => void;
  getCart: () => CartReturn | null;
  getCartRef: () => React.MutableRefObject<CartReturn | null>;
}

export const defaultAnalyticsContext: AnalyticsContextValue = {
  canTrack: () => false,
  publish: () => {},
  subscribe: () => {},
  getCart: () => null,
  getCartRef: () => ({current: null}),
};

const AnalyticsContext = createContext<AnalyticsContextValue>(
  defaultAnalyticsContext,
);

const subscribers = new Map<string, Map<String, (payload: Record<string, unknown>) => void>>();
const eventsHoldQueue = Array<{event: string, payload: Record<string, unknown>}>();

export function AnalyticsProvider({
  children,
  canTrack,
  staticPayload = {},
}: AnalyticsProviderProps): JSX.Element {
  const cartRef = useRef<CartReturn | null>(null);
  const finalConfig = useMemo<AnalyticsContextValue>(() => {
    return {
      canTrack,
      getCartRef: () => cartRef,
      getCart: () => cartRef.current,
      publish: (event: string, payload: Record<string, unknown>) => {
        const stampedPayload = {
          eventTimestamp: Date.now(),
          ...staticPayload,
          ...payload
        };
        if (canTrack()) {
          (subscribers.get(event) ?? new Map()).forEach((callback) => {
            try {
              callback(stampedPayload);
            } catch (error) {
              console.error(error);
            }
          });
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
