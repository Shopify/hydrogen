import type {
  Cart,
  CartLine,
  Customer,
  MailingAddress,
  Order,
  Country,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {useOnAddToCart} from './useOnAddToCart';
import {useOnPageView} from './useOnPageView';
import {flattenConnection} from '@shopify/hydrogen-ui-alpha';

type EventProps = {cart: Cart; customer: Customer; countries: Country[]};

export function Events({
  cart: rawCart,
  customer: rawCustomer,
  countries,
}: EventProps) {
  const cart = flattenCart(rawCart)
  const customer = flattenCustomer(rawCustomer);
  const country = getCountry(cart, countries)

  useOnPageView(
    ({event, page}) => {
      const {cartTotal, items} = cart
        ? parseCart(cart)
        : {cartTotal: 0, items: []};

      const payload = {
        event: event.type,
        device: parseDevice(),
        page: {
          title: page.title,
          description: page.description,
        },
        event_id: event.id,
        event_time: event.time,
        cart_total: cartTotal,
        user_properties: parseCustomer(customer),
        marketing: parseMarketing(customer),
        ecommerce: {
          currencyCode: country.currency.isoCode,
          cart_contents: {
            products: items,
          },
        },
      };

      // push to dataLayer or analytics.page(event) if using a package like analytics
      // https://www.npmjs.com/package/analytics
      window.dataLayer.push(payload);
      return payload;
    },
    {forwardToServer: true}
  );

  useOnAddToCart(
    ({event, page, data}) => {
      const addedCartLines =
        cart?.lines.filter(
          (line) => line.merchandise.id === data.addedCartLines.variantId
        ) || null;

      console.log({addedCartLines});

      const payload = {
        event: event.type,
        user_properties: parseCustomer(customer),
        event_id: event.id,
        event_time: event.time,
        marketing: parseMarketing(customer),
        ecommerce: {
          currencyCode: country?.currency?.isoCode,
          add: {
            actionField: {
              list: page.url.pathname,
            },
            products: addedCartLines.map(parseLine), // Array of added products
          },
        },
      };

      // dynamicYield.addItem(addedProducts[0], items, customerCurrencyCode);
      // analytics.page(PAYLOAD);
      window.dataLayer.push(payload);
      return payload;
    },
    {forwardToServer: true}
  );
  return null;
}


/*
  PAGE_VIEW helpers -----------------------------------------------------------------------------
*/
function flattenCart(cart: Cart): FlatCart {
  return {
    ...cart,
    lines: cart?.lines ? flattenConnection(cart.lines) : [],
  } as FlatCart;
}

function flattenCustomer(customer: Customer): FlatCustomer {
  return {
    ...customer,
    orders: customer?.orders ? flattenConnection(customer.orders) : [],
    addresses: customer?.addresses ? flattenConnection(customer.addresses) : [],
  } as FlatCustomer
}


function getCountry(cart: Cart, countries: Country[]) {
  return cart && countries?.length
      ? countries.find(
          (country) => country.isoCode === cart.buyerIdentity.countryCode
        )
      : {
          currencyCode: 'USD',
        };
}

function parseDevice() {
  if (!window) return {};
  return {
    screen_resolution: `${Math.floor(
      window.screen.width * window.devicePixelRatio
    )}x${Math.floor(window.screen.height * window.devicePixelRatio)}`,
    viewport_size: `${window.screen.width}x${window.screen.height}`,
    encoding: document.characterSet || 'UTF-8',
    language: window.navigator.language,
    colors: screen.colorDepth,
  };
}

type FlatCustomer = Customer & {
  addresses: MailingAddress[];
  orders: Order[] | [];
};

// @todo: fix type to remove addresses and orders connections
function parseCustomer(customer: FlatCustomer) {
  const customerId = customer?.id
    ? customer.id.split('/').pop()
    : crypto.randomUUID(); // uuid

  if (!customer) {
    return {
      visitor_type: 'guest',
      customer_id: customerId,
      user_id: customerId,
    };
  }

  const {defaultAddress, orders} = customer;

  const customerTotalSpent = orders?.length
    ? orders
        .reduce(
          (prev: number, curr: any) =>
            prev + parseFloat(curr.currentTotalPrice.amount || 0),
          0
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
    customer_order_count: orders?.length.toString() || '0',
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

type FlatCart = Cart & {
  lines: CartLine[];
};

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

function parseCart(cart: FlatCart) {
  const {cost, lines, attributes} = cart;
  const items = lines.map(parseLine);
  return {
    attributes: attributes || [],
    cartTotal: cost?.totalAmount?.amount || '0',
    currencyCode: cost?.totalAmount?.currencyCode || 'USD',
    items,
  };
}

function getIdFromGid(gid: string) {
  if (!gid) return null;
  return gid.split('/').pop()?.split('?')[0];
}

type UtmParams = {
  [key: string]: any;
};

function parseMarketing(customer: any) {
  if (!window) return {};
  const defaultUtm: UtmParams = {};
  const urlParams = Object.fromEntries(
    new URLSearchParams(window.location.search)
  );
  const utmParams = Object.keys(urlParams).reduce((utm, paramKey) => {
    if (/^utm_/.test(paramKey)) {
      utm[paramKey] = urlParams[paramKey];
    }
    return utm;
  }, defaultUtm);

  const gaId = getCookieFromPartial('_ga_');
  const marketing: {[key: string]: string} = {
    _fbp: getCookie('_fpb') || '',
    _fbc: getCookie('_fpb') || '',
    _ga: getCookie('_ga') || '',
    _gaexp: getCookie('_gaexp') || '',
    _gid: getCookie('_gid') || '',
    __utma: getCookie('__utma') || '',
    ttclid: getCookie('ttclid') || '',
    crto_mapped_user_id: getCookie('crto_mapped_user_id') || '',
    crto_is_user_optout: getCookie('crto_is_user_optout') || '',
    user_id: customer?.id,
    ...utmParams,
  };

  if (gaId) {
    marketing[gaId.name] = gaId.value;
  }

  return marketing;
}

/*
  Generic helpers -----------------------------------------------------------------------------
*/

/**
 * get cookie
 */
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

/**
 * get cookie from partial
 */
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
