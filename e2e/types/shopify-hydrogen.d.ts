/** This enables augmentation of the Hydrogen types for mocks */
declare module '@shopify/hydrogen' {
  export interface CustomerAccountQueries {}
  export interface CustomerAccountMutations {}
}

declare global {
  interface Env {
    HYDROGEN_E2E_MSW_SCENARIO?: string;
  }
}
