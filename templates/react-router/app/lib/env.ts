import { createContext } from "react-router";

export type Env = {
  MOCK_SHOP?: string;
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  PUBLIC_CHECKOUT_DOMAIN?: string;
  PUBLIC_STORE_DOMAIN?: string;
};

export const envContext = createContext<Env>();
