/// <reference types="@solidjs/start/env" />

import type { StorefrontLocals } from "./lib/request-storefront";

declare global {
  namespace App {
    interface RequestEventLocals extends Partial<StorefrontLocals> {}
  }
}

export {};
