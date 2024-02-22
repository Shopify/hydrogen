import {type ReactNode, useMemo, createContext, useContext} from "react";

type AnalyticsProviderProps = {
  /** React children to render. */
  children?: ReactNode;
}

type AnalyticsContextValue = {
  publish: (event: string, payload: Record<string, unknown>) => void;
  subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => void;
}

export const defaultAnalyticsContext: AnalyticsContextValue = {
  publish: () => {},
  subscribe: () => {},
};

const AnalyticsContext = createContext<AnalyticsContextValue>(
  defaultAnalyticsContext,
);

const subscribers = new Map<string, Map<String, (payload: Record<string, unknown>) => void>>();

export function AnalyticsProvider({
  children,
  ...analyticsConfig
}: AnalyticsProviderProps): JSX.Element {
  const finalConfig = useMemo<AnalyticsContextValue>(() => {
    return {
      publish: (event: string, payload: Record<string, unknown>) => {
        (subscribers.get(event) ?? new Map()).forEach((callback) => {
          callback(payload);
        });
      },
      subscribe: (event: string, callback: (payload: Record<string, unknown>) => void) => {
        if (!subscribers.has(event)) {
          subscribers.set(event, new Map());
        }
        subscribers.get(event)?.set(callback.toString(), callback);
      },
      ...analyticsConfig,
    };
  }, [analyticsConfig]);

  return (
    <AnalyticsContext.Provider value={finalConfig}>
      {children}
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
