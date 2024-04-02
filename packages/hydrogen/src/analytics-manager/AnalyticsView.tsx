import {useLocation} from '@remix-run/react';
import {useEffect, useRef} from 'react';
import {
  type ShopAnalytic,
  type AnalyticsProviderProps,
  useAnalytics,
} from './AnalyticsProvider';
import {CartReturn} from '../cart/queries/cart-types';
import {AnalyticsEvent} from './events';
import {
  CartLine,
  ComponentizableCartLine,
  Product,
  ProductVariant,
} from '@shopify/hydrogen-react/storefront-api-types';

export type OtherData = {
  /** Any other data that should be included in the event. */
  [key: string]: unknown;
};

type BasePayload = {
  /** The timestamp in ms at the time of event collection. */
  eventTimestamp: number;
  /** The shop data passed in from the `AnalyticsProvider`. */
  shop: ShopAnalytic | null;
  /** The custom data passed in from the `AnalyticsProvider`. */
  customData?: AnalyticsProviderProps['customData'];
};

type ViewBasePayload = {
  /** The url location of when this event is collected. */
  url: string;
};

type ProductPayload = {
  /** The product id. */
  id: Product['id'];
  /** The product title. */
  title: Product['title'];
  /** The displaying variant price. */
  price: ProductVariant['price']['amount'];
  /** The product vendor. */
  vendor: Product['vendor'];
  /** The displaying variant id. */
  variantId: ProductVariant['id'];
  /** The displaying variant title. */
  variantTitle: ProductVariant['title'];
  /** The quantity of product. */
  quantity: number;
  /** The product sku. */
  sku?: ProductVariant['sku'];
  /** The product type. */
  productType?: Product['productType'];
  /** Any other data that should be included in the event. */
  [key: string]: unknown;
};

type ProductsPayload = {
  /** The products associated with this event. */
  products: Array<ProductPayload>;
};

type CollectionPayloadDetails = {
  /** The collection id. */
  id: string;
  /** The collection handle. */
  handle: string;
};

type CollectionPayload = {
  collection: CollectionPayloadDetails;
};

type SearchPayload = {
  /** The search term used for the search results page */
  searchTerm: string;
  /** The search results */
  searchResults?: Array<any>;
};

type CartPayload = {
  /** The current cart state. */
  cart: CartReturn | null;
  /** The previous cart state. */
  prevCart: CartReturn | null;
};

type CartLinePayload = {
  /** The previous state of the cart line that got updated. */
  prevLine?: CartLine | ComponentizableCartLine;
  /** The current state of the cart line that got updated. */
  currentLine?: CartLine | ComponentizableCartLine;
};

// Event payloads
export type CollectionViewPayload = CollectionPayload &
  ViewBasePayload &
  BasePayload;
export type ProductViewPayload = ProductsPayload &
  ViewBasePayload &
  BasePayload;
export type CartViewPayload = ViewBasePayload & BasePayload;
export type PageViewPayload = ViewBasePayload & BasePayload;
export type SearchViewPayload = SearchPayload & ViewBasePayload & BasePayload;
export type CartUpdatePayload = CartPayload & BasePayload;
export type CartLineUpdatePayload = CartLinePayload & CartPayload & BasePayload;
export type CustomEventPayload = OtherData & BasePayload;

export type EventPayloads =
  | PageViewPayload
  | ProductViewPayload
  | CollectionViewPayload
  | CartViewPayload
  | SearchViewPayload
  | CartUpdatePayload
  | CartLineUpdatePayload
  | CustomEventPayload;

export type EventTypes =
  | (typeof AnalyticsEvent)['PAGE_VIEWED']
  | (typeof AnalyticsEvent)['PRODUCT_VIEWED']
  | (typeof AnalyticsEvent)['COLLECTION_VIEWED']
  | (typeof AnalyticsEvent)['CART_VIEWED']
  | (typeof AnalyticsEvent)['SEARCH_VIEWED']
  | (typeof AnalyticsEvent)['CART_UPDATED']
  | (typeof AnalyticsEvent)['PRODUCT_ADD_TO_CART']
  | (typeof AnalyticsEvent)['PRODUCT_REMOVED_FROM_CART']
  | (typeof AnalyticsEvent)['CUSTOM_EVENT'];

type BaseViewProps = {
  customData?: OtherData;
};

// Event types
type PageViewProps = BaseViewProps & {
  type: typeof AnalyticsEvent.PAGE_VIEWED;
  data?: OtherData;
};

type ProductViewProps = BaseViewProps & {
  type: typeof AnalyticsEvent.PRODUCT_VIEWED;
  data: Omit<ProductViewPayload, keyof BasePayload>;
};

type CollectionViewProps = BaseViewProps & {
  type: typeof AnalyticsEvent.COLLECTION_VIEWED;
  data: Omit<CollectionViewPayload, keyof BasePayload>;
};

type CartViewProps = BaseViewProps & {
  type: typeof AnalyticsEvent.CART_VIEWED;
  data?: Omit<CartViewPayload, keyof BasePayload>;
};

type SearchViewProps = BaseViewProps & {
  type: typeof AnalyticsEvent.SEARCH_VIEWED;
  data?: Omit<SearchViewPayload, keyof BasePayload>;
};

type CustomViewProps = BaseViewProps & {
  type: typeof AnalyticsEvent.CUSTOM_EVENT;
  data?: OtherData;
};

function AnalyticsView(props: PageViewProps): null;
function AnalyticsView(props: ProductViewProps): null;
function AnalyticsView(props: CollectionViewProps): null;
function AnalyticsView(props: CartViewProps): null;
function AnalyticsView(props: SearchViewProps): null;
function AnalyticsView(props: CustomViewProps): null;
function AnalyticsView(props: any) {
  const {type, data = {}} = props;
  const location = useLocation();
  const lastLocationPathname = useRef<string>('');
  const {publish, cart, prevCart, shop} = useAnalytics();
  const url = location.pathname + location.search;

  // Publish page_viewed events when the URL changes
  useEffect(() => {
    if (lastLocationPathname.current === url) return;

    // don't publish the event until we have the shop
    if (!shop) return;

    const viewPayload: PageViewPayload = {
      ...data,
      url: window.location.href,
      cart,
      prevCart,
      shop,
    };

    lastLocationPathname.current = url;

    publish(type, viewPayload);
  }, [publish, url, cart, prevCart, shop]);

  return null;
}

export function AnalyticsPageView(props: Omit<PageViewProps, 'type'>) {
  return <AnalyticsView {...props} type="page_viewed" />;
}

export function AnalyticsProductView(props: Omit<ProductViewProps, 'type'>) {
  return <AnalyticsView {...props} type="product_viewed" />;
}

export function AnalyticsCollectionView(
  props: Omit<CollectionViewProps, 'type'>,
) {
  return <AnalyticsView {...props} type="collection_viewed" />;
}

export function AnalyticsCartView(props: Omit<CartViewProps, 'type'>) {
  return <AnalyticsView {...props} type="cart_viewed" />;
}

export function AnalyticsSearchView(props: Omit<SearchViewProps, 'type'>) {
  return <AnalyticsView {...props} type="search_viewed" />;
}

export function AnalyticsCustomView(props: CustomViewProps) {
  return <AnalyticsView {...props} />;
}
