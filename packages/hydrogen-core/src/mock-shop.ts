export const MOCK_SHOP_DOMAIN = 'mock.shop';
export const isMockShop = (domain: string): boolean =>
  domain.includes(MOCK_SHOP_DOMAIN);
