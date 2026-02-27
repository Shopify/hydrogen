import {setTestStore, test, CartUtil} from '../../fixtures';

setTestStore('mockShop');

test.describe('Cart Functionality', () => {
  test('When adding a product to cart, it should update the cart', async ({
    page,
  }) => {
    const cart = new CartUtil(page);
    const productName = "Women's T-shirt";

    await page.goto('/');
    await cart.assertTotalItems(0);

    await page.getByRole('link', {name: productName}).click();
    await page.getByRole('button', {name: 'Add to cart'}).click();

    // This is optimistic. Wait for the cart to update.
    await cart.assertTotalItems(1);
    await cart.assertInCart(productName);
    // Validate that the backend has returned the correct subtotal
    await cart.assertSubtotal('$30.00');
  });
});
