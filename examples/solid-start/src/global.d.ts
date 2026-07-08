/// <reference types="@solidjs/start/env" />

import type { CustomerAccountLocals } from "./lib/customer-account";
import type { StorefrontLocals } from "./lib/request-storefront";

declare global {
  namespace App {
    interface RequestEventLocals
      extends Partial<CustomerAccountLocals>, Partial<StorefrontLocals> {}
  }
}

export {};
