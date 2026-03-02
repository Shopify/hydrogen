import {setTestStore, test, CartUtil} from '../../fixtures';

setTestStore('mockShop');

test.describe('Cart Functionality', () => {
  test('When adding a product to cart, it should update the cart', async ({
    page,
  }) => {
    const cart = new CartUtil(page);
    const productName = "Women's T-shirt";
    const productHandle = 'women-t-shirt';

    await page.goto('/');
    await cart.assertTotalItems(0);

    await page.goto(`/products/${productHandle}`);
    await cart.addItem(productName);

    await cart.assertTotalItems(1);
    await cart.assertInCart(productName);
    await cart.assertSubtotal('$30.00');
  });
});
