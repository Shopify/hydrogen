import {useLocation, useMatches} from '@remix-run/react';
import {useEffect, useRef} from 'react';

// https://www.matthewedgar.net/server-side-analytics-vs-client-side-analytics/#:~:text=Additionally%2C%20client%2Dside%20and%20server,while%20server%2Dside%20programs%20will.
export function useOnPageView(
  callback?: (data: any) => any,
  options?: {forwardToServer: boolean} | undefined
) {
  const location = useLocation();
  const prevPathname = useRef<string | undefined>();

  // emit page view
  useEffect(() => {
    if (location.pathname === prevPathname.current) return;

    // cache prev location
    prevPathname.current = location.pathname;

    // @todo: getPage
    const descriptionTag = document.querySelector(
      'meta[name=description]'
    ) as HTMLMetaElement;
    const description = descriptionTag ? descriptionTag.content : '';
    const title = document.title;

    // @todo: flat customer orders and addresses
    // @todo: add type
    let payload = {
      event: {
        type: 'page_view',
        id: crypto.randomUUID(),
        time: new Date().toISOString(),
      },
      page: {
        url: location,
        title,
        description,
      },
    };

    // capture the return user-modified payload (optional)
    let userPayload;
    if (typeof callback === 'function') {
      userPayload = callback(payload);
    }

    // send the
    if (options?.forwardToServer) {
      navigator.sendBeacon(
        `/events?type=${payload.event.type}`,
        JSON.stringify(userPayload || payload)
      );
    }

    console.log(`👀 EVENT:${payload.event.type}`, location.pathname, userPayload || payload);
  }, [
    callback,
    location.pathname,
  ]);
}

/*
  PAGE_VIEW
  VIEW_PLP
  VIEW_SEACH_RESULTS
  SELECT_ITEM
  VIEWED_PRODUCT
  ADD_TO_CART
  REMOVE_FROM_CART_CUSTOM
  VIEW_CART_CUSTOM
  ACCOUNT_LOGIN
*/

/*
No	GoogleAnalytics Analytics	Description
1	  view_promotion	When a user views a promotion
2	  select_promotion	When a user clicks on a promotion
3	  view_item_list	View of product impressions in a list
4	  select_item	 Click on a product
5	  view_item	detail	View product details
6	  add_to_cart	 Add product to cart
7	  add_to_wishlist	 Add product to a wishlist
8	  remove_from_cart	Remove product from the cart
9	  view_cart	 View shopping cart
10	begin_checkout	Initiate the checkout process
11	add_shipping_info 	Add shipping info during the checkout
12	add_payment_info 	Add payment info during the checkout
13	purchase	Purchase product
14	refund	Refund product
15	item_id	Product ID / SKU
16	item_name	Name of the product
17	item_list_name	Product list name
18	item_list_id	Product list identifier
19	index	Product position in the list
20	item_brand	Product brand
21	item_category		Product category
22	item_category_2	Product category 2nd level
23	item_category_3	Product category 3rd level
24	item_category_4	Product category 4th level
25	item_category_5	Product category 5th level
26	item_variant	Product variant name or description
27	affiliation	The store affiliation
28	discount Any discount on product
29	coupon	Coupon code used
30	price	Product price
31	currency User currency
32	quantity	Product quantity
33	promotion_id	Promotion ID
34	promotion_name	Promotion name
35	transaction_id	Unique ID for the transaction required for purchase and refund events
36	value	Product revenue
37	shipping charges for selected product in cart
38	payment_type	The payment method sent with add_payment_info
*/

/*
SKIMS PAGE_VIEW
ClientAnalytics.subscribe(
  ClientAnalytics.eventNames.PAGE_VIEW,
  (payload) => {
    const device = parseDeviceInfo();
    const {shopify, normalizedRscUrl: payloadUrl} = payload;
    const {
      customer,
      customerCurrencyCode = 'USD',
      userId,
    } = shopify || {};
    const userProperties = parseCustomerData(customer, userId);
    const {cartTotal, items} = parseCartData(cost, lines, attributes);
    const marketing = parseMarketingInfo(customer, userId);

    // Ignore sub page loads
    if (prevUrl === payloadUrl) return;
    prevUrl = payloadUrl;

    console.log('PAGE_VIEW');
    analytics.page({event: 'dl_route_change'});

    analytics.page({
      event: 'dl_user_data',
      device,
      page: {
        title: '',
      },
      event_id: uuidv4(),
      event_time: new Date().toISOString(),
      cart_total: cartTotal,
      user_properties: userProperties,
      marketing,
      ecommerce: {
        cart_contents: {
          products: items,
        },
        currencyCode: customerCurrencyCode,
      },
    });
  },
);
*/

/*
function parseCustomerData(data: any, uuid: string) {
  const [address] = flattenConnection(data?.addresses || []) as any;
  const orders = flattenConnection(data?.orders || []);
  const customerId = data?.id ? getIdFromGid(data.id, 'Customer') : '';

  return {
    customer_address_1: address?.address1 || '',
    customer_address_2: address?.address2 || '',
    customer_city: address?.city || '',
    customer_country: address?.country || '',
    customer_email: data?.email || '',
    customer_first_name: data?.firstName || '',
    customer_id: customerId || '',
    customer_last_name: data?.lastName || '',
    customer_order_count: orders?.length.toString() || '0',
    customer_phone: data?.phone || '',
    customer_province: address?.province || '',
    customer_province_code: address?.provinceCode || '',
    customer_tags: data?.tags?.join(', '),
    customer_total_spent:
      orders
        ?.reduce(
          (prev: number, curr: any) =>
            prev + parseFloat(curr.currentTotalPrice.amount || 0),
          0,
        )
        .toString() || '0',
    customer_zip: address?.zip || '',
    user_consent: '',
    visitor_type: customerId ? 'logged_in' : 'guest',
    user_id: customerId || uuid,
  };
}

function parseDeviceInfo() {
  if (!window) return {};

  const deviceInfo = {
    screen_resolution: `${window.screen.width * window.devicePixelRatio}x${
      window.screen.height * window.devicePixelRatio
    }`,
    viewport_size: `${window.screen.width}x${window.screen.height}`,
    encoding: document.characterSet || 'UTF-8',
    language: window.navigator.language,
    colors: screen.colorDepth,
  };

  return deviceInfo;
}

  function parseMarketingInfo(customer: any, uuid: string) {
    if (!window) return {};
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: any = {};
    urlParams.forEach((value: string, key: string) => {
      if (key.includes('utm_')) {
        utmParams[key] = value;
      }
    });

    const gaId = getCookiFromPartial('_ga_');
    const data = {
      _fbp: getCookie('_fpb') || '',
      _fbc: getCookie('_fpb') || '',
      _ga: getCookie('_ga') || '',
      _gaexp: getCookie('_gaexp') || '',
      _gid: getCookie('_gid') || '',
      __utma: getCookie('__utma') || '',
      ttclid: getCookie('ttclid') || '',
      crto_mapped_user_id: getCookie('crto_mapped_user_id') || '',
      crto_is_user_optout: getCookie('crto_is_user_optout') || '',
      user_id: customer?.id ? getIdFromGid(customer.id, 'Customer') : uuid,
      ...utmParams,
    };

    if (gaId) {
      data[gaId.name] = gaId.value;
    }

    return data;
  }

  function parseCartData(cartCost: any, cartLines: any[], cartAttributes: any) {
    return {
      attributes: cartAttributes || [],
      cartTotal: cartCost?.totalAmount?.amount || '0',
      currencyCode: cartCost?.totalAmount?.currencyCode || 'USD',
      items: cartLines.map((item, idx: number) => {
        const {merchandise, quantity} = item as any;
        const {product, title, priceV2, compareAtPriceV2, image, id} =
          merchandise;
        const productId = getIdFromGid(product.id, 'Product');
        const variantId = getIdFromGid(id, 'ProductVariant');

        return {
          merchandiseId: id,
          id: merchandise.sku || productId,
          name: product?.title || '',
          brand: product?.vendor || '',
          category: product?.productType || '',
          variant: title,
          price: priceV2?.amount || '',
          position: idx,
          quantity,
          product_id: productId,
          variant_id: variantId,
          compare_at_price: compareAtPriceV2?.amount || '',
          image: image?.url || '',
          inventory: '',
        };
      }),
    };
  }

  return null;
}
*/
