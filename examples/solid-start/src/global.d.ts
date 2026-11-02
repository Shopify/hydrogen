/// <reference types="@solidjs/start/env" />

import type { ContentSecurityPolicy } from "@shopify/hydrogen";

import type { CustomerAccountLocals } from "./lib/customer-account";
import type { StorefrontLocals } from "./lib/request-storefront";

declare global {
  namespace App {
    interface RequestEventLocals extends Partial<CustomerAccountLocals>, Partial<StorefrontLocals> {
      csp?: ContentSecurityPolicy;
    }
  }
}

export {};
