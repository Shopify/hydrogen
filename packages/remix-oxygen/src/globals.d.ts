// Inlined from @shopify/hydrogen to avoid build-order dependency.
// remix-oxygen is deprecated; these globals are set by hydrogen at runtime.
declare global {
  var __H2O_LOG_EVENT:
    | undefined
    | ((
        event: {
          url: string;
          startTime: number;
          endTime?: number;
          waitUntil?: (promise: Promise<unknown>) => void;
        } & Record<string, unknown>,
      ) => void);
  var __remix_devServerHooks:
    | undefined
    | {getCriticalCss: (...args: unknown[]) => any};
}

export {};
