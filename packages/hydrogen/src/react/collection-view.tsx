import {
  createElement,
  useEffect,
  useRef,
  useSyncExternalStore,
  type HTMLAttributes,
  type ReactElement,
} from "react";

import {
  connectCollectionUpdates,
  type CollectionUpdateConnection,
} from "../core/collection/collection-update";
import {
  COLLECTION_VIEW_TAG_NAME,
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../core/collection/collection-view";
import { useCollectionUpdateSource } from "./collection";

/**
 * Props for the `CollectionView` component: the collection, the number of products that the page
 * loaded, and HTML attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type CollectionViewProps = CollectionViewOptions & HTMLAttributes<HTMLElement>;

const noSubscribe = () => () => {};

/**
 * Sends the `shopify:collection:view` event when the collection page renders. `ShopifyScripts`
 * registers the element.
 *
 * The Storefront API has no product total for a collection, so pass the number of products that
 * the page loaded as `productsCount`. The element sends the event again when the collection
 * handle changes, but not when filters, sorting, or pagination change the products.
 *
 * Inside a `CollectionProvider`, the component also sends a `shopify:collection:update` event for
 * each filter or sort change that the customer makes. The event's `productsCount` is the count
 * before the change, and its promise resolves with the count of the new results. Wrap the filters
 * and the product grid of the collection page, so that the element contains the filter controls.
 * Back and forward navigation and pagination don't send the event.
 *
 * @param props - The collection, the products count, the children, and HTML attributes for the element.
 * @returns The collection view element.
 * @publicDocs
 */
export function CollectionView({
  collection,
  productsCount,
  children,
  className,
  ...rest
}: CollectionViewProps): ReactElement {
  const ref = useRef<HTMLElement>(null);
  const source = useCollectionUpdateSource();
  const connection = useRef<CollectionUpdateConnection | null>(null);
  const view = { collection, productsCount };
  const viewRef = useRef(view);
  viewRef.current = view;
  // Renders again when the store settles, so the update promises resolve with the rendered count.
  const status = useSyncExternalStore(
    source?.store.subscribe ?? noSubscribe,
    () => source?.store.getState().status,
    () => undefined,
  );

  useEffect(() => {
    if (!source || !ref.current) return;
    const current = connectCollectionUpdates(source, ref.current, viewRef.current);
    connection.current = current;
    return () => {
      connection.current = null;
      current.disconnect();
    };
  }, [source]);

  useEffect(() => {
    connection.current?.update(viewRef.current);
  }, [source, collection.id, collection.handle, productsCount, status]);

  return createElement(
    COLLECTION_VIEW_TAG_NAME,
    // React 18 sets `className` on custom elements as a `classname` attribute, so pass `class`.
    {
      ...rest,
      class: className,
      ...getCollectionViewAttributes(view),
      ref,
    },
    children,
  );
}
