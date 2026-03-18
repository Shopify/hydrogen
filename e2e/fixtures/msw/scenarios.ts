export const MSW_SCENARIOS = {
  customerAccountLoggedIn: 'customer-account-logged-in',
  deliveryAddresses: 'delivery-addresses',
  b2bLoggedIn: 'b2b-logged-in',
  subscriptionsLoggedIn: 'subscriptions-logged-in',
  legacyCustomerAccountLoggedIn: 'legacy-customer-account-logged-in',
} as const;

export type MswScenario = (typeof MSW_SCENARIOS)[keyof typeof MSW_SCENARIOS];
