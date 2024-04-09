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
  /** The shop data passed in from the `AnalyticsProvider`. */
  shop: ShopAnalytic | null;
  /** The custom data passed in from the `AnalyticsProvider`. */
  customData?: AnalyticsProviderProps['customData'];
};

type UrlPayload = {
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
};

type ProductsPayload = {
  /** The products associated with this event. */
  products: Array<ProductPayload & OtherData>;
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
  searchResults?: any;
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
  UrlPayload &
  BasePayload;
export type ProductViewPayload = ProductsPayload & UrlPayload & BasePayload;
export type CartViewPayload = UrlPayload & BasePayload;
export type PageViewPayload = UrlPayload & BasePayload;
export type SearchViewPayload = SearchPayload & UrlPayload & BasePayload;

type ViewPayload =
  | PageViewPayload
  | ProductViewPayload
  | CollectionViewPayload
  | CartViewPayload
  | SearchViewPayload;

export type CartUpdatePayload = CartPayload & BasePayload & OtherData;
export type CartLineUpdatePayload = CartLinePayload &
  CartPayload &
  BasePayload &
  OtherData;
export type CustomEventPayload = BasePayload & OtherData;

export type EventPayloads =
  | PageViewPayload
  | ProductViewPayload
  | CollectionViewPayload
  | CartViewPayload
  | SearchViewPayload
  | CartUpdatePayload
  | CartLineUpdatePayload
  | CustomEventPayload;

export type EventTypes = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type BaseViewProps = {
  customData?: OtherData;
};

function AnalyticsView(
  props: BasicViewProps & {type: typeof AnalyticsEvent.PAGE_VIEWED},
): null;
function AnalyticsView(
  props: ProductViewProps & {type: typeof AnalyticsEvent.PRODUCT_VIEWED},
): null;
function AnalyticsView(
  props: CollectionViewProps & {type: typeof AnalyticsEvent.COLLECTION_VIEWED},
): null;
function AnalyticsView(
  props: BasicViewProps & {type: typeof AnalyticsEvent.CART_VIEWED},
): null;
function AnalyticsView(
  props: SearchViewProps & {type: typeof AnalyticsEvent.SEARCH_VIEWED},
): null;
function AnalyticsView(props: CustomViewProps): null;
function AnalyticsView(props: any) {
  const {type, data = {}, customData} = props;
  const location = useLocation();
  const {publish, cart, prevCart, shop} = useAnalytics();
  const url = location.pathname + location.search;

  // Publish page_viewed events when the URL changes
  useEffect(() => {
    // don't publish the event until we have the shop
    if (!shop) return;

    const viewPayload: ViewPayload = {
      ...data,
      customData,
      url: window.location.href,
      cart,
      prevCart,
      shop,
    };

    publish(type, viewPayload);
  }, [publish, url, cart, prevCart, shop]);

  return null;
}

type BasicViewProps = {
  data?: OtherData;
  customData?: OtherData;
};

type ProductViewProps = {
  data: ProductsPayload;
  customData?: OtherData;
};

type CollectionViewProps = {
  data: CollectionPayload;
  customData?: OtherData;
};

type SearchViewProps = {
  data?: SearchPayload;
  customData?: OtherData;
};

type CustomViewProps = {
  type: typeof AnalyticsEvent.CUSTOM_EVENT;
  data?: OtherData;
  customData?: OtherData;
};

export function AnalyticsPageView(props: BasicViewProps) {
  return <AnalyticsView {...props} type="page_viewed" />;
}

export function AnalyticsProductView(props: ProductViewProps) {
  return <AnalyticsView {...props} type="product_viewed" />;
}

export function AnalyticsCollectionView(props: CollectionViewProps) {
  return <AnalyticsView {...props} type="collection_viewed" />;
}

export function AnalyticsCartView(props: BasicViewProps) {
  return <AnalyticsView {...props} type="cart_viewed" />;
}

export function AnalyticsSearchView(props: SearchViewProps) {
  return <AnalyticsView {...props} type="search_viewed" />;
}

export function AnalyticsCustomView(props: CustomViewProps) {
  return <AnalyticsView {...props} />;
}
