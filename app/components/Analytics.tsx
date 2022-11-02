import type {
  Cart,
  CartLine,
  CartLineEdge,
  Customer,
  OrderEdge,
  Product,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

import type {
  BaseEventPayload,
  PageViewProductEventPayload,
  PageViewSearchResultsPayload,
  AddToCartEventPayload,
  RemoveFromCartEventPayload,
} from '~/lib/events';

import {useOnCustomer, useOnCart, useOnEvent, useOnPage} from '~/lib/events';

declare global {
  interface Window {
    dataLayer: Record<string, any>[];
    gtag: (msg: string, setting: string, settings: any) => void;
  }
}

export type Params = {
  [key: string]: any;
};

const userId = crypto.randomUUID();

export function Analytics() {
  // page/navigation events
  useOnPage({
    view(payload) {
      gtmViewPage(payload);
    },
    viewProduct(payload) {
      gtmViewItem(payload);
    },
    viewCart(payload) {
      gtmViewCart(payload);
    },
    viewSearch(payload) {
      gtmViewSearchResults(payload);
    },
  });

  // cart events
  useOnCart({
    addLines(payload) {
      gtmAddToCart(payload);
    },
    removeLines(payload) {
      gtmRemoveFromCart(payload);
    },
    // ...
  });

  useOnCustomer({
    login: (payload) => {
      gtmLogin(payload);
    },
    register: (payload) => {
      gtmRegister(payload);
    },
  });

  // user-defined events
  useOnEvent({
    viewSideCart(payload) {
      gtmViewCart(payload);
    },
    beginCheckout(payload) {
      gtmBeginCheckout(payload);
    },
    selectItem(payload) {
      // @todo: selected variant change
    },
  });

  return null;
}

/*
  GTM Event handlers -----------------------------------------------------------------------------
*/
function gtmViewPage({event, page, data}: BaseEventPayload) {
  const {cartTotal, products} = data?.cart
    ? parseCart(data.cart)
    : {cartTotal: 0, products: []};
  window.dataLayer.push({
    event: 'page_view',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    cart_total: cartTotal,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data.customer),
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      cart_contents: {
        products,
      },
    },
  });
}

function gtmViewSearchResults({
  event,
  page,
  data,
}: PageViewSearchResultsPayload) {
  window.dataLayer.push({
    event: 'view_search_results',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data.customer),
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      actionField: {list: 'Search results'},
      impressions: parseProducts(data.searchResults),
    },
  });
}

function gtmViewItem({event, page, data}: PageViewProductEventPayload) {
  const product = parseProduct(data.product);
  window.dataLayer.push({
    event: 'view_item',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data.customer),
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      detail: {
        actionField: {
          list:
            page.url.pathname +
            `${page.url.search ? '?' + page.url.search : ''}`,
          action: 'detail',
        },
        products: [product],
      },
    },
  });
}

function gtmViewCart({event, page, data}: BaseEventPayload) {
  const {cartTotal, products} = data?.cart
    ? parseCart(data.cart)
    : {cartTotal: 0, products: []};

  window.dataLayer.push({
    event: 'view_cart',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data.customer),
    cart_total: cartTotal,
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      actionField: {
        list: 'Shopping Cart',
      },
      impressions: products,
    },
  });
}

function gtmAddToCart({event, page, data}: AddToCartEventPayload) {
  const {cartTotal} = data?.cart ? parseCart(data.cart) : {cartTotal: 0};
  window.dataLayer.push({
    event: 'add_to_cart',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    cart_total: cartTotal,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data?.customer),
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      add: {
        products: getProductsFromLines(data.addedLines),
      },
    },
  });
}

function gtmRemoveFromCart({event, page, data}: RemoveFromCartEventPayload) {
  const {cartTotal} = data?.cart ? parseCart(data.cart) : {cartTotal: 0};
  window.dataLayer.push({
    event: 'add_to_cart',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    cart_total: cartTotal,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data?.customer),
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      remove: {
        products: getProductsFromLines(data.removedLines),
      },
    },
  });
}

function gtmLogin({event, page, data}: BaseEventPayload) {
  const {cartTotal, products} = data?.cart
    ? parseCart(data.cart)
    : {cartTotal: 0, products: []};
  window.dataLayer.push({
    event: 'login',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    cart_total: cartTotal,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data.customer),
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      cart_contents: {
        products,
      },
    },
  });
}

function gtmRegister({event, page, data}: BaseEventPayload) {
  const {cartTotal, products} = data?.cart
    ? parseCart(data.cart)
    : {cartTotal: 0, products: []};
  window.dataLayer.push({
    event: 'register',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    cart_total: cartTotal,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data.customer),
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      cart_contents: {
        products,
      },
    },
  });
}

function gtmBeginCheckout({event, page, data}: BaseEventPayload) {
  const {cartTotal, products} = data?.cart
    ? parseCart(data.cart)
    : {cartTotal: 0, products: []};
  window.dataLayer.push({
    event: 'begin_checkout',
    device: parseDevice(),
    page,
    event_id: event.id,
    event_time: event.time,
    cart_total: cartTotal,
    user_properties: parseCustomer(data.customer),
    marketing: parseMarketing(data.customer),
    ecommerce: {
      currencyCode: data.country.currency.isoCode,
      cart_contents: {
        products,
      },
    },
  });
}

/*
  helpers -----------------------------------------------------------------------------
*/
function getProductsFromLines(lines: CartLineEdge[]) {
  return (lines || []).map(({node: line}) => {
    const options = line.merchandise.selectedOptions.reduce((result, item) => {
      result[item.name] = item.value;
      return result;
    }, {} as {[key: string]: any});

    return {
      item_id: line.merchandise.id.split('/').pop(),
      item_name: line.merchandise.product.title,
      price: line.merchandise.priceV2.amount,
      item_brand: '',
      item_category: 'T-Shirts',
      item_variant: options?.Color || '',
      dimension1: options?.Size || '',
      quantity: line.quantity,
    };
  });
}

function parseDevice() {
  if (!window) return {};
  return {
    screen_resolution: `${Math.floor(
      window.screen.width * window.devicePixelRatio,
    )}x${Math.floor(window.screen.height * window.devicePixelRatio)}`,
    viewport_size: `${window.screen.width}x${window.screen.height}`,
    encoding: document.characterSet || 'UTF-8',
    language: window.navigator.language,
    colors: screen.colorDepth,
  };
}

function parseCustomer(customer: Customer | null) {
  const customerId = customer?.id ? customer.id.split('/').pop() : userId;

  if (!customer) {
    return {
      visitor_type: 'guest',
      customer_id: customerId,
      user_id: customerId,
    };
  }

  const {defaultAddress, orders} = customer;

  const customerTotalSpent = orders?.edges?.length
    ? orders.edges
        .reduce(
          (total: number, edge: OrderEdge) =>
            total + parseFloat(edge.node.currentTotalPrice.amount) || 0,
          0,
        )
        .toString()
    : '0';

  return {
    customer_address_1: defaultAddress?.address1 || '',
    customer_address_2: defaultAddress?.address2 || '',
    customer_city: defaultAddress?.city || '',
    customer_country: defaultAddress?.country || '',
    customer_email: customer?.email || '',
    customer_first_name: customer?.firstName || '',
    customer_id: customerId || '',
    customer_last_name: customer?.lastName || '',
    customer_order_count: orders?.edges?.length.toString() || '0',
    customer_phone: customer?.phone || '',
    customer_province: defaultAddress?.province || '',
    customer_province_code: defaultAddress?.provinceCode || '',
    customer_tags: customer?.tags?.join(', ') || [],
    customer_total_spent: customerTotalSpent,
    customer_zip: defaultAddress?.zip || '',
    user_consent: '',
    visitor_type: 'logged_in',
    user_id: customerId,
  };
}

function parseLine(line: CartLine) {
  const {merchandise, quantity} = line;
  const {product, title, priceV2, compareAtPriceV2, image, id} = merchandise;
  const productId = getIdFromGid(product.id);
  const variantId = getIdFromGid(id);
  return {
    id: merchandise.sku || productId,
    name: product?.title || '',
    brand: product?.vendor || '',
    category: product?.productType || '',
    variant: title,
    price: priceV2?.amount || '',
    quantity,
    product_id: productId,
    variant_id: variantId,
    compare_at_price: compareAtPriceV2?.amount || '',
    image: image?.url || '',
    inventory: merchandise.quantityAvailable,
  };
}

function parseProducts(products: Product[]) {
  return products.map(parseProduct);
}

function parseProduct(product: Product) {
  const productId = product.id.split('/').pop();
  const firstVariant = product.variants.nodes[0];
  const {priceV2, compareAtPriceV2, image, title, id} = firstVariant;
  const variantId = id.split('/').pop();
  return {
    id: firstVariant.sku || productId,
    name: product?.title || '',
    brand: product?.vendor || '',
    category: product?.productType || '',
    variant: title,
    price: priceV2?.amount || '',
    quantity: 1,
    product_id: productId,
    variant_id: variantId,
    compare_at_price: compareAtPriceV2?.amount || '',
    image: image?.url || '',
    inventory: '',
  };
}

function parseCart(cart: Cart) {
  const {cost, lines, attributes} = cart;
  const products = lines.edges.map(({node}) => parseLine(node));
  return {
    attributes: attributes || [],
    cartTotal: cost?.totalAmount?.amount || '0',
    currencyCode: cost?.totalAmount?.currencyCode || 'USD',
    products,
  };
}

function getIdFromGid(gid: string) {
  if (!gid) return null;
  return gid.split('/').pop()?.split('?')[0];
}

function parseMarketing(customer: any) {
  if (!window) return {};
  const urlParams = Object.fromEntries(
    new URLSearchParams(window.location.search),
  ) as Params;

  const marketing: {[key: string]: string} = {
    ...parseFacebookCookies(),
    ...parseGoogleCookies(),
    ...parseTikTokCookies(),
    ...parseCriteoCookies(),
    ...parseUtmParams(urlParams),
    user_id: customer?.id,
  };

  const gaId = getCookieFromPartial('_ga_');
  if (!gaId) {
    return marketing;
  }

  return {...marketing, [gaId.name]: gaId.value};
}

function parseUtmParams(urlParams: Params) {
  return Object.keys(urlParams).reduce((utm, paramKey) => {
    if (/^utm_/.test(paramKey)) {
      utm[paramKey] = urlParams[paramKey];
    }
    return utm;
  }, {} as Params);
}

function parseGoogleCookies() {
  return {
    _ga: getCookie('_ga') || '',
    _gaexp: getCookie('_gaexp') || '',
    _gid: getCookie('_gid') || '',
    __utma: getCookie('__utma') || '',
  };
}

function parseFacebookCookies() {
  return {
    _fbp: getCookie('_fpb') || '',
    _fbc: getCookie('_fpb') || '',
  };
}

function parseTikTokCookies() {
  return {
    ttclid: getCookie('ttclid') || '',
  };
}

function parseCriteoCookies() {
  return {
    crto_mapped_user_id: getCookie('crto_mapped_user_id') || '',
    crto_is_user_optout: getCookie('crto_is_user_optout') || '',
  };
}

export function getCookie(cName: string) {
  let i;
  let x;
  let y;
  const ARRcookies = document.cookie.split(';');
  for (i = 0; i < ARRcookies.length; i += 1) {
    x = ARRcookies[i].substr(0, ARRcookies[i].indexOf('='));
    y = ARRcookies[i].substr(ARRcookies[i].indexOf('=') + 1);
    x = x.replace(/^\s+|\s+$/g, '');
    if (x === cName) {
      return decodeURI(y);
    }
  }
  return false;
}

export function getCookieFromPartial(cName: string) {
  let i;
  let x;
  let y;
  const cookies = document.cookie.split(';');
  for (i = 0; i < cookies.length; i += 1) {
    x = cookies[i].substr(0, cookies[i].indexOf('='));
    y = cookies[i].substr(cookies[i].indexOf('=') + 1);
    x = x.replace(/^\s+|\s+$/g, '');
    if (x.includes(cName)) {
      return {name: x, value: decodeURI(y)};
    }
  }
  return false;
}
