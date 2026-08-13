import { useSyncExternalStore } from "react";

function emptySubscribe() {
  return () => {};
}

/** `false` during SSR and the hydration render, `true` afterwards — without an effect-driven re-render. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
