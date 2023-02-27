/// <reference types="@cloudflare/workers-types" />

interface Env {
  ENVIRONMENT?: 'development';
  SESSION_SECRET: string;
  PUBLIC_STOREFRONT_API_TOKEN: string;
  PRIVATE_STOREFRONT_API_TOKEN: string;
  PUBLIC_STOREFRONT_API_VERSION: string;
  PUBLIC_STORE_DOMAIN: string;
  PUBLIC_STOREFRONT_ID: string;
}
