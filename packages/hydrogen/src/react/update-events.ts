import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

import type { CollectionUpdateSource } from "../core/collection/collection-update";
import type { UpdateEventConnection } from "../core/collection/update-events";

const noSubscribe = () => () => {};

/**
 * Connects the element to the source's update events while both exist, and passes the view after
 * each render.
 *
 * @internal
 */
export function useUpdateEvents<TView>(
  source: CollectionUpdateSource | null,
  ref: RefObject<HTMLElement | null>,
  view: TView,
  connect: (
    source: CollectionUpdateSource,
    element: HTMLElement,
    view: TView,
  ) => UpdateEventConnection<TView>,
): void {
  const connection = useRef<UpdateEventConnection<TView> | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  // Renders again when the store settles, so the update promises resolve with the rendered view.
  useSyncExternalStore(
    source?.store.subscribe ?? noSubscribe,
    () => source?.store.getState().status,
    () => undefined,
  );

  useEffect(() => {
    if (!source || !ref.current) return;
    const current = connect(source, ref.current, viewRef.current);
    connection.current = current;
    return () => {
      connection.current = null;
      current.disconnect();
    };
  }, [source, ref, connect]);

  // Runs after every render. The connection ignores views that don't settle anything.
  useEffect(() => {
    connection.current?.update(viewRef.current);
  });
}
