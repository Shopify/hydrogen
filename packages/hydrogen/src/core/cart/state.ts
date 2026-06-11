import type { CartErrorCode, CartWarningCode } from "../../graphql/generated/storefront-api-types";

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface CartCost {
  subtotalAmount: Money;
  totalAmount: Money;
  checkoutChargeAmount: Money;
}

export interface CartLineCost {
  totalAmount: Money;
  subtotalAmount: Money;
  amountPerQuantity: Money;
  compareAtAmountPerQuantity: Money | null;
}

export interface CartLineMerchandise {
  id: string;
  title?: string;
  selectedOptions?: Array<{ name: string; value: string }>;
  product: {
    title: string;
    handle?: string;
    [key: string]: unknown;
  };
  image?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
    [key: string]: unknown;
  } | null;
  quantityAvailable?: number | null;
  [key: string]: unknown;
}

export interface CartLine {
  id: string;
  quantity: number;
  cost: CartLineCost;
  merchandise?: CartLineMerchandise;
  parentRelationship?: { parent: { id: string } } | null;
  lineComponents?: CartLine[];
}

export interface CartLineConnection {
  nodes: CartLine[];
  [key: string]: unknown;
}

export interface DiscountCode {
  code: string;
  applicable: boolean;
}

export interface CartUserError {
  code: CartErrorCode | null;
  message: string;
  field?: string[];
}

export interface CartWarning {
  code: CartWarningCode;
  message: string;
}

export interface CartErrorGroup {
  userErrors: CartUserError[];
  warnings: CartWarning[];
}

export interface CartNetworkEntry {
  message: string;
  status?: number;
}

export interface Attribute {
  key: string;
  value: string;
}

export interface CartPending {
  lines: Set<string>;
  note: boolean;
  discountCodes: Set<string>;
}

export interface CartErrorState {
  cart: CartErrorGroup;
  lines: Map<string, CartErrorGroup>;
  note: CartErrorGroup;
  discountCodes: Map<string, CartErrorGroup>;
  network: CartNetworkEntry[];
  lastUpdatedAt: number;
  cartUpdatedAt: number;
  linesUpdatedAt: number;
  noteUpdatedAt: number;
  discountCodesUpdatedAt: number;
  networkUpdatedAt: number;
}

export interface CartData {
  id: string | null;
  checkoutUrl?: string | null;
  totalQuantity: number;
  cost: CartCost;
  note?: string | null;
  lines: CartLineConnection;
  discountCodes: DiscountCode[];
  [key: string]: unknown;
}

export interface CartState<TData extends CartData = CartData> {
  data: TData;
  loading: boolean;
  pending: CartPending;
  errors: CartErrorState;
}

export function createEmptyPending(): CartPending {
  return { lines: new Set(), note: false, discountCodes: new Set() };
}

export function createEmptyErrorGroup(): CartErrorGroup {
  return { userErrors: [], warnings: [] };
}

export function createEmptyCartErrors(): CartErrorState {
  return {
    cart: createEmptyErrorGroup(),
    lines: new Map(),
    note: createEmptyErrorGroup(),
    discountCodes: new Map(),
    network: [],
    lastUpdatedAt: 0,
    cartUpdatedAt: 0,
    linesUpdatedAt: 0,
    noteUpdatedAt: 0,
    discountCodesUpdatedAt: 0,
    networkUpdatedAt: 0,
  };
}

export const EMPTY_CART_DATA: CartData = Object.freeze({
  id: null,
  checkoutUrl: null,
  totalQuantity: 0,
  cost: Object.freeze({
    subtotalAmount: Object.freeze({ amount: "0", currencyCode: "" }),
    totalAmount: Object.freeze({ amount: "0", currencyCode: "" }),
    checkoutChargeAmount: Object.freeze({ amount: "0", currencyCode: "" }),
  }),
  note: "",
  lines: Object.freeze({ nodes: [] as CartLine[] }),
  discountCodes: [] as DiscountCode[],
});

export function createEmptyCartData(): CartData {
  return {
    ...EMPTY_CART_DATA,
    lines: { nodes: [] },
    discountCodes: [],
  };
}

export function createEmptyCartState(): CartState {
  return {
    data: createEmptyCartData(),
    loading: true,
    pending: createEmptyPending(),
    errors: createEmptyCartErrors(),
  };
}

export const EMPTY_CART_STATE: CartState = {
  data: createEmptyCartData(),
  loading: true,
  pending: createEmptyPending(),
  errors: createEmptyCartErrors(),
};
