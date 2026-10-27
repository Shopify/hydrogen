import { createContext } from "react-router";

export type Env = {
  MOCK_SHOP?: string;
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  PUBLIC_CHECKOUT_DOMAIN?: string;
  PUBLIC_STORE_DOMAIN?: string;
  PUBLIC_STOREFRONT_ID?: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID?: string;
  SESSION_SECRET?: string;
  SHOP_ID?: string;
  /** SPIKE ONLY: injects a cart fault for agentic E2E calibration. */
  SPIKE_FAULT?: string;
  /** SPIKE ONLY: healthy UX variant for agentic E2E calibration. */
  SPIKE_UX?: string;
};

export const envContext = createContext<Env>();
