/// <reference types="@solidjs/start/env" />

import type { ContentSecurityPolicy } from "@shopify/hydrogen";

import type { CustomerAccountLocals } from "./lib/customer-account";
import type { StorefrontLocals } from "./lib/request-storefront";

// Hydrogen's view event element (`VIEW_EVENT_TAG_NAME`). Solid needs `attr:` for its attributes.
declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "shopify-view-event": HTMLAttributes<HTMLElement>;
    }
    interface ExplicitAttributes {
      "view-event-trigger": string;
      "view-event-payload": string;
      "view-event-key": string;
    }
  }
}

declare global {
  namespace App {
    interface RequestEventLocals extends Partial<CustomerAccountLocals>, Partial<StorefrontLocals> {
      csp?: ContentSecurityPolicy;
    }
  }
}

export {};
