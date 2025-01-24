import {describe, it, expect} from 'vitest';
import {createCustomerAccountHelper, URL_TYPE} from './customer-account-helper';

const shopId = '1';
const customerAccountUrl = `https://shopify.com/${shopId}`;

describe('return correct urls', () => {
  describe('when shopId is provided', () => {
    const getAccountUrl = createCustomerAccountHelper('2025-01', shopId);

    it('returns customer account base url', () => {
      expect(getAccountUrl(URL_TYPE.CA_BASE_URL)).toBe(customerAccountUrl);
    });

    it('returns customer account auth url', () => {
      expect(getAccountUrl(URL_TYPE.CA_BASE_AUTH_URL)).toBe(
        `https://shopify.com/authentication/${shopId}`,
      );
    });

    it('returns customer account graphql url', () => {
      expect(getAccountUrl(URL_TYPE.GRAPHQL)).toBe(
        `${customerAccountUrl}/account/customer/api/2025-01/graphql`,
      );
    });

    it('returns customer account authorize url', () => {
      expect(getAccountUrl(URL_TYPE.AUTH)).toBe(
        `https://shopify.com/authentication/${shopId}/oauth/authorize`,
      );
    });

    it('returns customer account login scope', () => {
      expect(getAccountUrl(URL_TYPE.LOGIN_SCOPE)).toBe(
        'openid email customer-account-api:full',
      );
    });

    it('returns customer account token exchange url', () => {
      expect(getAccountUrl(URL_TYPE.TOKEN_EXCHANGE)).toBe(
        `https://shopify.com/authentication/${shopId}/oauth/token`,
      );
    });

    it('returns customer account logout url', () => {
      expect(getAccountUrl(URL_TYPE.LOGOUT)).toBe(
        `https://shopify.com/authentication/${shopId}/logout`,
      );
    });
  });
});
