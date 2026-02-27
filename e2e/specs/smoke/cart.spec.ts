import {setTestStore, test, expect} from '../../fixtures';
import {cart} from '../../fixtures/cart-utils';

setTestStore('mockShop');

test.describe('Cart Functionality', () => {
  test('When adding a product to cart, it should update the cart', async ({
    page,
  }) => {
    const productName = "Women's T-shirt";

    await page.goto('/');

    const cartToggle = page.getByRole('link', {name: 'Cart'});

    await expect(cartToggle.getByLabel('items: 0')).toBeVisible();

    await page.getByRole('link', {name: productName}).click();
    await page.getByRole('button', {name: 'Add to cart'}).click();

    await expect(cartToggle.getByLabel('Items: 1')).toBeVisible();

    await cart.assertInCart(page, productName);
    await cart.assertSubtotal(page, '$30.00');
  });
});
