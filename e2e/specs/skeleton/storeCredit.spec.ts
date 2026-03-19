import {setTestStore, test, expect, MSW_SCENARIOS} from '../../fixtures';

setTestStore('mockShop', {mock: {scenario: MSW_SCENARIOS.storeCredit}});

const SLIDES_VARIANT_ID = 'gid://shopify/ProductVariant/43695710371862';

/**
 * Create a cart with one item via the Storefront API and set the cart cookie.
 *
 * The MSW entry rewrites request URLs for CAAPI session injection, which
 * causes cart cookies to be set on the wrong domain when using the form
 * action. We sidestep this by creating the cart directly via the API
 * and injecting the cart ID cookie.
 */
async function createCartWithItem(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
) {
  const response = await request.post(
    'https://mock.shop/api/2025-10/graphql.json',
    {
      data: {
        query: `mutation createCart($lines: [CartLineInput!]!) {
          cartCreate(input: {lines: $lines}) {
            cart { id }
            userErrors { code message }
          }
        }`,
        variables: {
          lines: [{merchandiseId: SLIDES_VARIANT_ID, quantity: 1}],
        },
      },
    },
  );
  const json = await response.json();
  expect(json.data.cartCreate.userErrors).toHaveLength(0);

  const cartId: string = json.data.cartCreate.cart.id;
  await page.goto('/');

  const cartIdValue = cartId.replace('gid://shopify/Cart/', '');
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: 'cart',
      value: encodeURIComponent(cartIdValue),
      url: origin,
      httpOnly: false,
      secure: false,
    },
  ]);
}

test.describe('Store Credit', () => {
  test.describe('Cart Page', () => {
    test('displays store credit balance', async ({
      page,
      request,
      cart,
      storeCredit,
    }) => {
      await createCartWithItem(page, request);
      await cart.navigateToCartPage();
      await storeCredit.assertVisible('$50.00');
    });

    test('shows correctly formatted currency amount', async ({
      page,
      request,
      cart,
      storeCredit,
    }) => {
      await createCartWithItem(page, request);
      await cart.navigateToCartPage();
      const balance = storeCredit.getBalance();
      await balance.waitFor({state: 'visible'});
      const text = await balance.textContent();
      expect(text).toMatch(/\$\d+\.\d{2}/);
    });
  });

  test.describe('Empty State', () => {
    test('does not display store credit in the cart aside', async ({
      page,
      request,
      storeCredit,
    }) => {
      await createCartWithItem(page, request);
      const cartLink = page.getByRole('link', {name: 'Cart'});
      await cartLink.click();
      await expect(page.getByRole('dialog', {name: 'Cart'})).toBeVisible();
      // The cart aside does not receive store credit data from the loader
      await storeCredit.assertNotRendered();
    });
  });
});
