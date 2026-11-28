import { type RefObject, useEffect } from "react";

import type { ViewEventElement } from "../../vendor/standard-events";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";

/**
 * Sends the view event of a `view-event-trigger="manual"` element from an effect.
 *
 * Effects clean up when a React `<Activity>` hides the tree and run again when it shows the tree,
 * so the element sends again each time it is shown. StrictMode's first cleanup cancels the first
 * run before its promise resolves, so StrictMode sends once. The effect runs again only when `key` changes, not when the
 * payload or the variant changes.
 */
export function useViewEvent(
  ref: RefObject<(HTMLElement & ViewEventElement) | null>,
  enabled: boolean,
  key: unknown,
): void {
  useEffect(() => {
    if (!enabled || typeof customElements === "undefined") return;
    let cancelled = false;
    void customElements.whenDefined(VIEW_EVENT_TAG_NAME).then(() => {
      if (!cancelled) ref.current?.dispatchViewEvent();
    });
    return () => {
      cancelled = true;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- ref is a stable ref object; key is the semantic dep
  }, [enabled, key]);
}
