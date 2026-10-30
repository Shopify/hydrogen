export interface UcpTotal {
  type: string;
  amount: number;
}
export interface UcpMessage {
  type?: string;
  code?: string;
  content: string;
}
export interface UcpLineItem {
  id: string;
  shop?: string;
  cart_id?: string;
  item: { id: string; title: string; price: number; image_url?: string };
  quantity: number;
  totals: UcpTotal[];
}
export interface UcpChildCart {
  id: string;
  shop?: string;
  currency: string;
  line_items: UcpLineItem[];
  totals: UcpTotal[];
  continue_url?: string;
  discounts?: {
    codes?: string[];
    applied?: Array<{ id?: string; title?: string; amount?: number; code?: string }>;
  };
  messages?: UcpMessage[];
}
export interface UcpCart extends UcpChildCart {
  carts?: UcpChildCart[];
}
/** Provisional buyer localization and preference signals from UCP 2026-08-25 cart.context.
 * Currency is a preference, not a guarantee of the merchant's presentment currency.
 */
export interface UcpCartContext {
  address_country?: string;
  address_region?: string;
  postal_code?: string;
  currency?: string;
  eligibility?: string[];
  intent?: string;
  language?: string;
  location?: string;
  payment?: Array<{ handler: string; types?: string[] }>;
  [key: string]: unknown;
}
export interface UcpRequest {
  shop: string;
  id?: string;
  cart?: {
    context?: UcpCartContext;
    line_items: Array<{ id?: string; item: { id: string }; quantity: number }>;
    discounts?: { codes: string[] };
  };
}
