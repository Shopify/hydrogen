import {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';
import {redirect, type LoaderArgs} from '@shopify/hydrogen-remix';
import {cartCreate, cartLinesAdd, cartDiscountCodesUpdate} from '../../cart';

/**
 * Creates or update a cart with the passed encoded cart line inputs and redirects to checkout
 * @param $encondedLines a route param including cart line inputs encoded as /$variantId:$quantity,$variantId:$quantity
 * @param ?discount ((optional) discount to apply to the cart
 * @param ?payment=shop_pay (optional if set it redirects to shop pay checkout
 * @see https://help.shopify.com/en/manual/products/details/checkout-link
 * @example Adds one line item and redirects to standard checkout
 * ```ts
 * /cart/42562624913464:1
 *
 * ```
 * @example Adds one line item and redirects to shop pay checkout
 * ```ts
 * /cart/42562624913464:1?payment=shop_pay
 *
 * ```
 * @example Adds multiple line items with different quantities, a discount code and redirects to shop pay checkout
 * ```ts
 * /cart/36485954240671:2,42562624913464:1?payment=shop_pay&discount=FREESHIPPING
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
  const {encondedLines = ''} = params;

  if (!encondedLines || typeof url?.search !== 'string') {
    redirect('/cart');
  }

  const shopPayCheckoutUrl = `https://${env.SHOPIFY_STORE_DOMAIN}/cart/${encondedLines}${url.search}`;
  let standardCheckoutUrl;

  const lines = parseEncodedLines(encondedLines);

  let cartId = await session.get('cartId');
  let checkoutUrl;

  // no existing cart create one
  if (!cartId) {
    const {cart} = await cartCreate({
      context,
      input: {
        lines,
        discountCodes: discount ? [discount] : [],
      },
    });

    if (!cart) {
      return redirect('/');
    }

    standardCheckoutUrl = cart.checkoutUrl;
    cartId = cart.id;
    session.set('cartId', cartId);
    headers.set('Set-Cookie', await session.commit());
  } else {
    // have an existing cart, add lines
    const {cart} = await cartLinesAdd({context, cartId, lines});

    if (!cart) {
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
function parseEncodedLines(encondedLines: string | undefined): CartLineInput[] {
  if (typeof encondedLines === 'undefined') return [];
  return encondedLines
    .split(',')
    .map((encodedLine) => {
      const [variantId, quantity] = encodedLine.split(':');
      if (typeof variantId !== 'string' || typeof quantity !== 'string')
        return null;
      return {
        merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
        quantity: parseInt(quantity),
      };
    })
    .filter(Boolean) as CartLineInput[];
}
