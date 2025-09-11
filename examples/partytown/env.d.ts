/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    GTM_ID: string;
    GTM_CONTAINER_ID: string;
  }
  
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Make this file a module
export {}