export const MSW_SCENARIOS = {
  customerAccountLoggedIn: 'customer-account-logged-in',
} as const;

export type MswScenario = (typeof MSW_SCENARIOS)[keyof typeof MSW_SCENARIOS];
