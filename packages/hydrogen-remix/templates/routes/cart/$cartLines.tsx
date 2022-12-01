import {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';
import {redirect, type LoaderArgs} from '@shopify/hydrogen-remix';
import {cartCreate, cartLinesAdd, cartDiscountCodesUpdate} from '../../cart';

/**
 * Creates or updates a cart with the passed encoded cart line inputs and redirects to checkout
 * @param $encondedLines a route param including cart line inputs encoded as /$variantId:$quantity,$variantId:$quantity
 * @param ?discount (optional) discount to apply to the cart
 * @param ?payment=shop_pay (optional) if set it redirects to shop pay checkout, otherwise to standard checkout
 * @see https://help.shopify.com/en/manual/products/details/checkout-link
 * @example Adds one line item and redirects to standard checkout
 * ```ts
 * /cart/42562624913464:1
 *
 * ```
 * @example Adds one line item and redirects to shop pay checkout
 * ```ts
 * /cart/42562624847928:1?payment=shop_pay
 *
 * ```
 * @example Adds multiple line items with different quantities, a discount code and redirects to shop pay checkout
 * ```ts
 * /cart/42562624847928:2,42562624913464:1?payment=shop_pay&discount=FREESHIPPING
 *
 * ```
 */
export async function loader({request, context, params}: LoaderArgs) {
  const {session, env} = context;
  const headers = new Headers();
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const payment = searchParams.get('payment') || null;
  const discount = searchParams.get('discount') || null;
  const checkoutViaShopPay = payment === 'shop_pay';
  const {cartLines = ''} = params;

  if (!cartLines || typeof url?.search !== 'string') {
    return redirect('/');
  }

  const lines = parseEncodedLines(cartLines);

  if (!lines?.length) {
    console.error('/cart/$cartLines: failed no valid lines to add');
    console.error({cartLines, lines});
    return redirect('/');
  }

  const shopPayCheckoutUrl = `https://${env.SHOPIFY_STORE_DOMAIN}/cart/${cartLines}${url.search}`;
  let standardCheckoutUrl;
  let cartId = await session.get('cartId');

  // no existing cart create one
  if (!cartId) {
    const {cart, errors} = await cartCreate({
      context,
      input: {
        lines,
        discountCodes: discount ? [discount] : [],
      },
    });

    if (!cart || errors?.length) {
      console.error('/cart/$cartLines: failed to create cart');
      console.error({lines, errors});
      return redirect('/');
    }

    standardCheckoutUrl = cart.checkoutUrl;
    cartId = cart.id;
    session.set('cartId', cartId);
    headers.set('Set-Cookie', await session.commit());
  } else {
    // have an existing cart, add lines
    const {cart, errors} = await cartLinesAdd({context, cartId, lines});

    if (!cart || errors.length) {
      // Adding console.errors for debugging because we are silently redirecting on errors
      console.error('/cart/$cartLines: failed to add lines to the cart');
      console.error({lines, errors});
      return redirect('/', {headers});
    }

    // apply discount if passed in
    if (discount) {
      const {cart, errors} = await cartDiscountCodesUpdate({
        cartId,
        context,
        discountCodes: [discount],
      });

      if (!cart || errors?.length) {
        // Adding console.errors for debugging because we are silently redirecting on errors
        console.error('/cart/$cartLines: failed to apply discount');
        console.error({discount});
        return redirect('/', {headers});
      }

      standardCheckoutUrl = cart.checkoutUrl;
    }
  }

  return checkoutViaShopPay
    ? redirect(shopPayCheckoutUrl)
    : redirect(standardCheckoutUrl, {headers});
}

/**
 * Parses encoded checkout line items to CartLineInput[]
 * @param encondedLines string with encoded cart line(s)
 * @see https://stackoverflow.com/questions/8648892/how-to-convert-url-parameters-to-a-javascript-object
 * @returns CartLineInput[]
 */
function parseEncodedLines(encodedLines: string | undefined): CartLineInput[] {
  if (typeof encodedLines === 'undefined') return [];
  return encodedLines
    .split(',')
    .map((encodedLine) => {
      try {
        const [variantId, quantity] = encodedLine.split(':');
        if (typeof variantId !== 'string' || typeof quantity !== 'string')
          return null;

        const isValidVariantId = /^[0-9]{0,12}/.test(variantId);
        const isValidQuantity = /^\d+$/.test(quantity);

        if (!isValidVariantId || !isValidQuantity) return null;

        return {
          merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
          quantity: parseInt(quantity),
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean) as CartLineInput[];
}
