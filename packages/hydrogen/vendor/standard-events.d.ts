// version: ea315691e9819723879605d727a20fde6bdda314
export interface CartDiscountUpdatePayloadDetail {
	[k: string]: unknown;
}
export interface CartDiscountUpdateResultDetail {
	[k: string]: unknown;
}
export interface CartErrorPayloadDetail {
	[k: string]: unknown;
}
export interface CartLinesUpdatePayloadDetail {
	[k: string]: unknown;
}
export interface CartLinesUpdateResultDetail {
	[k: string]: unknown;
}
export interface CartNoteUpdatePayloadDetail {
	[k: string]: unknown;
}
export interface CartNoteUpdateResultDetail {
	[k: string]: unknown;
}
export interface CartViewPayloadDetail {
	[k: string]: unknown;
}
export interface CollectionUpdatePayloadDetail {
	[k: string]: unknown;
}
export interface CollectionUpdateResultDetail {
	[k: string]: unknown;
}
export interface CollectionViewPayloadDetail {
	[k: string]: unknown;
}
export interface PageViewPayloadDetail {
	[k: string]: unknown;
}
export interface ProductSelectPayloadDetail {
	[k: string]: unknown;
}
export interface ProductSelectResultDetail {
	[k: string]: unknown;
}
export interface ProductViewPayloadDetail {
	[k: string]: unknown;
}
export interface SearchUpdatePayloadDetail {
	[k: string]: unknown;
}
export interface SearchUpdateResultDetail {
	[k: string]: unknown;
}
export interface CartDiscountUpdatePayload {
	discountCodes: {
		code: string;
	}[];
	promise: Promise<CartDiscountUpdateResult>;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartDiscountUpdatePayloadDetail;
}
export interface CartDiscountUpdateResult {
	cart: {
		id: string;
		totalQuantity: number;
		cost: {
			totalAmount: {
				amount: string;
				currencyCode: string;
			};
		};
		lines: {
			id: string;
			quantity: number;
			cost: {
				totalAmount: {
					amount: string;
					currencyCode: string;
				};
			};
		}[];
		discountCodes: {
			applicable: boolean;
			code: string;
		}[];
	} | null;
	userErrors?: {
		code?: string;
		field?: string[];
		message: string;
	}[];
	warnings?: {
		code?: string;
		message: string;
		target?: string;
	}[];
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartDiscountUpdateResultDetail;
}
export interface CartErrorPayload {
	error: string;
	code: "ADDRESS_FIELD_CONTAINS_EMOJIS" | "ADDRESS_FIELD_CONTAINS_HTML_TAGS" | "ADDRESS_FIELD_CONTAINS_URL" | "ADDRESS_FIELD_DOES_NOT_MATCH_EXPECTED_PATTERN" | "ADDRESS_FIELD_IS_REQUIRED" | "ADDRESS_FIELD_IS_TOO_LONG" | "BUNDLES_AND_ADDONS_CANNOT_BE_MIXED" | "BUYER_CANNOT_PURCHASE_FOR_COMPANY_LOCATION" | "CART_TOO_LARGE" | "GIFT_CARD_RECIPIENT_INVALID" | "INVALID" | "INVALID_COMPANY_LOCATION" | "INVALID_DELIVERY_ADDRESS_ID" | "INVALID_DELIVERY_GROUP" | "INVALID_DELIVERY_OPTION" | "INVALID_INCREMENT" | "INVALID_MERCHANDISE_LINE" | "INVALID_METAFIELDS" | "INVALID_ZIP_CODE_FOR_COUNTRY" | "INVALID_ZIP_CODE_FOR_PROVINCE" | "LESS_THAN" | "MAXIMUM_EXCEEDED" | "MERCHANDISE_NOT_APPLICABLE" | "MINIMUM_NOT_MET" | "MISSING_CUSTOMER_ACCESS_TOKEN" | "MISSING_DISCOUNT_CODE" | "MISSING_NOTE" | "NOTE_TOO_LONG" | "ONLY_ONE_DELIVERY_ADDRESS_CAN_BE_SELECTED" | "PARENT_LINE_INVALID_REFERENCE" | "PARENT_LINE_NESTING_TOO_DEEP" | "PARENT_LINE_NOT_FOUND" | "PARENT_LINE_OPERATION_BLOCKED" | "PENDING_DELIVERY_GROUPS" | "PROVINCE_NOT_FOUND" | "SELLING_PLAN_NOT_APPLICABLE" | "SERVICE_UNAVAILABLE" | "TOO_MANY_DELIVERY_ADDRESSES" | "UNSPECIFIED_ADDRESS_ERROR" | "VALIDATION_CUSTOM" | "VARIANT_REQUIRES_SELLING_PLAN" | "ZIP_CODE_NOT_SUPPORTED";
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartErrorPayloadDetail;
}
export type CartLinesUpdatePayload = {
	action: "add";
	context: "product" | "cart" | "dialog" | "standard-action";
	/**
	 * @minItems 1
	 */
	lines: {
		merchandiseId: string;
		quantity: number;
	}[];
	promise: Promise<CartLinesUpdateResult>;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartLinesUpdatePayloadDetail;
} | {
	action: "remove";
	context: "product" | "cart" | "dialog" | "standard-action";
	/**
	 * @minItems 1
	 */
	lines: {
		id: string;
		quantity: number;
	}[];
	promise: Promise<CartLinesUpdateResult>;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartLinesUpdatePayloadDetail;
} | {
	action: "update";
	context: "product" | "cart" | "dialog" | "standard-action";
	/**
	 * @minItems 1
	 */
	lines: {
		id: string;
		quantity: number;
	}[];
	promise: Promise<CartLinesUpdateResult>;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartLinesUpdatePayloadDetail;
};
export interface CartLinesUpdateResult {
	cart: {
		id: string;
		totalQuantity: number;
		cost: {
			totalAmount: {
				amount: string;
				currencyCode: string;
			};
		};
		lines: {
			id: string;
			quantity: number;
			cost: {
				totalAmount: {
					amount: string;
					currencyCode: string;
				};
			};
		}[];
		discountCodes: {
			applicable: boolean;
			code: string;
		}[];
	} | null;
	userErrors?: {
		code?: string;
		field?: string[];
		message: string;
	}[];
	warnings?: {
		code?: string;
		message: string;
		target?: string;
	}[];
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartLinesUpdateResultDetail;
}
export interface CartNoteUpdatePayload {
	context: "product" | "cart" | "dialog" | "standard-action";
	note: string;
	promise: Promise<CartNoteUpdateResult>;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartNoteUpdatePayloadDetail;
}
export interface CartNoteUpdateResult {
	cart: {
		id: string;
		totalQuantity: number;
		cost: {
			totalAmount: {
				amount: string;
				currencyCode: string;
			};
		};
		lines: {
			id: string;
			quantity: number;
			cost: {
				totalAmount: {
					amount: string;
					currencyCode: string;
				};
			};
		}[];
		discountCodes: {
			applicable: boolean;
			code: string;
		}[];
	} | null;
	userErrors?: {
		code?: string;
		field?: string[];
		message: string;
	}[];
	warnings?: {
		code?: string;
		message: string;
		target?: string;
	}[];
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartNoteUpdateResultDetail;
}
export interface CartSummary {
	id: string;
	totalQuantity: number;
	cost: {
		totalAmount: {
			amount: string;
			currencyCode: string;
		};
	};
	lines: {
		id: string;
		quantity: number;
		cost: {
			totalAmount: {
				amount: string;
				currencyCode: string;
			};
		};
	}[];
	discountCodes: {
		applicable: boolean;
		code: string;
	}[];
}
export interface CartViewPayload {
	context: "page" | "dialog";
	cart: {
		id: string;
		totalQuantity: number;
		cost: {
			totalAmount: {
				amount: string;
				currencyCode: string;
			};
		};
		lines: {
			id: string;
			quantity: number;
			cost: {
				totalAmount: {
					amount: string;
					currencyCode: string;
				};
			};
		}[];
		discountCodes: {
			applicable: boolean;
			code: string;
		}[];
	} | null;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CartViewPayloadDetail;
}
export interface CollectionUpdatePayload {
	collection: {
		id: string | null;
		handle: string;
		productsCount: number;
	};
	productFilters?: {
		available?: boolean;
		category?: {
			id: string;
		};
		price?: {
			min?: number;
			max?: number;
		};
		productMetafield?: {
			namespace: string;
			key: string;
			value?: string;
		};
		productType?: string;
		productVendor?: string;
		tag?: string;
		taxonomyMetafield?: {
			key: string;
			value: string;
		};
		variantMetafield?: {
			namespace: string;
			key: string;
			value?: string;
		};
		variantOption?: {
			name: string;
			value?: string;
		};
	}[];
	sortKey?: "BEST_SELLING" | "COLLECTION_DEFAULT" | "CREATED" | "ID" | "MANUAL" | "PRICE" | "RELEVANCE" | "TITLE";
	promise: Promise<CollectionUpdateResult>;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CollectionUpdatePayloadDetail;
}
export interface CollectionUpdateResult {
	productsCount: number;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CollectionUpdateResultDetail;
}
export interface CollectionViewPayload {
	collection: {
		id: string | null;
		handle: string;
		productsCount: number;
	};
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: CollectionViewPayloadDetail;
}
export interface PageViewPayload {
	page: {
		template: string;
		title: string;
		url: string;
	};
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: PageViewPayloadDetail;
}
export interface ProductFilter {
	available?: boolean;
	category?: {
		id: string;
	};
	price?: {
		min?: number;
		max?: number;
	};
	productMetafield?: {
		namespace: string;
		key: string;
		value?: string;
	};
	productType?: string;
	productVendor?: string;
	tag?: string;
	taxonomyMetafield?: {
		key: string;
		value: string;
	};
	variantMetafield?: {
		namespace: string;
		key: string;
		value?: string;
	};
	variantOption?: {
		name: string;
		value?: string;
	};
}
export interface ProductSelectPayload {
	product: {
		id: string;
		title: string;
		handle: string;
	};
	/**
	 * @minItems 1
	 */
	selectedOptions: {
		name: string;
		value: string;
	}[];
	promise: Promise<ProductSelectResult>;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: ProductSelectPayloadDetail;
}
export interface ProductSelectResult {
	variant: {
		id: string;
		title: string;
		availableForSale: boolean;
		price: {
			amount: string;
			currencyCode: string;
		};
		/**
		 * @minItems 1
		 */
		selectedOptions: {
			name: string;
			value: string;
		}[];
	} | null;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: ProductSelectResultDetail;
}
export interface ProductViewPayload {
	context: "page" | "search" | "collection" | "dialog" | "recommendation";
	selectedOptions: {
		name: string;
		value: string;
	}[];
	product: {
		id: string;
		title: string;
		handle: string;
		selectedVariant: {
			id: string;
			title: string;
			availableForSale: boolean;
			price: {
				amount: string;
				currencyCode: string;
			};
			selectedOptions: {
				name: string;
				value: string;
			}[];
		} | null;
	};
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: ProductViewPayloadDetail;
}
export interface SearchUpdatePayload {
	search: {
		query: string;
		productFilters?: {
			available?: boolean;
			category?: {
				id: string;
			};
			price?: {
				min?: number;
				max?: number;
			};
			productMetafield?: {
				namespace: string;
				key: string;
				value?: string;
			};
			productType?: string;
			productVendor?: string;
			tag?: string;
			taxonomyMetafield?: {
				key: string;
				value: string;
			};
			variantMetafield?: {
				namespace: string;
				key: string;
				value?: string;
			};
			variantOption?: {
				name: string;
				value?: string;
			};
		}[];
		sortKey?: "RELEVANCE" | "PRICE";
	};
	promise: Promise<SearchUpdateResult>;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: SearchUpdatePayloadDetail;
}
export interface SearchUpdateResult {
	totalCount: number;
	/**
	 * Optional custom data. Use this to provide additional data for internal use in the theme.
	 */
	detail?: SearchUpdateResultDetail;
}
export interface StandardStorefrontEventMap {
	"shopify:cart:discount-update": CartDiscountUpdateEvent;
	"shopify:cart:error": CartErrorEvent;
	"shopify:cart:lines-update": CartLinesUpdateEvent;
	"shopify:cart:note-update": CartNoteUpdateEvent;
	"shopify:cart:view": CartViewEvent;
	"shopify:collection:update": CollectionUpdateEvent;
	"shopify:collection:view": CollectionViewEvent;
	"shopify:page:view": PageViewEvent;
	"shopify:product:select": ProductSelectEvent;
	"shopify:product:view": ProductViewEvent;
	"shopify:search:update": SearchUpdateEvent;
}
declare global {
	interface ElementEventMap extends StandardStorefrontEventMap {
	}
	interface DocumentEventMap extends StandardStorefrontEventMap {
	}
	interface WindowEventMap extends StandardStorefrontEventMap {
	}
}
/**
 * Shopify resource types that can be wrapped in a `gid://shopify/...` identifier.
 */
export type ShopifyResourceType = "Product" | "ProductVariant" | "Cart" | "CartLine" | "Collection" | "SellingPlan";
declare function createGid<T extends ShopifyResourceType>(resourceType: T, id: string | number): `gid://shopify/${T}/${string}`;
/** Maps `string` to `string | number` via distribution, preserving `null`/`undefined` in unions. */
export type StringToGidInput<T> = T extends string ? string | number : T;
/**
 * Recursively replaces `id` and `merchandiseId` fields of type `string` with
 * `string | number` so that event constructors accept raw IDs, numeric IDs,
 * or full GID strings.
 * Distributive over unions, so nullable types (e.g. `T | null`) are handled
 * automatically without special casing.
 */
export type WithGidInput<T> = T extends Promise<infer R> ? Promise<WithGidInput<R>> : T extends (infer U)[] ? WithGidInput<U>[] : T extends Record<string, any> ? {
	[K in keyof T]: K extends "id" | "merchandiseId" ? StringToGidInput<T[K]> : WithGidInput<T[K]>;
} : T;
/** Raw cart line item from the AJAX API response. */
export interface CartAjaxLine {
	/** AJAX line keys are opaque identifiers; preserve them when available. */
	key: string;
	/** AJAX item variant id; stringified when `key` is unavailable. */
	id: string | number;
	quantity: number;
	final_line_price: number | string;
	[key: string]: unknown;
}
/** Raw cart response from the AJAX API. */
export interface CartAjaxResponse {
	token: string;
	item_count: number;
	total_price: number | string;
	currency: string;
	items: CartAjaxLine[];
	discount_codes?: Array<{
		code: string;
		applicable: boolean;
	}>;
	[key: string]: unknown;
}
declare function fromAjaxCart(cart: CartAjaxResponse): CartSummary;
declare function parseProductFilters(searchParams?: URLSearchParams, options?: {
	locale?: string;
}): ProductFilter[] | undefined;
declare function getCollectionSortKey(searchParams?: URLSearchParams): CollectionUpdatePayload["sortKey"];
declare function getSearchSortKey(searchParams?: URLSearchParams): SearchUpdatePayload["search"]["sortKey"];
export declare const StandardEvents: {
	readonly pageView: "shopify:page:view";
	readonly productView: "shopify:product:view";
	readonly productSelect: "shopify:product:select";
	readonly cartView: "shopify:cart:view";
	readonly cartError: "shopify:cart:error";
	readonly cartLinesUpdate: "shopify:cart:lines-update";
	readonly cartNoteUpdate: "shopify:cart:note-update";
	readonly cartDiscountUpdate: "shopify:cart:discount-update";
	readonly searchUpdate: "shopify:search:update";
	readonly collectionView: "shopify:collection:view";
	readonly collectionUpdate: "shopify:collection:update";
};
export type StandardEventType = (typeof StandardEvents)[keyof typeof StandardEvents];
export declare class ShopifyStandardEvent extends Event {
	static readonly eventName: string;
	static createGid: typeof createGid;
	constructor(type: string, payload: Record<string, any>, options?: EventInit);
}
export interface PageViewEvent extends PageViewPayload {
}
export declare class PageViewEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:page:view";
	constructor(payload: PageViewPayload);
}
export interface ProductViewEvent extends ProductViewPayload {
}
export declare class ProductViewEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:product:view";
	constructor(payload: WithGidInput<ProductViewPayload>);
}
export interface ProductSelectEvent extends ProductSelectPayload {
}
export declare class ProductSelectEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:product:select";
	static createPromise: () => {
		promise: Promise<{
			variant: {
				id: string | number;
				title: string;
				availableForSale: boolean;
				price: {
					amount: string;
					currencyCode: string;
				};
				selectedOptions: {
					name: string;
					value: string;
				}[];
			} | null;
			detail?: any;
		}>;
		resolve: (value: {
			variant: {
				id: string | number;
				title: string;
				availableForSale: boolean;
				price: {
					amount: string;
					currencyCode: string;
				};
				selectedOptions: {
					name: string;
					value: string;
				}[];
			} | null;
			detail?: any;
		}) => void;
		reject: (reason?: any) => void;
	};
	constructor(payload: WithGidInput<ProductSelectPayload>);
}
export type CartViewInput = WithGidInput<Omit<CartViewPayload, "cart"> & {
	cart: (Omit<NonNullable<CartViewPayload["cart"]>, "id"> & {
		id?: NonNullable<CartViewPayload["cart"]>["id"];
	}) | null;
}>;
export interface CartViewEvent extends CartViewPayload {
}
export declare class CartViewEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:cart:view";
	static createCartFromAjaxResponse: typeof fromAjaxCart;
	constructor({ cart, ...payload }: CartViewInput);
}
export interface CartErrorEvent extends CartErrorPayload {
}
export declare class CartErrorEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:cart:error";
	constructor(payload: CartErrorPayload);
}
declare class CartLinesUpdateEventImpl<TAction extends CartLinesUpdatePayload["action"] = CartLinesUpdatePayload["action"]> extends ShopifyStandardEvent {
	static readonly eventName: "shopify:cart:lines-update";
	static createPromise: () => {
		promise: Promise<{
			cart: {
				id: string | number;
				totalQuantity: number;
				cost: {
					totalAmount: {
						amount: string;
						currencyCode: string;
					};
				};
				lines: {
					id: string | number;
					quantity: number;
					cost: {
						totalAmount: {
							amount: string;
							currencyCode: string;
						};
					};
				}[];
				discountCodes: {
					applicable: boolean;
					code: string;
				}[];
			} | null;
			userErrors?: {
				code?: string | undefined;
				field?: string[] | undefined;
				message: string;
			}[] | undefined;
			warnings?: {
				code?: string | undefined;
				message: string;
				target?: string | undefined;
			}[] | undefined;
			detail?: any;
		}>;
		resolve: (value: {
			cart: {
				id: string | number;
				totalQuantity: number;
				cost: {
					totalAmount: {
						amount: string;
						currencyCode: string;
					};
				};
				lines: {
					id: string | number;
					quantity: number;
					cost: {
						totalAmount: {
							amount: string;
							currencyCode: string;
						};
					};
				}[];
				discountCodes: {
					applicable: boolean;
					code: string;
				}[];
			} | null;
			userErrors?: {
				code?: string | undefined;
				field?: string[] | undefined;
				message: string;
			}[] | undefined;
			warnings?: {
				code?: string | undefined;
				message: string;
				target?: string | undefined;
			}[] | undefined;
			detail?: any;
		}) => void;
		reject: (reason?: any) => void;
	};
	static createCartFromAjaxResponse: typeof fromAjaxCart;
	action: Extract<CartLinesUpdatePayload, {
		action: TAction;
	}>["action"];
	context: Extract<CartLinesUpdatePayload, {
		action: TAction;
	}>["context"];
	lines: Extract<CartLinesUpdatePayload, {
		action: TAction;
	}>["lines"];
	promise: Extract<CartLinesUpdatePayload, {
		action: TAction;
	}>["promise"];
	detail?: Extract<CartLinesUpdatePayload, {
		action: TAction;
	}>["detail"];
	constructor(payload: WithGidInput<Extract<CartLinesUpdatePayload, {
		action: TAction;
	}>>);
}
export declare const CartLinesUpdateEvent: typeof CartLinesUpdateEventImpl;
export type CartLinesUpdateEvent<TAction extends CartLinesUpdatePayload["action"] = CartLinesUpdatePayload["action"]> = TAction extends CartLinesUpdatePayload["action"] ? CartLinesUpdateEventImpl<TAction> : never;
export interface CartNoteUpdateEvent extends CartNoteUpdatePayload {
}
export declare class CartNoteUpdateEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:cart:note-update";
	static createCartFromAjaxResponse: typeof fromAjaxCart;
	static createPromise: () => {
		promise: Promise<{
			cart: {
				id: string | number;
				totalQuantity: number;
				cost: {
					totalAmount: {
						amount: string;
						currencyCode: string;
					};
				};
				lines: {
					id: string | number;
					quantity: number;
					cost: {
						totalAmount: {
							amount: string;
							currencyCode: string;
						};
					};
				}[];
				discountCodes: {
					applicable: boolean;
					code: string;
				}[];
			} | null;
			userErrors?: {
				code?: string | undefined;
				field?: string[] | undefined;
				message: string;
			}[] | undefined;
			warnings?: {
				code?: string | undefined;
				message: string;
				target?: string | undefined;
			}[] | undefined;
			detail?: any;
		}>;
		resolve: (value: {
			cart: {
				id: string | number;
				totalQuantity: number;
				cost: {
					totalAmount: {
						amount: string;
						currencyCode: string;
					};
				};
				lines: {
					id: string | number;
					quantity: number;
					cost: {
						totalAmount: {
							amount: string;
							currencyCode: string;
						};
					};
				}[];
				discountCodes: {
					applicable: boolean;
					code: string;
				}[];
			} | null;
			userErrors?: {
				code?: string | undefined;
				field?: string[] | undefined;
				message: string;
			}[] | undefined;
			warnings?: {
				code?: string | undefined;
				message: string;
				target?: string | undefined;
			}[] | undefined;
			detail?: any;
		}) => void;
		reject: (reason?: any) => void;
	};
	constructor(payload: WithGidInput<CartNoteUpdatePayload>);
}
export interface CartDiscountUpdateEvent extends CartDiscountUpdatePayload {
}
export declare class CartDiscountUpdateEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:cart:discount-update";
	static createCartFromAjaxResponse: typeof fromAjaxCart;
	static createPromise: () => {
		promise: Promise<{
			cart: {
				id: string | number;
				totalQuantity: number;
				cost: {
					totalAmount: {
						amount: string;
						currencyCode: string;
					};
				};
				lines: {
					id: string | number;
					quantity: number;
					cost: {
						totalAmount: {
							amount: string;
							currencyCode: string;
						};
					};
				}[];
				discountCodes: {
					applicable: boolean;
					code: string;
				}[];
			} | null;
			userErrors?: {
				code?: string | undefined;
				field?: string[] | undefined;
				message: string;
			}[] | undefined;
			warnings?: {
				code?: string | undefined;
				message: string;
				target?: string | undefined;
			}[] | undefined;
			detail?: any;
		}>;
		resolve: (value: {
			cart: {
				id: string | number;
				totalQuantity: number;
				cost: {
					totalAmount: {
						amount: string;
						currencyCode: string;
					};
				};
				lines: {
					id: string | number;
					quantity: number;
					cost: {
						totalAmount: {
							amount: string;
							currencyCode: string;
						};
					};
				}[];
				discountCodes: {
					applicable: boolean;
					code: string;
				}[];
			} | null;
			userErrors?: {
				code?: string | undefined;
				field?: string[] | undefined;
				message: string;
			}[] | undefined;
			warnings?: {
				code?: string | undefined;
				message: string;
				target?: string | undefined;
			}[] | undefined;
			detail?: any;
		}) => void;
		reject: (reason?: any) => void;
	};
	constructor(payload: WithGidInput<CartDiscountUpdatePayload>);
}
export interface SearchUpdateEvent extends SearchUpdatePayload {
}
export declare class SearchUpdateEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:search:update";
	static createPromise: () => {
		promise: Promise<SearchUpdateResult>;
		resolve: (value: SearchUpdateResult) => void;
		reject: (reason?: any) => void;
	};
	static parseProductFilters: typeof parseProductFilters;
	static getSortKey: typeof getSearchSortKey;
	constructor(payload: SearchUpdatePayload);
}
export interface CollectionViewEvent extends CollectionViewPayload {
}
export declare class CollectionViewEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:collection:view";
	constructor(payload: WithGidInput<CollectionViewPayload>);
}
export interface CollectionUpdateEvent extends CollectionUpdatePayload {
}
export declare class CollectionUpdateEvent extends ShopifyStandardEvent {
	static readonly eventName: "shopify:collection:update";
	static createPromise: () => {
		promise: Promise<{
			productsCount: number;
			detail?: any;
		}>;
		resolve: (value: {
			productsCount: number;
			detail?: any;
		}) => void;
		reject: (reason?: any) => void;
	};
	static parseProductFilters: typeof parseProductFilters;
	static getSortKey: typeof getCollectionSortKey;
	constructor(payload: WithGidInput<CollectionUpdatePayload>);
}
export type ViewEventTrigger = "connect" | "intersect" | "dialog" | "manual";
export interface ViewEventOptions {
	/** The trigger for the view event when not specified via attribute. The default is 'connect'. */
	defaultTrigger?: ViewEventTrigger;
}
export type CustomElementLike = {
	connectedCallback?(): void;
	disconnectedCallback?(): void;
};
export type ViewEventElementBase = new (...args: any[]) => HTMLElement & CustomElementLike;
/**
 * Interface describing the view event functionality added by createViewEventElement.
 * Themes can use this interface when declaring their own view event components
 * to ensure type compatibility with the factory output.
 */
export interface ViewEventElement {
	dispatchViewEvent(): void;
}
export type ViewEventElementClass<TBase extends ViewEventElementBase> = new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & ViewEventElement;
/**
 * Creates a ViewEventElement class that extends the given base class.
 *
 * Attributes:
 * - `view-event-payload`: Output of the `standard_event_data: 'view'` Liquid filter. Alternatively, a child `<script type="application/json" data-view-event-payload>` can be used.
 * - `view-event-trigger`: one of `"connect" | "intersect" | "dialog" | "manual"`. Defaults to "connect".
 *
 * Register it as a custom element or use it as a base class for your own custom element to automatically dispatch view events.
 * Example: `customElements.define('s-view-event', createViewEventElement());`
 */
export declare function createViewEventElement<TBase extends ViewEventElementBase = typeof HTMLElement>(Base?: TBase, options?: ViewEventOptions): ViewEventElementClass<TBase>;

export {};
