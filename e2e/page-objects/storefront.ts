import {Page, Locator} from '@playwright/test';

export class StorefrontPage {
  readonly page: Page;
  private baseUrl: string = '';

  readonly heroImage: Locator;
  readonly loginLink: Locator;
  readonly cartLink: Locator;
  readonly cartDrawer: Locator;
  readonly recommendedProductsGrid: Locator;

  constructor(page: Page, baseUrl?: string) {
    this.page = page;
    this.baseUrl = baseUrl || '';

    // Common elements across all pages
    this.heroImage = page.locator('.featured-collection-image img');
    this.loginLink = page.locator('a[href="/account"]');
    this.cartLink = page.locator('a[href="/cart"]');
    this.cartDrawer = page.locator('aside').filter({hasText: 'CART'});

    // Product grid
    this.recommendedProductsGrid = page.locator('.recommended-products-grid');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async goto(path: string = '/') {
    // Support both full URLs and paths
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async getCartCount(): Promise<number> {
    const cartText = await this.cartLink.textContent();
    const match = cartText?.match(/Cart\s+(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async isCartDrawerOpen(): Promise<boolean> {
    return await this.cartDrawer.isVisible();
  }

  async waitForCartUpdate() {
    await this.page.waitForTimeout(1000);
  }

  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }
}

export class ProductPage extends StorefrontPage {
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly addToCartButton: Locator;
  readonly quantityInput: Locator;
  readonly productImage: Locator;
  readonly variantSelector: Locator;

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);

    this.productTitle = page.locator('h1');
    this.productPrice = page
      .locator('.product-price, div:has-text("$"), span:has-text("$")')
      .filter({hasText: '$'});
    this.addToCartButton = page
      .locator('button[type="submit"]')
      .filter({hasText: 'Add to cart'});
    this.quantityInput = page.locator('input[name="quantity"]');
    this.productImage = page.locator('img[alt*="Product"]').first();
    this.variantSelector = page.locator(
      'select[name="variant"], input[name="variant"]',
    );
  }

  async navigateToProduct(productHandle: string) {
    await this.goto(`/products/${productHandle}`);
  }

  async navigateToFirstProduct() {
    await this.goto('/');
    const firstProduct = this.recommendedProductsGrid
      .locator('a.product-item')
      .first();
    await firstProduct.click();
    await this.page.waitForLoadState('networkidle');
  }

  async addToCart(quantity: number = 1) {
    if (quantity !== 1 && (await this.quantityInput.isVisible())) {
      await this.quantityInput.fill(quantity.toString());
    }
    await this.addToCartButton.click();
    await this.waitForCartUpdate();
  }

  async getProductTitle(): Promise<string> {
    return (await this.productTitle.textContent()) || '';
  }

  async getProductPrice(): Promise<string> {
    return (await this.productPrice.first().textContent()) || '';
  }
}

export class CartPage extends StorefrontPage {
  readonly cartItems: Locator;
  readonly cartItemTitle: Locator;
  readonly cartItemPrice: Locator;
  readonly cartItemQuantity: Locator;
  readonly removeItemButton: Locator;
  readonly updateQuantityButton: Locator;
  readonly cartSubtotal: Locator;
  readonly emptyCartMessage: Locator;
  readonly checkoutButton: Locator;
  readonly quantityIncreaseButton: Locator;
  readonly quantityDecreaseButton: Locator;

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);

    this.cartItems = page
      .locator('[data-test="cart-item"], .cart-item, li')
      .filter({has: page.locator('button')});
    this.cartItemTitle = page.locator(
      '[data-test="cart-item-title"], .cart-item-title, h3, h4',
    );
    this.cartItemPrice = page.locator(
      '[data-test="cart-item-price"], .cart-item-price',
    );
    this.cartItemQuantity = page.locator(
      'input[name*="quantity"], [data-test="quantity"]',
    );
    this.removeItemButton = page
      .locator('button')
      .filter({hasText: /remove|delete|trash/i});
    this.updateQuantityButton = page
      .locator('button')
      .filter({hasText: /update/i});
    this.cartSubtotal = page
      .locator('[data-test="subtotal"], .subtotal, .cart-subtotal')
      .filter({hasText: '$'});
    this.emptyCartMessage = page.locator('text=/empty|no items/i');
    this.checkoutButton = page
      .locator('button, a')
      .filter({hasText: /checkout/i});
    this.quantityIncreaseButton = page.locator(
      'button[aria-label*="Increase"], button:has-text("+")',
    );
    this.quantityDecreaseButton = page.locator(
      'button[aria-label*="Decrease"], button:has-text("-")',
    );
  }

  async openCart() {
    await this.cartLink.click();
    await this.page.waitForTimeout(500);
  }

  async navigateToCart() {
    await this.goto('/cart');
  }

  async getItemCount(): Promise<number> {
    const items = await this.cartItems.count();
    return items;
  }

  async updateItemQuantity(itemIndex: number, newQuantity: number) {
    const quantityInputs = await this.cartItemQuantity.all();
    if (quantityInputs[itemIndex]) {
      await quantityInputs[itemIndex].fill(newQuantity.toString());

      // Try to find and click update button if it exists
      const updateButtons = await this.updateQuantityButton.all();
      if (updateButtons.length > 0) {
        await updateButtons[0].click();
      }

      await this.waitForCartUpdate();
    }
  }

  async increaseQuantity(itemIndex: number = 0) {
    const increaseButtons = await this.quantityIncreaseButton.all();
    if (increaseButtons[itemIndex]) {
      await increaseButtons[itemIndex].click();
      await this.waitForCartUpdate();
    }
  }

  async decreaseQuantity(itemIndex: number = 0) {
    const decreaseButtons = await this.quantityDecreaseButton.all();
    if (decreaseButtons[itemIndex]) {
      await decreaseButtons[itemIndex].click();
      await this.waitForCartUpdate();
    }
  }

  async removeItem(itemIndex: number = 0) {
    const removeButtons = await this.removeItemButton.all();
    if (removeButtons[itemIndex]) {
      await removeButtons[itemIndex].click();
      await this.waitForCartUpdate();
    }
  }

  async getSubtotal(): Promise<string> {
    const subtotalText = await this.cartSubtotal.textContent();
    return subtotalText || '';
  }

  async isCartEmpty(): Promise<boolean> {
    return await this.emptyCartMessage.isVisible();
  }

  async clearCart() {
    while ((await this.getItemCount()) > 0) {
      await this.removeItem(0);
    }
  }
}

export class CollectionPage extends StorefrontPage {
  readonly collectionTitle: Locator;
  readonly productGrid: Locator;
  readonly productItems: Locator;
  readonly productTitles: Locator;
  readonly productPrices: Locator;
  readonly sortDropdown: Locator;
  readonly filterOptions: Locator;
  readonly loadMoreButton: Locator;
  readonly pagination: Locator;

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);

    this.collectionTitle = page.locator('h1');
    this.productGrid = page.locator(
      '[data-test="product-grid"], .product-grid, .collection-products, .products-grid',
    );
    this.productItems = this.productGrid
      .locator('a, article, li')
      .filter({has: page.locator('img')});
    this.productTitles = this.productItems.locator(
      'h2, h3, h4, [data-test="product-title"]',
    );
    this.productPrices = this.productItems
      .locator('[data-test="product-price"], .price, span')
      .filter({hasText: '$'});
    this.sortDropdown = page.locator(
      'select[name*="sort"], [data-test="sort"]',
    );
    this.filterOptions = page.locator('[data-test="filter"], .filters');
    this.loadMoreButton = page
      .locator('button')
      .filter({hasText: /load more/i});
    this.pagination = page.locator(
      '[data-test="pagination"], .pagination, nav[aria-label*="pagination"]',
    );
  }

  async navigateToCollection(handle: string) {
    await this.goto(`/collections/${handle}`);
  }

  async getProductCount(): Promise<number> {
    return await this.productItems.count();
  }

  async getProductTitles(): Promise<string[]> {
    const titles = await this.productTitles.allTextContents();
    return titles.filter((t) => t.trim());
  }

  async getProductPrices(): Promise<string[]> {
    const prices = await this.productPrices.allTextContents();
    return prices.filter((p) => p.trim());
  }

  async clickProduct(index: number) {
    const products = await this.productItems.all();
    if (products[index]) {
      await products[index].click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async sortBy(option: string) {
    if (await this.sortDropdown.isVisible()) {
      await this.sortDropdown.selectOption(option);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async loadMore() {
    if (await this.loadMoreButton.isVisible()) {
      await this.loadMoreButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async hasProducts(): Promise<boolean> {
    return (await this.getProductCount()) > 0;
  }
}

export function createPageObjects(page: Page, baseUrl?: string) {
  return {
    storefront: new StorefrontPage(page, baseUrl),
    product: new ProductPage(page, baseUrl),
    cart: new CartPage(page, baseUrl),
    collection: new CollectionPage(page, baseUrl),
  };
}
