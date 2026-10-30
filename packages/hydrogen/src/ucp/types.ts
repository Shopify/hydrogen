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
  item: { id: string; title: string; price: number };
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
export interface UcpRequest {
  shop: string;
  id?: string;
  cart?: {
    line_items: Array<{ id?: string; item: { id: string }; quantity: number }>;
    discounts?: { codes: string[] };
  };
}
