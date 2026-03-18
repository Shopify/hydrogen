import {setTestStore, test, CartUtil} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

test.describe('Cart Functionality', () => {
  test('When adding a product to cart, it should update the cart', async ({
    page,
  }) => {
    const cart = new CartUtil(page);
    const productName = 'The Element';
    const productHandle = 'the-element';

    await page.goto('/');
    await cart.assertTotalItems(0);

    await page.goto(`/products/${productHandle}`);
    await cart.addItem(productName);

    await cart.assertTotalItems(1);
    await cart.assertInCart(productName);
    await cart.assertSubtotal('$749.95');
  });
});
