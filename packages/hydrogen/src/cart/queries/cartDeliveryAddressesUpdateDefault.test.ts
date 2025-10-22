import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {
  cartDeliveryAddressesUpdateDefault,
  CART_DELIVERY_ADDRESSES_UPDATE_MUTATION,
} from './cartDeliveryAddressesUpdateDefault';

describe('cartDeliveryAddressesUpdateDefault', () => {
  describe('empty array behavior (API 2025-10+)', () => {
    it('should document that passing empty array clears all delivery addresses', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const result = await updateDeliveryAddresses([]);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should accept empty array as valid input per API 2025-10 semantics', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      await expect(updateDeliveryAddresses([])).resolves.toBeDefined();
    });
  });

  describe('with delivery addresses', () => {
    it('should update delivery addresses when addresses provided', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const mockAddress = {
        id: 'gid://shopify/CartSelectableAddress/test-123',
        selected: true,
        address: {
          deliveryAddress: {
            address1: '123 Test Street',
            city: 'Test City',
            countryCode: 'US',
            zip: '12345',
          },
        },
      };

      const result = await updateDeliveryAddresses([mockAddress]);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should handle multiple addresses in single update', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const addresses = [
        {
          id: 'gid://shopify/CartSelectableAddress/addr-1',
          selected: true,
          address: {
            deliveryAddress: {
              address1: '123 Main St',
              city: 'NYC',
              countryCode: 'US',
              zip: '10001',
            },
          },
        },
        {
          id: 'gid://shopify/CartSelectableAddress/addr-2',
          selected: false,
          address: {
            deliveryAddress: {
              address1: '456 Broadway',
              city: 'NYC',
              countryCode: 'US',
              zip: '10002',
            },
          },
        },
      ];

      const result = await updateDeliveryAddresses(addresses);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });
  });

  describe('cartFragment override', () => {
    it('can override cartFragment for custom query fields', async () => {
      const cartFragment = 'cartFragmentOverride';
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
        cartFragment,
      });

      const result = await updateDeliveryAddresses([]);

      expect(result.cart).toHaveProperty('id', CART_ID);
      expect(result.userErrors?.[0]).toContain(cartFragment);
    });
  });

  describe('mutation structure', () => {
    it('should include required mutation fields for error and warning handling', () => {
      const mutation = CART_DELIVERY_ADDRESSES_UPDATE_MUTATION();

      expect(mutation).toContain('cartDeliveryAddressesUpdate');
      expect(mutation).toContain('userErrors');
      expect(mutation).toContain('warnings');
      expect(mutation).toContain('CartApiError');
      expect(mutation).toContain('CartApiWarning');
    });

    it('should include @inContext directive for internationalization', () => {
      const mutation = CART_DELIVERY_ADDRESSES_UPDATE_MUTATION();

      expect(mutation).toContain('@inContext');
      expect(mutation).toContain('$country');
      expect(mutation).toContain('$language');
    });
  });

  describe('documentation completeness', () => {
    it('should document empty array behavior in JSDoc', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const functionFile = fs.readFileSync(
        path.join(__dirname, 'cartDeliveryAddressesUpdateDefault.tsx'),
        'utf-8',
      );

      expect(functionFile).toContain('empty array');
      expect(functionFile).toContain('clear');
      expect(functionFile).toContain('2025-10');
    });

    it('should include example of clearing addresses with empty array', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const functionFile = fs.readFileSync(
        path.join(__dirname, 'cartDeliveryAddressesUpdateDefault.tsx'),
        'utf-8',
      );

      expect(functionFile).toMatch(/example.*clear/i);
      expect(functionFile).toContain('updateAddresses([])');
    });
  });

  describe('edge cases', () => {
    it('should handle address with only required fields', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const minimalAddress = {
        selected: true,
        address: {
          deliveryAddress: {
            address1: '123 Main',
            city: 'NYC',
            countryCode: 'US',
            zip: '10001',
          },
        },
      };

      const result = await updateDeliveryAddresses([minimalAddress]);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should handle address with copyFromCustomerAddressId instead of deliveryAddress', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const customerAddress = {
        id: 'gid://shopify/CartSelectableAddress/test',
        selected: true,
        address: {
          copyFromCustomerAddressId:
            'gid://shopify/MailingAddress/123?model_name=CustomerAddress',
        },
      };

      const result = await updateDeliveryAddresses([customerAddress]);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should handle optional parameters like country and language', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const result = await updateDeliveryAddresses([], {
        country: 'CA',
        language: 'FR',
      });

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should handle single address update', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const singleAddress = [
        {
          id: 'gid://shopify/CartSelectableAddress/single',
          selected: true,
          oneTimeUse: false,
          address: {
            deliveryAddress: {
              address1: 'Single Street',
              city: 'Solo City',
              countryCode: 'US',
              zip: '99999',
            },
          },
        },
      ];

      const result = await updateDeliveryAddresses(singleAddress);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should handle address with all optional fields', async () => {
      const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const fullAddress = {
        id: 'gid://shopify/CartSelectableAddress/full',
        selected: true,
        oneTimeUse: true,
        validationStrategy: 'COUNTRY_CODE_ONLY' as const,
        address: {
          deliveryAddress: {
            firstName: 'John',
            lastName: 'Doe',
            company: 'Acme Corp',
            address1: '123 Main St',
            address2: 'Apt 4B',
            city: 'New York',
            provinceCode: 'NY',
            countryCode: 'US',
            zip: '10001',
            phone: '+1234567890',
          },
        },
      };

      const result = await updateDeliveryAddresses([fullAddress]);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });
  });
});
