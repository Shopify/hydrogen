import { shallowRef, watch, type ShallowRef } from "vue";

import type { CollectionUpdateSource } from "../core/collection/collection-update";
import type { UpdateEventConnection } from "../core/collection/update-events";

/**
 * Connects the element to the source's update events while both exist, and passes the view after
 * each render that changes the view or the store status.
 *
 * @internal
 */
export function useUpdateEvents<TView>(
  source: Readonly<ShallowRef<CollectionUpdateSource>> | null,
  element: Readonly<ShallowRef<HTMLElement | undefined>>,
  view: () => TView,
  connect: (
    source: CollectionUpdateSource,
    element: HTMLElement,
    view: TView,
  ) => UpdateEventConnection<TView>,
): void {
  const status = shallowRef<string>();

  watch(
    () => [source?.value, element.value] as const,
    ([current, target], _, onCleanup) => {
      if (!current || !target) return;
      const connection = connect(current, target, view());
      // Updates after each render, so the update promises resolve with the rendered view.
      const stopUpdates = watch(
        () => [view(), status.value],
        () => connection.update(view()),
        { flush: "post", immediate: true, deep: true },
      );
      const unsubscribe = current.store.subscribe((state) => {
        status.value = state.status;
      });
      onCleanup(() => {
        unsubscribe();
        stopUpdates();
        connection.disconnect();
      });
    },
    { flush: "post" },
  );
}
