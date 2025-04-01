/**
 * GQty AUTO-GENERATED CODE: PLEASE DO NOT MODIFY MANUALLY
 */

import {SchemaUnionsKey, type ScalarsEnumsHash} from 'gqty';

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends {[key: string]: unknown}> = {[K in keyof T]: T[K]};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<T extends {[key: string]: unknown}, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | {[P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never};
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: {input: string; output: string};
  String: {input: string; output: string};
  Boolean: {input: boolean; output: boolean};
  Int: {input: number; output: number};
  Float: {input: number; output: number};
  /**
   * A string containing a hexadecimal representation of a color.
   *
   * For example, "#6A8D48".
   */
  Color: {input: any; output: any};
  /**
   * Represents an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)-encoded date and time string.
   * For example, 3:50 pm on September 7, 2019 in the time zone of UTC (Coordinated Universal Time) is
   * represented as `"2019-09-07T15:50:00Z`".
   */
  DateTime: {input: string; output: string};
  /**
   * A signed decimal number, which supports arbitrary precision and is serialized as a string.
   *
   * Example values: `"29.99"`, `"29.999"`.
   */
  Decimal: {input: any; output: any};
  /**
   * A string containing HTML code. Refer to the [HTML spec](https://html.spec.whatwg.org/#elements-3) for a
   * complete list of HTML elements.
   *
   * Example value: `"<p>Grey cotton knit sweater.</p>"`
   */
  HTML: {input: any; output: any};
  /** An ISO 8601-encoded datetime */
  ISO8601DateTime: {input: any; output: any};
  /**
   * A [JSON](https://www.json.org/json-en.html) object.
   *
   * Example value:
   * `{
   *   "product": {
   *     "id": "gid://shopify/Product/1346443542550",
   *     "title": "White T-shirt",
   *     "options": [{
   *       "name": "Size",
   *       "values": ["M", "L"]
   *     }]
   *   }
   * }`
   */
  JSON: {input: any; output: any};
  /**
   * Represents an [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986) and
   * [RFC 3987](https://datatracker.ietf.org/doc/html/rfc3987)-compliant URI string.
   *
   * For example, `"https://example.myshopify.com"` is a valid URL. It includes a scheme (`https`) and a host
   * (`example.myshopify.com`).
   */
  URL: {input: any; output: any};
  /**
   * An unsigned 64-bit integer. Represents whole numeric values between 0 and 2^64 - 1 encoded as a string of base-10 digits.
   *
   * Example value: `"50"`.
   */
  UnsignedInt64: {input: any; output: any};
}

/** The input fields for submitting Apple Pay payment method information for checkout. */
export interface ApplePayWalletContentInput {
  /** The customer's billing address. */
  billingAddress: MailingAddressInput;
  /** The data for the Apple Pay wallet. */
  data: Scalars['String']['input'];
  /** The header data for the Apple Pay wallet. */
  header: ApplePayWalletHeaderInput;
  /** The last digits of the card used to create the payment. */
  lastDigits?: InputMaybe<Scalars['String']['input']>;
  /** The signature for the Apple Pay wallet. */
  signature: Scalars['String']['input'];
  /** The version for the Apple Pay wallet. */
  version: Scalars['String']['input'];
}

/** The input fields for submitting wallet payment method information for checkout. */
export interface ApplePayWalletHeaderInput {
  /** The application data for the Apple Pay wallet. */
  applicationData?: InputMaybe<Scalars['String']['input']>;
  /** The ephemeral public key for the Apple Pay wallet. */
  ephemeralPublicKey: Scalars['String']['input'];
  /** The public key hash for the Apple Pay wallet. */
  publicKeyHash: Scalars['String']['input'];
  /** The transaction ID for the Apple Pay wallet. */
  transactionId: Scalars['String']['input'];
}

/** The set of valid sort keys for the Article query. */
export enum ArticleSortKeys {
  /** Sort by the `author` value. */
  AUTHOR = 'AUTHOR',
  /** Sort by the `blog_title` value. */
  BLOG_TITLE = 'BLOG_TITLE',
  /** Sort by the `id` value. */
  ID = 'ID',
  /** Sort by the `published_at` value. */
  PUBLISHED_AT = 'PUBLISHED_AT',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
  /** Sort by the `title` value. */
  TITLE = 'TITLE',
  /** Sort by the `updated_at` value. */
  UPDATED_AT = 'UPDATED_AT',
}

/** The input fields for an attribute. */
export interface AttributeInput {
  /** Key or name of the attribute. */
  key: Scalars['String']['input'];
  /** Value of the attribute. */
  value: Scalars['String']['input'];
}

/** The set of valid sort keys for the Blog query. */
export enum BlogSortKeys {
  /** Sort by the `handle` value. */
  HANDLE = 'HANDLE',
  /** Sort by the `id` value. */
  ID = 'ID',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
  /** Sort by the `title` value. */
  TITLE = 'TITLE',
}

/** The input fields for obtaining the buyer's identity. */
export interface BuyerInput {
  /** The identifier of the company location. */
  companyLocationId?: InputMaybe<Scalars['ID']['input']>;
  /** The customer access token retrieved from the [Customer Accounts API](https://shopify.dev/docs/api/customer#step-obtain-access-token). */
  customerAccessToken: Scalars['String']['input'];
}

/** Card brand, such as Visa or Mastercard, which can be used for payments. */
export enum CardBrand {
  /** American Express. */
  AMERICAN_EXPRESS = 'AMERICAN_EXPRESS',
  /** Diners Club. */
  DINERS_CLUB = 'DINERS_CLUB',
  /** Discover. */
  DISCOVER = 'DISCOVER',
  /** JCB. */
  JCB = 'JCB',
  /** Mastercard. */
  MASTERCARD = 'MASTERCARD',
  /** Visa. */
  VISA = 'VISA',
}

/**
 * Specifies the input fields to update the buyer information associated with a cart.
 * Buyer identity is used to determine
 * [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing)
 * and should match the customer's shipping address.
 */
export interface CartBuyerIdentityInput {
  /** The company location of the buyer that is interacting with the cart. */
  companyLocationId?: InputMaybe<Scalars['ID']['input']>;
  /** The country where the buyer is located. */
  countryCode?: InputMaybe<CountryCode>;
  /** The access token used to identify the customer associated with the cart. */
  customerAccessToken?: InputMaybe<Scalars['String']['input']>;
  /** The email address of the buyer that is interacting with the cart. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** The phone number of the buyer that is interacting with the cart. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /**
   * A set of preferences tied to the buyer interacting with the cart. Preferences are used to prefill fields in at checkout to streamline information collection.
   * Preferences are not synced back to the cart if they are overwritten.
   */
  preferences?: InputMaybe<CartPreferencesInput>;
}

/** Represents how credit card details are provided for a direct payment. */
export enum CartCardSource {
  /**
   * The credit card was provided by a third party and vaulted on their system.
   * Using this value requires a separate permission from Shopify.
   */
  SAVED_CREDIT_CARD = 'SAVED_CREDIT_CARD',
}

/** Preferred location used to find the closest pick up point based on coordinates. */
export interface CartDeliveryCoordinatesPreferenceInput {
  /**
   * The two-letter code for the country of the preferred location.
   *
   * For example, US.
   */
  countryCode: CountryCode;
  /** The geographic latitude for a given location. Coordinates are required in order to set pickUpHandle for pickup points. */
  latitude: Scalars['Float']['input'];
  /** The geographic longitude for a given location. Coordinates are required in order to set pickUpHandle for pickup points. */
  longitude: Scalars['Float']['input'];
}

/** Defines what type of merchandise is in the delivery group. */
export enum CartDeliveryGroupType {
  /**
   * The delivery group only contains merchandise that is either a one time purchase or a first delivery of
   * subscription merchandise.
   */
  ONE_TIME_PURCHASE = 'ONE_TIME_PURCHASE',
  /** The delivery group only contains subscription merchandise. */
  SUBSCRIPTION = 'SUBSCRIPTION',
}

/** Delivery preferences can be used to prefill the delivery section at checkout. */
export interface CartDeliveryPreferenceInput {
  /** The coordinates of a delivery location in order of preference. */
  coordinates?: InputMaybe<CartDeliveryCoordinatesPreferenceInput>;
  /**
   * The preferred delivery methods such as shipping, local pickup or through pickup points.
   *
   * The input must not contain more than `250` values.
   */
  deliveryMethod?: InputMaybe<Array<PreferenceDeliveryMethodType>>;
  /**
   * The pickup handle prefills checkout fields with the location for either local pickup or pickup points delivery methods.
   * It accepts both location ID for local pickup and external IDs for pickup points.
   *
   * The input must not contain more than `250` values.
   */
  pickupHandle?: InputMaybe<Array<Scalars['String']['input']>>;
}

/** The input fields for submitting direct payment method information for checkout. */
export interface CartDirectPaymentMethodInput {
  /** The customer's billing address. */
  billingAddress: MailingAddressInput;
  /** The source of the credit card payment. */
  cardSource?: InputMaybe<CartCardSource>;
  /** The session ID for the direct payment method used to create the payment. */
  sessionId: Scalars['String']['input'];
}

/** Possible error codes that can be returned by `CartUserError`. */
export enum CartErrorCode {
  /** The specified address field contains emojis. */
  ADDRESS_FIELD_CONTAINS_EMOJIS = 'ADDRESS_FIELD_CONTAINS_EMOJIS',
  /** The specified address field contains HTML tags. */
  ADDRESS_FIELD_CONTAINS_HTML_TAGS = 'ADDRESS_FIELD_CONTAINS_HTML_TAGS',
  /** The specified address field contains a URL. */
  ADDRESS_FIELD_CONTAINS_URL = 'ADDRESS_FIELD_CONTAINS_URL',
  /** The specified address field does not match the expected pattern. */
  ADDRESS_FIELD_DOES_NOT_MATCH_EXPECTED_PATTERN = 'ADDRESS_FIELD_DOES_NOT_MATCH_EXPECTED_PATTERN',
  /** The specified address field is required. */
  ADDRESS_FIELD_IS_REQUIRED = 'ADDRESS_FIELD_IS_REQUIRED',
  /** The specified address field is too long. */
  ADDRESS_FIELD_IS_TOO_LONG = 'ADDRESS_FIELD_IS_TOO_LONG',
  /** The input value is invalid. */
  INVALID = 'INVALID',
  /** Company location not found or not allowed. */
  INVALID_COMPANY_LOCATION = 'INVALID_COMPANY_LOCATION',
  /** Delivery group was not found in cart. */
  INVALID_DELIVERY_GROUP = 'INVALID_DELIVERY_GROUP',
  /** Delivery option was not valid. */
  INVALID_DELIVERY_OPTION = 'INVALID_DELIVERY_OPTION',
  /** The quantity must be a multiple of the specified increment. */
  INVALID_INCREMENT = 'INVALID_INCREMENT',
  /** Merchandise line was not found in cart. */
  INVALID_MERCHANDISE_LINE = 'INVALID_MERCHANDISE_LINE',
  /** The metafields were not valid. */
  INVALID_METAFIELDS = 'INVALID_METAFIELDS',
  /** The payment wasn't valid. */
  INVALID_PAYMENT = 'INVALID_PAYMENT',
  /** Cannot update payment on an empty cart */
  INVALID_PAYMENT_EMPTY_CART = 'INVALID_PAYMENT_EMPTY_CART',
  /** The given zip code is invalid for the provided country. */
  INVALID_ZIP_CODE_FOR_COUNTRY = 'INVALID_ZIP_CODE_FOR_COUNTRY',
  /** The given zip code is invalid for the provided province. */
  INVALID_ZIP_CODE_FOR_PROVINCE = 'INVALID_ZIP_CODE_FOR_PROVINCE',
  /** The input value should be less than the maximum value allowed. */
  LESS_THAN = 'LESS_THAN',
  /** The quantity must be below the specified maximum for the item. */
  MAXIMUM_EXCEEDED = 'MAXIMUM_EXCEEDED',
  /** The quantity must be above the specified minimum for the item. */
  MINIMUM_NOT_MET = 'MINIMUM_NOT_MET',
  /** The customer access token is required when setting a company location. */
  MISSING_CUSTOMER_ACCESS_TOKEN = 'MISSING_CUSTOMER_ACCESS_TOKEN',
  /** Missing discount code. */
  MISSING_DISCOUNT_CODE = 'MISSING_DISCOUNT_CODE',
  /** Missing note. */
  MISSING_NOTE = 'MISSING_NOTE',
  /** The note length must be below the specified maximum. */
  NOTE_TOO_LONG = 'NOTE_TOO_LONG',
  /** The payment method is not supported. */
  PAYMENT_METHOD_NOT_SUPPORTED = 'PAYMENT_METHOD_NOT_SUPPORTED',
  /** The given province cannot be found. */
  PROVINCE_NOT_FOUND = 'PROVINCE_NOT_FOUND',
  /** A general error occurred during address validation. */
  UNSPECIFIED_ADDRESS_ERROR = 'UNSPECIFIED_ADDRESS_ERROR',
  /** Validation failed. */
  VALIDATION_CUSTOM = 'VALIDATION_CUSTOM',
  /** The given zip code is unsupported. */
  ZIP_CODE_NOT_SUPPORTED = 'ZIP_CODE_NOT_SUPPORTED',
}

/** The input fields for submitting a billing address without a selected payment method. */
export interface CartFreePaymentMethodInput {
  /** The customer's billing address. */
  billingAddress: MailingAddressInput;
}

/** The input fields to create a cart. */
export interface CartInput {
  /**
   * An array of key-value pairs that contains additional information about the cart.
   *
   * The input must not contain more than `250` values.
   */
  attributes?: InputMaybe<Array<AttributeInput>>;
  /**
   * The customer associated with the cart. Used to determine [international pricing]
   * (https://shopify.dev/custom-storefronts/internationalization/international-pricing).
   * Buyer identity should match the customer's shipping address.
   */
  buyerIdentity?: InputMaybe<CartBuyerIdentityInput>;
  /**
   * The case-insensitive discount codes that the customer added at checkout.
   *
   * The input must not contain more than `250` values.
   */
  discountCodes?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * The case-insensitive gift card codes.
   *
   * The input must not contain more than `250` values.
   */
  giftCardCodes?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * A list of merchandise lines to add to the cart.
   *
   * The input must not contain more than `250` values.
   */
  lines?: InputMaybe<Array<CartLineInput>>;
  /**
   * The metafields to associate with this cart.
   *
   * The input must not contain more than `250` values.
   */
  metafields?: InputMaybe<Array<CartInputMetafieldInput>>;
  /** A note that's associated with the cart. For example, the note can be a personalized message to the buyer. */
  note?: InputMaybe<Scalars['String']['input']>;
}

/** The input fields for a cart metafield value to set. */
export interface CartInputMetafieldInput {
  /** The key name of the metafield. */
  key: Scalars['String']['input'];
  /**
   * The type of data that the cart metafield stores.
   * The type of data must be a [supported type](https://shopify.dev/apps/metafields/types).
   */
  type: Scalars['String']['input'];
  /** The data to store in the cart metafield. The data is always stored as a string, regardless of the metafield's type. */
  value: Scalars['String']['input'];
}

/** The input fields to create a merchandise line on a cart. */
export interface CartLineInput {
  /**
   * An array of key-value pairs that contains additional information about the merchandise line.
   *
   * The input must not contain more than `250` values.
   */
  attributes?: InputMaybe<Array<AttributeInput>>;
  /** The ID of the merchandise that the buyer intends to purchase. */
  merchandiseId: Scalars['ID']['input'];
  /** The quantity of the merchandise. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the selling plan that the merchandise is being purchased with. */
  sellingPlanId?: InputMaybe<Scalars['ID']['input']>;
}

/** The input fields to update a line item on a cart. */
export interface CartLineUpdateInput {
  /**
   * An array of key-value pairs that contains additional information about the merchandise line.
   *
   * The input must not contain more than `250` values.
   */
  attributes?: InputMaybe<Array<AttributeInput>>;
  /** The ID of the merchandise line. */
  id: Scalars['ID']['input'];
  /** The ID of the merchandise for the line item. */
  merchandiseId?: InputMaybe<Scalars['ID']['input']>;
  /** The quantity of the line item. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the selling plan that the merchandise is being purchased with. */
  sellingPlanId?: InputMaybe<Scalars['ID']['input']>;
}

/** The input fields to delete a cart metafield. */
export interface CartMetafieldDeleteInput {
  /**
   * The key name of the cart metafield. Can either be a composite key (`namespace.key`) or a simple key
   *  that relies on the default app-reserved namespace.
   */
  key: Scalars['String']['input'];
  /** The ID of the cart resource. */
  ownerId: Scalars['ID']['input'];
}

/** The input fields for a cart metafield value to set. */
export interface CartMetafieldsSetInput {
  /** The key name of the cart metafield. */
  key: Scalars['String']['input'];
  /** The ID of the cart resource. */
  ownerId: Scalars['ID']['input'];
  /**
   * The type of data that the cart metafield stores.
   * The type of data must be a [supported type](https://shopify.dev/apps/metafields/types).
   */
  type: Scalars['String']['input'];
  /** The data to store in the cart metafield. The data is always stored as a string, regardless of the metafield's type. */
  value: Scalars['String']['input'];
}

/** The input fields for updating the payment method that will be used to checkout. */
export interface CartPaymentInput {
  /** The amount that the customer will be charged at checkout. */
  amount: MoneyInput;
  /** The input fields to use when checking out a cart with a direct payment method (like a credit card). */
  directPaymentMethod?: InputMaybe<CartDirectPaymentMethodInput>;
  /**
   * The input fields to use to checkout a cart without providing a payment method.
   * Use this payment method input if the total cost of the cart is 0.
   */
  freePaymentMethod?: InputMaybe<CartFreePaymentMethodInput>;
  /**
   * An ID of the order placed on the originating platform.
   * Note that this value doesn't correspond to the Shopify Order ID.
   */
  sourceIdentifier?: InputMaybe<Scalars['String']['input']>;
  /** The input fields to use when checking out a cart with a wallet payment method (like Shop Pay or Apple Pay). */
  walletPaymentMethod?: InputMaybe<CartWalletPaymentMethodInput>;
}

/** The input fields represent preferences for the buyer that is interacting with the cart. */
export interface CartPreferencesInput {
  /** Delivery preferences can be used to prefill the delivery section in at checkout. */
  delivery?: InputMaybe<CartDeliveryPreferenceInput>;
  /**
   * Wallet preferences are used to populate relevant payment fields in the checkout flow.
   * Accepted value: `["shop_pay"]`.
   *
   * The input must not contain more than `250` values.
   */
  wallet?: InputMaybe<Array<Scalars['String']['input']>>;
}

/** The input fields for updating the selected delivery options for a delivery group. */
export interface CartSelectedDeliveryOptionInput {
  /** The ID of the cart delivery group. */
  deliveryGroupId: Scalars['ID']['input'];
  /** The handle of the selected delivery option. */
  deliveryOptionHandle: Scalars['String']['input'];
}

/** The input fields for submitting wallet payment method information for checkout. */
export interface CartWalletPaymentMethodInput {
  /** The payment method information for the Apple Pay wallet. */
  applePayWalletContent?: InputMaybe<ApplePayWalletContentInput>;
  /** The payment method information for the Shop Pay wallet. */
  shopPayWalletContent?: InputMaybe<ShopPayWalletContentInput>;
}

/** The code for the cart warning. */
export enum CartWarningCode {
  /** The merchandise does not have enough stock. */
  MERCHANDISE_NOT_ENOUGH_STOCK = 'MERCHANDISE_NOT_ENOUGH_STOCK',
  /** The merchandise is out of stock. */
  MERCHANDISE_OUT_OF_STOCK = 'MERCHANDISE_OUT_OF_STOCK',
  /** Gift cards are not available as a payment method. */
  PAYMENTS_GIFT_CARDS_UNAVAILABLE = 'PAYMENTS_GIFT_CARDS_UNAVAILABLE',
}

/** The set of valid sort keys for the Collection query. */
export enum CollectionSortKeys {
  /** Sort by the `id` value. */
  ID = 'ID',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
  /** Sort by the `title` value. */
  TITLE = 'TITLE',
  /** Sort by the `updated_at` value. */
  UPDATED_AT = 'UPDATED_AT',
}

/** The code of the error that occurred during a cart completion attempt. */
export enum CompletionErrorCode {
  ERROR = 'ERROR',
  INVENTORY_RESERVATION_ERROR = 'INVENTORY_RESERVATION_ERROR',
  PAYMENT_AMOUNT_TOO_SMALL = 'PAYMENT_AMOUNT_TOO_SMALL',
  PAYMENT_CALL_ISSUER = 'PAYMENT_CALL_ISSUER',
  PAYMENT_CARD_DECLINED = 'PAYMENT_CARD_DECLINED',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  PAYMENT_GATEWAY_NOT_ENABLED_ERROR = 'PAYMENT_GATEWAY_NOT_ENABLED_ERROR',
  PAYMENT_INSUFFICIENT_FUNDS = 'PAYMENT_INSUFFICIENT_FUNDS',
  PAYMENT_INVALID_BILLING_ADDRESS = 'PAYMENT_INVALID_BILLING_ADDRESS',
  PAYMENT_INVALID_CREDIT_CARD = 'PAYMENT_INVALID_CREDIT_CARD',
  PAYMENT_INVALID_CURRENCY = 'PAYMENT_INVALID_CURRENCY',
  PAYMENT_INVALID_PAYMENT_METHOD = 'PAYMENT_INVALID_PAYMENT_METHOD',
  PAYMENT_TRANSIENT_ERROR = 'PAYMENT_TRANSIENT_ERROR',
}

/** The precision of the value returned by a count field. */
export enum CountPrecision {
  /** The count is at least the value. A limit was reached. */
  AT_LEAST = 'AT_LEAST',
  /** The count is exactly the value. */
  EXACT = 'EXACT',
}

/**
 * The code designating a country/region, which generally follows ISO 3166-1 alpha-2 guidelines.
 * If a territory doesn't have a country code value in the `CountryCode` enum, then it might be considered a subdivision
 * of another country. For example, the territories associated with Spain are represented by the country code `ES`,
 * and the territories associated with the United States of America are represented by the country code `US`.
 */
export enum CountryCode {
  /** Ascension Island. */
  AC = 'AC',
  /** Andorra. */
  AD = 'AD',
  /** United Arab Emirates. */
  AE = 'AE',
  /** Afghanistan. */
  AF = 'AF',
  /** Antigua & Barbuda. */
  AG = 'AG',
  /** Anguilla. */
  AI = 'AI',
  /** Albania. */
  AL = 'AL',
  /** Armenia. */
  AM = 'AM',
  /** Netherlands Antilles. */
  AN = 'AN',
  /** Angola. */
  AO = 'AO',
  /** Argentina. */
  AR = 'AR',
  /** Austria. */
  AT = 'AT',
  /** Australia. */
  AU = 'AU',
  /** Aruba. */
  AW = 'AW',
  /** Åland Islands. */
  AX = 'AX',
  /** Azerbaijan. */
  AZ = 'AZ',
  /** Bosnia & Herzegovina. */
  BA = 'BA',
  /** Barbados. */
  BB = 'BB',
  /** Bangladesh. */
  BD = 'BD',
  /** Belgium. */
  BE = 'BE',
  /** Burkina Faso. */
  BF = 'BF',
  /** Bulgaria. */
  BG = 'BG',
  /** Bahrain. */
  BH = 'BH',
  /** Burundi. */
  BI = 'BI',
  /** Benin. */
  BJ = 'BJ',
  /** St. Barthélemy. */
  BL = 'BL',
  /** Bermuda. */
  BM = 'BM',
  /** Brunei. */
  BN = 'BN',
  /** Bolivia. */
  BO = 'BO',
  /** Caribbean Netherlands. */
  BQ = 'BQ',
  /** Brazil. */
  BR = 'BR',
  /** Bahamas. */
  BS = 'BS',
  /** Bhutan. */
  BT = 'BT',
  /** Bouvet Island. */
  BV = 'BV',
  /** Botswana. */
  BW = 'BW',
  /** Belarus. */
  BY = 'BY',
  /** Belize. */
  BZ = 'BZ',
  /** Canada. */
  CA = 'CA',
  /** Cocos (Keeling) Islands. */
  CC = 'CC',
  /** Congo - Kinshasa. */
  CD = 'CD',
  /** Central African Republic. */
  CF = 'CF',
  /** Congo - Brazzaville. */
  CG = 'CG',
  /** Switzerland. */
  CH = 'CH',
  /** Côte d’Ivoire. */
  CI = 'CI',
  /** Cook Islands. */
  CK = 'CK',
  /** Chile. */
  CL = 'CL',
  /** Cameroon. */
  CM = 'CM',
  /** China. */
  CN = 'CN',
  /** Colombia. */
  CO = 'CO',
  /** Costa Rica. */
  CR = 'CR',
  /** Cuba. */
  CU = 'CU',
  /** Cape Verde. */
  CV = 'CV',
  /** Curaçao. */
  CW = 'CW',
  /** Christmas Island. */
  CX = 'CX',
  /** Cyprus. */
  CY = 'CY',
  /** Czechia. */
  CZ = 'CZ',
  /** Germany. */
  DE = 'DE',
  /** Djibouti. */
  DJ = 'DJ',
  /** Denmark. */
  DK = 'DK',
  /** Dominica. */
  DM = 'DM',
  /** Dominican Republic. */
  DO = 'DO',
  /** Algeria. */
  DZ = 'DZ',
  /** Ecuador. */
  EC = 'EC',
  /** Estonia. */
  EE = 'EE',
  /** Egypt. */
  EG = 'EG',
  /** Western Sahara. */
  EH = 'EH',
  /** Eritrea. */
  ER = 'ER',
  /** Spain. */
  ES = 'ES',
  /** Ethiopia. */
  ET = 'ET',
  /** Finland. */
  FI = 'FI',
  /** Fiji. */
  FJ = 'FJ',
  /** Falkland Islands. */
  FK = 'FK',
  /** Faroe Islands. */
  FO = 'FO',
  /** France. */
  FR = 'FR',
  /** Gabon. */
  GA = 'GA',
  /** United Kingdom. */
  GB = 'GB',
  /** Grenada. */
  GD = 'GD',
  /** Georgia. */
  GE = 'GE',
  /** French Guiana. */
  GF = 'GF',
  /** Guernsey. */
  GG = 'GG',
  /** Ghana. */
  GH = 'GH',
  /** Gibraltar. */
  GI = 'GI',
  /** Greenland. */
  GL = 'GL',
  /** Gambia. */
  GM = 'GM',
  /** Guinea. */
  GN = 'GN',
  /** Guadeloupe. */
  GP = 'GP',
  /** Equatorial Guinea. */
  GQ = 'GQ',
  /** Greece. */
  GR = 'GR',
  /** South Georgia & South Sandwich Islands. */
  GS = 'GS',
  /** Guatemala. */
  GT = 'GT',
  /** Guinea-Bissau. */
  GW = 'GW',
  /** Guyana. */
  GY = 'GY',
  /** Hong Kong SAR. */
  HK = 'HK',
  /** Heard & McDonald Islands. */
  HM = 'HM',
  /** Honduras. */
  HN = 'HN',
  /** Croatia. */
  HR = 'HR',
  /** Haiti. */
  HT = 'HT',
  /** Hungary. */
  HU = 'HU',
  /** Indonesia. */
  ID = 'ID',
  /** Ireland. */
  IE = 'IE',
  /** Israel. */
  IL = 'IL',
  /** Isle of Man. */
  IM = 'IM',
  /** India. */
  IN = 'IN',
  /** British Indian Ocean Territory. */
  IO = 'IO',
  /** Iraq. */
  IQ = 'IQ',
  /** Iran. */
  IR = 'IR',
  /** Iceland. */
  IS = 'IS',
  /** Italy. */
  IT = 'IT',
  /** Jersey. */
  JE = 'JE',
  /** Jamaica. */
  JM = 'JM',
  /** Jordan. */
  JO = 'JO',
  /** Japan. */
  JP = 'JP',
  /** Kenya. */
  KE = 'KE',
  /** Kyrgyzstan. */
  KG = 'KG',
  /** Cambodia. */
  KH = 'KH',
  /** Kiribati. */
  KI = 'KI',
  /** Comoros. */
  KM = 'KM',
  /** St. Kitts & Nevis. */
  KN = 'KN',
  /** North Korea. */
  KP = 'KP',
  /** South Korea. */
  KR = 'KR',
  /** Kuwait. */
  KW = 'KW',
  /** Cayman Islands. */
  KY = 'KY',
  /** Kazakhstan. */
  KZ = 'KZ',
  /** Laos. */
  LA = 'LA',
  /** Lebanon. */
  LB = 'LB',
  /** St. Lucia. */
  LC = 'LC',
  /** Liechtenstein. */
  LI = 'LI',
  /** Sri Lanka. */
  LK = 'LK',
  /** Liberia. */
  LR = 'LR',
  /** Lesotho. */
  LS = 'LS',
  /** Lithuania. */
  LT = 'LT',
  /** Luxembourg. */
  LU = 'LU',
  /** Latvia. */
  LV = 'LV',
  /** Libya. */
  LY = 'LY',
  /** Morocco. */
  MA = 'MA',
  /** Monaco. */
  MC = 'MC',
  /** Moldova. */
  MD = 'MD',
  /** Montenegro. */
  ME = 'ME',
  /** St. Martin. */
  MF = 'MF',
  /** Madagascar. */
  MG = 'MG',
  /** North Macedonia. */
  MK = 'MK',
  /** Mali. */
  ML = 'ML',
  /** Myanmar (Burma). */
  MM = 'MM',
  /** Mongolia. */
  MN = 'MN',
  /** Macao SAR. */
  MO = 'MO',
  /** Martinique. */
  MQ = 'MQ',
  /** Mauritania. */
  MR = 'MR',
  /** Montserrat. */
  MS = 'MS',
  /** Malta. */
  MT = 'MT',
  /** Mauritius. */
  MU = 'MU',
  /** Maldives. */
  MV = 'MV',
  /** Malawi. */
  MW = 'MW',
  /** Mexico. */
  MX = 'MX',
  /** Malaysia. */
  MY = 'MY',
  /** Mozambique. */
  MZ = 'MZ',
  /** Namibia. */
  NA = 'NA',
  /** New Caledonia. */
  NC = 'NC',
  /** Niger. */
  NE = 'NE',
  /** Norfolk Island. */
  NF = 'NF',
  /** Nigeria. */
  NG = 'NG',
  /** Nicaragua. */
  NI = 'NI',
  /** Netherlands. */
  NL = 'NL',
  /** Norway. */
  NO = 'NO',
  /** Nepal. */
  NP = 'NP',
  /** Nauru. */
  NR = 'NR',
  /** Niue. */
  NU = 'NU',
  /** New Zealand. */
  NZ = 'NZ',
  /** Oman. */
  OM = 'OM',
  /** Panama. */
  PA = 'PA',
  /** Peru. */
  PE = 'PE',
  /** French Polynesia. */
  PF = 'PF',
  /** Papua New Guinea. */
  PG = 'PG',
  /** Philippines. */
  PH = 'PH',
  /** Pakistan. */
  PK = 'PK',
  /** Poland. */
  PL = 'PL',
  /** St. Pierre & Miquelon. */
  PM = 'PM',
  /** Pitcairn Islands. */
  PN = 'PN',
  /** Palestinian Territories. */
  PS = 'PS',
  /** Portugal. */
  PT = 'PT',
  /** Paraguay. */
  PY = 'PY',
  /** Qatar. */
  QA = 'QA',
  /** Réunion. */
  RE = 'RE',
  /** Romania. */
  RO = 'RO',
  /** Serbia. */
  RS = 'RS',
  /** Russia. */
  RU = 'RU',
  /** Rwanda. */
  RW = 'RW',
  /** Saudi Arabia. */
  SA = 'SA',
  /** Solomon Islands. */
  SB = 'SB',
  /** Seychelles. */
  SC = 'SC',
  /** Sudan. */
  SD = 'SD',
  /** Sweden. */
  SE = 'SE',
  /** Singapore. */
  SG = 'SG',
  /** St. Helena. */
  SH = 'SH',
  /** Slovenia. */
  SI = 'SI',
  /** Svalbard & Jan Mayen. */
  SJ = 'SJ',
  /** Slovakia. */
  SK = 'SK',
  /** Sierra Leone. */
  SL = 'SL',
  /** San Marino. */
  SM = 'SM',
  /** Senegal. */
  SN = 'SN',
  /** Somalia. */
  SO = 'SO',
  /** Suriname. */
  SR = 'SR',
  /** South Sudan. */
  SS = 'SS',
  /** São Tomé & Príncipe. */
  ST = 'ST',
  /** El Salvador. */
  SV = 'SV',
  /** Sint Maarten. */
  SX = 'SX',
  /** Syria. */
  SY = 'SY',
  /** Eswatini. */
  SZ = 'SZ',
  /** Tristan da Cunha. */
  TA = 'TA',
  /** Turks & Caicos Islands. */
  TC = 'TC',
  /** Chad. */
  TD = 'TD',
  /** French Southern Territories. */
  TF = 'TF',
  /** Togo. */
  TG = 'TG',
  /** Thailand. */
  TH = 'TH',
  /** Tajikistan. */
  TJ = 'TJ',
  /** Tokelau. */
  TK = 'TK',
  /** Timor-Leste. */
  TL = 'TL',
  /** Turkmenistan. */
  TM = 'TM',
  /** Tunisia. */
  TN = 'TN',
  /** Tonga. */
  TO = 'TO',
  /** Türkiye. */
  TR = 'TR',
  /** Trinidad & Tobago. */
  TT = 'TT',
  /** Tuvalu. */
  TV = 'TV',
  /** Taiwan. */
  TW = 'TW',
  /** Tanzania. */
  TZ = 'TZ',
  /** Ukraine. */
  UA = 'UA',
  /** Uganda. */
  UG = 'UG',
  /** U.S. Outlying Islands. */
  UM = 'UM',
  /** United States. */
  US = 'US',
  /** Uruguay. */
  UY = 'UY',
  /** Uzbekistan. */
  UZ = 'UZ',
  /** Vatican City. */
  VA = 'VA',
  /** St. Vincent & Grenadines. */
  VC = 'VC',
  /** Venezuela. */
  VE = 'VE',
  /** British Virgin Islands. */
  VG = 'VG',
  /** Vietnam. */
  VN = 'VN',
  /** Vanuatu. */
  VU = 'VU',
  /** Wallis & Futuna. */
  WF = 'WF',
  /** Samoa. */
  WS = 'WS',
  /** Kosovo. */
  XK = 'XK',
  /** Yemen. */
  YE = 'YE',
  /** Mayotte. */
  YT = 'YT',
  /** South Africa. */
  ZA = 'ZA',
  /** Zambia. */
  ZM = 'ZM',
  /** Zimbabwe. */
  ZW = 'ZW',
  /** Unknown Region. */
  ZZ = 'ZZ',
}

/** The part of the image that should remain after cropping. */
export enum CropRegion {
  /** Keep the bottom of the image. */
  BOTTOM = 'BOTTOM',
  /** Keep the center of the image. */
  CENTER = 'CENTER',
  /** Keep the left of the image. */
  LEFT = 'LEFT',
  /** Keep the right of the image. */
  RIGHT = 'RIGHT',
  /** Keep the top of the image. */
  TOP = 'TOP',
}

/**
 * The three-letter currency codes that represent the world currencies used in
 * stores. These include standard ISO 4217 codes, legacy codes,
 * and non-standard codes.
 */
export enum CurrencyCode {
  /** United Arab Emirates Dirham (AED). */
  AED = 'AED',
  /** Afghan Afghani (AFN). */
  AFN = 'AFN',
  /** Albanian Lek (ALL). */
  ALL = 'ALL',
  /** Armenian Dram (AMD). */
  AMD = 'AMD',
  /** Netherlands Antillean Guilder. */
  ANG = 'ANG',
  /** Angolan Kwanza (AOA). */
  AOA = 'AOA',
  /** Argentine Pesos (ARS). */
  ARS = 'ARS',
  /** Australian Dollars (AUD). */
  AUD = 'AUD',
  /** Aruban Florin (AWG). */
  AWG = 'AWG',
  /** Azerbaijani Manat (AZN). */
  AZN = 'AZN',
  /** Bosnia and Herzegovina Convertible Mark (BAM). */
  BAM = 'BAM',
  /** Barbadian Dollar (BBD). */
  BBD = 'BBD',
  /** Bangladesh Taka (BDT). */
  BDT = 'BDT',
  /** Bulgarian Lev (BGN). */
  BGN = 'BGN',
  /** Bahraini Dinar (BHD). */
  BHD = 'BHD',
  /** Burundian Franc (BIF). */
  BIF = 'BIF',
  /** Bermudian Dollar (BMD). */
  BMD = 'BMD',
  /** Brunei Dollar (BND). */
  BND = 'BND',
  /** Bolivian Boliviano (BOB). */
  BOB = 'BOB',
  /** Brazilian Real (BRL). */
  BRL = 'BRL',
  /** Bahamian Dollar (BSD). */
  BSD = 'BSD',
  /** Bhutanese Ngultrum (BTN). */
  BTN = 'BTN',
  /** Botswana Pula (BWP). */
  BWP = 'BWP',
  /** Belarusian Ruble (BYN). */
  BYN = 'BYN',
  /**
   * Belarusian Ruble (BYR).
   * @deprecated `BYR` is deprecated. Use `BYN` available from version `2021-01` onwards instead.
   */
  BYR = 'BYR',
  /** Belize Dollar (BZD). */
  BZD = 'BZD',
  /** Canadian Dollars (CAD). */
  CAD = 'CAD',
  /** Congolese franc (CDF). */
  CDF = 'CDF',
  /** Swiss Francs (CHF). */
  CHF = 'CHF',
  /** Chilean Peso (CLP). */
  CLP = 'CLP',
  /** Chinese Yuan Renminbi (CNY). */
  CNY = 'CNY',
  /** Colombian Peso (COP). */
  COP = 'COP',
  /** Costa Rican Colones (CRC). */
  CRC = 'CRC',
  /** Cape Verdean escudo (CVE). */
  CVE = 'CVE',
  /** Czech Koruny (CZK). */
  CZK = 'CZK',
  /** Djiboutian Franc (DJF). */
  DJF = 'DJF',
  /** Danish Kroner (DKK). */
  DKK = 'DKK',
  /** Dominican Peso (DOP). */
  DOP = 'DOP',
  /** Algerian Dinar (DZD). */
  DZD = 'DZD',
  /** Egyptian Pound (EGP). */
  EGP = 'EGP',
  /** Eritrean Nakfa (ERN). */
  ERN = 'ERN',
  /** Ethiopian Birr (ETB). */
  ETB = 'ETB',
  /** Euro (EUR). */
  EUR = 'EUR',
  /** Fijian Dollars (FJD). */
  FJD = 'FJD',
  /** Falkland Islands Pounds (FKP). */
  FKP = 'FKP',
  /** United Kingdom Pounds (GBP). */
  GBP = 'GBP',
  /** Georgian Lari (GEL). */
  GEL = 'GEL',
  /** Ghanaian Cedi (GHS). */
  GHS = 'GHS',
  /** Gibraltar Pounds (GIP). */
  GIP = 'GIP',
  /** Gambian Dalasi (GMD). */
  GMD = 'GMD',
  /** Guinean Franc (GNF). */
  GNF = 'GNF',
  /** Guatemalan Quetzal (GTQ). */
  GTQ = 'GTQ',
  /** Guyanese Dollar (GYD). */
  GYD = 'GYD',
  /** Hong Kong Dollars (HKD). */
  HKD = 'HKD',
  /** Honduran Lempira (HNL). */
  HNL = 'HNL',
  /** Croatian Kuna (HRK). */
  HRK = 'HRK',
  /** Haitian Gourde (HTG). */
  HTG = 'HTG',
  /** Hungarian Forint (HUF). */
  HUF = 'HUF',
  /** Indonesian Rupiah (IDR). */
  IDR = 'IDR',
  /** Israeli New Shekel (NIS). */
  ILS = 'ILS',
  /** Indian Rupees (INR). */
  INR = 'INR',
  /** Iraqi Dinar (IQD). */
  IQD = 'IQD',
  /** Iranian Rial (IRR). */
  IRR = 'IRR',
  /** Icelandic Kronur (ISK). */
  ISK = 'ISK',
  /** Jersey Pound. */
  JEP = 'JEP',
  /** Jamaican Dollars (JMD). */
  JMD = 'JMD',
  /** Jordanian Dinar (JOD). */
  JOD = 'JOD',
  /** Japanese Yen (JPY). */
  JPY = 'JPY',
  /** Kenyan Shilling (KES). */
  KES = 'KES',
  /** Kyrgyzstani Som (KGS). */
  KGS = 'KGS',
  /** Cambodian Riel. */
  KHR = 'KHR',
  /** Kiribati Dollar (KID). */
  KID = 'KID',
  /** Comorian Franc (KMF). */
  KMF = 'KMF',
  /** South Korean Won (KRW). */
  KRW = 'KRW',
  /** Kuwaiti Dinar (KWD). */
  KWD = 'KWD',
  /** Cayman Dollars (KYD). */
  KYD = 'KYD',
  /** Kazakhstani Tenge (KZT). */
  KZT = 'KZT',
  /** Laotian Kip (LAK). */
  LAK = 'LAK',
  /** Lebanese Pounds (LBP). */
  LBP = 'LBP',
  /** Sri Lankan Rupees (LKR). */
  LKR = 'LKR',
  /** Liberian Dollar (LRD). */
  LRD = 'LRD',
  /** Lesotho Loti (LSL). */
  LSL = 'LSL',
  /** Lithuanian Litai (LTL). */
  LTL = 'LTL',
  /** Latvian Lati (LVL). */
  LVL = 'LVL',
  /** Libyan Dinar (LYD). */
  LYD = 'LYD',
  /** Moroccan Dirham. */
  MAD = 'MAD',
  /** Moldovan Leu (MDL). */
  MDL = 'MDL',
  /** Malagasy Ariary (MGA). */
  MGA = 'MGA',
  /** Macedonia Denar (MKD). */
  MKD = 'MKD',
  /** Burmese Kyat (MMK). */
  MMK = 'MMK',
  /** Mongolian Tugrik. */
  MNT = 'MNT',
  /** Macanese Pataca (MOP). */
  MOP = 'MOP',
  /** Mauritanian Ouguiya (MRU). */
  MRU = 'MRU',
  /** Mauritian Rupee (MUR). */
  MUR = 'MUR',
  /** Maldivian Rufiyaa (MVR). */
  MVR = 'MVR',
  /** Malawian Kwacha (MWK). */
  MWK = 'MWK',
  /** Mexican Pesos (MXN). */
  MXN = 'MXN',
  /** Malaysian Ringgits (MYR). */
  MYR = 'MYR',
  /** Mozambican Metical. */
  MZN = 'MZN',
  /** Namibian Dollar. */
  NAD = 'NAD',
  /** Nigerian Naira (NGN). */
  NGN = 'NGN',
  /** Nicaraguan Córdoba (NIO). */
  NIO = 'NIO',
  /** Norwegian Kroner (NOK). */
  NOK = 'NOK',
  /** Nepalese Rupee (NPR). */
  NPR = 'NPR',
  /** New Zealand Dollars (NZD). */
  NZD = 'NZD',
  /** Omani Rial (OMR). */
  OMR = 'OMR',
  /** Panamian Balboa (PAB). */
  PAB = 'PAB',
  /** Peruvian Nuevo Sol (PEN). */
  PEN = 'PEN',
  /** Papua New Guinean Kina (PGK). */
  PGK = 'PGK',
  /** Philippine Peso (PHP). */
  PHP = 'PHP',
  /** Pakistani Rupee (PKR). */
  PKR = 'PKR',
  /** Polish Zlotych (PLN). */
  PLN = 'PLN',
  /** Paraguayan Guarani (PYG). */
  PYG = 'PYG',
  /** Qatari Rial (QAR). */
  QAR = 'QAR',
  /** Romanian Lei (RON). */
  RON = 'RON',
  /** Serbian dinar (RSD). */
  RSD = 'RSD',
  /** Russian Rubles (RUB). */
  RUB = 'RUB',
  /** Rwandan Franc (RWF). */
  RWF = 'RWF',
  /** Saudi Riyal (SAR). */
  SAR = 'SAR',
  /** Solomon Islands Dollar (SBD). */
  SBD = 'SBD',
  /** Seychellois Rupee (SCR). */
  SCR = 'SCR',
  /** Sudanese Pound (SDG). */
  SDG = 'SDG',
  /** Swedish Kronor (SEK). */
  SEK = 'SEK',
  /** Singapore Dollars (SGD). */
  SGD = 'SGD',
  /** Saint Helena Pounds (SHP). */
  SHP = 'SHP',
  /** Sierra Leonean Leone (SLL). */
  SLL = 'SLL',
  /** Somali Shilling (SOS). */
  SOS = 'SOS',
  /** Surinamese Dollar (SRD). */
  SRD = 'SRD',
  /** South Sudanese Pound (SSP). */
  SSP = 'SSP',
  /**
   * Sao Tome And Principe Dobra (STD).
   * @deprecated `STD` is deprecated. Use `STN` available from version `2022-07` onwards instead.
   */
  STD = 'STD',
  /** Sao Tome And Principe Dobra (STN). */
  STN = 'STN',
  /** Syrian Pound (SYP). */
  SYP = 'SYP',
  /** Swazi Lilangeni (SZL). */
  SZL = 'SZL',
  /** Thai baht (THB). */
  THB = 'THB',
  /** Tajikistani Somoni (TJS). */
  TJS = 'TJS',
  /** Turkmenistani Manat (TMT). */
  TMT = 'TMT',
  /** Tunisian Dinar (TND). */
  TND = 'TND',
  /** Tongan Pa'anga (TOP). */
  TOP = 'TOP',
  /** Turkish Lira (TRY). */
  TRY = 'TRY',
  /** Trinidad and Tobago Dollars (TTD). */
  TTD = 'TTD',
  /** Taiwan Dollars (TWD). */
  TWD = 'TWD',
  /** Tanzanian Shilling (TZS). */
  TZS = 'TZS',
  /** Ukrainian Hryvnia (UAH). */
  UAH = 'UAH',
  /** Ugandan Shilling (UGX). */
  UGX = 'UGX',
  /** United States Dollars (USD). */
  USD = 'USD',
  /** Uruguayan Pesos (UYU). */
  UYU = 'UYU',
  /** Uzbekistan som (UZS). */
  UZS = 'UZS',
  /** Venezuelan Bolivares (VED). */
  VED = 'VED',
  /**
   * Venezuelan Bolivares (VEF).
   * @deprecated `VEF` is deprecated. Use `VES` available from version `2020-10` onwards instead.
   */
  VEF = 'VEF',
  /** Venezuelan Bolivares Soberanos (VES). */
  VES = 'VES',
  /** Vietnamese đồng (VND). */
  VND = 'VND',
  /** Vanuatu Vatu (VUV). */
  VUV = 'VUV',
  /** Samoan Tala (WST). */
  WST = 'WST',
  /** Central African CFA Franc (XAF). */
  XAF = 'XAF',
  /** East Caribbean Dollar (XCD). */
  XCD = 'XCD',
  /** West African CFA franc (XOF). */
  XOF = 'XOF',
  /** CFP Franc (XPF). */
  XPF = 'XPF',
  /** Unrecognized currency. */
  XXX = 'XXX',
  /** Yemeni Rial (YER). */
  YER = 'YER',
  /** South African Rand (ZAR). */
  ZAR = 'ZAR',
  /** Zambian Kwacha (ZMW). */
  ZMW = 'ZMW',
}

/** The input fields required to create a customer access token. */
export interface CustomerAccessTokenCreateInput {
  /** The email associated to the customer. */
  email: Scalars['String']['input'];
  /** The login password to be used by the customer. */
  password: Scalars['String']['input'];
}

/** The input fields to activate a customer. */
export interface CustomerActivateInput {
  /** The activation token required to activate the customer. */
  activationToken: Scalars['String']['input'];
  /** New password that will be set during activation. */
  password: Scalars['String']['input'];
}

/** The input fields to create a new customer. */
export interface CustomerCreateInput {
  /** Indicates whether the customer has consented to be sent marketing material via email. */
  acceptsMarketing?: InputMaybe<Scalars['Boolean']['input']>;
  /** The customer’s email. */
  email: Scalars['String']['input'];
  /** The customer’s first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The customer’s last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The login password used by the customer. */
  password: Scalars['String']['input'];
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   */
  phone?: InputMaybe<Scalars['String']['input']>;
}

/** Possible error codes that can be returned by `CustomerUserError`. */
export enum CustomerErrorCode {
  /** Customer already enabled. */
  ALREADY_ENABLED = 'ALREADY_ENABLED',
  /** Input email contains an invalid domain name. */
  BAD_DOMAIN = 'BAD_DOMAIN',
  /** The input value is blank. */
  BLANK = 'BLANK',
  /** Input contains HTML tags. */
  CONTAINS_HTML_TAGS = 'CONTAINS_HTML_TAGS',
  /** Input contains URL. */
  CONTAINS_URL = 'CONTAINS_URL',
  /** Customer is disabled. */
  CUSTOMER_DISABLED = 'CUSTOMER_DISABLED',
  /** The input value is invalid. */
  INVALID = 'INVALID',
  /** Multipass token is not valid. */
  INVALID_MULTIPASS_REQUEST = 'INVALID_MULTIPASS_REQUEST',
  /** Address does not exist. */
  NOT_FOUND = 'NOT_FOUND',
  /** Input password starts or ends with whitespace. */
  PASSWORD_STARTS_OR_ENDS_WITH_WHITESPACE = 'PASSWORD_STARTS_OR_ENDS_WITH_WHITESPACE',
  /** The input value is already taken. */
  TAKEN = 'TAKEN',
  /** Invalid activation token. */
  TOKEN_INVALID = 'TOKEN_INVALID',
  /** The input value is too long. */
  TOO_LONG = 'TOO_LONG',
  /** The input value is too short. */
  TOO_SHORT = 'TOO_SHORT',
  /** Unidentified customer. */
  UNIDENTIFIED_CUSTOMER = 'UNIDENTIFIED_CUSTOMER',
}

/** The input fields to reset a customer's password. */
export interface CustomerResetInput {
  /** New password that will be set as part of the reset password process. */
  password: Scalars['String']['input'];
  /** The reset token required to reset the customer’s password. */
  resetToken: Scalars['String']['input'];
}

/** The input fields to update the Customer information. */
export interface CustomerUpdateInput {
  /** Indicates whether the customer has consented to be sent marketing material via email. */
  acceptsMarketing?: InputMaybe<Scalars['Boolean']['input']>;
  /** The customer’s email. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** The customer’s first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The customer’s last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The login password used by the customer. */
  password?: InputMaybe<Scalars['String']['input']>;
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_. To remove the phone number, specify `null`.
   */
  phone?: InputMaybe<Scalars['String']['input']>;
}

/** The input fields for delivery address preferences. */
export interface DeliveryAddressInput {
  /** The ID of a customer address that is associated with the buyer that is interacting with the cart. */
  customerAddressId?: InputMaybe<Scalars['ID']['input']>;
  /** A delivery address preference of a buyer that is interacting with the cart. */
  deliveryAddress?: InputMaybe<MailingAddressInput>;
  /** Defines what kind of address validation is requested. */
  deliveryAddressValidationStrategy?: InputMaybe<DeliveryAddressValidationStrategy>;
  /**
   * Whether the given delivery address is considered to be a one-time use address. One-time use addresses do not
   * get persisted to the buyer's personal addresses when checking out.
   */
  oneTimeUse?: InputMaybe<Scalars['Boolean']['input']>;
}

/** Defines the types of available validation strategies for delivery addresses. */
export enum DeliveryAddressValidationStrategy {
  /** Only the country code is validated. */
  COUNTRY_CODE_ONLY = 'COUNTRY_CODE_ONLY',
  /**
   * Strict validation is performed, i.e. all fields in the address are validated
   * according to Shopify's checkout rules. If the address fails validation, the cart will not be updated.
   */
  STRICT = 'STRICT',
}

/** List of different delivery method types. */
export enum DeliveryMethodType {
  /** Local Delivery. */
  LOCAL = 'LOCAL',
  /** None. */
  NONE = 'NONE',
  /** Shipping to a Pickup Point. */
  PICKUP_POINT = 'PICKUP_POINT',
  /** Local Pickup. */
  PICK_UP = 'PICK_UP',
  /** Retail. */
  RETAIL = 'RETAIL',
  /** Shipping. */
  SHIPPING = 'SHIPPING',
}

/** Digital wallet, such as Apple Pay, which can be used for accelerated checkouts. */
export enum DigitalWallet {
  /** Android Pay. */
  ANDROID_PAY = 'ANDROID_PAY',
  /** Apple Pay. */
  APPLE_PAY = 'APPLE_PAY',
  /** Google Pay. */
  GOOGLE_PAY = 'GOOGLE_PAY',
  /** Shopify Pay. */
  SHOPIFY_PAY = 'SHOPIFY_PAY',
}

/** The method by which the discount's value is allocated onto its entitled lines. */
export enum DiscountApplicationAllocationMethod {
  /** The value is spread across all entitled lines. */
  ACROSS = 'ACROSS',
  /** The value is applied onto every entitled line. */
  EACH = 'EACH',
  /**
   * The value is specifically applied onto a particular line.
   * @deprecated Use ACROSS instead.
   */
  ONE = 'ONE',
}

/**
 * The lines on the order to which the discount is applied, of the type defined by
 * the discount application's `targetType`. For example, the value `ENTITLED`, combined with a `targetType` of
 * `LINE_ITEM`, applies the discount on all line items that are entitled to the discount.
 * The value `ALL`, combined with a `targetType` of `SHIPPING_LINE`, applies the discount on all shipping lines.
 */
export enum DiscountApplicationTargetSelection {
  /** The discount is allocated onto all the lines. */
  ALL = 'ALL',
  /** The discount is allocated onto only the lines that it's entitled for. */
  ENTITLED = 'ENTITLED',
  /** The discount is allocated onto explicitly chosen lines. */
  EXPLICIT = 'EXPLICIT',
}

/** The type of line (i.e. line item or shipping line) on an order that the discount is applicable towards. */
export enum DiscountApplicationTargetType {
  /** The discount applies onto line items. */
  LINE_ITEM = 'LINE_ITEM',
  /** The discount applies onto shipping lines. */
  SHIPPING_LINE = 'SHIPPING_LINE',
}

/** Defines how to present the filter values, specifies the presentation of the filter. */
export enum FilterPresentation {
  /** Image presentation, filter values display an image. */
  IMAGE = 'IMAGE',
  /** Swatch presentation, filter values display color or image patterns. */
  SWATCH = 'SWATCH',
  /** Text presentation, no additional visual display for filter values. */
  TEXT = 'TEXT',
}

/**
 * The type of data that the filter group represents.
 *
 * For more information, refer to [Filter products in a collection with the Storefront API]
 * (https://shopify.dev/custom-storefronts/products-collections/filter-products).
 */
export enum FilterType {
  /** A boolean value. */
  BOOLEAN = 'BOOLEAN',
  /** A list of selectable values. */
  LIST = 'LIST',
  /** A range of prices. */
  PRICE_RANGE = 'PRICE_RANGE',
}

/** The input fields used to specify a geographical location. */
export interface GeoCoordinateInput {
  /** The coordinate's latitude value. */
  latitude: Scalars['Float']['input'];
  /** The coordinate's longitude value. */
  longitude: Scalars['Float']['input'];
}

/** The input fields to identify a metafield on an owner resource by namespace and key. */
export interface HasMetafieldsIdentifier {
  /** The identifier for the metafield. */
  key: Scalars['String']['input'];
  /** The container the metafield belongs to. If omitted, the app-reserved namespace will be used. */
  namespace?: InputMaybe<Scalars['String']['input']>;
}

/** List of supported image content types. */
export enum ImageContentType {
  /** A JPG image. */
  JPG = 'JPG',
  /** A PNG image. */
  PNG = 'PNG',
  /** A WEBP image. */
  WEBP = 'WEBP',
}

/**
 * The available options for transforming an image.
 *
 * All transformation options are considered best effort. Any transformation that
 * the original image type doesn't support will be ignored.
 */
export interface ImageTransformInput {
  /**
   * The region of the image to remain after cropping.
   * Must be used in conjunction with the `maxWidth` and/or `maxHeight` fields,
   * where the `maxWidth` and `maxHeight` aren't equal.
   * The `crop` argument should coincide with the smaller value. A smaller `maxWidth` indicates a `LEFT` or `RIGHT` crop, while
   * a smaller `maxHeight` indicates a `TOP` or `BOTTOM` crop. For example, `{
   * maxWidth: 5, maxHeight: 10, crop: LEFT }` will result
   * in an image with a width of 5 and height of 10, where the right side of the image is removed.
   */
  crop?: InputMaybe<CropRegion>;
  /** Image height in pixels between 1 and 5760. */
  maxHeight?: InputMaybe<Scalars['Int']['input']>;
  /** Image width in pixels between 1 and 5760. */
  maxWidth?: InputMaybe<Scalars['Int']['input']>;
  /**
   * Convert the source image into the preferred content type.
   * Supported conversions: `.svg` to `.png`, any file type to `.jpg`, and any file type to `.webp`.
   */
  preferredContentType?: InputMaybe<ImageContentType>;
  /** Image size multiplier for high-resolution retina displays. Must be within 1..3. */
  scale?: InputMaybe<Scalars['Int']['input']>;
}

/** Language codes supported by Shopify. */
export enum LanguageCode {
  /** Afrikaans. */
  AF = 'AF',
  /** Akan. */
  AK = 'AK',
  /** Amharic. */
  AM = 'AM',
  /** Arabic. */
  AR = 'AR',
  /** Assamese. */
  AS = 'AS',
  /** Azerbaijani. */
  AZ = 'AZ',
  /** Belarusian. */
  BE = 'BE',
  /** Bulgarian. */
  BG = 'BG',
  /** Bambara. */
  BM = 'BM',
  /** Bangla. */
  BN = 'BN',
  /** Tibetan. */
  BO = 'BO',
  /** Breton. */
  BR = 'BR',
  /** Bosnian. */
  BS = 'BS',
  /** Catalan. */
  CA = 'CA',
  /** Chechen. */
  CE = 'CE',
  /** Central Kurdish. */
  CKB = 'CKB',
  /** Czech. */
  CS = 'CS',
  /** Church Slavic. */
  CU = 'CU',
  /** Welsh. */
  CY = 'CY',
  /** Danish. */
  DA = 'DA',
  /** German. */
  DE = 'DE',
  /** Dzongkha. */
  DZ = 'DZ',
  /** Ewe. */
  EE = 'EE',
  /** Greek. */
  EL = 'EL',
  /** English. */
  EN = 'EN',
  /** Esperanto. */
  EO = 'EO',
  /** Spanish. */
  ES = 'ES',
  /** Estonian. */
  ET = 'ET',
  /** Basque. */
  EU = 'EU',
  /** Persian. */
  FA = 'FA',
  /** Fulah. */
  FF = 'FF',
  /** Finnish. */
  FI = 'FI',
  /** Filipino. */
  FIL = 'FIL',
  /** Faroese. */
  FO = 'FO',
  /** French. */
  FR = 'FR',
  /** Western Frisian. */
  FY = 'FY',
  /** Irish. */
  GA = 'GA',
  /** Scottish Gaelic. */
  GD = 'GD',
  /** Galician. */
  GL = 'GL',
  /** Gujarati. */
  GU = 'GU',
  /** Manx. */
  GV = 'GV',
  /** Hausa. */
  HA = 'HA',
  /** Hebrew. */
  HE = 'HE',
  /** Hindi. */
  HI = 'HI',
  /** Croatian. */
  HR = 'HR',
  /** Hungarian. */
  HU = 'HU',
  /** Armenian. */
  HY = 'HY',
  /** Interlingua. */
  IA = 'IA',
  /** Indonesian. */
  ID = 'ID',
  /** Igbo. */
  IG = 'IG',
  /** Sichuan Yi. */
  II = 'II',
  /** Icelandic. */
  IS = 'IS',
  /** Italian. */
  IT = 'IT',
  /** Japanese. */
  JA = 'JA',
  /** Javanese. */
  JV = 'JV',
  /** Georgian. */
  KA = 'KA',
  /** Kikuyu. */
  KI = 'KI',
  /** Kazakh. */
  KK = 'KK',
  /** Kalaallisut. */
  KL = 'KL',
  /** Khmer. */
  KM = 'KM',
  /** Kannada. */
  KN = 'KN',
  /** Korean. */
  KO = 'KO',
  /** Kashmiri. */
  KS = 'KS',
  /** Kurdish. */
  KU = 'KU',
  /** Cornish. */
  KW = 'KW',
  /** Kyrgyz. */
  KY = 'KY',
  /** Latin. */
  LA = 'LA',
  /** Luxembourgish. */
  LB = 'LB',
  /** Ganda. */
  LG = 'LG',
  /** Lingala. */
  LN = 'LN',
  /** Lao. */
  LO = 'LO',
  /** Lithuanian. */
  LT = 'LT',
  /** Luba-Katanga. */
  LU = 'LU',
  /** Latvian. */
  LV = 'LV',
  /** Malagasy. */
  MG = 'MG',
  /** Māori. */
  MI = 'MI',
  /** Macedonian. */
  MK = 'MK',
  /** Malayalam. */
  ML = 'ML',
  /** Mongolian. */
  MN = 'MN',
  /** Moldavian. */
  MO = 'MO',
  /** Marathi. */
  MR = 'MR',
  /** Malay. */
  MS = 'MS',
  /** Maltese. */
  MT = 'MT',
  /** Burmese. */
  MY = 'MY',
  /** Norwegian (Bokmål). */
  NB = 'NB',
  /** North Ndebele. */
  ND = 'ND',
  /** Nepali. */
  NE = 'NE',
  /** Dutch. */
  NL = 'NL',
  /** Norwegian Nynorsk. */
  NN = 'NN',
  /** Norwegian. */
  NO = 'NO',
  /** Oromo. */
  OM = 'OM',
  /** Odia. */
  OR = 'OR',
  /** Ossetic. */
  OS = 'OS',
  /** Punjabi. */
  PA = 'PA',
  /** Polish. */
  PL = 'PL',
  /** Pashto. */
  PS = 'PS',
  /** Portuguese. */
  PT = 'PT',
  /** Portuguese (Brazil). */
  PT_BR = 'PT_BR',
  /** Portuguese (Portugal). */
  PT_PT = 'PT_PT',
  /** Quechua. */
  QU = 'QU',
  /** Romansh. */
  RM = 'RM',
  /** Rundi. */
  RN = 'RN',
  /** Romanian. */
  RO = 'RO',
  /** Russian. */
  RU = 'RU',
  /** Kinyarwanda. */
  RW = 'RW',
  /** Sanskrit. */
  SA = 'SA',
  /** Sardinian. */
  SC = 'SC',
  /** Sindhi. */
  SD = 'SD',
  /** Northern Sami. */
  SE = 'SE',
  /** Sango. */
  SG = 'SG',
  /** Serbo-Croatian. */
  SH = 'SH',
  /** Sinhala. */
  SI = 'SI',
  /** Slovak. */
  SK = 'SK',
  /** Slovenian. */
  SL = 'SL',
  /** Shona. */
  SN = 'SN',
  /** Somali. */
  SO = 'SO',
  /** Albanian. */
  SQ = 'SQ',
  /** Serbian. */
  SR = 'SR',
  /** Sundanese. */
  SU = 'SU',
  /** Swedish. */
  SV = 'SV',
  /** Swahili. */
  SW = 'SW',
  /** Tamil. */
  TA = 'TA',
  /** Telugu. */
  TE = 'TE',
  /** Tajik. */
  TG = 'TG',
  /** Thai. */
  TH = 'TH',
  /** Tigrinya. */
  TI = 'TI',
  /** Turkmen. */
  TK = 'TK',
  /** Tongan. */
  TO = 'TO',
  /** Turkish. */
  TR = 'TR',
  /** Tatar. */
  TT = 'TT',
  /** Uyghur. */
  UG = 'UG',
  /** Ukrainian. */
  UK = 'UK',
  /** Urdu. */
  UR = 'UR',
  /** Uzbek. */
  UZ = 'UZ',
  /** Vietnamese. */
  VI = 'VI',
  /** Volapük. */
  VO = 'VO',
  /** Wolof. */
  WO = 'WO',
  /** Xhosa. */
  XH = 'XH',
  /** Yiddish. */
  YI = 'YI',
  /** Yoruba. */
  YO = 'YO',
  /** Chinese. */
  ZH = 'ZH',
  /** Chinese (Simplified). */
  ZH_CN = 'ZH_CN',
  /** Chinese (Traditional). */
  ZH_TW = 'ZH_TW',
  /** Zulu. */
  ZU = 'ZU',
}

/** The set of valid sort keys for the Location query. */
export enum LocationSortKeys {
  /** Sort by the `city` value. */
  CITY = 'CITY',
  /** Sort by the `distance` value. */
  DISTANCE = 'DISTANCE',
  /** Sort by the `id` value. */
  ID = 'ID',
  /** Sort by the `name` value. */
  NAME = 'NAME',
}

/** The input fields to create or update a mailing address. */
export interface MailingAddressInput {
  /** The first line of the address. Typically the street address or PO Box number. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** The second line of the address. Typically the number of the apartment, suite, or unit. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** The name of the city, district, village, or town. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** The name of the customer's company or organization. */
  company?: InputMaybe<Scalars['String']['input']>;
  /** The name of the country. */
  country?: InputMaybe<Scalars['String']['input']>;
  /** The first name of the customer. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The last name of the customer. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** The region of the address, such as the province, state, or district. */
  province?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  zip?: InputMaybe<Scalars['String']['input']>;
}

/** The possible content types for a media object. */
export enum MediaContentType {
  /** An externally hosted video. */
  EXTERNAL_VIDEO = 'EXTERNAL_VIDEO',
  /** A Shopify hosted image. */
  IMAGE = 'IMAGE',
  /** A 3d model. */
  MODEL_3D = 'MODEL_3D',
  /** A Shopify hosted video. */
  VIDEO = 'VIDEO',
}

/** Host for a Media Resource. */
export enum MediaHost {
  /** Host for Vimeo embedded videos. */
  VIMEO = 'VIMEO',
  /** Host for YouTube embedded videos. */
  YOUTUBE = 'YOUTUBE',
}

/** The possible formats for a media presentation. */
export enum MediaPresentationFormat {
  /** A media image presentation. */
  IMAGE = 'IMAGE',
  /** A model viewer presentation. */
  MODEL_VIEWER = 'MODEL_VIEWER',
}

/** A menu item type. */
export enum MenuItemType {
  /** An article link. */
  ARTICLE = 'ARTICLE',
  /** A blog link. */
  BLOG = 'BLOG',
  /** A catalog link. */
  CATALOG = 'CATALOG',
  /** A collection link. */
  COLLECTION = 'COLLECTION',
  /** A collection link. */
  COLLECTIONS = 'COLLECTIONS',
  /** A customer account page link. */
  CUSTOMER_ACCOUNT_PAGE = 'CUSTOMER_ACCOUNT_PAGE',
  /** A frontpage link. */
  FRONTPAGE = 'FRONTPAGE',
  /** An http link. */
  HTTP = 'HTTP',
  /** A metaobject page link. */
  METAOBJECT = 'METAOBJECT',
  /** A page link. */
  PAGE = 'PAGE',
  /** A product link. */
  PRODUCT = 'PRODUCT',
  /** A search link. */
  SEARCH = 'SEARCH',
  /** A shop policy link. */
  SHOP_POLICY = 'SHOP_POLICY',
}

/** Possible error codes that can be returned by `MetafieldDeleteUserError`. */
export enum MetafieldDeleteErrorCode {
  /** The owner ID is invalid. */
  INVALID_OWNER = 'INVALID_OWNER',
  /** Metafield not found. */
  METAFIELD_DOES_NOT_EXIST = 'METAFIELD_DOES_NOT_EXIST',
}

/**
 * A filter used to view a subset of products in a collection matching a specific metafield value.
 *
 * Only the following metafield types are currently supported:
 * - `number_integer`
 * - `number_decimal`
 * - `single_line_text_field`
 * - `boolean` as of 2022-04.
 */
export interface MetafieldFilter {
  /** The key of the metafield to filter on. */
  key: Scalars['String']['input'];
  /** The namespace of the metafield to filter on. */
  namespace: Scalars['String']['input'];
  /** The value of the metafield. */
  value: Scalars['String']['input'];
}

/** Possible error codes that can be returned by `MetafieldsSetUserError`. */
export enum MetafieldsSetUserErrorCode {
  /** The input value is blank. */
  BLANK = 'BLANK',
  /** The input value isn't included in the list. */
  INCLUSION = 'INCLUSION',
  /** The owner ID is invalid. */
  INVALID_OWNER = 'INVALID_OWNER',
  /** The type is invalid. */
  INVALID_TYPE = 'INVALID_TYPE',
  /** The value is invalid for metafield type or for definition options. */
  INVALID_VALUE = 'INVALID_VALUE',
  /** The input value should be less than or equal to the maximum value allowed. */
  LESS_THAN_OR_EQUAL_TO = 'LESS_THAN_OR_EQUAL_TO',
  /** The input value needs to be blank. */
  PRESENT = 'PRESENT',
  /** The input value is too long. */
  TOO_LONG = 'TOO_LONG',
  /** The input value is too short. */
  TOO_SHORT = 'TOO_SHORT',
}

/** The input fields used to retrieve a metaobject by handle. */
export interface MetaobjectHandleInput {
  /** The handle of the metaobject. */
  handle: Scalars['String']['input'];
  /** The type of the metaobject. */
  type: Scalars['String']['input'];
}

/** The input fields for a monetary value with currency. */
export interface MoneyInput {
  /** Decimal money amount. */
  amount: Scalars['Decimal']['input'];
  /** Currency of the money. */
  currencyCode: CurrencyCode;
}

/** Represents the reason for the order's cancellation. */
export enum OrderCancelReason {
  /** The customer wanted to cancel the order. */
  CUSTOMER = 'CUSTOMER',
  /** Payment was declined. */
  DECLINED = 'DECLINED',
  /** The order was fraudulent. */
  FRAUD = 'FRAUD',
  /** There was insufficient inventory. */
  INVENTORY = 'INVENTORY',
  /** The order was canceled for an unlisted reason. */
  OTHER = 'OTHER',
  /** Staff made an error. */
  STAFF = 'STAFF',
}

/** Represents the order's current financial status. */
export enum OrderFinancialStatus {
  /** Displayed as **Authorized**. */
  AUTHORIZED = 'AUTHORIZED',
  /** Displayed as **Paid**. */
  PAID = 'PAID',
  /** Displayed as **Partially paid**. */
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  /** Displayed as **Partially refunded**. */
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  /** Displayed as **Pending**. */
  PENDING = 'PENDING',
  /** Displayed as **Refunded**. */
  REFUNDED = 'REFUNDED',
  /** Displayed as **Voided**. */
  VOIDED = 'VOIDED',
}

/** Represents the order's aggregated fulfillment status for display purposes. */
export enum OrderFulfillmentStatus {
  /** Displayed as **Fulfilled**. All of the items in the order have been fulfilled. */
  FULFILLED = 'FULFILLED',
  /** Displayed as **In progress**. Some of the items in the order have been fulfilled, or a request for fulfillment has been sent to the fulfillment service. */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Displayed as **On hold**. All of the unfulfilled items in this order are on hold. */
  ON_HOLD = 'ON_HOLD',
  /** Displayed as **Open**. None of the items in the order have been fulfilled. Replaced by "UNFULFILLED" status. */
  OPEN = 'OPEN',
  /** Displayed as **Partially fulfilled**. Some of the items in the order have been fulfilled. */
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  /** Displayed as **Pending fulfillment**. A request for fulfillment of some items awaits a response from the fulfillment service. Replaced by "IN_PROGRESS" status. */
  PENDING_FULFILLMENT = 'PENDING_FULFILLMENT',
  /** Displayed as **Restocked**. All of the items in the order have been restocked. Replaced by "UNFULFILLED" status. */
  RESTOCKED = 'RESTOCKED',
  /** Displayed as **Scheduled**. All of the unfulfilled items in this order are scheduled for fulfillment at later time. */
  SCHEDULED = 'SCHEDULED',
  /** Displayed as **Unfulfilled**. None of the items in the order have been fulfilled. */
  UNFULFILLED = 'UNFULFILLED',
}

/** The set of valid sort keys for the Order query. */
export enum OrderSortKeys {
  /** Sort by the `id` value. */
  ID = 'ID',
  /** Sort by the `processed_at` value. */
  PROCESSED_AT = 'PROCESSED_AT',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
  /** Sort by the `total_price` value. */
  TOTAL_PRICE = 'TOTAL_PRICE',
}

/** The set of valid sort keys for the Page query. */
export enum PageSortKeys {
  /** Sort by the `id` value. */
  ID = 'ID',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
  /** Sort by the `title` value. */
  TITLE = 'TITLE',
  /** Sort by the `updated_at` value. */
  UPDATED_AT = 'UPDATED_AT',
}

/** Decides the distribution of results. */
export enum PredictiveSearchLimitScope {
  /** Return results up to limit across all types. */
  ALL = 'ALL',
  /** Return results up to limit per type. */
  EACH = 'EACH',
}

/** The types of search items to perform predictive search on. */
export enum PredictiveSearchType {
  /** Returns matching articles. */
  ARTICLE = 'ARTICLE',
  /** Returns matching collections. */
  COLLECTION = 'COLLECTION',
  /** Returns matching pages. */
  PAGE = 'PAGE',
  /** Returns matching products. */
  PRODUCT = 'PRODUCT',
  /** Returns matching query strings. */
  QUERY = 'QUERY',
}

/** The preferred delivery methods such as shipping, local pickup or through pickup points. */
export enum PreferenceDeliveryMethodType {
  /** A delivery method used to let buyers collect purchases at designated locations like parcel lockers. */
  PICKUP_POINT = 'PICKUP_POINT',
  /** A delivery method used to let buyers receive items directly from a specific location within an area. */
  PICK_UP = 'PICK_UP',
  /** A delivery method used to send items directly to a buyer’s specified address. */
  SHIPPING = 'SHIPPING',
}

/** The input fields for a filter used to view a subset of products in a collection matching a specific price range. */
export interface PriceRangeFilter {
  /** The maximum price in the range. Empty indicates no max price. */
  max?: InputMaybe<Scalars['Float']['input']>;
  /** The minimum price in the range. Defaults to zero. */
  min?: InputMaybe<Scalars['Float']['input']>;
}

/** The set of valid sort keys for the ProductCollection query. */
export enum ProductCollectionSortKeys {
  /** Sort by the `best-selling` value. */
  BEST_SELLING = 'BEST_SELLING',
  /** Sort by the `collection-default` value. */
  COLLECTION_DEFAULT = 'COLLECTION_DEFAULT',
  /** Sort by the `created` value. */
  CREATED = 'CREATED',
  /** Sort by the `id` value. */
  ID = 'ID',
  /** Sort by the `manual` value. */
  MANUAL = 'MANUAL',
  /** Sort by the `price` value. */
  PRICE = 'PRICE',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
  /** Sort by the `title` value. */
  TITLE = 'TITLE',
}

/**
 * The input fields for a filter used to view a subset of products in a collection.
 * By default, the `available` and `price` filters are enabled. Filters are customized with the Shopify Search & Discovery app.
 * Learn more about [customizing storefront filtering](https://help.shopify.com/manual/online-store/themes/customizing-themes/storefront-filters).
 */
export interface ProductFilter {
  /** Filter on if the product is available for sale. */
  available?: InputMaybe<Scalars['Boolean']['input']>;
  /** A range of prices to filter with-in. */
  price?: InputMaybe<PriceRangeFilter>;
  /** A product metafield to filter on. */
  productMetafield?: InputMaybe<MetafieldFilter>;
  /** The product type to filter on. */
  productType?: InputMaybe<Scalars['String']['input']>;
  /** The product vendor to filter on. */
  productVendor?: InputMaybe<Scalars['String']['input']>;
  /** A product tag to filter on. */
  tag?: InputMaybe<Scalars['String']['input']>;
  /** A variant metafield to filter on. */
  variantMetafield?: InputMaybe<MetafieldFilter>;
  /** A variant option to filter on. */
  variantOption?: InputMaybe<VariantOptionFilter>;
}

/** The set of valid sort keys for the ProductImage query. */
export enum ProductImageSortKeys {
  /** Sort by the `created_at` value. */
  CREATED_AT = 'CREATED_AT',
  /** Sort by the `id` value. */
  ID = 'ID',
  /** Sort by the `position` value. */
  POSITION = 'POSITION',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
}

/** The set of valid sort keys for the ProductMedia query. */
export enum ProductMediaSortKeys {
  /** Sort by the `id` value. */
  ID = 'ID',
  /** Sort by the `position` value. */
  POSITION = 'POSITION',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
}

/**
 * The recommendation intent that is used to generate product recommendations.
 * You can use intent to generate product recommendations according to different strategies.
 */
export enum ProductRecommendationIntent {
  /** Offer customers products that are complementary to a product for which recommendations are to be fetched. An example is add-on products that display in a Pair it with section. */
  COMPLEMENTARY = 'COMPLEMENTARY',
  /** Offer customers a mix of products that are similar or complementary to a product for which recommendations are to be fetched. An example is substitutable products that display in a You may also like section. */
  RELATED = 'RELATED',
}

/** The set of valid sort keys for the Product query. */
export enum ProductSortKeys {
  /** Sort by the `best_selling` value. */
  BEST_SELLING = 'BEST_SELLING',
  /** Sort by the `created_at` value. */
  CREATED_AT = 'CREATED_AT',
  /** Sort by the `id` value. */
  ID = 'ID',
  /** Sort by the `price` value. */
  PRICE = 'PRICE',
  /** Sort by the `product_type` value. */
  PRODUCT_TYPE = 'PRODUCT_TYPE',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
  /** Sort by the `title` value. */
  TITLE = 'TITLE',
  /** Sort by the `updated_at` value. */
  UPDATED_AT = 'UPDATED_AT',
  /** Sort by the `vendor` value. */
  VENDOR = 'VENDOR',
}

/** The set of valid sort keys for the ProductVariant query. */
export enum ProductVariantSortKeys {
  /** Sort by the `id` value. */
  ID = 'ID',
  /** Sort by the `position` value. */
  POSITION = 'POSITION',
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   */
  RELEVANCE = 'RELEVANCE',
  /** Sort by the `sku` value. */
  SKU = 'SKU',
  /** Sort by the `title` value. */
  TITLE = 'TITLE',
}

/** Specifies whether to perform a partial word match on the last search term. */
export enum SearchPrefixQueryType {
  /** Perform a partial word match on the last search term. */
  LAST = 'LAST',
  /** Don't perform a partial word match on the last search term. */
  NONE = 'NONE',
}

/** The set of valid sort keys for the search query. */
export enum SearchSortKeys {
  /** Sort by the `price` value. */
  PRICE = 'PRICE',
  /** Sort by relevance to the search terms. */
  RELEVANCE = 'RELEVANCE',
}

/** The types of search items to perform search within. */
export enum SearchType {
  /** Returns matching articles. */
  ARTICLE = 'ARTICLE',
  /** Returns matching pages. */
  PAGE = 'PAGE',
  /** Returns matching products. */
  PRODUCT = 'PRODUCT',
}

/** Specifies whether to display results for unavailable products. */
export enum SearchUnavailableProductsType {
  /** Exclude unavailable products. */
  HIDE = 'HIDE',
  /** Show unavailable products after all other matching results. This is the default. */
  LAST = 'LAST',
  /** Show unavailable products in the order that they're found. */
  SHOW = 'SHOW',
}

/** Specifies the list of resource fields to search. */
export enum SearchableField {
  /** Author of the page or article. */
  AUTHOR = 'AUTHOR',
  /** Body of the page or article or product description or collection description. */
  BODY = 'BODY',
  /** Product type. */
  PRODUCT_TYPE = 'PRODUCT_TYPE',
  /** Tag associated with the product or article. */
  TAG = 'TAG',
  /** Title of the page or article or product title or collection title. */
  TITLE = 'TITLE',
  /** Variant barcode. */
  VARIANTS_BARCODE = 'VARIANTS_BARCODE',
  /** Variant SKU. */
  VARIANTS_SKU = 'VARIANTS_SKU',
  /** Variant title. */
  VARIANTS_TITLE = 'VARIANTS_TITLE',
  /** Product vendor. */
  VENDOR = 'VENDOR',
}

/** The input fields required for a selected option. */
export interface SelectedOptionInput {
  /** The product option’s name. */
  name: Scalars['String']['input'];
  /** The product option’s value. */
  value: Scalars['String']['input'];
}

/** The checkout charge when the full amount isn't charged at checkout. */
export enum SellingPlanCheckoutChargeType {
  /** The checkout charge is a percentage of the product or variant price. */
  PERCENTAGE = 'PERCENTAGE',
  /** The checkout charge is a fixed price amount. */
  PRICE = 'PRICE',
}

/** Represents a valid selling plan interval. */
export enum SellingPlanInterval {
  /** Day interval. */
  DAY = 'DAY',
  /** Month interval. */
  MONTH = 'MONTH',
  /** Week interval. */
  WEEK = 'WEEK',
  /** Year interval. */
  YEAR = 'YEAR',
}

/** The payment frequency for a Shop Pay Installments Financing Plan. */
export enum ShopPayInstallmentsFinancingPlanFrequency {
  /** Monthly payment frequency. */
  MONTHLY = 'MONTHLY',
  /** Weekly payment frequency. */
  WEEKLY = 'WEEKLY',
}

/** The loan type for a Shop Pay Installments Financing Plan Term. */
export enum ShopPayInstallmentsLoan {
  /** An interest-bearing loan type. */
  INTEREST = 'INTEREST',
  /** A split-pay loan type. */
  SPLIT_PAY = 'SPLIT_PAY',
  /** A zero-percent loan type. */
  ZERO_PERCENT = 'ZERO_PERCENT',
}

/** The input fields to create a delivery method for a Shop Pay payment request. */
export interface ShopPayPaymentRequestDeliveryMethodInput {
  /** The amount for the delivery method. */
  amount?: InputMaybe<MoneyInput>;
  /** The code of the delivery method. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The detail about when the delivery may be expected. */
  deliveryExpectationLabel?: InputMaybe<Scalars['String']['input']>;
  /** The detail of the delivery method. */
  detail?: InputMaybe<Scalars['String']['input']>;
  /** The label of the delivery method. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The maximum delivery date for the delivery method. */
  maxDeliveryDate?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  /** The minimum delivery date for the delivery method. */
  minDeliveryDate?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
}

/** Represents the delivery method type for a Shop Pay payment request. */
export enum ShopPayPaymentRequestDeliveryMethodType {
  /** The delivery method type is pickup. */
  PICKUP = 'PICKUP',
  /** The delivery method type is shipping. */
  SHIPPING = 'SHIPPING',
}

/** The input fields to create a discount for a Shop Pay payment request. */
export interface ShopPayPaymentRequestDiscountInput {
  /** The amount of the discount. */
  amount?: InputMaybe<MoneyInput>;
  /** The label of the discount. */
  label?: InputMaybe<Scalars['String']['input']>;
}

/** The input fields to create an image for a Shop Pay payment request. */
export interface ShopPayPaymentRequestImageInput {
  /** The alt text of the image. */
  alt?: InputMaybe<Scalars['String']['input']>;
  /** The source URL of the image. */
  url: Scalars['String']['input'];
}

/** The input fields represent a Shop Pay payment request. */
export interface ShopPayPaymentRequestInput {
  /**
   * The delivery methods for the payment request.
   *
   * The input must not contain more than `250` values.
   */
  deliveryMethods?: InputMaybe<Array<ShopPayPaymentRequestDeliveryMethodInput>>;
  /**
   * The discount codes for the payment request.
   *
   * The input must not contain more than `250` values.
   */
  discountCodes?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * The discounts for the payment request order.
   *
   * The input must not contain more than `250` values.
   */
  discounts?: InputMaybe<Array<ShopPayPaymentRequestDiscountInput>>;
  /**
   * The line items for the payment request.
   *
   * The input must not contain more than `250` values.
   */
  lineItems?: InputMaybe<Array<ShopPayPaymentRequestLineItemInput>>;
  /** The locale for the payment request. */
  locale: Scalars['String']['input'];
  /** The encrypted payment method for the payment request. */
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  /** The presentment currency for the payment request. */
  presentmentCurrency: CurrencyCode;
  /** The delivery method type for the payment request. */
  selectedDeliveryMethodType?: InputMaybe<ShopPayPaymentRequestDeliveryMethodType>;
  /**
   * The shipping lines for the payment request.
   *
   * The input must not contain more than `250` values.
   */
  shippingLines?: InputMaybe<Array<ShopPayPaymentRequestShippingLineInput>>;
  /** The subtotal amount for the payment request. */
  subtotal: MoneyInput;
  /** The total amount for the payment request. */
  total: MoneyInput;
  /** The total shipping price for the payment request. */
  totalShippingPrice?: InputMaybe<ShopPayPaymentRequestTotalShippingPriceInput>;
  /** The total tax for the payment request. */
  totalTax?: InputMaybe<MoneyInput>;
}

/** The input fields to create a line item for a Shop Pay payment request. */
export interface ShopPayPaymentRequestLineItemInput {
  /** The final item price for the line item. */
  finalItemPrice?: InputMaybe<MoneyInput>;
  /** The final line price for the line item. */
  finalLinePrice?: InputMaybe<MoneyInput>;
  /** The image of the line item. */
  image?: InputMaybe<ShopPayPaymentRequestImageInput>;
  /**
   * The item discounts for the line item.
   *
   * The input must not contain more than `250` values.
   */
  itemDiscounts?: InputMaybe<Array<ShopPayPaymentRequestDiscountInput>>;
  /** The label of the line item. */
  label?: InputMaybe<Scalars['String']['input']>;
  /**
   * The line discounts for the line item.
   *
   * The input must not contain more than `250` values.
   */
  lineDiscounts?: InputMaybe<Array<ShopPayPaymentRequestDiscountInput>>;
  /** The original item price for the line item. */
  originalItemPrice?: InputMaybe<MoneyInput>;
  /** The original line price for the line item. */
  originalLinePrice?: InputMaybe<MoneyInput>;
  /** The quantity of the line item. */
  quantity: Scalars['Int']['input'];
  /** Whether the line item requires shipping. */
  requiresShipping?: InputMaybe<Scalars['Boolean']['input']>;
  /** The SKU of the line item. */
  sku?: InputMaybe<Scalars['String']['input']>;
}

/** The input fields to create a shipping line for a Shop Pay payment request. */
export interface ShopPayPaymentRequestShippingLineInput {
  /** The amount for the shipping line. */
  amount?: InputMaybe<MoneyInput>;
  /** The code of the shipping line. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The label of the shipping line. */
  label?: InputMaybe<Scalars['String']['input']>;
}

/** The input fields to create a shipping total for a Shop Pay payment request. */
export interface ShopPayPaymentRequestTotalShippingPriceInput {
  /**
   * The discounts for the shipping total.
   *
   * The input must not contain more than `250` values.
   */
  discounts?: InputMaybe<Array<ShopPayPaymentRequestDiscountInput>>;
  /** The final total for the shipping total. */
  finalTotal?: InputMaybe<MoneyInput>;
  /** The original total for the shipping total. */
  originalTotal?: InputMaybe<MoneyInput>;
}

/** The input fields for submitting Shop Pay payment method information for checkout. */
export interface ShopPayWalletContentInput {
  /** The customer's billing address. */
  billingAddress: MailingAddressInput;
  /** Session token for transaction. */
  sessionToken: Scalars['String']['input'];
}

/** The types of resources potentially present in a sitemap. */
export enum SitemapType {
  /** Articles present in the sitemap. */
  ARTICLE = 'ARTICLE',
  /** Blogs present in the sitemap. */
  BLOG = 'BLOG',
  /** Collections present in the sitemap. */
  COLLECTION = 'COLLECTION',
  /**
   * Metaobjects present in the sitemap. Only metaobject types with the
   * [`renderable` capability](https://shopify.dev/docs/apps/build/custom-data/metaobjects/use-metaobject-capabilities#render-metaobjects-as-web-pages)
   * are included in sitemap.
   */
  METAOBJECT = 'METAOBJECT',
  /** Pages present in the sitemap. */
  PAGE = 'PAGE',
  /** Products present in the sitemap. */
  PRODUCT = 'PRODUCT',
}

/** The code of the error that occurred during cart submit for completion. */
export enum SubmissionErrorCode {
  BUYER_IDENTITY_EMAIL_IS_INVALID = 'BUYER_IDENTITY_EMAIL_IS_INVALID',
  BUYER_IDENTITY_EMAIL_REQUIRED = 'BUYER_IDENTITY_EMAIL_REQUIRED',
  BUYER_IDENTITY_PHONE_IS_INVALID = 'BUYER_IDENTITY_PHONE_IS_INVALID',
  DELIVERY_ADDRESS1_INVALID = 'DELIVERY_ADDRESS1_INVALID',
  DELIVERY_ADDRESS1_REQUIRED = 'DELIVERY_ADDRESS1_REQUIRED',
  DELIVERY_ADDRESS1_TOO_LONG = 'DELIVERY_ADDRESS1_TOO_LONG',
  DELIVERY_ADDRESS2_INVALID = 'DELIVERY_ADDRESS2_INVALID',
  DELIVERY_ADDRESS2_REQUIRED = 'DELIVERY_ADDRESS2_REQUIRED',
  DELIVERY_ADDRESS2_TOO_LONG = 'DELIVERY_ADDRESS2_TOO_LONG',
  DELIVERY_ADDRESS_REQUIRED = 'DELIVERY_ADDRESS_REQUIRED',
  DELIVERY_CITY_INVALID = 'DELIVERY_CITY_INVALID',
  DELIVERY_CITY_REQUIRED = 'DELIVERY_CITY_REQUIRED',
  DELIVERY_CITY_TOO_LONG = 'DELIVERY_CITY_TOO_LONG',
  DELIVERY_COMPANY_INVALID = 'DELIVERY_COMPANY_INVALID',
  DELIVERY_COMPANY_REQUIRED = 'DELIVERY_COMPANY_REQUIRED',
  DELIVERY_COMPANY_TOO_LONG = 'DELIVERY_COMPANY_TOO_LONG',
  DELIVERY_COUNTRY_REQUIRED = 'DELIVERY_COUNTRY_REQUIRED',
  DELIVERY_FIRST_NAME_INVALID = 'DELIVERY_FIRST_NAME_INVALID',
  DELIVERY_FIRST_NAME_REQUIRED = 'DELIVERY_FIRST_NAME_REQUIRED',
  DELIVERY_FIRST_NAME_TOO_LONG = 'DELIVERY_FIRST_NAME_TOO_LONG',
  DELIVERY_INVALID_POSTAL_CODE_FOR_COUNTRY = 'DELIVERY_INVALID_POSTAL_CODE_FOR_COUNTRY',
  DELIVERY_INVALID_POSTAL_CODE_FOR_ZONE = 'DELIVERY_INVALID_POSTAL_CODE_FOR_ZONE',
  DELIVERY_LAST_NAME_INVALID = 'DELIVERY_LAST_NAME_INVALID',
  DELIVERY_LAST_NAME_REQUIRED = 'DELIVERY_LAST_NAME_REQUIRED',
  DELIVERY_LAST_NAME_TOO_LONG = 'DELIVERY_LAST_NAME_TOO_LONG',
  DELIVERY_NO_DELIVERY_AVAILABLE = 'DELIVERY_NO_DELIVERY_AVAILABLE',
  DELIVERY_NO_DELIVERY_AVAILABLE_FOR_MERCHANDISE_LINE = 'DELIVERY_NO_DELIVERY_AVAILABLE_FOR_MERCHANDISE_LINE',
  DELIVERY_OPTIONS_PHONE_NUMBER_INVALID = 'DELIVERY_OPTIONS_PHONE_NUMBER_INVALID',
  DELIVERY_OPTIONS_PHONE_NUMBER_REQUIRED = 'DELIVERY_OPTIONS_PHONE_NUMBER_REQUIRED',
  DELIVERY_PHONE_NUMBER_INVALID = 'DELIVERY_PHONE_NUMBER_INVALID',
  DELIVERY_PHONE_NUMBER_REQUIRED = 'DELIVERY_PHONE_NUMBER_REQUIRED',
  DELIVERY_POSTAL_CODE_INVALID = 'DELIVERY_POSTAL_CODE_INVALID',
  DELIVERY_POSTAL_CODE_REQUIRED = 'DELIVERY_POSTAL_CODE_REQUIRED',
  DELIVERY_ZONE_NOT_FOUND = 'DELIVERY_ZONE_NOT_FOUND',
  DELIVERY_ZONE_REQUIRED_FOR_COUNTRY = 'DELIVERY_ZONE_REQUIRED_FOR_COUNTRY',
  ERROR = 'ERROR',
  MERCHANDISE_LINE_LIMIT_REACHED = 'MERCHANDISE_LINE_LIMIT_REACHED',
  MERCHANDISE_NOT_APPLICABLE = 'MERCHANDISE_NOT_APPLICABLE',
  MERCHANDISE_NOT_ENOUGH_STOCK_AVAILABLE = 'MERCHANDISE_NOT_ENOUGH_STOCK_AVAILABLE',
  MERCHANDISE_OUT_OF_STOCK = 'MERCHANDISE_OUT_OF_STOCK',
  MERCHANDISE_PRODUCT_NOT_PUBLISHED = 'MERCHANDISE_PRODUCT_NOT_PUBLISHED',
  NO_DELIVERY_GROUP_SELECTED = 'NO_DELIVERY_GROUP_SELECTED',
  PAYMENTS_ADDRESS1_INVALID = 'PAYMENTS_ADDRESS1_INVALID',
  PAYMENTS_ADDRESS1_REQUIRED = 'PAYMENTS_ADDRESS1_REQUIRED',
  PAYMENTS_ADDRESS1_TOO_LONG = 'PAYMENTS_ADDRESS1_TOO_LONG',
  PAYMENTS_ADDRESS2_INVALID = 'PAYMENTS_ADDRESS2_INVALID',
  PAYMENTS_ADDRESS2_REQUIRED = 'PAYMENTS_ADDRESS2_REQUIRED',
  PAYMENTS_ADDRESS2_TOO_LONG = 'PAYMENTS_ADDRESS2_TOO_LONG',
  PAYMENTS_BILLING_ADDRESS_ZONE_NOT_FOUND = 'PAYMENTS_BILLING_ADDRESS_ZONE_NOT_FOUND',
  PAYMENTS_BILLING_ADDRESS_ZONE_REQUIRED_FOR_COUNTRY = 'PAYMENTS_BILLING_ADDRESS_ZONE_REQUIRED_FOR_COUNTRY',
  PAYMENTS_CITY_INVALID = 'PAYMENTS_CITY_INVALID',
  PAYMENTS_CITY_REQUIRED = 'PAYMENTS_CITY_REQUIRED',
  PAYMENTS_CITY_TOO_LONG = 'PAYMENTS_CITY_TOO_LONG',
  PAYMENTS_COMPANY_INVALID = 'PAYMENTS_COMPANY_INVALID',
  PAYMENTS_COMPANY_REQUIRED = 'PAYMENTS_COMPANY_REQUIRED',
  PAYMENTS_COMPANY_TOO_LONG = 'PAYMENTS_COMPANY_TOO_LONG',
  PAYMENTS_COUNTRY_REQUIRED = 'PAYMENTS_COUNTRY_REQUIRED',
  PAYMENTS_CREDIT_CARD_BASE_EXPIRED = 'PAYMENTS_CREDIT_CARD_BASE_EXPIRED',
  PAYMENTS_CREDIT_CARD_BASE_GATEWAY_NOT_SUPPORTED = 'PAYMENTS_CREDIT_CARD_BASE_GATEWAY_NOT_SUPPORTED',
  PAYMENTS_CREDIT_CARD_BASE_INVALID_START_DATE_OR_ISSUE_NUMBER_FOR_DEBIT = 'PAYMENTS_CREDIT_CARD_BASE_INVALID_START_DATE_OR_ISSUE_NUMBER_FOR_DEBIT',
  PAYMENTS_CREDIT_CARD_BRAND_NOT_SUPPORTED = 'PAYMENTS_CREDIT_CARD_BRAND_NOT_SUPPORTED',
  PAYMENTS_CREDIT_CARD_FIRST_NAME_BLANK = 'PAYMENTS_CREDIT_CARD_FIRST_NAME_BLANK',
  PAYMENTS_CREDIT_CARD_GENERIC = 'PAYMENTS_CREDIT_CARD_GENERIC',
  PAYMENTS_CREDIT_CARD_LAST_NAME_BLANK = 'PAYMENTS_CREDIT_CARD_LAST_NAME_BLANK',
  PAYMENTS_CREDIT_CARD_MONTH_INCLUSION = 'PAYMENTS_CREDIT_CARD_MONTH_INCLUSION',
  PAYMENTS_CREDIT_CARD_NAME_INVALID = 'PAYMENTS_CREDIT_CARD_NAME_INVALID',
  PAYMENTS_CREDIT_CARD_NUMBER_INVALID = 'PAYMENTS_CREDIT_CARD_NUMBER_INVALID',
  PAYMENTS_CREDIT_CARD_NUMBER_INVALID_FORMAT = 'PAYMENTS_CREDIT_CARD_NUMBER_INVALID_FORMAT',
  PAYMENTS_CREDIT_CARD_SESSION_ID = 'PAYMENTS_CREDIT_CARD_SESSION_ID',
  PAYMENTS_CREDIT_CARD_VERIFICATION_VALUE_BLANK = 'PAYMENTS_CREDIT_CARD_VERIFICATION_VALUE_BLANK',
  PAYMENTS_CREDIT_CARD_VERIFICATION_VALUE_INVALID_FOR_CARD_TYPE = 'PAYMENTS_CREDIT_CARD_VERIFICATION_VALUE_INVALID_FOR_CARD_TYPE',
  PAYMENTS_CREDIT_CARD_YEAR_EXPIRED = 'PAYMENTS_CREDIT_CARD_YEAR_EXPIRED',
  PAYMENTS_CREDIT_CARD_YEAR_INVALID_EXPIRY_YEAR = 'PAYMENTS_CREDIT_CARD_YEAR_INVALID_EXPIRY_YEAR',
  PAYMENTS_FIRST_NAME_INVALID = 'PAYMENTS_FIRST_NAME_INVALID',
  PAYMENTS_FIRST_NAME_REQUIRED = 'PAYMENTS_FIRST_NAME_REQUIRED',
  PAYMENTS_FIRST_NAME_TOO_LONG = 'PAYMENTS_FIRST_NAME_TOO_LONG',
  PAYMENTS_INVALID_POSTAL_CODE_FOR_COUNTRY = 'PAYMENTS_INVALID_POSTAL_CODE_FOR_COUNTRY',
  PAYMENTS_INVALID_POSTAL_CODE_FOR_ZONE = 'PAYMENTS_INVALID_POSTAL_CODE_FOR_ZONE',
  PAYMENTS_LAST_NAME_INVALID = 'PAYMENTS_LAST_NAME_INVALID',
  PAYMENTS_LAST_NAME_REQUIRED = 'PAYMENTS_LAST_NAME_REQUIRED',
  PAYMENTS_LAST_NAME_TOO_LONG = 'PAYMENTS_LAST_NAME_TOO_LONG',
  PAYMENTS_METHOD_REQUIRED = 'PAYMENTS_METHOD_REQUIRED',
  PAYMENTS_METHOD_UNAVAILABLE = 'PAYMENTS_METHOD_UNAVAILABLE',
  PAYMENTS_PHONE_NUMBER_INVALID = 'PAYMENTS_PHONE_NUMBER_INVALID',
  PAYMENTS_PHONE_NUMBER_REQUIRED = 'PAYMENTS_PHONE_NUMBER_REQUIRED',
  PAYMENTS_POSTAL_CODE_INVALID = 'PAYMENTS_POSTAL_CODE_INVALID',
  PAYMENTS_POSTAL_CODE_REQUIRED = 'PAYMENTS_POSTAL_CODE_REQUIRED',
  PAYMENTS_SHOPIFY_PAYMENTS_REQUIRED = 'PAYMENTS_SHOPIFY_PAYMENTS_REQUIRED',
  PAYMENTS_UNACCEPTABLE_PAYMENT_AMOUNT = 'PAYMENTS_UNACCEPTABLE_PAYMENT_AMOUNT',
  PAYMENTS_WALLET_CONTENT_MISSING = 'PAYMENTS_WALLET_CONTENT_MISSING',
  TAXES_DELIVERY_GROUP_ID_NOT_FOUND = 'TAXES_DELIVERY_GROUP_ID_NOT_FOUND',
  TAXES_LINE_ID_NOT_FOUND = 'TAXES_LINE_ID_NOT_FOUND',
  TAXES_MUST_BE_DEFINED = 'TAXES_MUST_BE_DEFINED',
}

/** The accepted types of unit of measurement. */
export enum UnitPriceMeasurementMeasuredType {
  /** Unit of measurements representing areas. */
  AREA = 'AREA',
  /** Unit of measurements representing lengths. */
  LENGTH = 'LENGTH',
  /** Unit of measurements representing volumes. */
  VOLUME = 'VOLUME',
  /** Unit of measurements representing weights. */
  WEIGHT = 'WEIGHT',
}

/** The valid units of measurement for a unit price measurement. */
export enum UnitPriceMeasurementMeasuredUnit {
  /** 100 centiliters equals 1 liter. */
  CL = 'CL',
  /** 100 centimeters equals 1 meter. */
  CM = 'CM',
  /** Metric system unit of weight. */
  G = 'G',
  /** 1 kilogram equals 1000 grams. */
  KG = 'KG',
  /** Metric system unit of volume. */
  L = 'L',
  /** Metric system unit of length. */
  M = 'M',
  /** Metric system unit of area. */
  M2 = 'M2',
  /** 1 cubic meter equals 1000 liters. */
  M3 = 'M3',
  /** 1000 milligrams equals 1 gram. */
  MG = 'MG',
  /** 1000 milliliters equals 1 liter. */
  ML = 'ML',
  /** 1000 millimeters equals 1 meter. */
  MM = 'MM',
}

/** Systems of weights and measures. */
export enum UnitSystem {
  /** Imperial system of weights and measures. */
  IMPERIAL_SYSTEM = 'IMPERIAL_SYSTEM',
  /** Metric system of weights and measures. */
  METRIC_SYSTEM = 'METRIC_SYSTEM',
}

/** Possible error codes that can be returned by `ShopPayPaymentRequestSessionUserErrors`. */
export enum UserErrorsShopPayPaymentRequestSessionUserErrorsCode {
  /** Idempotency key has already been used. */
  IDEMPOTENCY_KEY_ALREADY_USED = 'IDEMPOTENCY_KEY_ALREADY_USED',
  /** Payment request input is invalid. */
  PAYMENT_REQUEST_INVALID_INPUT = 'PAYMENT_REQUEST_INVALID_INPUT',
  /** Payment request not found. */
  PAYMENT_REQUEST_NOT_FOUND = 'PAYMENT_REQUEST_NOT_FOUND',
}

/** The input fields for a filter used to view a subset of products in a collection matching a specific variant option. */
export interface VariantOptionFilter {
  /** The name of the variant option to filter on. */
  name: Scalars['String']['input'];
  /** The value of the variant option to filter on. */
  value: Scalars['String']['input'];
}

/** Units of measurement for weight. */
export enum WeightUnit {
  /** Metric system unit of mass. */
  GRAMS = 'GRAMS',
  /** 1 kilogram equals 1000 grams. */
  KILOGRAMS = 'KILOGRAMS',
  /** Imperial system unit of mass. */
  OUNCES = 'OUNCES',
  /** 1 pound equals 16 ounces. */
  POUNDS = 'POUNDS',
}

export const scalarsEnumsHash: ScalarsEnumsHash = {
  ArticleSortKeys: true,
  BlogSortKeys: true,
  Boolean: true,
  CardBrand: true,
  CartCardSource: true,
  CartDeliveryGroupType: true,
  CartErrorCode: true,
  CartWarningCode: true,
  CollectionSortKeys: true,
  Color: true,
  CompletionErrorCode: true,
  CountPrecision: true,
  CountryCode: true,
  CropRegion: true,
  CurrencyCode: true,
  CustomerErrorCode: true,
  DateTime: true,
  Decimal: true,
  DeliveryAddressValidationStrategy: true,
  DeliveryMethodType: true,
  DigitalWallet: true,
  DiscountApplicationAllocationMethod: true,
  DiscountApplicationTargetSelection: true,
  DiscountApplicationTargetType: true,
  FilterPresentation: true,
  FilterType: true,
  Float: true,
  HTML: true,
  ID: true,
  ISO8601DateTime: true,
  ImageContentType: true,
  Int: true,
  JSON: true,
  LanguageCode: true,
  LocationSortKeys: true,
  MediaContentType: true,
  MediaHost: true,
  MediaPresentationFormat: true,
  MenuItemType: true,
  MetafieldDeleteErrorCode: true,
  MetafieldsSetUserErrorCode: true,
  OrderCancelReason: true,
  OrderFinancialStatus: true,
  OrderFulfillmentStatus: true,
  OrderSortKeys: true,
  PageSortKeys: true,
  PredictiveSearchLimitScope: true,
  PredictiveSearchType: true,
  PreferenceDeliveryMethodType: true,
  ProductCollectionSortKeys: true,
  ProductImageSortKeys: true,
  ProductMediaSortKeys: true,
  ProductRecommendationIntent: true,
  ProductSortKeys: true,
  ProductVariantSortKeys: true,
  SearchPrefixQueryType: true,
  SearchSortKeys: true,
  SearchType: true,
  SearchUnavailableProductsType: true,
  SearchableField: true,
  SellingPlanCheckoutChargeType: true,
  SellingPlanInterval: true,
  ShopPayInstallmentsFinancingPlanFrequency: true,
  ShopPayInstallmentsLoan: true,
  ShopPayPaymentRequestDeliveryMethodType: true,
  SitemapType: true,
  String: true,
  SubmissionErrorCode: true,
  URL: true,
  UnitPriceMeasurementMeasuredType: true,
  UnitPriceMeasurementMeasuredUnit: true,
  UnitSystem: true,
  UnsignedInt64: true,
  UserErrorsShopPayPaymentRequestSessionUserErrorsCode: true,
  WeightUnit: true,
};
export const generatedSchema = {
  ApiVersion: {
    __typename: {__type: 'String!'},
    displayName: {__type: 'String!'},
    handle: {__type: 'String!'},
    supported: {__type: 'Boolean!'},
  },
  ApplePayWalletContentInput: {
    billingAddress: {__type: 'MailingAddressInput!'},
    data: {__type: 'String!'},
    header: {__type: 'ApplePayWalletHeaderInput!'},
    lastDigits: {__type: 'String'},
    signature: {__type: 'String!'},
    version: {__type: 'String!'},
  },
  ApplePayWalletHeaderInput: {
    applicationData: {__type: 'String'},
    ephemeralPublicKey: {__type: 'String!'},
    publicKeyHash: {__type: 'String!'},
    transactionId: {__type: 'String!'},
  },
  AppliedGiftCard: {
    __typename: {__type: 'String!'},
    amountUsed: {__type: 'MoneyV2!'},
    amountUsedV2: {__type: 'MoneyV2!'},
    balance: {__type: 'MoneyV2!'},
    balanceV2: {__type: 'MoneyV2!'},
    id: {__type: 'ID!'},
    lastCharacters: {__type: 'String!'},
    presentmentAmountUsed: {__type: 'MoneyV2!'},
  },
  Article: {
    __typename: {__type: 'String!'},
    author: {__type: 'ArticleAuthor!'},
    authorV2: {__type: 'ArticleAuthor'},
    blog: {__type: 'Blog!'},
    comments: {
      __type: 'CommentConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    content: {__type: 'String!', __args: {truncateAt: 'Int'}},
    contentHtml: {__type: 'HTML!'},
    excerpt: {__type: 'String', __args: {truncateAt: 'Int'}},
    excerptHtml: {__type: 'HTML'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    image: {__type: 'Image'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    onlineStoreUrl: {__type: 'URL'},
    publishedAt: {__type: 'DateTime!'},
    seo: {__type: 'SEO'},
    tags: {__type: '[String!]!'},
    title: {__type: 'String!'},
    trackingParameters: {__type: 'String'},
  },
  ArticleAuthor: {
    __typename: {__type: 'String!'},
    bio: {__type: 'String'},
    email: {__type: 'String!'},
    firstName: {__type: 'String!'},
    lastName: {__type: 'String!'},
    name: {__type: 'String!'},
  },
  ArticleConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[ArticleEdge!]!'},
    nodes: {__type: '[Article!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  ArticleEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Article!'},
  },
  Attribute: {
    __typename: {__type: 'String!'},
    key: {__type: 'String!'},
    value: {__type: 'String'},
  },
  AttributeInput: {key: {__type: 'String!'}, value: {__type: 'String!'}},
  AutomaticDiscountApplication: {
    __typename: {__type: 'String!'},
    allocationMethod: {__type: 'DiscountApplicationAllocationMethod!'},
    targetSelection: {__type: 'DiscountApplicationTargetSelection!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
    title: {__type: 'String!'},
    value: {__type: 'PricingValue!'},
  },
  BaseCartLine: {
    __typename: {__type: 'String!'},
    attribute: {__type: 'Attribute', __args: {key: 'String!'}},
    attributes: {__type: '[Attribute!]!'},
    cost: {__type: 'CartLineCost!'},
    discountAllocations: {__type: '[CartDiscountAllocation!]!'},
    estimatedCost: {__type: 'CartLineEstimatedCost!'},
    id: {__type: 'ID!'},
    merchandise: {__type: 'Merchandise!'},
    quantity: {__type: 'Int!'},
    sellingPlanAllocation: {__type: 'SellingPlanAllocation'},
    $on: {__type: '$BaseCartLine!'},
  },
  BaseCartLineConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[BaseCartLineEdge!]!'},
    nodes: {__type: '[BaseCartLine!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  BaseCartLineEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'BaseCartLine!'},
  },
  Blog: {
    __typename: {__type: 'String!'},
    articleByHandle: {__type: 'Article', __args: {handle: 'String!'}},
    articles: {
      __type: 'ArticleConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        query: 'String',
        reverse: 'Boolean',
        sortKey: 'ArticleSortKeys',
      },
    },
    authors: {__type: '[ArticleAuthor!]!'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    onlineStoreUrl: {__type: 'URL'},
    seo: {__type: 'SEO'},
    title: {__type: 'String!'},
  },
  BlogConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[BlogEdge!]!'},
    nodes: {__type: '[Blog!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  BlogEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Blog!'},
  },
  Brand: {
    __typename: {__type: 'String!'},
    colors: {__type: 'BrandColors!'},
    coverImage: {__type: 'MediaImage'},
    logo: {__type: 'MediaImage'},
    shortDescription: {__type: 'String'},
    slogan: {__type: 'String'},
    squareLogo: {__type: 'MediaImage'},
  },
  BrandColorGroup: {
    __typename: {__type: 'String!'},
    background: {__type: 'Color'},
    foreground: {__type: 'Color'},
  },
  BrandColors: {
    __typename: {__type: 'String!'},
    primary: {__type: '[BrandColorGroup!]!'},
    secondary: {__type: '[BrandColorGroup!]!'},
  },
  BuyerInput: {
    companyLocationId: {__type: 'ID'},
    customerAccessToken: {__type: 'String!'},
  },
  Cart: {
    __typename: {__type: 'String!'},
    appliedGiftCards: {__type: '[AppliedGiftCard!]!'},
    attribute: {__type: 'Attribute', __args: {key: 'String!'}},
    attributes: {__type: '[Attribute!]!'},
    buyerIdentity: {__type: 'CartBuyerIdentity!'},
    checkoutUrl: {__type: 'URL!'},
    cost: {__type: 'CartCost!'},
    createdAt: {__type: 'DateTime!'},
    deliveryGroups: {
      __type: 'CartDeliveryGroupConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
        withCarrierRates: 'Boolean',
      },
    },
    discountAllocations: {__type: '[CartDiscountAllocation!]!'},
    discountCodes: {__type: '[CartDiscountCode!]!'},
    estimatedCost: {__type: 'CartEstimatedCost!'},
    id: {__type: 'ID!'},
    lines: {
      __type: 'BaseCartLineConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    note: {__type: 'String'},
    totalQuantity: {__type: 'Int!'},
    updatedAt: {__type: 'DateTime!'},
  },
  CartAttributesUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartAutomaticDiscountAllocation: {
    __typename: {__type: 'String!'},
    discountedAmount: {__type: 'MoneyV2!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
    title: {__type: 'String!'},
  },
  CartBillingAddressUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartBuyerIdentity: {
    __typename: {__type: 'String!'},
    countryCode: {__type: 'CountryCode'},
    customer: {__type: 'Customer'},
    deliveryAddressPreferences: {__type: '[DeliveryAddress!]!'},
    email: {__type: 'String'},
    phone: {__type: 'String'},
    preferences: {__type: 'CartPreferences'},
    purchasingCompany: {__type: 'PurchasingCompany'},
  },
  CartBuyerIdentityInput: {
    companyLocationId: {__type: 'ID'},
    countryCode: {__type: 'CountryCode'},
    customerAccessToken: {__type: 'String'},
    email: {__type: 'String'},
    phone: {__type: 'String'},
    preferences: {__type: 'CartPreferencesInput'},
  },
  CartBuyerIdentityUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartCodeDiscountAllocation: {
    __typename: {__type: 'String!'},
    code: {__type: 'String!'},
    discountedAmount: {__type: 'MoneyV2!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
  },
  CartCompletionAction: {
    __typename: {__type: 'String!'},
    $on: {__type: '$CartCompletionAction!'},
  },
  CartCompletionActionRequired: {
    __typename: {__type: 'String!'},
    action: {__type: 'CartCompletionAction'},
    id: {__type: 'String!'},
  },
  CartCompletionAttemptResult: {
    __typename: {__type: 'String!'},
    $on: {__type: '$CartCompletionAttemptResult!'},
  },
  CartCompletionFailed: {
    __typename: {__type: 'String!'},
    errors: {__type: '[CompletionError!]!'},
    id: {__type: 'String!'},
  },
  CartCompletionProcessing: {
    __typename: {__type: 'String!'},
    id: {__type: 'String!'},
    pollDelay: {__type: 'Int!'},
  },
  CartCompletionSuccess: {
    __typename: {__type: 'String!'},
    completedAt: {__type: 'DateTime'},
    id: {__type: 'String!'},
    orderId: {__type: 'ID!'},
    orderUrl: {__type: 'URL!'},
  },
  CartCost: {
    __typename: {__type: 'String!'},
    checkoutChargeAmount: {__type: 'MoneyV2!'},
    subtotalAmount: {__type: 'MoneyV2!'},
    subtotalAmountEstimated: {__type: 'Boolean!'},
    totalAmount: {__type: 'MoneyV2!'},
    totalAmountEstimated: {__type: 'Boolean!'},
    totalDutyAmount: {__type: 'MoneyV2'},
    totalDutyAmountEstimated: {__type: 'Boolean!'},
    totalTaxAmount: {__type: 'MoneyV2'},
    totalTaxAmountEstimated: {__type: 'Boolean!'},
  },
  CartCreatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartCustomDiscountAllocation: {
    __typename: {__type: 'String!'},
    discountedAmount: {__type: 'MoneyV2!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
    title: {__type: 'String!'},
  },
  CartDeliveryCoordinatesPreference: {
    __typename: {__type: 'String!'},
    countryCode: {__type: 'CountryCode!'},
    latitude: {__type: 'Float!'},
    longitude: {__type: 'Float!'},
  },
  CartDeliveryCoordinatesPreferenceInput: {
    countryCode: {__type: 'CountryCode!'},
    latitude: {__type: 'Float!'},
    longitude: {__type: 'Float!'},
  },
  CartDeliveryGroup: {
    __typename: {__type: 'String!'},
    cartLines: {
      __type: 'BaseCartLineConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    deliveryAddress: {__type: 'MailingAddress!'},
    deliveryOptions: {__type: '[CartDeliveryOption!]!'},
    groupType: {__type: 'CartDeliveryGroupType!'},
    id: {__type: 'ID!'},
    selectedDeliveryOption: {__type: 'CartDeliveryOption'},
  },
  CartDeliveryGroupConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[CartDeliveryGroupEdge!]!'},
    nodes: {__type: '[CartDeliveryGroup!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  CartDeliveryGroupEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'CartDeliveryGroup!'},
  },
  CartDeliveryOption: {
    __typename: {__type: 'String!'},
    code: {__type: 'String'},
    deliveryMethodType: {__type: 'DeliveryMethodType!'},
    description: {__type: 'String'},
    estimatedCost: {__type: 'MoneyV2!'},
    handle: {__type: 'String!'},
    title: {__type: 'String'},
  },
  CartDeliveryPreference: {
    __typename: {__type: 'String!'},
    coordinates: {__type: 'CartDeliveryCoordinatesPreference'},
    deliveryMethod: {__type: '[PreferenceDeliveryMethodType!]!'},
    pickupHandle: {__type: '[String!]!'},
  },
  CartDeliveryPreferenceInput: {
    coordinates: {__type: 'CartDeliveryCoordinatesPreferenceInput'},
    deliveryMethod: {__type: '[PreferenceDeliveryMethodType!]'},
    pickupHandle: {__type: '[String!]'},
  },
  CartDirectPaymentMethodInput: {
    billingAddress: {__type: 'MailingAddressInput!'},
    cardSource: {__type: 'CartCardSource'},
    sessionId: {__type: 'String!'},
  },
  CartDiscountAllocation: {
    __typename: {__type: 'String!'},
    discountedAmount: {__type: 'MoneyV2!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
    $on: {__type: '$CartDiscountAllocation!'},
  },
  CartDiscountCode: {
    __typename: {__type: 'String!'},
    applicable: {__type: 'Boolean!'},
    code: {__type: 'String!'},
  },
  CartDiscountCodesUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartEstimatedCost: {
    __typename: {__type: 'String!'},
    checkoutChargeAmount: {__type: 'MoneyV2!'},
    subtotalAmount: {__type: 'MoneyV2!'},
    totalAmount: {__type: 'MoneyV2!'},
    totalDutyAmount: {__type: 'MoneyV2'},
    totalTaxAmount: {__type: 'MoneyV2'},
  },
  CartFreePaymentMethodInput: {
    billingAddress: {__type: 'MailingAddressInput!'},
  },
  CartGiftCardCodesUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartInput: {
    attributes: {__type: '[AttributeInput!]'},
    buyerIdentity: {__type: 'CartBuyerIdentityInput'},
    discountCodes: {__type: '[String!]'},
    giftCardCodes: {__type: '[String!]'},
    lines: {__type: '[CartLineInput!]'},
    metafields: {__type: '[CartInputMetafieldInput!]'},
    note: {__type: 'String'},
  },
  CartInputMetafieldInput: {
    key: {__type: 'String!'},
    type: {__type: 'String!'},
    value: {__type: 'String!'},
  },
  CartLine: {
    __typename: {__type: 'String!'},
    attribute: {__type: 'Attribute', __args: {key: 'String!'}},
    attributes: {__type: '[Attribute!]!'},
    cost: {__type: 'CartLineCost!'},
    discountAllocations: {__type: '[CartDiscountAllocation!]!'},
    estimatedCost: {__type: 'CartLineEstimatedCost!'},
    id: {__type: 'ID!'},
    merchandise: {__type: 'Merchandise!'},
    quantity: {__type: 'Int!'},
    sellingPlanAllocation: {__type: 'SellingPlanAllocation'},
  },
  CartLineCost: {
    __typename: {__type: 'String!'},
    amountPerQuantity: {__type: 'MoneyV2!'},
    compareAtAmountPerQuantity: {__type: 'MoneyV2'},
    subtotalAmount: {__type: 'MoneyV2!'},
    totalAmount: {__type: 'MoneyV2!'},
  },
  CartLineEstimatedCost: {
    __typename: {__type: 'String!'},
    amount: {__type: 'MoneyV2!'},
    compareAtAmount: {__type: 'MoneyV2'},
    subtotalAmount: {__type: 'MoneyV2!'},
    totalAmount: {__type: 'MoneyV2!'},
  },
  CartLineInput: {
    attributes: {__type: '[AttributeInput!]'},
    merchandiseId: {__type: 'ID!'},
    quantity: {__type: 'Int'},
    sellingPlanId: {__type: 'ID'},
  },
  CartLineUpdateInput: {
    attributes: {__type: '[AttributeInput!]'},
    id: {__type: 'ID!'},
    merchandiseId: {__type: 'ID'},
    quantity: {__type: 'Int'},
    sellingPlanId: {__type: 'ID'},
  },
  CartLinesAddPayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartLinesRemovePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartLinesUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartMetafieldDeleteInput: {
    key: {__type: 'String!'},
    ownerId: {__type: 'ID!'},
  },
  CartMetafieldDeletePayload: {
    __typename: {__type: 'String!'},
    deletedId: {__type: 'ID'},
    userErrors: {__type: '[MetafieldDeleteUserError!]!'},
  },
  CartMetafieldsSetInput: {
    key: {__type: 'String!'},
    ownerId: {__type: 'ID!'},
    type: {__type: 'String!'},
    value: {__type: 'String!'},
  },
  CartMetafieldsSetPayload: {
    __typename: {__type: 'String!'},
    metafields: {__type: '[Metafield!]'},
    userErrors: {__type: '[MetafieldsSetUserError!]!'},
  },
  CartNoteUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartPaymentInput: {
    amount: {__type: 'MoneyInput!'},
    directPaymentMethod: {__type: 'CartDirectPaymentMethodInput'},
    freePaymentMethod: {__type: 'CartFreePaymentMethodInput'},
    sourceIdentifier: {__type: 'String'},
    walletPaymentMethod: {__type: 'CartWalletPaymentMethodInput'},
  },
  CartPaymentUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartPreferences: {
    __typename: {__type: 'String!'},
    delivery: {__type: 'CartDeliveryPreference'},
    wallet: {__type: '[String!]'},
  },
  CartPreferencesInput: {
    delivery: {__type: 'CartDeliveryPreferenceInput'},
    wallet: {__type: '[String!]'},
  },
  CartSelectedDeliveryOptionInput: {
    deliveryGroupId: {__type: 'ID!'},
    deliveryOptionHandle: {__type: 'String!'},
  },
  CartSelectedDeliveryOptionsUpdatePayload: {
    __typename: {__type: 'String!'},
    cart: {__type: 'Cart'},
    userErrors: {__type: '[CartUserError!]!'},
    warnings: {__type: '[CartWarning!]!'},
  },
  CartSubmitForCompletionPayload: {
    __typename: {__type: 'String!'},
    result: {__type: 'CartSubmitForCompletionResult'},
    userErrors: {__type: '[CartUserError!]!'},
  },
  CartSubmitForCompletionResult: {
    __typename: {__type: 'String!'},
    $on: {__type: '$CartSubmitForCompletionResult!'},
  },
  CartUserError: {
    __typename: {__type: 'String!'},
    code: {__type: 'CartErrorCode'},
    field: {__type: '[String!]'},
    message: {__type: 'String!'},
  },
  CartWalletPaymentMethodInput: {
    applePayWalletContent: {__type: 'ApplePayWalletContentInput'},
    shopPayWalletContent: {__type: 'ShopPayWalletContentInput'},
  },
  CartWarning: {
    __typename: {__type: 'String!'},
    code: {__type: 'CartWarningCode!'},
    message: {__type: 'String!'},
    target: {__type: 'ID!'},
  },
  Collection: {
    __typename: {__type: 'String!'},
    description: {__type: 'String!', __args: {truncateAt: 'Int'}},
    descriptionHtml: {__type: 'HTML!'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    image: {__type: 'Image'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    onlineStoreUrl: {__type: 'URL'},
    products: {
      __type: 'ProductConnection!',
      __args: {
        after: 'String',
        before: 'String',
        filters: '[ProductFilter!]',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
        sortKey: 'ProductCollectionSortKeys',
      },
    },
    seo: {__type: 'SEO!'},
    title: {__type: 'String!'},
    trackingParameters: {__type: 'String'},
    updatedAt: {__type: 'DateTime!'},
  },
  CollectionConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[CollectionEdge!]!'},
    nodes: {__type: '[Collection!]!'},
    pageInfo: {__type: 'PageInfo!'},
    totalCount: {__type: 'UnsignedInt64!'},
  },
  CollectionEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Collection!'},
  },
  Comment: {
    __typename: {__type: 'String!'},
    author: {__type: 'CommentAuthor!'},
    content: {__type: 'String!', __args: {truncateAt: 'Int'}},
    contentHtml: {__type: 'HTML!'},
    id: {__type: 'ID!'},
  },
  CommentAuthor: {
    __typename: {__type: 'String!'},
    email: {__type: 'String!'},
    name: {__type: 'String!'},
  },
  CommentConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[CommentEdge!]!'},
    nodes: {__type: '[Comment!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  CommentEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Comment!'},
  },
  Company: {
    __typename: {__type: 'String!'},
    createdAt: {__type: 'DateTime!'},
    externalId: {__type: 'String'},
    id: {__type: 'ID!'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    name: {__type: 'String!'},
    updatedAt: {__type: 'DateTime!'},
  },
  CompanyContact: {
    __typename: {__type: 'String!'},
    createdAt: {__type: 'DateTime!'},
    id: {__type: 'ID!'},
    locale: {__type: 'String'},
    title: {__type: 'String'},
    updatedAt: {__type: 'DateTime!'},
  },
  CompanyLocation: {
    __typename: {__type: 'String!'},
    createdAt: {__type: 'DateTime!'},
    externalId: {__type: 'String'},
    id: {__type: 'ID!'},
    locale: {__type: 'String'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    name: {__type: 'String!'},
    updatedAt: {__type: 'DateTime!'},
  },
  CompletePaymentChallenge: {
    __typename: {__type: 'String!'},
    redirectUrl: {__type: 'URL'},
  },
  CompletionError: {
    __typename: {__type: 'String!'},
    code: {__type: 'CompletionErrorCode!'},
    message: {__type: 'String'},
  },
  ComponentizableCartLine: {
    __typename: {__type: 'String!'},
    attribute: {__type: 'Attribute', __args: {key: 'String!'}},
    attributes: {__type: '[Attribute!]!'},
    cost: {__type: 'CartLineCost!'},
    discountAllocations: {__type: '[CartDiscountAllocation!]!'},
    estimatedCost: {__type: 'CartLineEstimatedCost!'},
    id: {__type: 'ID!'},
    lineComponents: {__type: '[CartLine!]!'},
    merchandise: {__type: 'Merchandise!'},
    quantity: {__type: 'Int!'},
    sellingPlanAllocation: {__type: 'SellingPlanAllocation'},
  },
  Count: {
    __typename: {__type: 'String!'},
    count: {__type: 'Int!'},
    precision: {__type: 'CountPrecision!'},
  },
  Country: {
    __typename: {__type: 'String!'},
    availableLanguages: {__type: '[Language!]!'},
    currency: {__type: 'Currency!'},
    isoCode: {__type: 'CountryCode!'},
    market: {__type: 'Market'},
    name: {__type: 'String!'},
    unitSystem: {__type: 'UnitSystem!'},
  },
  Currency: {
    __typename: {__type: 'String!'},
    isoCode: {__type: 'CurrencyCode!'},
    name: {__type: 'String!'},
    symbol: {__type: 'String!'},
  },
  Customer: {
    __typename: {__type: 'String!'},
    acceptsMarketing: {__type: 'Boolean!'},
    addresses: {
      __type: 'MailingAddressConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    createdAt: {__type: 'DateTime!'},
    defaultAddress: {__type: 'MailingAddress'},
    displayName: {__type: 'String!'},
    email: {__type: 'String'},
    firstName: {__type: 'String'},
    id: {__type: 'ID!'},
    lastName: {__type: 'String'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    numberOfOrders: {__type: 'UnsignedInt64!'},
    orders: {
      __type: 'OrderConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        query: 'String',
        reverse: 'Boolean',
        sortKey: 'OrderSortKeys',
      },
    },
    phone: {__type: 'String'},
    tags: {__type: '[String!]!'},
    updatedAt: {__type: 'DateTime!'},
  },
  CustomerAccessToken: {
    __typename: {__type: 'String!'},
    accessToken: {__type: 'String!'},
    expiresAt: {__type: 'DateTime!'},
  },
  CustomerAccessTokenCreateInput: {
    email: {__type: 'String!'},
    password: {__type: 'String!'},
  },
  CustomerAccessTokenCreatePayload: {
    __typename: {__type: 'String!'},
    customerAccessToken: {__type: 'CustomerAccessToken'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerAccessTokenCreateWithMultipassPayload: {
    __typename: {__type: 'String!'},
    customerAccessToken: {__type: 'CustomerAccessToken'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
  },
  CustomerAccessTokenDeletePayload: {
    __typename: {__type: 'String!'},
    deletedAccessToken: {__type: 'String'},
    deletedCustomerAccessTokenId: {__type: 'String'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerAccessTokenRenewPayload: {
    __typename: {__type: 'String!'},
    customerAccessToken: {__type: 'CustomerAccessToken'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerActivateByUrlPayload: {
    __typename: {__type: 'String!'},
    customer: {__type: 'Customer'},
    customerAccessToken: {__type: 'CustomerAccessToken'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
  },
  CustomerActivateInput: {
    activationToken: {__type: 'String!'},
    password: {__type: 'String!'},
  },
  CustomerActivatePayload: {
    __typename: {__type: 'String!'},
    customer: {__type: 'Customer'},
    customerAccessToken: {__type: 'CustomerAccessToken'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerAddressCreatePayload: {
    __typename: {__type: 'String!'},
    customerAddress: {__type: 'MailingAddress'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerAddressDeletePayload: {
    __typename: {__type: 'String!'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    deletedCustomerAddressId: {__type: 'String'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerAddressUpdatePayload: {
    __typename: {__type: 'String!'},
    customerAddress: {__type: 'MailingAddress'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerCreateInput: {
    acceptsMarketing: {__type: 'Boolean'},
    email: {__type: 'String!'},
    firstName: {__type: 'String'},
    lastName: {__type: 'String'},
    password: {__type: 'String!'},
    phone: {__type: 'String'},
  },
  CustomerCreatePayload: {
    __typename: {__type: 'String!'},
    customer: {__type: 'Customer'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerDefaultAddressUpdatePayload: {
    __typename: {__type: 'String!'},
    customer: {__type: 'Customer'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerRecoverPayload: {
    __typename: {__type: 'String!'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerResetByUrlPayload: {
    __typename: {__type: 'String!'},
    customer: {__type: 'Customer'},
    customerAccessToken: {__type: 'CustomerAccessToken'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerResetInput: {
    password: {__type: 'String!'},
    resetToken: {__type: 'String!'},
  },
  CustomerResetPayload: {
    __typename: {__type: 'String!'},
    customer: {__type: 'Customer'},
    customerAccessToken: {__type: 'CustomerAccessToken'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerUpdateInput: {
    acceptsMarketing: {__type: 'Boolean'},
    email: {__type: 'String'},
    firstName: {__type: 'String'},
    lastName: {__type: 'String'},
    password: {__type: 'String'},
    phone: {__type: 'String'},
  },
  CustomerUpdatePayload: {
    __typename: {__type: 'String!'},
    customer: {__type: 'Customer'},
    customerAccessToken: {__type: 'CustomerAccessToken'},
    customerUserErrors: {__type: '[CustomerUserError!]!'},
    userErrors: {__type: '[UserError!]!'},
  },
  CustomerUserError: {
    __typename: {__type: 'String!'},
    code: {__type: 'CustomerErrorCode'},
    field: {__type: '[String!]'},
    message: {__type: 'String!'},
  },
  DeliveryAddress: {
    __typename: {__type: 'String!'},
    $on: {__type: '$DeliveryAddress!'},
  },
  DeliveryAddressInput: {
    customerAddressId: {__type: 'ID'},
    deliveryAddress: {__type: 'MailingAddressInput'},
    deliveryAddressValidationStrategy: {
      __type: 'DeliveryAddressValidationStrategy',
    },
    oneTimeUse: {__type: 'Boolean'},
  },
  DiscountAllocation: {
    __typename: {__type: 'String!'},
    allocatedAmount: {__type: 'MoneyV2!'},
    discountApplication: {__type: 'DiscountApplication!'},
  },
  DiscountApplication: {
    __typename: {__type: 'String!'},
    allocationMethod: {__type: 'DiscountApplicationAllocationMethod!'},
    targetSelection: {__type: 'DiscountApplicationTargetSelection!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
    value: {__type: 'PricingValue!'},
    $on: {__type: '$DiscountApplication!'},
  },
  DiscountApplicationConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[DiscountApplicationEdge!]!'},
    nodes: {__type: '[DiscountApplication!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  DiscountApplicationEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'DiscountApplication!'},
  },
  DiscountCodeApplication: {
    __typename: {__type: 'String!'},
    allocationMethod: {__type: 'DiscountApplicationAllocationMethod!'},
    applicable: {__type: 'Boolean!'},
    code: {__type: 'String!'},
    targetSelection: {__type: 'DiscountApplicationTargetSelection!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
    value: {__type: 'PricingValue!'},
  },
  DisplayableError: {
    __typename: {__type: 'String!'},
    field: {__type: '[String!]'},
    message: {__type: 'String!'},
    $on: {__type: '$DisplayableError!'},
  },
  Domain: {
    __typename: {__type: 'String!'},
    host: {__type: 'String!'},
    sslEnabled: {__type: 'Boolean!'},
    url: {__type: 'URL!'},
  },
  ExternalVideo: {
    __typename: {__type: 'String!'},
    alt: {__type: 'String'},
    embedUrl: {__type: 'URL!'},
    embeddedUrl: {__type: 'URL!'},
    host: {__type: 'MediaHost!'},
    id: {__type: 'ID!'},
    mediaContentType: {__type: 'MediaContentType!'},
    originUrl: {__type: 'URL!'},
    presentation: {__type: 'MediaPresentation'},
    previewImage: {__type: 'Image'},
  },
  Filter: {
    __typename: {__type: 'String!'},
    id: {__type: 'String!'},
    label: {__type: 'String!'},
    presentation: {__type: 'FilterPresentation'},
    type: {__type: 'FilterType!'},
    values: {__type: '[FilterValue!]!'},
  },
  FilterValue: {
    __typename: {__type: 'String!'},
    count: {__type: 'Int!'},
    id: {__type: 'String!'},
    image: {__type: 'MediaImage'},
    input: {__type: 'JSON!'},
    label: {__type: 'String!'},
    swatch: {__type: 'Swatch'},
  },
  Fulfillment: {
    __typename: {__type: 'String!'},
    fulfillmentLineItems: {
      __type: 'FulfillmentLineItemConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    trackingCompany: {__type: 'String'},
    trackingInfo: {
      __type: '[FulfillmentTrackingInfo!]!',
      __args: {first: 'Int'},
    },
  },
  FulfillmentLineItem: {
    __typename: {__type: 'String!'},
    lineItem: {__type: 'OrderLineItem!'},
    quantity: {__type: 'Int!'},
  },
  FulfillmentLineItemConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[FulfillmentLineItemEdge!]!'},
    nodes: {__type: '[FulfillmentLineItem!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  FulfillmentLineItemEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'FulfillmentLineItem!'},
  },
  FulfillmentTrackingInfo: {
    __typename: {__type: 'String!'},
    number: {__type: 'String'},
    url: {__type: 'URL'},
  },
  GenericFile: {
    __typename: {__type: 'String!'},
    alt: {__type: 'String'},
    id: {__type: 'ID!'},
    mimeType: {__type: 'String'},
    originalFileSize: {__type: 'Int'},
    previewImage: {__type: 'Image'},
    url: {__type: 'URL'},
  },
  GeoCoordinateInput: {
    latitude: {__type: 'Float!'},
    longitude: {__type: 'Float!'},
  },
  HasMetafields: {
    __typename: {__type: 'String!'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    $on: {__type: '$HasMetafields!'},
  },
  HasMetafieldsIdentifier: {
    key: {__type: 'String!'},
    namespace: {__type: 'String'},
  },
  Image: {
    __typename: {__type: 'String!'},
    altText: {__type: 'String'},
    height: {__type: 'Int'},
    id: {__type: 'ID'},
    originalSrc: {__type: 'URL!'},
    src: {__type: 'URL!'},
    transformedSrc: {
      __type: 'URL!',
      __args: {
        crop: 'CropRegion',
        maxHeight: 'Int',
        maxWidth: 'Int',
        preferredContentType: 'ImageContentType',
        scale: 'Int',
      },
    },
    url: {__type: 'URL!', __args: {transform: 'ImageTransformInput'}},
    width: {__type: 'Int'},
  },
  ImageConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[ImageEdge!]!'},
    nodes: {__type: '[Image!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  ImageEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Image!'},
  },
  ImageTransformInput: {
    crop: {__type: 'CropRegion'},
    maxHeight: {__type: 'Int'},
    maxWidth: {__type: 'Int'},
    preferredContentType: {__type: 'ImageContentType'},
    scale: {__type: 'Int'},
  },
  InContextAnnotation: {
    __typename: {__type: 'String!'},
    description: {__type: 'String!'},
    type: {__type: 'InContextAnnotationType!'},
  },
  InContextAnnotationType: {
    __typename: {__type: 'String!'},
    kind: {__type: 'String!'},
    name: {__type: 'String!'},
  },
  Language: {
    __typename: {__type: 'String!'},
    endonymName: {__type: 'String!'},
    isoCode: {__type: 'LanguageCode!'},
    name: {__type: 'String!'},
  },
  Localization: {
    __typename: {__type: 'String!'},
    availableCountries: {__type: '[Country!]!'},
    availableLanguages: {__type: '[Language!]!'},
    country: {__type: 'Country!'},
    language: {__type: 'Language!'},
    market: {__type: 'Market!'},
  },
  Location: {
    __typename: {__type: 'String!'},
    address: {__type: 'LocationAddress!'},
    id: {__type: 'ID!'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    name: {__type: 'String!'},
  },
  LocationAddress: {
    __typename: {__type: 'String!'},
    address1: {__type: 'String'},
    address2: {__type: 'String'},
    city: {__type: 'String'},
    country: {__type: 'String'},
    countryCode: {__type: 'String'},
    formatted: {__type: '[String!]!'},
    latitude: {__type: 'Float'},
    longitude: {__type: 'Float'},
    phone: {__type: 'String'},
    province: {__type: 'String'},
    provinceCode: {__type: 'String'},
    zip: {__type: 'String'},
  },
  LocationConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[LocationEdge!]!'},
    nodes: {__type: '[Location!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  LocationEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Location!'},
  },
  MailingAddress: {
    __typename: {__type: 'String!'},
    address1: {__type: 'String'},
    address2: {__type: 'String'},
    city: {__type: 'String'},
    company: {__type: 'String'},
    country: {__type: 'String'},
    countryCode: {__type: 'String'},
    countryCodeV2: {__type: 'CountryCode'},
    firstName: {__type: 'String'},
    formatted: {
      __type: '[String!]!',
      __args: {withCompany: 'Boolean', withName: 'Boolean'},
    },
    formattedArea: {__type: 'String'},
    id: {__type: 'ID!'},
    lastName: {__type: 'String'},
    latitude: {__type: 'Float'},
    longitude: {__type: 'Float'},
    name: {__type: 'String'},
    phone: {__type: 'String'},
    province: {__type: 'String'},
    provinceCode: {__type: 'String'},
    zip: {__type: 'String'},
  },
  MailingAddressConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[MailingAddressEdge!]!'},
    nodes: {__type: '[MailingAddress!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  MailingAddressEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'MailingAddress!'},
  },
  MailingAddressInput: {
    address1: {__type: 'String'},
    address2: {__type: 'String'},
    city: {__type: 'String'},
    company: {__type: 'String'},
    country: {__type: 'String'},
    firstName: {__type: 'String'},
    lastName: {__type: 'String'},
    phone: {__type: 'String'},
    province: {__type: 'String'},
    zip: {__type: 'String'},
  },
  ManualDiscountApplication: {
    __typename: {__type: 'String!'},
    allocationMethod: {__type: 'DiscountApplicationAllocationMethod!'},
    description: {__type: 'String'},
    targetSelection: {__type: 'DiscountApplicationTargetSelection!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
    title: {__type: 'String!'},
    value: {__type: 'PricingValue!'},
  },
  Market: {
    __typename: {__type: 'String!'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
  },
  Media: {
    __typename: {__type: 'String!'},
    alt: {__type: 'String'},
    id: {__type: 'ID!'},
    mediaContentType: {__type: 'MediaContentType!'},
    presentation: {__type: 'MediaPresentation'},
    previewImage: {__type: 'Image'},
    $on: {__type: '$Media!'},
  },
  MediaConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[MediaEdge!]!'},
    nodes: {__type: '[Media!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  MediaEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Media!'},
  },
  MediaImage: {
    __typename: {__type: 'String!'},
    alt: {__type: 'String'},
    id: {__type: 'ID!'},
    image: {__type: 'Image'},
    mediaContentType: {__type: 'MediaContentType!'},
    presentation: {__type: 'MediaPresentation'},
    previewImage: {__type: 'Image'},
  },
  MediaPresentation: {
    __typename: {__type: 'String!'},
    asJson: {__type: 'JSON', __args: {format: 'MediaPresentationFormat!'}},
    id: {__type: 'ID!'},
  },
  Menu: {
    __typename: {__type: 'String!'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    items: {__type: '[MenuItem!]!'},
    itemsCount: {__type: 'Int!'},
    title: {__type: 'String!'},
  },
  MenuItem: {
    __typename: {__type: 'String!'},
    id: {__type: 'ID!'},
    items: {__type: '[MenuItem!]!'},
    resource: {__type: 'MenuItemResource'},
    resourceId: {__type: 'ID'},
    tags: {__type: '[String!]!'},
    title: {__type: 'String!'},
    type: {__type: 'MenuItemType!'},
    url: {__type: 'URL'},
  },
  MenuItemResource: {
    __typename: {__type: 'String!'},
    $on: {__type: '$MenuItemResource!'},
  },
  Merchandise: {
    __typename: {__type: 'String!'},
    $on: {__type: '$Merchandise!'},
  },
  Metafield: {
    __typename: {__type: 'String!'},
    createdAt: {__type: 'DateTime!'},
    description: {__type: 'String'},
    id: {__type: 'ID!'},
    key: {__type: 'String!'},
    namespace: {__type: 'String!'},
    parentResource: {__type: 'MetafieldParentResource!'},
    reference: {__type: 'MetafieldReference'},
    references: {
      __type: 'MetafieldReferenceConnection',
      __args: {after: 'String', before: 'String', first: 'Int', last: 'Int'},
    },
    type: {__type: 'String!'},
    updatedAt: {__type: 'DateTime!'},
    value: {__type: 'String!'},
  },
  MetafieldDeleteUserError: {
    __typename: {__type: 'String!'},
    code: {__type: 'MetafieldDeleteErrorCode'},
    field: {__type: '[String!]'},
    message: {__type: 'String!'},
  },
  MetafieldFilter: {
    key: {__type: 'String!'},
    namespace: {__type: 'String!'},
    value: {__type: 'String!'},
  },
  MetafieldParentResource: {
    __typename: {__type: 'String!'},
    $on: {__type: '$MetafieldParentResource!'},
  },
  MetafieldReference: {
    __typename: {__type: 'String!'},
    $on: {__type: '$MetafieldReference!'},
  },
  MetafieldReferenceConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[MetafieldReferenceEdge!]!'},
    nodes: {__type: '[MetafieldReference!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  MetafieldReferenceEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'MetafieldReference!'},
  },
  MetafieldsSetUserError: {
    __typename: {__type: 'String!'},
    code: {__type: 'MetafieldsSetUserErrorCode'},
    elementIndex: {__type: 'Int'},
    field: {__type: '[String!]'},
    message: {__type: 'String!'},
  },
  Metaobject: {
    __typename: {__type: 'String!'},
    field: {__type: 'MetaobjectField', __args: {key: 'String!'}},
    fields: {__type: '[MetaobjectField!]!'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    onlineStoreUrl: {__type: 'URL'},
    seo: {__type: 'MetaobjectSEO'},
    type: {__type: 'String!'},
    updatedAt: {__type: 'DateTime!'},
  },
  MetaobjectConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[MetaobjectEdge!]!'},
    nodes: {__type: '[Metaobject!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  MetaobjectEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Metaobject!'},
  },
  MetaobjectField: {
    __typename: {__type: 'String!'},
    key: {__type: 'String!'},
    reference: {__type: 'MetafieldReference'},
    references: {
      __type: 'MetafieldReferenceConnection',
      __args: {after: 'String', before: 'String', first: 'Int', last: 'Int'},
    },
    type: {__type: 'String!'},
    value: {__type: 'String'},
  },
  MetaobjectHandleInput: {
    handle: {__type: 'String!'},
    type: {__type: 'String!'},
  },
  MetaobjectSEO: {
    __typename: {__type: 'String!'},
    description: {__type: 'MetaobjectField'},
    title: {__type: 'MetaobjectField'},
  },
  Model3d: {
    __typename: {__type: 'String!'},
    alt: {__type: 'String'},
    id: {__type: 'ID!'},
    mediaContentType: {__type: 'MediaContentType!'},
    presentation: {__type: 'MediaPresentation'},
    previewImage: {__type: 'Image'},
    sources: {__type: '[Model3dSource!]!'},
  },
  Model3dSource: {
    __typename: {__type: 'String!'},
    filesize: {__type: 'Int!'},
    format: {__type: 'String!'},
    mimeType: {__type: 'String!'},
    url: {__type: 'String!'},
  },
  MoneyInput: {
    amount: {__type: 'Decimal!'},
    currencyCode: {__type: 'CurrencyCode!'},
  },
  MoneyV2: {
    __typename: {__type: 'String!'},
    amount: {__type: 'Decimal!'},
    currencyCode: {__type: 'CurrencyCode!'},
  },
  Node: {
    __typename: {__type: 'String!'},
    id: {__type: 'ID!'},
    $on: {__type: '$Node!'},
  },
  OnlineStorePublishable: {
    __typename: {__type: 'String!'},
    onlineStoreUrl: {__type: 'URL'},
    $on: {__type: '$OnlineStorePublishable!'},
  },
  Order: {
    __typename: {__type: 'String!'},
    billingAddress: {__type: 'MailingAddress'},
    cancelReason: {__type: 'OrderCancelReason'},
    canceledAt: {__type: 'DateTime'},
    currencyCode: {__type: 'CurrencyCode!'},
    currentSubtotalPrice: {__type: 'MoneyV2!'},
    currentTotalDuties: {__type: 'MoneyV2'},
    currentTotalPrice: {__type: 'MoneyV2!'},
    currentTotalShippingPrice: {__type: 'MoneyV2!'},
    currentTotalTax: {__type: 'MoneyV2!'},
    customAttributes: {__type: '[Attribute!]!'},
    customerLocale: {__type: 'String'},
    customerUrl: {__type: 'URL'},
    discountApplications: {
      __type: 'DiscountApplicationConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    edited: {__type: 'Boolean!'},
    email: {__type: 'String'},
    financialStatus: {__type: 'OrderFinancialStatus'},
    fulfillmentStatus: {__type: 'OrderFulfillmentStatus!'},
    id: {__type: 'ID!'},
    lineItems: {
      __type: 'OrderLineItemConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    name: {__type: 'String!'},
    orderNumber: {__type: 'Int!'},
    originalTotalDuties: {__type: 'MoneyV2'},
    originalTotalPrice: {__type: 'MoneyV2!'},
    phone: {__type: 'String'},
    processedAt: {__type: 'DateTime!'},
    shippingAddress: {__type: 'MailingAddress'},
    shippingDiscountAllocations: {__type: '[DiscountAllocation!]!'},
    statusUrl: {__type: 'URL!'},
    subtotalPrice: {__type: 'MoneyV2'},
    subtotalPriceV2: {__type: 'MoneyV2'},
    successfulFulfillments: {__type: '[Fulfillment!]', __args: {first: 'Int'}},
    totalPrice: {__type: 'MoneyV2!'},
    totalPriceV2: {__type: 'MoneyV2!'},
    totalRefunded: {__type: 'MoneyV2!'},
    totalRefundedV2: {__type: 'MoneyV2!'},
    totalShippingPrice: {__type: 'MoneyV2!'},
    totalShippingPriceV2: {__type: 'MoneyV2!'},
    totalTax: {__type: 'MoneyV2'},
    totalTaxV2: {__type: 'MoneyV2'},
  },
  OrderConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[OrderEdge!]!'},
    nodes: {__type: '[Order!]!'},
    pageInfo: {__type: 'PageInfo!'},
    totalCount: {__type: 'UnsignedInt64!'},
  },
  OrderEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Order!'},
  },
  OrderLineItem: {
    __typename: {__type: 'String!'},
    currentQuantity: {__type: 'Int!'},
    customAttributes: {__type: '[Attribute!]!'},
    discountAllocations: {__type: '[DiscountAllocation!]!'},
    discountedTotalPrice: {__type: 'MoneyV2!'},
    originalTotalPrice: {__type: 'MoneyV2!'},
    quantity: {__type: 'Int!'},
    title: {__type: 'String!'},
    variant: {__type: 'ProductVariant'},
  },
  OrderLineItemConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[OrderLineItemEdge!]!'},
    nodes: {__type: '[OrderLineItem!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  OrderLineItemEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'OrderLineItem!'},
  },
  Page: {
    __typename: {__type: 'String!'},
    body: {__type: 'HTML!'},
    bodySummary: {__type: 'String!'},
    createdAt: {__type: 'DateTime!'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    onlineStoreUrl: {__type: 'URL'},
    seo: {__type: 'SEO'},
    title: {__type: 'String!'},
    trackingParameters: {__type: 'String'},
    updatedAt: {__type: 'DateTime!'},
  },
  PageConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[PageEdge!]!'},
    nodes: {__type: '[Page!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  PageEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Page!'},
  },
  PageInfo: {
    __typename: {__type: 'String!'},
    endCursor: {__type: 'String'},
    hasNextPage: {__type: 'Boolean!'},
    hasPreviousPage: {__type: 'Boolean!'},
    startCursor: {__type: 'String'},
  },
  PaginatedSitemapResources: {
    __typename: {__type: 'String!'},
    hasNextPage: {__type: 'Boolean!'},
    items: {__type: '[SitemapResourceInterface!]!'},
  },
  PaymentSettings: {
    __typename: {__type: 'String!'},
    acceptedCardBrands: {__type: '[CardBrand!]!'},
    cardVaultUrl: {__type: 'URL!'},
    countryCode: {__type: 'CountryCode!'},
    currencyCode: {__type: 'CurrencyCode!'},
    enabledPresentmentCurrencies: {__type: '[CurrencyCode!]!'},
    shopifyPaymentsAccountId: {__type: 'String'},
    supportedDigitalWallets: {__type: '[DigitalWallet!]!'},
  },
  PredictiveSearchResult: {
    __typename: {__type: 'String!'},
    articles: {__type: '[Article!]!'},
    collections: {__type: '[Collection!]!'},
    pages: {__type: '[Page!]!'},
    products: {__type: '[Product!]!'},
    queries: {__type: '[SearchQuerySuggestion!]!'},
  },
  PriceRangeFilter: {max: {__type: 'Float'}, min: {__type: 'Float'}},
  PricingPercentageValue: {
    __typename: {__type: 'String!'},
    percentage: {__type: 'Float!'},
  },
  PricingValue: {
    __typename: {__type: 'String!'},
    $on: {__type: '$PricingValue!'},
  },
  Product: {
    __typename: {__type: 'String!'},
    adjacentVariants: {
      __type: '[ProductVariant!]!',
      __args: {
        caseInsensitiveMatch: 'Boolean',
        ignoreUnknownOptions: 'Boolean',
        selectedOptions: '[SelectedOptionInput!]',
      },
    },
    availableForSale: {__type: 'Boolean!'},
    category: {__type: 'TaxonomyCategory'},
    collections: {
      __type: 'CollectionConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    compareAtPriceRange: {__type: 'ProductPriceRange!'},
    createdAt: {__type: 'DateTime!'},
    description: {__type: 'String!', __args: {truncateAt: 'Int'}},
    descriptionHtml: {__type: 'HTML!'},
    encodedVariantAvailability: {__type: 'String'},
    encodedVariantExistence: {__type: 'String'},
    featuredImage: {__type: 'Image'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    images: {
      __type: 'ImageConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
        sortKey: 'ProductImageSortKeys',
      },
    },
    isGiftCard: {__type: 'Boolean!'},
    media: {
      __type: 'MediaConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
        sortKey: 'ProductMediaSortKeys',
      },
    },
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    onlineStoreUrl: {__type: 'URL'},
    options: {__type: '[ProductOption!]!', __args: {first: 'Int'}},
    priceRange: {__type: 'ProductPriceRange!'},
    productType: {__type: 'String!'},
    publishedAt: {__type: 'DateTime!'},
    requiresSellingPlan: {__type: 'Boolean!'},
    selectedOrFirstAvailableVariant: {
      __type: 'ProductVariant',
      __args: {
        caseInsensitiveMatch: 'Boolean',
        ignoreUnknownOptions: 'Boolean',
        selectedOptions: '[SelectedOptionInput!]',
      },
    },
    sellingPlanGroups: {
      __type: 'SellingPlanGroupConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    seo: {__type: 'SEO!'},
    tags: {__type: '[String!]!'},
    title: {__type: 'String!'},
    totalInventory: {__type: 'Int'},
    trackingParameters: {__type: 'String'},
    updatedAt: {__type: 'DateTime!'},
    variantBySelectedOptions: {
      __type: 'ProductVariant',
      __args: {
        caseInsensitiveMatch: 'Boolean',
        ignoreUnknownOptions: 'Boolean',
        selectedOptions: '[SelectedOptionInput!]!',
      },
    },
    variants: {
      __type: 'ProductVariantConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
        sortKey: 'ProductVariantSortKeys',
      },
    },
    variantsCount: {__type: 'Count'},
    vendor: {__type: 'String!'},
  },
  ProductConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[ProductEdge!]!'},
    filters: {__type: '[Filter!]!'},
    nodes: {__type: '[Product!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  ProductEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'Product!'},
  },
  ProductFilter: {
    available: {__type: 'Boolean'},
    price: {__type: 'PriceRangeFilter'},
    productMetafield: {__type: 'MetafieldFilter'},
    productType: {__type: 'String'},
    productVendor: {__type: 'String'},
    tag: {__type: 'String'},
    variantMetafield: {__type: 'MetafieldFilter'},
    variantOption: {__type: 'VariantOptionFilter'},
  },
  ProductOption: {
    __typename: {__type: 'String!'},
    id: {__type: 'ID!'},
    name: {__type: 'String!'},
    optionValues: {__type: '[ProductOptionValue!]!'},
    values: {__type: '[String!]!'},
  },
  ProductOptionValue: {
    __typename: {__type: 'String!'},
    firstSelectableVariant: {__type: 'ProductVariant'},
    id: {__type: 'ID!'},
    name: {__type: 'String!'},
    swatch: {__type: 'ProductOptionValueSwatch'},
  },
  ProductOptionValueSwatch: {
    __typename: {__type: 'String!'},
    color: {__type: 'Color'},
    image: {__type: 'Media'},
  },
  ProductPriceRange: {
    __typename: {__type: 'String!'},
    maxVariantPrice: {__type: 'MoneyV2!'},
    minVariantPrice: {__type: 'MoneyV2!'},
  },
  ProductVariant: {
    __typename: {__type: 'String!'},
    availableForSale: {__type: 'Boolean!'},
    barcode: {__type: 'String'},
    compareAtPrice: {__type: 'MoneyV2'},
    compareAtPriceV2: {__type: 'MoneyV2'},
    components: {
      __type: 'ProductVariantComponentConnection!',
      __args: {after: 'String', before: 'String', first: 'Int', last: 'Int'},
    },
    currentlyNotInStock: {__type: 'Boolean!'},
    groupedBy: {
      __type: 'ProductVariantConnection!',
      __args: {after: 'String', before: 'String', first: 'Int', last: 'Int'},
    },
    id: {__type: 'ID!'},
    image: {__type: 'Image'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    price: {__type: 'MoneyV2!'},
    priceV2: {__type: 'MoneyV2!'},
    product: {__type: 'Product!'},
    quantityAvailable: {__type: 'Int'},
    quantityPriceBreaks: {
      __type: 'QuantityPriceBreakConnection!',
      __args: {after: 'String', before: 'String', first: 'Int', last: 'Int'},
    },
    quantityRule: {__type: 'QuantityRule!'},
    requiresComponents: {__type: 'Boolean!'},
    requiresShipping: {__type: 'Boolean!'},
    selectedOptions: {__type: '[SelectedOption!]!'},
    sellingPlanAllocations: {
      __type: 'SellingPlanAllocationConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
    shopPayInstallmentsPricing: {
      __type: 'ShopPayInstallmentsProductVariantPricing',
    },
    sku: {__type: 'String'},
    storeAvailability: {
      __type: 'StoreAvailabilityConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        near: 'GeoCoordinateInput',
        reverse: 'Boolean',
      },
    },
    taxable: {__type: 'Boolean!'},
    title: {__type: 'String!'},
    unitPrice: {__type: 'MoneyV2'},
    unitPriceMeasurement: {__type: 'UnitPriceMeasurement'},
    weight: {__type: 'Float'},
    weightUnit: {__type: 'WeightUnit!'},
  },
  ProductVariantComponent: {
    __typename: {__type: 'String!'},
    productVariant: {__type: 'ProductVariant!'},
    quantity: {__type: 'Int!'},
  },
  ProductVariantComponentConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[ProductVariantComponentEdge!]!'},
    nodes: {__type: '[ProductVariantComponent!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  ProductVariantComponentEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'ProductVariantComponent!'},
  },
  ProductVariantConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[ProductVariantEdge!]!'},
    nodes: {__type: '[ProductVariant!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  ProductVariantEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'ProductVariant!'},
  },
  PurchasingCompany: {
    __typename: {__type: 'String!'},
    company: {__type: 'Company!'},
    contact: {__type: 'CompanyContact'},
    location: {__type: 'CompanyLocation!'},
  },
  QuantityPriceBreak: {
    __typename: {__type: 'String!'},
    minimumQuantity: {__type: 'Int!'},
    price: {__type: 'MoneyV2!'},
  },
  QuantityPriceBreakConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[QuantityPriceBreakEdge!]!'},
    nodes: {__type: '[QuantityPriceBreak!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  QuantityPriceBreakEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'QuantityPriceBreak!'},
  },
  QuantityRule: {
    __typename: {__type: 'String!'},
    increment: {__type: 'Int!'},
    maximum: {__type: 'Int'},
    minimum: {__type: 'Int!'},
  },
  SEO: {
    __typename: {__type: 'String!'},
    description: {__type: 'String'},
    title: {__type: 'String'},
  },
  ScriptDiscountApplication: {
    __typename: {__type: 'String!'},
    allocationMethod: {__type: 'DiscountApplicationAllocationMethod!'},
    targetSelection: {__type: 'DiscountApplicationTargetSelection!'},
    targetType: {__type: 'DiscountApplicationTargetType!'},
    title: {__type: 'String!'},
    value: {__type: 'PricingValue!'},
  },
  SearchQuerySuggestion: {
    __typename: {__type: 'String!'},
    styledText: {__type: 'String!'},
    text: {__type: 'String!'},
    trackingParameters: {__type: 'String'},
  },
  SearchResultItem: {
    __typename: {__type: 'String!'},
    $on: {__type: '$SearchResultItem!'},
  },
  SearchResultItemConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[SearchResultItemEdge!]!'},
    nodes: {__type: '[SearchResultItem!]!'},
    pageInfo: {__type: 'PageInfo!'},
    productFilters: {__type: '[Filter!]!'},
    totalCount: {__type: 'Int!'},
  },
  SearchResultItemEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'SearchResultItem!'},
  },
  SelectedOption: {
    __typename: {__type: 'String!'},
    name: {__type: 'String!'},
    value: {__type: 'String!'},
  },
  SelectedOptionInput: {name: {__type: 'String!'}, value: {__type: 'String!'}},
  SellingPlan: {
    __typename: {__type: 'String!'},
    billingPolicy: {__type: 'SellingPlanBillingPolicy'},
    checkoutCharge: {__type: 'SellingPlanCheckoutCharge!'},
    deliveryPolicy: {__type: 'SellingPlanDeliveryPolicy'},
    description: {__type: 'String'},
    id: {__type: 'ID!'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    name: {__type: 'String!'},
    options: {__type: '[SellingPlanOption!]!'},
    priceAdjustments: {__type: '[SellingPlanPriceAdjustment!]!'},
    recurringDeliveries: {__type: 'Boolean!'},
  },
  SellingPlanAllocation: {
    __typename: {__type: 'String!'},
    checkoutChargeAmount: {__type: 'MoneyV2!'},
    priceAdjustments: {__type: '[SellingPlanAllocationPriceAdjustment!]!'},
    remainingBalanceChargeAmount: {__type: 'MoneyV2!'},
    sellingPlan: {__type: 'SellingPlan!'},
  },
  SellingPlanAllocationConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[SellingPlanAllocationEdge!]!'},
    nodes: {__type: '[SellingPlanAllocation!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  SellingPlanAllocationEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'SellingPlanAllocation!'},
  },
  SellingPlanAllocationPriceAdjustment: {
    __typename: {__type: 'String!'},
    compareAtPrice: {__type: 'MoneyV2!'},
    perDeliveryPrice: {__type: 'MoneyV2!'},
    price: {__type: 'MoneyV2!'},
    unitPrice: {__type: 'MoneyV2'},
  },
  SellingPlanBillingPolicy: {
    __typename: {__type: 'String!'},
    $on: {__type: '$SellingPlanBillingPolicy!'},
  },
  SellingPlanCheckoutCharge: {
    __typename: {__type: 'String!'},
    type: {__type: 'SellingPlanCheckoutChargeType!'},
    value: {__type: 'SellingPlanCheckoutChargeValue!'},
  },
  SellingPlanCheckoutChargePercentageValue: {
    __typename: {__type: 'String!'},
    percentage: {__type: 'Float!'},
  },
  SellingPlanCheckoutChargeValue: {
    __typename: {__type: 'String!'},
    $on: {__type: '$SellingPlanCheckoutChargeValue!'},
  },
  SellingPlanConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[SellingPlanEdge!]!'},
    nodes: {__type: '[SellingPlan!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  SellingPlanDeliveryPolicy: {
    __typename: {__type: 'String!'},
    $on: {__type: '$SellingPlanDeliveryPolicy!'},
  },
  SellingPlanEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'SellingPlan!'},
  },
  SellingPlanFixedAmountPriceAdjustment: {
    __typename: {__type: 'String!'},
    adjustmentAmount: {__type: 'MoneyV2!'},
  },
  SellingPlanFixedPriceAdjustment: {
    __typename: {__type: 'String!'},
    price: {__type: 'MoneyV2!'},
  },
  SellingPlanGroup: {
    __typename: {__type: 'String!'},
    appName: {__type: 'String'},
    name: {__type: 'String!'},
    options: {__type: '[SellingPlanGroupOption!]!'},
    sellingPlans: {
      __type: 'SellingPlanConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
      },
    },
  },
  SellingPlanGroupConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[SellingPlanGroupEdge!]!'},
    nodes: {__type: '[SellingPlanGroup!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  SellingPlanGroupEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'SellingPlanGroup!'},
  },
  SellingPlanGroupOption: {
    __typename: {__type: 'String!'},
    name: {__type: 'String!'},
    values: {__type: '[String!]!'},
  },
  SellingPlanOption: {
    __typename: {__type: 'String!'},
    name: {__type: 'String'},
    value: {__type: 'String'},
  },
  SellingPlanPercentagePriceAdjustment: {
    __typename: {__type: 'String!'},
    adjustmentPercentage: {__type: 'Int!'},
  },
  SellingPlanPriceAdjustment: {
    __typename: {__type: 'String!'},
    adjustmentValue: {__type: 'SellingPlanPriceAdjustmentValue!'},
    orderCount: {__type: 'Int'},
  },
  SellingPlanPriceAdjustmentValue: {
    __typename: {__type: 'String!'},
    $on: {__type: '$SellingPlanPriceAdjustmentValue!'},
  },
  SellingPlanRecurringBillingPolicy: {
    __typename: {__type: 'String!'},
    interval: {__type: 'SellingPlanInterval!'},
    intervalCount: {__type: 'Int!'},
  },
  SellingPlanRecurringDeliveryPolicy: {
    __typename: {__type: 'String!'},
    interval: {__type: 'SellingPlanInterval!'},
    intervalCount: {__type: 'Int!'},
  },
  Shop: {
    __typename: {__type: 'String!'},
    brand: {__type: 'Brand'},
    description: {__type: 'String'},
    id: {__type: 'ID!'},
    metafield: {
      __type: 'Metafield',
      __args: {key: 'String!', namespace: 'String'},
    },
    metafields: {
      __type: '[Metafield]!',
      __args: {identifiers: '[HasMetafieldsIdentifier!]!'},
    },
    moneyFormat: {__type: 'String!'},
    name: {__type: 'String!'},
    paymentSettings: {__type: 'PaymentSettings!'},
    primaryDomain: {__type: 'Domain!'},
    privacyPolicy: {__type: 'ShopPolicy'},
    refundPolicy: {__type: 'ShopPolicy'},
    shippingPolicy: {__type: 'ShopPolicy'},
    shipsToCountries: {__type: '[CountryCode!]!'},
    shopPayInstallmentsPricing: {__type: 'ShopPayInstallmentsPricing'},
    subscriptionPolicy: {__type: 'ShopPolicyWithDefault'},
    termsOfService: {__type: 'ShopPolicy'},
  },
  ShopPayInstallmentsFinancingPlan: {
    __typename: {__type: 'String!'},
    id: {__type: 'ID!'},
    maxPrice: {__type: 'MoneyV2!'},
    minPrice: {__type: 'MoneyV2!'},
    terms: {__type: '[ShopPayInstallmentsFinancingPlanTerm!]!'},
  },
  ShopPayInstallmentsFinancingPlanTerm: {
    __typename: {__type: 'String!'},
    apr: {__type: 'Int!'},
    frequency: {__type: 'ShopPayInstallmentsFinancingPlanFrequency!'},
    id: {__type: 'ID!'},
    installmentsCount: {__type: 'Count'},
    loanType: {__type: 'ShopPayInstallmentsLoan!'},
  },
  ShopPayInstallmentsPricing: {
    __typename: {__type: 'String!'},
    financingPlans: {__type: '[ShopPayInstallmentsFinancingPlan!]!'},
    maxPrice: {__type: 'MoneyV2!'},
    minPrice: {__type: 'MoneyV2!'},
  },
  ShopPayInstallmentsProductVariantPricing: {
    __typename: {__type: 'String!'},
    available: {__type: 'Boolean!'},
    eligible: {__type: 'Boolean!'},
    fullPrice: {__type: 'MoneyV2!'},
    id: {__type: 'ID!'},
    installmentsCount: {__type: 'Count'},
    pricePerTerm: {__type: 'MoneyV2!'},
  },
  ShopPayPaymentRequest: {
    __typename: {__type: 'String!'},
    deliveryMethods: {__type: '[ShopPayPaymentRequestDeliveryMethod!]!'},
    discountCodes: {__type: '[String!]!'},
    discounts: {__type: '[ShopPayPaymentRequestDiscount!]'},
    lineItems: {__type: '[ShopPayPaymentRequestLineItem!]!'},
    locale: {__type: 'String!'},
    presentmentCurrency: {__type: 'CurrencyCode!'},
    selectedDeliveryMethodType: {
      __type: 'ShopPayPaymentRequestDeliveryMethodType!',
    },
    shippingAddress: {__type: 'ShopPayPaymentRequestContactField'},
    shippingLines: {__type: '[ShopPayPaymentRequestShippingLine!]!'},
    subtotal: {__type: 'MoneyV2!'},
    total: {__type: 'MoneyV2!'},
    totalShippingPrice: {__type: 'ShopPayPaymentRequestTotalShippingPrice'},
    totalTax: {__type: 'MoneyV2'},
  },
  ShopPayPaymentRequestContactField: {
    __typename: {__type: 'String!'},
    address1: {__type: 'String!'},
    address2: {__type: 'String'},
    city: {__type: 'String!'},
    companyName: {__type: 'String'},
    countryCode: {__type: 'String!'},
    email: {__type: 'String'},
    firstName: {__type: 'String!'},
    lastName: {__type: 'String!'},
    phone: {__type: 'String'},
    postalCode: {__type: 'String'},
    provinceCode: {__type: 'String'},
  },
  ShopPayPaymentRequestDeliveryMethod: {
    __typename: {__type: 'String!'},
    amount: {__type: 'MoneyV2!'},
    code: {__type: 'String!'},
    deliveryExpectationLabel: {__type: 'String'},
    detail: {__type: 'String'},
    label: {__type: 'String!'},
    maxDeliveryDate: {__type: 'ISO8601DateTime'},
    minDeliveryDate: {__type: 'ISO8601DateTime'},
  },
  ShopPayPaymentRequestDeliveryMethodInput: {
    amount: {__type: 'MoneyInput'},
    code: {__type: 'String'},
    deliveryExpectationLabel: {__type: 'String'},
    detail: {__type: 'String'},
    label: {__type: 'String'},
    maxDeliveryDate: {__type: 'ISO8601DateTime'},
    minDeliveryDate: {__type: 'ISO8601DateTime'},
  },
  ShopPayPaymentRequestDiscount: {
    __typename: {__type: 'String!'},
    amount: {__type: 'MoneyV2!'},
    label: {__type: 'String!'},
  },
  ShopPayPaymentRequestDiscountInput: {
    amount: {__type: 'MoneyInput'},
    label: {__type: 'String'},
  },
  ShopPayPaymentRequestImage: {
    __typename: {__type: 'String!'},
    alt: {__type: 'String'},
    url: {__type: 'String!'},
  },
  ShopPayPaymentRequestImageInput: {
    alt: {__type: 'String'},
    url: {__type: 'String!'},
  },
  ShopPayPaymentRequestInput: {
    deliveryMethods: {__type: '[ShopPayPaymentRequestDeliveryMethodInput!]'},
    discountCodes: {__type: '[String!]'},
    discounts: {__type: '[ShopPayPaymentRequestDiscountInput!]'},
    lineItems: {__type: '[ShopPayPaymentRequestLineItemInput!]'},
    locale: {__type: 'String!'},
    paymentMethod: {__type: 'String'},
    presentmentCurrency: {__type: 'CurrencyCode!'},
    selectedDeliveryMethodType: {
      __type: 'ShopPayPaymentRequestDeliveryMethodType',
    },
    shippingLines: {__type: '[ShopPayPaymentRequestShippingLineInput!]'},
    subtotal: {__type: 'MoneyInput!'},
    total: {__type: 'MoneyInput!'},
    totalShippingPrice: {
      __type: 'ShopPayPaymentRequestTotalShippingPriceInput',
    },
    totalTax: {__type: 'MoneyInput'},
  },
  ShopPayPaymentRequestLineItem: {
    __typename: {__type: 'String!'},
    finalItemPrice: {__type: 'MoneyV2!'},
    finalLinePrice: {__type: 'MoneyV2!'},
    image: {__type: 'ShopPayPaymentRequestImage'},
    itemDiscounts: {__type: '[ShopPayPaymentRequestDiscount!]'},
    label: {__type: 'String!'},
    lineDiscounts: {__type: '[ShopPayPaymentRequestDiscount!]'},
    originalItemPrice: {__type: 'MoneyV2'},
    originalLinePrice: {__type: 'MoneyV2'},
    quantity: {__type: 'Int!'},
    requiresShipping: {__type: 'Boolean'},
    sku: {__type: 'String'},
  },
  ShopPayPaymentRequestLineItemInput: {
    finalItemPrice: {__type: 'MoneyInput'},
    finalLinePrice: {__type: 'MoneyInput'},
    image: {__type: 'ShopPayPaymentRequestImageInput'},
    itemDiscounts: {__type: '[ShopPayPaymentRequestDiscountInput!]'},
    label: {__type: 'String'},
    lineDiscounts: {__type: '[ShopPayPaymentRequestDiscountInput!]'},
    originalItemPrice: {__type: 'MoneyInput'},
    originalLinePrice: {__type: 'MoneyInput'},
    quantity: {__type: 'Int!'},
    requiresShipping: {__type: 'Boolean'},
    sku: {__type: 'String'},
  },
  ShopPayPaymentRequestReceipt: {
    __typename: {__type: 'String!'},
    paymentRequest: {__type: 'ShopPayPaymentRequest!'},
    processingStatusType: {__type: 'String!'},
    token: {__type: 'String!'},
  },
  ShopPayPaymentRequestSession: {
    __typename: {__type: 'String!'},
    checkoutUrl: {__type: 'URL!'},
    paymentRequest: {__type: 'ShopPayPaymentRequest!'},
    sourceIdentifier: {__type: 'String!'},
    token: {__type: 'String!'},
  },
  ShopPayPaymentRequestSessionCreatePayload: {
    __typename: {__type: 'String!'},
    shopPayPaymentRequestSession: {__type: 'ShopPayPaymentRequestSession'},
    userErrors: {
      __type: '[UserErrorsShopPayPaymentRequestSessionUserErrors!]!',
    },
  },
  ShopPayPaymentRequestSessionSubmitPayload: {
    __typename: {__type: 'String!'},
    paymentRequestReceipt: {__type: 'ShopPayPaymentRequestReceipt'},
    userErrors: {
      __type: '[UserErrorsShopPayPaymentRequestSessionUserErrors!]!',
    },
  },
  ShopPayPaymentRequestShippingLine: {
    __typename: {__type: 'String!'},
    amount: {__type: 'MoneyV2!'},
    code: {__type: 'String!'},
    label: {__type: 'String!'},
  },
  ShopPayPaymentRequestShippingLineInput: {
    amount: {__type: 'MoneyInput'},
    code: {__type: 'String'},
    label: {__type: 'String'},
  },
  ShopPayPaymentRequestTotalShippingPrice: {
    __typename: {__type: 'String!'},
    discounts: {__type: '[ShopPayPaymentRequestDiscount!]!'},
    finalTotal: {__type: 'MoneyV2!'},
    originalTotal: {__type: 'MoneyV2'},
  },
  ShopPayPaymentRequestTotalShippingPriceInput: {
    discounts: {__type: '[ShopPayPaymentRequestDiscountInput!]'},
    finalTotal: {__type: 'MoneyInput'},
    originalTotal: {__type: 'MoneyInput'},
  },
  ShopPayWalletContentInput: {
    billingAddress: {__type: 'MailingAddressInput!'},
    sessionToken: {__type: 'String!'},
  },
  ShopPolicy: {
    __typename: {__type: 'String!'},
    body: {__type: 'String!'},
    handle: {__type: 'String!'},
    id: {__type: 'ID!'},
    title: {__type: 'String!'},
    url: {__type: 'URL!'},
  },
  ShopPolicyWithDefault: {
    __typename: {__type: 'String!'},
    body: {__type: 'String!'},
    handle: {__type: 'String!'},
    id: {__type: 'ID'},
    title: {__type: 'String!'},
    url: {__type: 'URL!'},
  },
  Sitemap: {
    __typename: {__type: 'String!'},
    pagesCount: {__type: 'Count'},
    resources: {__type: 'PaginatedSitemapResources', __args: {page: 'Int!'}},
  },
  SitemapImage: {
    __typename: {__type: 'String!'},
    alt: {__type: 'String'},
    filepath: {__type: 'String'},
    updatedAt: {__type: 'DateTime!'},
  },
  SitemapResource: {
    __typename: {__type: 'String!'},
    handle: {__type: 'String!'},
    image: {__type: 'SitemapImage'},
    title: {__type: 'String'},
    updatedAt: {__type: 'DateTime!'},
  },
  SitemapResourceInterface: {
    __typename: {__type: 'String!'},
    handle: {__type: 'String!'},
    updatedAt: {__type: 'DateTime!'},
    $on: {__type: '$SitemapResourceInterface!'},
  },
  SitemapResourceMetaobject: {
    __typename: {__type: 'String!'},
    handle: {__type: 'String!'},
    onlineStoreUrlHandle: {__type: 'String'},
    type: {__type: 'String!'},
    updatedAt: {__type: 'DateTime!'},
  },
  StoreAvailability: {
    __typename: {__type: 'String!'},
    available: {__type: 'Boolean!'},
    location: {__type: 'Location!'},
    pickUpTime: {__type: 'String!'},
    quantityAvailable: {__type: 'Int!'},
  },
  StoreAvailabilityConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[StoreAvailabilityEdge!]!'},
    nodes: {__type: '[StoreAvailability!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  StoreAvailabilityEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'StoreAvailability!'},
  },
  StringConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[StringEdge!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  StringEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'String!'},
  },
  SubmissionError: {
    __typename: {__type: 'String!'},
    code: {__type: 'SubmissionErrorCode!'},
    message: {__type: 'String'},
  },
  SubmitAlreadyAccepted: {
    __typename: {__type: 'String!'},
    attemptId: {__type: 'String!'},
  },
  SubmitFailed: {
    __typename: {__type: 'String!'},
    checkoutUrl: {__type: 'URL'},
    errors: {__type: '[SubmissionError!]!'},
  },
  SubmitSuccess: {
    __typename: {__type: 'String!'},
    attemptId: {__type: 'String!'},
  },
  SubmitThrottled: {
    __typename: {__type: 'String!'},
    pollAfter: {__type: 'DateTime!'},
  },
  Swatch: {
    __typename: {__type: 'String!'},
    color: {__type: 'Color'},
    image: {__type: 'MediaImage'},
  },
  TaxonomyCategory: {
    __typename: {__type: 'String!'},
    ancestors: {__type: '[TaxonomyCategory!]!'},
    id: {__type: 'ID!'},
    name: {__type: 'String!'},
  },
  Trackable: {
    __typename: {__type: 'String!'},
    trackingParameters: {__type: 'String'},
    $on: {__type: '$Trackable!'},
  },
  UnitPriceMeasurement: {
    __typename: {__type: 'String!'},
    measuredType: {__type: 'UnitPriceMeasurementMeasuredType'},
    quantityUnit: {__type: 'UnitPriceMeasurementMeasuredUnit'},
    quantityValue: {__type: 'Float!'},
    referenceUnit: {__type: 'UnitPriceMeasurementMeasuredUnit'},
    referenceValue: {__type: 'Int!'},
  },
  UrlRedirect: {
    __typename: {__type: 'String!'},
    id: {__type: 'ID!'},
    path: {__type: 'String!'},
    target: {__type: 'String!'},
  },
  UrlRedirectConnection: {
    __typename: {__type: 'String!'},
    edges: {__type: '[UrlRedirectEdge!]!'},
    nodes: {__type: '[UrlRedirect!]!'},
    pageInfo: {__type: 'PageInfo!'},
  },
  UrlRedirectEdge: {
    __typename: {__type: 'String!'},
    cursor: {__type: 'String!'},
    node: {__type: 'UrlRedirect!'},
  },
  UserError: {
    __typename: {__type: 'String!'},
    field: {__type: '[String!]'},
    message: {__type: 'String!'},
  },
  UserErrorsShopPayPaymentRequestSessionUserErrors: {
    __typename: {__type: 'String!'},
    code: {__type: 'UserErrorsShopPayPaymentRequestSessionUserErrorsCode'},
    field: {__type: '[String!]'},
    message: {__type: 'String!'},
  },
  VariantOptionFilter: {name: {__type: 'String!'}, value: {__type: 'String!'}},
  Video: {
    __typename: {__type: 'String!'},
    alt: {__type: 'String'},
    id: {__type: 'ID!'},
    mediaContentType: {__type: 'MediaContentType!'},
    presentation: {__type: 'MediaPresentation'},
    previewImage: {__type: 'Image'},
    sources: {__type: '[VideoSource!]!'},
  },
  VideoSource: {
    __typename: {__type: 'String!'},
    format: {__type: 'String!'},
    height: {__type: 'Int!'},
    mimeType: {__type: 'String!'},
    url: {__type: 'String!'},
    width: {__type: 'Int!'},
  },
  mutation: {
    __typename: {__type: 'String!'},
    cartAttributesUpdate: {
      __type: 'CartAttributesUpdatePayload',
      __args: {attributes: '[AttributeInput!]!', cartId: 'ID!'},
    },
    cartBillingAddressUpdate: {
      __type: 'CartBillingAddressUpdatePayload',
      __args: {billingAddress: 'MailingAddressInput', cartId: 'ID!'},
    },
    cartBuyerIdentityUpdate: {
      __type: 'CartBuyerIdentityUpdatePayload',
      __args: {buyerIdentity: 'CartBuyerIdentityInput!', cartId: 'ID!'},
    },
    cartCreate: {__type: 'CartCreatePayload', __args: {input: 'CartInput'}},
    cartDiscountCodesUpdate: {
      __type: 'CartDiscountCodesUpdatePayload',
      __args: {cartId: 'ID!', discountCodes: '[String!]'},
    },
    cartGiftCardCodesUpdate: {
      __type: 'CartGiftCardCodesUpdatePayload',
      __args: {cartId: 'ID!', giftCardCodes: '[String!]!'},
    },
    cartLinesAdd: {
      __type: 'CartLinesAddPayload',
      __args: {cartId: 'ID!', lines: '[CartLineInput!]!'},
    },
    cartLinesRemove: {
      __type: 'CartLinesRemovePayload',
      __args: {cartId: 'ID!', lineIds: '[ID!]!'},
    },
    cartLinesUpdate: {
      __type: 'CartLinesUpdatePayload',
      __args: {cartId: 'ID!', lines: '[CartLineUpdateInput!]!'},
    },
    cartMetafieldDelete: {
      __type: 'CartMetafieldDeletePayload',
      __args: {input: 'CartMetafieldDeleteInput!'},
    },
    cartMetafieldsSet: {
      __type: 'CartMetafieldsSetPayload',
      __args: {metafields: '[CartMetafieldsSetInput!]!'},
    },
    cartNoteUpdate: {
      __type: 'CartNoteUpdatePayload',
      __args: {cartId: 'ID!', note: 'String!'},
    },
    cartPaymentUpdate: {
      __type: 'CartPaymentUpdatePayload',
      __args: {cartId: 'ID!', payment: 'CartPaymentInput!'},
    },
    cartSelectedDeliveryOptionsUpdate: {
      __type: 'CartSelectedDeliveryOptionsUpdatePayload',
      __args: {
        cartId: 'ID!',
        selectedDeliveryOptions: '[CartSelectedDeliveryOptionInput!]!',
      },
    },
    cartSubmitForCompletion: {
      __type: 'CartSubmitForCompletionPayload',
      __args: {attemptToken: 'String!', cartId: 'ID!'},
    },
    customerAccessTokenCreate: {
      __type: 'CustomerAccessTokenCreatePayload',
      __args: {input: 'CustomerAccessTokenCreateInput!'},
    },
    customerAccessTokenCreateWithMultipass: {
      __type: 'CustomerAccessTokenCreateWithMultipassPayload',
      __args: {multipassToken: 'String!'},
    },
    customerAccessTokenDelete: {
      __type: 'CustomerAccessTokenDeletePayload',
      __args: {customerAccessToken: 'String!'},
    },
    customerAccessTokenRenew: {
      __type: 'CustomerAccessTokenRenewPayload',
      __args: {customerAccessToken: 'String!'},
    },
    customerActivate: {
      __type: 'CustomerActivatePayload',
      __args: {id: 'ID!', input: 'CustomerActivateInput!'},
    },
    customerActivateByUrl: {
      __type: 'CustomerActivateByUrlPayload',
      __args: {activationUrl: 'URL!', password: 'String!'},
    },
    customerAddressCreate: {
      __type: 'CustomerAddressCreatePayload',
      __args: {address: 'MailingAddressInput!', customerAccessToken: 'String!'},
    },
    customerAddressDelete: {
      __type: 'CustomerAddressDeletePayload',
      __args: {customerAccessToken: 'String!', id: 'ID!'},
    },
    customerAddressUpdate: {
      __type: 'CustomerAddressUpdatePayload',
      __args: {
        address: 'MailingAddressInput!',
        customerAccessToken: 'String!',
        id: 'ID!',
      },
    },
    customerCreate: {
      __type: 'CustomerCreatePayload',
      __args: {input: 'CustomerCreateInput!'},
    },
    customerDefaultAddressUpdate: {
      __type: 'CustomerDefaultAddressUpdatePayload',
      __args: {addressId: 'ID!', customerAccessToken: 'String!'},
    },
    customerRecover: {
      __type: 'CustomerRecoverPayload',
      __args: {email: 'String!'},
    },
    customerReset: {
      __type: 'CustomerResetPayload',
      __args: {id: 'ID!', input: 'CustomerResetInput!'},
    },
    customerResetByUrl: {
      __type: 'CustomerResetByUrlPayload',
      __args: {password: 'String!', resetUrl: 'URL!'},
    },
    customerUpdate: {
      __type: 'CustomerUpdatePayload',
      __args: {
        customer: 'CustomerUpdateInput!',
        customerAccessToken: 'String!',
      },
    },
    shopPayPaymentRequestSessionCreate: {
      __type: 'ShopPayPaymentRequestSessionCreatePayload',
      __args: {
        paymentRequest: 'ShopPayPaymentRequestInput!',
        sourceIdentifier: 'String!',
      },
    },
    shopPayPaymentRequestSessionSubmit: {
      __type: 'ShopPayPaymentRequestSessionSubmitPayload',
      __args: {
        idempotencyKey: 'String!',
        orderName: 'String',
        paymentRequest: 'ShopPayPaymentRequestInput!',
        token: 'String!',
      },
    },
  },
  query: {
    __typename: {__type: 'String!'},
    article: {__type: 'Article', __args: {id: 'ID!'}},
    articles: {
      __type: 'ArticleConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        query: 'String',
        reverse: 'Boolean',
        sortKey: 'ArticleSortKeys',
      },
    },
    blog: {__type: 'Blog', __args: {handle: 'String', id: 'ID'}},
    blogByHandle: {__type: 'Blog', __args: {handle: 'String!'}},
    blogs: {
      __type: 'BlogConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        query: 'String',
        reverse: 'Boolean',
        sortKey: 'BlogSortKeys',
      },
    },
    cart: {__type: 'Cart', __args: {id: 'ID!'}},
    cartCompletionAttempt: {
      __type: 'CartCompletionAttemptResult',
      __args: {attemptId: 'String!'},
    },
    collection: {__type: 'Collection', __args: {handle: 'String', id: 'ID'}},
    collectionByHandle: {__type: 'Collection', __args: {handle: 'String!'}},
    collections: {
      __type: 'CollectionConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        query: 'String',
        reverse: 'Boolean',
        sortKey: 'CollectionSortKeys',
      },
    },
    customer: {__type: 'Customer', __args: {customerAccessToken: 'String!'}},
    localization: {__type: 'Localization!'},
    locations: {
      __type: 'LocationConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        near: 'GeoCoordinateInput',
        reverse: 'Boolean',
        sortKey: 'LocationSortKeys',
      },
    },
    menu: {__type: 'Menu', __args: {handle: 'String!'}},
    metaobject: {
      __type: 'Metaobject',
      __args: {handle: 'MetaobjectHandleInput', id: 'ID'},
    },
    metaobjects: {
      __type: 'MetaobjectConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        reverse: 'Boolean',
        sortKey: 'String',
        type: 'String!',
      },
    },
    node: {__type: 'Node', __args: {id: 'ID!'}},
    nodes: {__type: '[Node]!', __args: {ids: '[ID!]!'}},
    page: {__type: 'Page', __args: {handle: 'String', id: 'ID'}},
    pageByHandle: {__type: 'Page', __args: {handle: 'String!'}},
    pages: {
      __type: 'PageConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        query: 'String',
        reverse: 'Boolean',
        sortKey: 'PageSortKeys',
      },
    },
    paymentSettings: {__type: 'PaymentSettings!'},
    predictiveSearch: {
      __type: 'PredictiveSearchResult',
      __args: {
        limit: 'Int',
        limitScope: 'PredictiveSearchLimitScope',
        query: 'String!',
        searchableFields: '[SearchableField!]',
        types: '[PredictiveSearchType!]',
        unavailableProducts: 'SearchUnavailableProductsType',
      },
    },
    product: {__type: 'Product', __args: {handle: 'String', id: 'ID'}},
    productByHandle: {__type: 'Product', __args: {handle: 'String!'}},
    productRecommendations: {
      __type: '[Product!]',
      __args: {
        intent: 'ProductRecommendationIntent',
        productHandle: 'String',
        productId: 'ID',
      },
    },
    productTags: {__type: 'StringConnection!', __args: {first: 'Int!'}},
    productTypes: {__type: 'StringConnection!', __args: {first: 'Int!'}},
    products: {
      __type: 'ProductConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        query: 'String',
        reverse: 'Boolean',
        sortKey: 'ProductSortKeys',
      },
    },
    publicApiVersions: {__type: '[ApiVersion!]!'},
    search: {
      __type: 'SearchResultItemConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        prefix: 'SearchPrefixQueryType',
        productFilters: '[ProductFilter!]',
        query: 'String!',
        reverse: 'Boolean',
        sortKey: 'SearchSortKeys',
        types: '[SearchType!]',
        unavailableProducts: 'SearchUnavailableProductsType',
      },
    },
    shop: {__type: 'Shop!'},
    sitemap: {__type: 'Sitemap!', __args: {type: 'SitemapType!'}},
    urlRedirects: {
      __type: 'UrlRedirectConnection!',
      __args: {
        after: 'String',
        before: 'String',
        first: 'Int',
        last: 'Int',
        query: 'String',
        reverse: 'Boolean',
      },
    },
  },
  subscription: {},
  [SchemaUnionsKey]: {
    Node: [
      'AppliedGiftCard',
      'Article',
      'Blog',
      'Cart',
      'CartLine',
      'Collection',
      'Comment',
      'Company',
      'CompanyContact',
      'CompanyLocation',
      'ComponentizableCartLine',
      'ExternalVideo',
      'GenericFile',
      'Location',
      'MailingAddress',
      'Market',
      'MediaImage',
      'MediaPresentation',
      'Menu',
      'MenuItem',
      'Metafield',
      'Metaobject',
      'Model3d',
      'Order',
      'Page',
      'Product',
      'ProductOption',
      'ProductOptionValue',
      'ProductVariant',
      'Shop',
      'ShopPayInstallmentsFinancingPlan',
      'ShopPayInstallmentsFinancingPlanTerm',
      'ShopPayInstallmentsProductVariantPricing',
      'ShopPolicy',
      'TaxonomyCategory',
      'UrlRedirect',
      'Video',
    ],
    HasMetafields: [
      'Article',
      'Blog',
      'Cart',
      'Collection',
      'Company',
      'CompanyLocation',
      'Customer',
      'Location',
      'Market',
      'Order',
      'Page',
      'Product',
      'ProductVariant',
      'SellingPlan',
      'Shop',
    ],
    OnlineStorePublishable: [
      'Article',
      'Blog',
      'Collection',
      'Metaobject',
      'Page',
      'Product',
    ],
    Trackable: [
      'Article',
      'Collection',
      'Page',
      'Product',
      'SearchQuerySuggestion',
    ],
    DiscountApplication: [
      'AutomaticDiscountApplication',
      'DiscountCodeApplication',
      'ManualDiscountApplication',
      'ScriptDiscountApplication',
    ],
    CartDiscountAllocation: [
      'CartAutomaticDiscountAllocation',
      'CartCodeDiscountAllocation',
      'CartCustomDiscountAllocation',
    ],
    CartCompletionAction: ['CompletePaymentChallenge'],
    CartCompletionAttemptResult: [
      'CartCompletionActionRequired',
      'CartCompletionFailed',
      'CartCompletionProcessing',
      'CartCompletionSuccess',
    ],
    BaseCartLine: ['CartLine', 'ComponentizableCartLine'],
    CartSubmitForCompletionResult: [
      'SubmitAlreadyAccepted',
      'SubmitFailed',
      'SubmitSuccess',
      'SubmitThrottled',
    ],
    DisplayableError: [
      'CartUserError',
      'CustomerUserError',
      'MetafieldDeleteUserError',
      'MetafieldsSetUserError',
      'UserError',
      'UserErrorsShopPayPaymentRequestSessionUserErrors',
    ],
    DeliveryAddress: ['MailingAddress'],
    Media: ['ExternalVideo', 'MediaImage', 'Model3d', 'Video'],
    MenuItemResource: [
      'Article',
      'Blog',
      'Collection',
      'Metaobject',
      'Page',
      'Product',
      'ShopPolicy',
    ],
    Merchandise: ['ProductVariant'],
    MetafieldParentResource: [
      'Article',
      'Blog',
      'Cart',
      'Collection',
      'Company',
      'CompanyLocation',
      'Customer',
      'Location',
      'Market',
      'Order',
      'Page',
      'Product',
      'ProductVariant',
      'SellingPlan',
      'Shop',
    ],
    MetafieldReference: [
      'Collection',
      'GenericFile',
      'MediaImage',
      'Metaobject',
      'Model3d',
      'Page',
      'Product',
      'ProductVariant',
      'Video',
    ],
    PricingValue: ['MoneyV2', 'PricingPercentageValue'],
    SearchResultItem: ['Article', 'Page', 'Product'],
    SellingPlanBillingPolicy: ['SellingPlanRecurringBillingPolicy'],
    SellingPlanCheckoutChargeValue: [
      'MoneyV2',
      'SellingPlanCheckoutChargePercentageValue',
    ],
    SellingPlanDeliveryPolicy: ['SellingPlanRecurringDeliveryPolicy'],
    SellingPlanPriceAdjustmentValue: [
      'SellingPlanFixedAmountPriceAdjustment',
      'SellingPlanFixedPriceAdjustment',
      'SellingPlanPercentagePriceAdjustment',
    ],
    SitemapResourceInterface: ['SitemapResource', 'SitemapResourceMetaobject'],
  },
} as const;

/**
 * A version of the API, as defined by [Shopify API versioning](https://shopify.dev/api/usage/versioning).
 * Versions are commonly referred to by their handle (for example, `2021-10`).
 */
export interface ApiVersion {
  __typename?: 'ApiVersion';
  /**
   * The human-readable name of the version.
   */
  displayName: ScalarsEnums['String'];
  /**
   * The unique identifier of an ApiVersion. All supported API versions have a date-based (YYYY-MM) or `unstable` handle.
   */
  handle: ScalarsEnums['String'];
  /**
   * Whether the version is actively supported by Shopify. Supported API versions are guaranteed to be stable. Unsupported API versions include unstable, release candidate, and end-of-life versions that are marked as unsupported. For more information, refer to [Versioning](https://shopify.dev/api/usage/versioning).
   */
  supported: ScalarsEnums['Boolean'];
}

/**
 * Details about the gift card used on the checkout.
 */
export interface AppliedGiftCard {
  __typename?: 'AppliedGiftCard';
  /**
   * The amount that was taken from the gift card by applying it.
   */
  amountUsed: MoneyV2;
  /**
   * The amount that was taken from the gift card by applying it.
   * @deprecated Use `amountUsed` instead.
   */
  amountUsedV2: MoneyV2;
  /**
   * The amount left on the gift card.
   */
  balance: MoneyV2;
  /**
   * The amount left on the gift card.
   * @deprecated Use `balance` instead.
   */
  balanceV2: MoneyV2;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The last characters of the gift card.
   */
  lastCharacters: ScalarsEnums['String'];
  /**
   * The amount that was applied to the checkout in its currency.
   */
  presentmentAmountUsed: MoneyV2;
}

/**
 * An article in an online store blog.
 */
export interface Article {
  __typename?: 'Article';
  /**
   * The article's author.
   * @deprecated Use `authorV2` instead.
   */
  author: ArticleAuthor;
  /**
   * The article's author.
   */
  authorV2?: Maybe<ArticleAuthor>;
  /**
   * The blog that the article belongs to.
   */
  blog: Blog;
  /**
   * List of comments posted on the article.
   */
  comments: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => CommentConnection;
  /**
   * Stripped content of the article, single line with HTML tags removed.
   */
  content: (args?: {
    /**
     * Truncates a string after the given length.
     */
    truncateAt?: Maybe<ScalarsEnums['Int']>;
  }) => ScalarsEnums['String'];
  /**
   * The content of the article, complete with HTML formatting.
   */
  contentHtml: ScalarsEnums['HTML'];
  /**
   * Stripped excerpt of the article, single line with HTML tags removed.
   */
  excerpt: (args?: {
    /**
     * Truncates a string after the given length.
     */
    truncateAt?: Maybe<ScalarsEnums['Int']>;
  }) => Maybe<ScalarsEnums['String']>;
  /**
   * The excerpt of the article, complete with HTML formatting.
   */
  excerptHtml?: Maybe<ScalarsEnums['HTML']>;
  /**
   * A human-friendly unique string for the Article automatically generated from its title.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The image associated with the article.
   */
  image?: Maybe<Image>;
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel.
   */
  onlineStoreUrl?: Maybe<ScalarsEnums['URL']>;
  /**
   * The date and time when the article was published.
   */
  publishedAt: ScalarsEnums['DateTime'];
  /**
   * The article’s SEO information.
   */
  seo?: Maybe<SEO>;
  /**
   * A categorization that a article can be tagged with.
   */
  tags: Array<ScalarsEnums['String']>;
  /**
   * The article’s name.
   */
  title: ScalarsEnums['String'];
  /**
   * URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null.
   */
  trackingParameters?: Maybe<ScalarsEnums['String']>;
}

/**
 * The author of an article.
 */
export interface ArticleAuthor {
  __typename?: 'ArticleAuthor';
  /**
   * The author's bio.
   */
  bio?: Maybe<ScalarsEnums['String']>;
  /**
   * The author’s email.
   */
  email: ScalarsEnums['String'];
  /**
   * The author's first name.
   */
  firstName: ScalarsEnums['String'];
  /**
   * The author's last name.
   */
  lastName: ScalarsEnums['String'];
  /**
   * The author's full name.
   */
  name: ScalarsEnums['String'];
}

/**
 * An auto-generated type for paginating through multiple Articles.
 */
export interface ArticleConnection {
  __typename?: 'ArticleConnection';
  /**
   * A list of edges.
   */
  edges: Array<ArticleEdge>;
  /**
   * A list of the nodes contained in ArticleEdge.
   */
  nodes: Array<Article>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Article and a cursor during pagination.
 */
export interface ArticleEdge {
  __typename?: 'ArticleEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of ArticleEdge.
   */
  node: Article;
}

/**
 * Represents a generic custom attribute, such as whether an order is a customer's first.
 */
export interface Attribute {
  __typename?: 'Attribute';
  /**
   * The key or name of the attribute. For example, `"customersFirstOrder"`.
   */
  key: ScalarsEnums['String'];
  /**
   * The value of the attribute. For example, `"true"`.
   */
  value?: Maybe<ScalarsEnums['String']>;
}

/**
 * Automatic discount applications capture the intentions of a discount that was automatically applied.
 */
export interface AutomaticDiscountApplication {
  __typename?: 'AutomaticDiscountApplication';
  /**
   * The method by which the discount's value is allocated to its entitled items.
   */
  allocationMethod: ScalarsEnums['DiscountApplicationAllocationMethod'];
  /**
   * Which lines of targetType that the discount is allocated over.
   */
  targetSelection: ScalarsEnums['DiscountApplicationTargetSelection'];
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
  /**
   * The title of the application.
   */
  title: ScalarsEnums['String'];
  /**
   * The value of the discount application.
   */
  value: PricingValue;
}

/**
 * Represents a cart line common fields.
 */
export interface BaseCartLine {
  __typename?: 'CartLine' | 'ComponentizableCartLine';
  /**
   * An attribute associated with the cart line.
   */
  attribute: (args: {
    /**
     * The key of the attribute.
     */
    key: ScalarsEnums['String'];
  }) => Maybe<Attribute>;
  /**
   * The attributes associated with the cart line. Attributes are represented as key-value pairs.
   */
  attributes: Array<Attribute>;
  /**
   * The cost of the merchandise that the buyer will pay for at checkout. The costs are subject to change and changes will be reflected at checkout.
   */
  cost: CartLineCost;
  /**
   * The discounts that have been applied to the cart line.
   */
  discountAllocations: Array<CartDiscountAllocation>;
  /**
   * The estimated cost of the merchandise that the buyer will pay for at checkout. The estimated costs are subject to change and changes will be reflected at checkout.
   * @deprecated Use `cost` instead.
   */
  estimatedCost: CartLineEstimatedCost;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The merchandise that the buyer intends to purchase.
   */
  merchandise: Merchandise;
  /**
   * The quantity of the merchandise that the customer intends to purchase.
   */
  quantity: ScalarsEnums['Int'];
  /**
   * The selling plan associated with the cart line and the effect that each selling plan has on variants when they're purchased.
   */
  sellingPlanAllocation?: Maybe<SellingPlanAllocation>;
  $on: $BaseCartLine;
}

/**
 * An auto-generated type for paginating through multiple BaseCartLines.
 */
export interface BaseCartLineConnection {
  __typename?: 'BaseCartLineConnection';
  /**
   * A list of edges.
   */
  edges: Array<BaseCartLineEdge>;
  /**
   * A list of the nodes contained in BaseCartLineEdge.
   */
  nodes: Array<BaseCartLine>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one BaseCartLine and a cursor during pagination.
 */
export interface BaseCartLineEdge {
  __typename?: 'BaseCartLineEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of BaseCartLineEdge.
   */
  node: BaseCartLine;
}

/**
 * An online store blog.
 */
export interface Blog {
  __typename?: 'Blog';
  /**
   * Find an article by its handle.
   */
  articleByHandle: (args: {
    /**
     * The handle of the article.
     */
    handle: ScalarsEnums['String'];
  }) => Maybe<Article>;
  /**
   * List of the blog's articles.
   */
  articles: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Apply one or multiple filters to the query.
     * | name | description | acceptable_values | default_value | example_use |
     * | ---- | ---- | ---- | ---- | ---- |
     * | author |
     * | blog_title |
     * | created_at |
     * | tag |
     * | tag_not |
     * | updated_at |
     * Refer to the detailed [search syntax](https://shopify.dev/api/usage/search-syntax) for more information about using filters.
     */
    query?: Maybe<ScalarsEnums['String']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Sort the underlying list by the given key.
     * @defaultValue `"ID"`
     */
    sortKey?: Maybe<ArticleSortKeys>;
  }) => ArticleConnection;
  /**
   * The authors who have contributed to the blog.
   */
  authors: Array<ArticleAuthor>;
  /**
   * A human-friendly unique string for the Blog automatically generated from its title.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel.
   */
  onlineStoreUrl?: Maybe<ScalarsEnums['URL']>;
  /**
   * The blog's SEO information.
   */
  seo?: Maybe<SEO>;
  /**
   * The blogs’s title.
   */
  title: ScalarsEnums['String'];
}

/**
 * An auto-generated type for paginating through multiple Blogs.
 */
export interface BlogConnection {
  __typename?: 'BlogConnection';
  /**
   * A list of edges.
   */
  edges: Array<BlogEdge>;
  /**
   * A list of the nodes contained in BlogEdge.
   */
  nodes: Array<Blog>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Blog and a cursor during pagination.
 */
export interface BlogEdge {
  __typename?: 'BlogEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of BlogEdge.
   */
  node: Blog;
}

/**
 * The store's [branding configuration](https://help.shopify.com/en/manual/promoting-marketing/managing-brand-assets).
 */
export interface Brand {
  __typename?: 'Brand';
  /**
   * The colors of the store's brand.
   */
  colors: BrandColors;
  /**
   * The store's cover image.
   */
  coverImage?: Maybe<MediaImage>;
  /**
   * The store's default logo.
   */
  logo?: Maybe<MediaImage>;
  /**
   * The store's short description.
   */
  shortDescription?: Maybe<ScalarsEnums['String']>;
  /**
   * The store's slogan.
   */
  slogan?: Maybe<ScalarsEnums['String']>;
  /**
   * The store's preferred logo for square UI elements.
   */
  squareLogo?: Maybe<MediaImage>;
}

/**
 * A group of related colors for the shop's brand.
 */
export interface BrandColorGroup {
  __typename?: 'BrandColorGroup';
  /**
   * The background color.
   */
  background?: Maybe<ScalarsEnums['Color']>;
  /**
   * The foreground color.
   */
  foreground?: Maybe<ScalarsEnums['Color']>;
}

/**
 * The colors of the shop's brand.
 */
export interface BrandColors {
  __typename?: 'BrandColors';
  /**
   * The shop's primary brand colors.
   */
  primary: Array<BrandColorGroup>;
  /**
   * The shop's secondary brand colors.
   */
  secondary: Array<BrandColorGroup>;
}

/**
 * A cart represents the merchandise that a buyer intends to purchase,
 * and the estimated cost associated with the cart. Learn how to
 * [interact with a cart](https://shopify.dev/custom-storefronts/internationalization/international-pricing)
 * during a customer's session.
 */
export interface Cart {
  __typename?: 'Cart';
  /**
   * The gift cards that have been applied to the cart.
   */
  appliedGiftCards: Array<AppliedGiftCard>;
  /**
   * An attribute associated with the cart.
   */
  attribute: (args: {
    /**
     * The key of the attribute.
     */
    key: ScalarsEnums['String'];
  }) => Maybe<Attribute>;
  /**
   * The attributes associated with the cart. Attributes are represented as key-value pairs.
   */
  attributes: Array<Attribute>;
  /**
   * Information about the buyer that's interacting with the cart.
   */
  buyerIdentity: CartBuyerIdentity;
  /**
   * The URL of the checkout for the cart.
   */
  checkoutUrl: ScalarsEnums['URL'];
  /**
   * The estimated costs that the buyer will pay at checkout. The costs are subject to change and changes will be reflected at checkout. The `cost` field uses the `buyerIdentity` field to determine [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing).
   */
  cost: CartCost;
  /**
   * The date and time when the cart was created.
   */
  createdAt: ScalarsEnums['DateTime'];
  /**
   * The delivery groups available for the cart, based on the buyer identity default
   * delivery address preference or the default address of the logged-in customer.
   */
  deliveryGroups: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Whether to include [carrier-calculated delivery rates](https://help.shopify.com/en/manual/shipping/setting-up-and-managing-your-shipping/enabling-shipping-carriers) in the response.
     *
     * By default, only static shipping rates are returned. This argument requires mandatory usage of the [`@defer` directive](https://shopify.dev/docs/api/storefront#directives).
     *
     * For more information, refer to [fetching carrier-calculated rates for the cart using `@defer`](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/defer#fetching-carrier-calculated-rates-for-the-cart-using-defer).
     * @defaultValue `false`
     */
    withCarrierRates?: Maybe<ScalarsEnums['Boolean']>;
  }) => CartDeliveryGroupConnection;
  /**
   * The discounts that have been applied to the entire cart.
   */
  discountAllocations: Array<CartDiscountAllocation>;
  /**
   * The case-insensitive discount codes that the customer added at checkout.
   */
  discountCodes: Array<CartDiscountCode>;
  /**
   * The estimated costs that the buyer will pay at checkout. The estimated costs are subject to change and changes will be reflected at checkout. The `estimatedCost` field uses the `buyerIdentity` field to determine [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing).
   * @deprecated Use `cost` instead.
   */
  estimatedCost: CartEstimatedCost;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * A list of lines containing information about the items the customer intends to purchase.
   */
  lines: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => BaseCartLineConnection;
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * A note that's associated with the cart. For example, the note can be a personalized message to the buyer.
   */
  note?: Maybe<ScalarsEnums['String']>;
  /**
   * The total number of items in the cart.
   */
  totalQuantity: ScalarsEnums['Int'];
  /**
   * The date and time when the cart was updated.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * Return type for `cartAttributesUpdate` mutation.
 */
export interface CartAttributesUpdatePayload {
  __typename?: 'CartAttributesUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * The discounts automatically applied to the cart line based on prerequisites that have been met.
 */
export interface CartAutomaticDiscountAllocation {
  __typename?: 'CartAutomaticDiscountAllocation';
  /**
   * The discounted amount that has been applied to the cart line.
   */
  discountedAmount: MoneyV2;
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
  /**
   * The title of the allocated discount.
   */
  title: ScalarsEnums['String'];
}

/**
 * Return type for `cartBillingAddressUpdate` mutation.
 */
export interface CartBillingAddressUpdatePayload {
  __typename?: 'CartBillingAddressUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * Represents information about the buyer that is interacting with the cart.
 */
export interface CartBuyerIdentity {
  __typename?: 'CartBuyerIdentity';
  /**
   * The country where the buyer is located.
   */
  countryCode?: Maybe<ScalarsEnums['CountryCode']>;
  /**
   * The customer account associated with the cart.
   */
  customer?: Maybe<Customer>;
  /**
   * An ordered set of delivery addresses tied to the buyer that is interacting with the cart.
   * The rank of the preferences is determined by the order of the addresses in the array. Preferences
   * can be used to populate relevant fields in the checkout flow.
   *
   * As of the `2025-01` release, `buyerIdentity.deliveryAddressPreferences` is deprecated.
   * Delivery addresses are now part of the `CartDelivery` object and managed with three new mutations:
   * - `cartDeliveryAddressAdd`
   * - `cartDeliveryAddressUpdate`
   * - `cartDeliveryAddressDelete`
   * @deprecated Use `cart.delivery` instead.
   */
  deliveryAddressPreferences: Array<DeliveryAddress>;
  /**
   * The email address of the buyer that's interacting with the cart.
   */
  email?: Maybe<ScalarsEnums['String']>;
  /**
   * The phone number of the buyer that's interacting with the cart.
   */
  phone?: Maybe<ScalarsEnums['String']>;
  /**
   * A set of preferences tied to the buyer interacting with the cart. Preferences are used to prefill fields in at checkout to streamline information collection.
   * Preferences are not synced back to the cart if they are overwritten.
   */
  preferences?: Maybe<CartPreferences>;
  /**
   * The purchasing company associated with the cart.
   */
  purchasingCompany?: Maybe<PurchasingCompany>;
}

/**
 * Return type for `cartBuyerIdentityUpdate` mutation.
 */
export interface CartBuyerIdentityUpdatePayload {
  __typename?: 'CartBuyerIdentityUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * The discount that has been applied to the cart line using a discount code.
 */
export interface CartCodeDiscountAllocation {
  __typename?: 'CartCodeDiscountAllocation';
  /**
   * The code used to apply the discount.
   */
  code: ScalarsEnums['String'];
  /**
   * The discounted amount that has been applied to the cart line.
   */
  discountedAmount: MoneyV2;
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
}

/**
 * The completion action to checkout a cart.
 */
export interface CartCompletionAction {
  __typename?: 'CompletePaymentChallenge';
  $on: $CartCompletionAction;
}

/**
 * The required completion action to checkout a cart.
 */
export interface CartCompletionActionRequired {
  __typename?: 'CartCompletionActionRequired';
  /**
   * The action required to complete the cart completion attempt.
   */
  action?: Maybe<CartCompletionAction>;
  /**
   * The ID of the cart completion attempt.
   */
  id: ScalarsEnums['String'];
}

/**
 * The result of a cart completion attempt.
 */
export interface CartCompletionAttemptResult {
  __typename?:
    | 'CartCompletionActionRequired'
    | 'CartCompletionFailed'
    | 'CartCompletionProcessing'
    | 'CartCompletionSuccess';
  $on: $CartCompletionAttemptResult;
}

/**
 * A failed completion to checkout a cart.
 */
export interface CartCompletionFailed {
  __typename?: 'CartCompletionFailed';
  /**
   * The errors that caused the checkout to fail.
   */
  errors: Array<CompletionError>;
  /**
   * The ID of the cart completion attempt.
   */
  id: ScalarsEnums['String'];
}

/**
 * A cart checkout completion that's still processing.
 */
export interface CartCompletionProcessing {
  __typename?: 'CartCompletionProcessing';
  /**
   * The ID of the cart completion attempt.
   */
  id: ScalarsEnums['String'];
  /**
   * The number of milliseconds to wait before polling again.
   */
  pollDelay: ScalarsEnums['Int'];
}

/**
 * A successful completion to checkout a cart and a created order.
 */
export interface CartCompletionSuccess {
  __typename?: 'CartCompletionSuccess';
  /**
   * The date and time when the job completed.
   */
  completedAt?: Maybe<ScalarsEnums['DateTime']>;
  /**
   * The ID of the cart completion attempt.
   */
  id: ScalarsEnums['String'];
  /**
   * The ID of the order that's created in Shopify.
   */
  orderId: ScalarsEnums['ID'];
  /**
   * The URL of the order confirmation in Shopify.
   */
  orderUrl: ScalarsEnums['URL'];
}

/**
 * The costs that the buyer will pay at checkout.
 * The cart cost uses [`CartBuyerIdentity`](https://shopify.dev/api/storefront/reference/cart/cartbuyeridentity) to determine
 * [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing).
 */
export interface CartCost {
  __typename?: 'CartCost';
  /**
   * The estimated amount, before taxes and discounts, for the customer to pay at checkout. The checkout charge amount doesn't include any deferred payments that'll be paid at a later date. If the cart has no deferred payments, then the checkout charge amount is equivalent to `subtotalAmount`.
   */
  checkoutChargeAmount: MoneyV2;
  /**
   * The amount, before taxes and cart-level discounts, for the customer to pay.
   */
  subtotalAmount: MoneyV2;
  /**
   * Whether the subtotal amount is estimated.
   */
  subtotalAmountEstimated: ScalarsEnums['Boolean'];
  /**
   * The total amount for the customer to pay.
   */
  totalAmount: MoneyV2;
  /**
   * Whether the total amount is estimated.
   */
  totalAmountEstimated: ScalarsEnums['Boolean'];
  /**
   * The duty amount for the customer to pay at checkout.
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.. Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api). for more information.
   */
  totalDutyAmount?: Maybe<MoneyV2>;
  /**
   * Whether the total duty amount is estimated.
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.. Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api). for more information.
   */
  totalDutyAmountEstimated: ScalarsEnums['Boolean'];
  /**
   * The tax amount for the customer to pay at checkout.
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.. Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api). for more information.
   */
  totalTaxAmount?: Maybe<MoneyV2>;
  /**
   * Whether the total tax amount is estimated.
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.. Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api). for more information.
   */
  totalTaxAmountEstimated: ScalarsEnums['Boolean'];
}

/**
 * Return type for `cartCreate` mutation.
 */
export interface CartCreatePayload {
  __typename?: 'CartCreatePayload';
  /**
   * The new cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * The discounts automatically applied to the cart line based on prerequisites that have been met.
 */
export interface CartCustomDiscountAllocation {
  __typename?: 'CartCustomDiscountAllocation';
  /**
   * The discounted amount that has been applied to the cart line.
   */
  discountedAmount: MoneyV2;
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
  /**
   * The title of the allocated discount.
   */
  title: ScalarsEnums['String'];
}

/**
 * Preferred location used to find the closest pick up point based on coordinates.
 */
export interface CartDeliveryCoordinatesPreference {
  __typename?: 'CartDeliveryCoordinatesPreference';
  /**
   * The two-letter code for the country of the preferred location.
   *
   * For example, US.
   */
  countryCode: ScalarsEnums['CountryCode'];
  /**
   * The geographic latitude for a given location. Coordinates are required in order to set pickUpHandle for pickup points.
   */
  latitude: ScalarsEnums['Float'];
  /**
   * The geographic longitude for a given location. Coordinates are required in order to set pickUpHandle for pickup points.
   */
  longitude: ScalarsEnums['Float'];
}

/**
 * Information about the options available for one or more line items to be delivered to a specific address.
 */
export interface CartDeliveryGroup {
  __typename?: 'CartDeliveryGroup';
  /**
   * A list of cart lines for the delivery group.
   */
  cartLines: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => BaseCartLineConnection;
  /**
   * The destination address for the delivery group.
   */
  deliveryAddress: MailingAddress;
  /**
   * The delivery options available for the delivery group.
   */
  deliveryOptions: Array<CartDeliveryOption>;
  /**
   * The type of merchandise in the delivery group.
   */
  groupType: ScalarsEnums['CartDeliveryGroupType'];
  /**
   * The ID for the delivery group.
   */
  id: ScalarsEnums['ID'];
  /**
   * The selected delivery option for the delivery group.
   */
  selectedDeliveryOption?: Maybe<CartDeliveryOption>;
}

/**
 * An auto-generated type for paginating through multiple CartDeliveryGroups.
 */
export interface CartDeliveryGroupConnection {
  __typename?: 'CartDeliveryGroupConnection';
  /**
   * A list of edges.
   */
  edges: Array<CartDeliveryGroupEdge>;
  /**
   * A list of the nodes contained in CartDeliveryGroupEdge.
   */
  nodes: Array<CartDeliveryGroup>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one CartDeliveryGroup and a cursor during pagination.
 */
export interface CartDeliveryGroupEdge {
  __typename?: 'CartDeliveryGroupEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of CartDeliveryGroupEdge.
   */
  node: CartDeliveryGroup;
}

/**
 * Information about a delivery option.
 */
export interface CartDeliveryOption {
  __typename?: 'CartDeliveryOption';
  /**
   * The code of the delivery option.
   */
  code?: Maybe<ScalarsEnums['String']>;
  /**
   * The method for the delivery option.
   */
  deliveryMethodType: ScalarsEnums['DeliveryMethodType'];
  /**
   * The description of the delivery option.
   */
  description?: Maybe<ScalarsEnums['String']>;
  /**
   * The estimated cost for the delivery option.
   */
  estimatedCost: MoneyV2;
  /**
   * The unique identifier of the delivery option.
   */
  handle: ScalarsEnums['String'];
  /**
   * The title of the delivery option.
   */
  title?: Maybe<ScalarsEnums['String']>;
}

/**
 * A set of preferences tied to the buyer interacting with the cart. Preferences are used to prefill fields in at checkout to streamline information collection.
 * Preferences are not synced back to the cart if they are overwritten.
 */
export interface CartDeliveryPreference {
  __typename?: 'CartDeliveryPreference';
  /**
   * Preferred location used to find the closest pick up point based on coordinates.
   */
  coordinates?: Maybe<CartDeliveryCoordinatesPreference>;
  /**
   * The preferred delivery methods such as shipping, local pickup or through pickup points.
   */
  deliveryMethod: Array<ScalarsEnums['PreferenceDeliveryMethodType']>;
  /**
   * The pickup handle prefills checkout fields with the location for either local pickup or pickup points delivery methods.
   * It accepts both location ID for local pickup and external IDs for pickup points.
   */
  pickupHandle: Array<ScalarsEnums['String']>;
}

/**
 * The discounts that have been applied to the cart line.
 */
export interface CartDiscountAllocation {
  __typename?:
    | 'CartAutomaticDiscountAllocation'
    | 'CartCodeDiscountAllocation'
    | 'CartCustomDiscountAllocation';
  /**
   * The discounted amount that has been applied to the cart line.
   */
  discountedAmount: MoneyV2;
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
  $on: $CartDiscountAllocation;
}

/**
 * The discount codes applied to the cart.
 */
export interface CartDiscountCode {
  __typename?: 'CartDiscountCode';
  /**
   * Whether the discount code is applicable to the cart's current contents.
   */
  applicable: ScalarsEnums['Boolean'];
  /**
   * The code for the discount.
   */
  code: ScalarsEnums['String'];
}

/**
 * Return type for `cartDiscountCodesUpdate` mutation.
 */
export interface CartDiscountCodesUpdatePayload {
  __typename?: 'CartDiscountCodesUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * The estimated costs that the buyer will pay at checkout. The estimated cost uses [`CartBuyerIdentity`](https://shopify.dev/api/storefront/reference/cart/cartbuyeridentity) to determine [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing).
 */
export interface CartEstimatedCost {
  __typename?: 'CartEstimatedCost';
  /**
   * The estimated amount, before taxes and discounts, for the customer to pay at checkout. The checkout charge amount doesn't include any deferred payments that'll be paid at a later date. If the cart has no deferred payments, then the checkout charge amount is equivalent to`subtotal_amount`.
   */
  checkoutChargeAmount: MoneyV2;
  /**
   * The estimated amount, before taxes and discounts, for the customer to pay.
   */
  subtotalAmount: MoneyV2;
  /**
   * The estimated total amount for the customer to pay.
   */
  totalAmount: MoneyV2;
  /**
   * The estimated duty amount for the customer to pay at checkout.
   */
  totalDutyAmount?: Maybe<MoneyV2>;
  /**
   * The estimated tax amount for the customer to pay at checkout.
   */
  totalTaxAmount?: Maybe<MoneyV2>;
}

/**
 * Return type for `cartGiftCardCodesUpdate` mutation.
 */
export interface CartGiftCardCodesUpdatePayload {
  __typename?: 'CartGiftCardCodesUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * Represents information about the merchandise in the cart.
 */
export interface CartLine {
  __typename?: 'CartLine';
  /**
   * An attribute associated with the cart line.
   */
  attribute: (args: {
    /**
     * The key of the attribute.
     */
    key: ScalarsEnums['String'];
  }) => Maybe<Attribute>;
  /**
   * The attributes associated with the cart line. Attributes are represented as key-value pairs.
   */
  attributes: Array<Attribute>;
  /**
   * The cost of the merchandise that the buyer will pay for at checkout. The costs are subject to change and changes will be reflected at checkout.
   */
  cost: CartLineCost;
  /**
   * The discounts that have been applied to the cart line.
   */
  discountAllocations: Array<CartDiscountAllocation>;
  /**
   * The estimated cost of the merchandise that the buyer will pay for at checkout. The estimated costs are subject to change and changes will be reflected at checkout.
   * @deprecated Use `cost` instead.
   */
  estimatedCost: CartLineEstimatedCost;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The merchandise that the buyer intends to purchase.
   */
  merchandise: Merchandise;
  /**
   * The quantity of the merchandise that the customer intends to purchase.
   */
  quantity: ScalarsEnums['Int'];
  /**
   * The selling plan associated with the cart line and the effect that each selling plan has on variants when they're purchased.
   */
  sellingPlanAllocation?: Maybe<SellingPlanAllocation>;
}

/**
 * The cost of the merchandise line that the buyer will pay at checkout.
 */
export interface CartLineCost {
  __typename?: 'CartLineCost';
  /**
   * The amount of the merchandise line.
   */
  amountPerQuantity: MoneyV2;
  /**
   * The compare at amount of the merchandise line.
   */
  compareAtAmountPerQuantity?: Maybe<MoneyV2>;
  /**
   * The cost of the merchandise line before line-level discounts.
   */
  subtotalAmount: MoneyV2;
  /**
   * The total cost of the merchandise line.
   */
  totalAmount: MoneyV2;
}

/**
 * The estimated cost of the merchandise line that the buyer will pay at checkout.
 */
export interface CartLineEstimatedCost {
  __typename?: 'CartLineEstimatedCost';
  /**
   * The amount of the merchandise line.
   */
  amount: MoneyV2;
  /**
   * The compare at amount of the merchandise line.
   */
  compareAtAmount?: Maybe<MoneyV2>;
  /**
   * The estimated cost of the merchandise line before discounts.
   */
  subtotalAmount: MoneyV2;
  /**
   * The estimated total cost of the merchandise line.
   */
  totalAmount: MoneyV2;
}

/**
 * Return type for `cartLinesAdd` mutation.
 */
export interface CartLinesAddPayload {
  __typename?: 'CartLinesAddPayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * Return type for `cartLinesRemove` mutation.
 */
export interface CartLinesRemovePayload {
  __typename?: 'CartLinesRemovePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * Return type for `cartLinesUpdate` mutation.
 */
export interface CartLinesUpdatePayload {
  __typename?: 'CartLinesUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * Return type for `cartMetafieldDelete` mutation.
 */
export interface CartMetafieldDeletePayload {
  __typename?: 'CartMetafieldDeletePayload';
  /**
   * The ID of the deleted cart metafield.
   */
  deletedId?: Maybe<ScalarsEnums['ID']>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<MetafieldDeleteUserError>;
}

/**
 * Return type for `cartMetafieldsSet` mutation.
 */
export interface CartMetafieldsSetPayload {
  __typename?: 'CartMetafieldsSetPayload';
  /**
   * The list of cart metafields that were set.
   */
  metafields?: Maybe<Array<Metafield>>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<MetafieldsSetUserError>;
}

/**
 * Return type for `cartNoteUpdate` mutation.
 */
export interface CartNoteUpdatePayload {
  __typename?: 'CartNoteUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * Return type for `cartPaymentUpdate` mutation.
 */
export interface CartPaymentUpdatePayload {
  __typename?: 'CartPaymentUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * A set of preferences tied to the buyer interacting with the cart. Preferences are used to prefill fields in at checkout to streamline information collection.
 * Preferences are not synced back to the cart if they are overwritten.
 */
export interface CartPreferences {
  __typename?: 'CartPreferences';
  /**
   * Delivery preferences can be used to prefill the delivery section in at checkout.
   */
  delivery?: Maybe<CartDeliveryPreference>;
  /**
   * Wallet preferences are used to populate relevant payment fields in the checkout flow.
   * Accepted value: `["shop_pay"]`.
   */
  wallet?: Maybe<Array<ScalarsEnums['String']>>;
}

/**
 * Return type for `cartSelectedDeliveryOptionsUpdate` mutation.
 */
export interface CartSelectedDeliveryOptionsUpdatePayload {
  __typename?: 'CartSelectedDeliveryOptionsUpdatePayload';
  /**
   * The updated cart.
   */
  cart?: Maybe<Cart>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
  /**
   * A list of warnings that occurred during the mutation.
   */
  warnings: Array<CartWarning>;
}

/**
 * Return type for `cartSubmitForCompletion` mutation.
 */
export interface CartSubmitForCompletionPayload {
  __typename?: 'CartSubmitForCompletionPayload';
  /**
   * The result of cart submission for completion.
   */
  result?: Maybe<CartSubmitForCompletionResult>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<CartUserError>;
}

/**
 * The result of cart submit completion.
 */
export interface CartSubmitForCompletionResult {
  __typename?:
    | 'SubmitAlreadyAccepted'
    | 'SubmitFailed'
    | 'SubmitSuccess'
    | 'SubmitThrottled';
  $on: $CartSubmitForCompletionResult;
}

/**
 * Represents an error that happens during execution of a cart mutation.
 */
export interface CartUserError {
  __typename?: 'CartUserError';
  /**
   * The error code.
   */
  code?: Maybe<ScalarsEnums['CartErrorCode']>;
  /**
   * The path to the input field that caused the error.
   */
  field?: Maybe<Array<ScalarsEnums['String']>>;
  /**
   * The error message.
   */
  message: ScalarsEnums['String'];
}

/**
 * A warning that occurred during a cart mutation.
 */
export interface CartWarning {
  __typename?: 'CartWarning';
  /**
   * The code of the warning.
   */
  code: ScalarsEnums['CartWarningCode'];
  /**
   * The message text of the warning.
   */
  message: ScalarsEnums['String'];
  /**
   * The target of the warning.
   */
  target: ScalarsEnums['ID'];
}

/**
 * A collection represents a grouping of products that a shop owner can create to
 * organize them or make their shops easier to browse.
 */
export interface Collection {
  __typename?: 'Collection';
  /**
   * Stripped description of the collection, single line with HTML tags removed.
   */
  description: (args?: {
    /**
     * Truncates a string after the given length.
     */
    truncateAt?: Maybe<ScalarsEnums['Int']>;
  }) => ScalarsEnums['String'];
  /**
   * The description of the collection, complete with HTML formatting.
   */
  descriptionHtml: ScalarsEnums['HTML'];
  /**
   * A human-friendly unique string for the collection automatically generated from its title.
   * Limit of 255 characters.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * Image associated with the collection.
   */
  image?: Maybe<Image>;
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel.
   */
  onlineStoreUrl?: Maybe<ScalarsEnums['URL']>;
  /**
   * List of products in the collection.
   */
  products: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns a subset of products matching all product filters.
     *
     * The input must not contain more than `250` values.
     */
    filters?: Maybe<Array<ProductFilter>>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Sort the underlying list by the given key.
     * @defaultValue `"COLLECTION_DEFAULT"`
     */
    sortKey?: Maybe<ProductCollectionSortKeys>;
  }) => ProductConnection;
  /**
   * The collection's SEO information.
   */
  seo: SEO;
  /**
   * The collection’s name. Limit of 255 characters.
   */
  title: ScalarsEnums['String'];
  /**
   * URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null.
   */
  trackingParameters?: Maybe<ScalarsEnums['String']>;
  /**
   * The date and time when the collection was last modified.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * An auto-generated type for paginating through multiple Collections.
 */
export interface CollectionConnection {
  __typename?: 'CollectionConnection';
  /**
   * A list of edges.
   */
  edges: Array<CollectionEdge>;
  /**
   * A list of the nodes contained in CollectionEdge.
   */
  nodes: Array<Collection>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
  /**
   * The total count of Collections.
   */
  totalCount: ScalarsEnums['UnsignedInt64'];
}

/**
 * An auto-generated type which holds one Collection and a cursor during pagination.
 */
export interface CollectionEdge {
  __typename?: 'CollectionEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of CollectionEdge.
   */
  node: Collection;
}

/**
 * A comment on an article.
 */
export interface Comment {
  __typename?: 'Comment';
  /**
   * The comment’s author.
   */
  author: CommentAuthor;
  /**
   * Stripped content of the comment, single line with HTML tags removed.
   */
  content: (args?: {
    /**
     * Truncates a string after the given length.
     */
    truncateAt?: Maybe<ScalarsEnums['Int']>;
  }) => ScalarsEnums['String'];
  /**
   * The content of the comment, complete with HTML formatting.
   */
  contentHtml: ScalarsEnums['HTML'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
}

/**
 * The author of a comment.
 */
export interface CommentAuthor {
  __typename?: 'CommentAuthor';
  /**
   * The author's email.
   */
  email: ScalarsEnums['String'];
  /**
   * The author’s name.
   */
  name: ScalarsEnums['String'];
}

/**
 * An auto-generated type for paginating through multiple Comments.
 */
export interface CommentConnection {
  __typename?: 'CommentConnection';
  /**
   * A list of edges.
   */
  edges: Array<CommentEdge>;
  /**
   * A list of the nodes contained in CommentEdge.
   */
  nodes: Array<Comment>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Comment and a cursor during pagination.
 */
export interface CommentEdge {
  __typename?: 'CommentEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of CommentEdge.
   */
  node: Comment;
}

/**
 * Represents information about a company which is also a customer of the shop.
 */
export interface Company {
  __typename?: 'Company';
  /**
   * The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company was created in Shopify.
   */
  createdAt: ScalarsEnums['DateTime'];
  /**
   * A unique externally-supplied ID for the company.
   */
  externalId?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The name of the company.
   */
  name: ScalarsEnums['String'];
  /**
   * The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company was last modified.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * A company's main point of contact.
 */
export interface CompanyContact {
  __typename?: 'CompanyContact';
  /**
   * The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company contact was created in Shopify.
   */
  createdAt: ScalarsEnums['DateTime'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The company contact's locale (language).
   */
  locale?: Maybe<ScalarsEnums['String']>;
  /**
   * The company contact's job title.
   */
  title?: Maybe<ScalarsEnums['String']>;
  /**
   * The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company contact was last modified.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * A company's location.
 */
export interface CompanyLocation {
  __typename?: 'CompanyLocation';
  /**
   * The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company location was created in Shopify.
   */
  createdAt: ScalarsEnums['DateTime'];
  /**
   * A unique externally-supplied ID for the company.
   */
  externalId?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The preferred locale of the company location.
   */
  locale?: Maybe<ScalarsEnums['String']>;
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The name of the company location.
   */
  name: ScalarsEnums['String'];
  /**
   * The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company location was last modified.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * The action for the 3DS payment redirect.
 */
export interface CompletePaymentChallenge {
  __typename?: 'CompletePaymentChallenge';
  /**
   * The URL for the 3DS payment redirect.
   */
  redirectUrl?: Maybe<ScalarsEnums['URL']>;
}

/**
 * An error that occurred during a cart completion attempt.
 */
export interface CompletionError {
  __typename?: 'CompletionError';
  /**
   * The error code.
   */
  code: ScalarsEnums['CompletionErrorCode'];
  /**
   * The error message.
   */
  message?: Maybe<ScalarsEnums['String']>;
}

/**
 * Represents information about the grouped merchandise in the cart.
 */
export interface ComponentizableCartLine {
  __typename?: 'ComponentizableCartLine';
  /**
   * An attribute associated with the cart line.
   */
  attribute: (args: {
    /**
     * The key of the attribute.
     */
    key: ScalarsEnums['String'];
  }) => Maybe<Attribute>;
  /**
   * The attributes associated with the cart line. Attributes are represented as key-value pairs.
   */
  attributes: Array<Attribute>;
  /**
   * The cost of the merchandise that the buyer will pay for at checkout. The costs are subject to change and changes will be reflected at checkout.
   */
  cost: CartLineCost;
  /**
   * The discounts that have been applied to the cart line.
   */
  discountAllocations: Array<CartDiscountAllocation>;
  /**
   * The estimated cost of the merchandise that the buyer will pay for at checkout. The estimated costs are subject to change and changes will be reflected at checkout.
   * @deprecated Use `cost` instead.
   */
  estimatedCost: CartLineEstimatedCost;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The components of the line item.
   */
  lineComponents: Array<CartLine>;
  /**
   * The merchandise that the buyer intends to purchase.
   */
  merchandise: Merchandise;
  /**
   * The quantity of the merchandise that the customer intends to purchase.
   */
  quantity: ScalarsEnums['Int'];
  /**
   * The selling plan associated with the cart line and the effect that each selling plan has on variants when they're purchased.
   */
  sellingPlanAllocation?: Maybe<SellingPlanAllocation>;
}

/**
 * Details for count of elements.
 */
export interface Count {
  __typename?: 'Count';
  /**
   * Count of elements.
   */
  count: ScalarsEnums['Int'];
  /**
   * Precision of count, how exact is the value.
   */
  precision: ScalarsEnums['CountPrecision'];
}

/**
 * A country.
 */
export interface Country {
  __typename?: 'Country';
  /**
   * The languages available for the country.
   */
  availableLanguages: Array<Language>;
  /**
   * The currency of the country.
   */
  currency: Currency;
  /**
   * The ISO code of the country.
   */
  isoCode: ScalarsEnums['CountryCode'];
  /**
   * The market that includes this country.
   */
  market?: Maybe<Market>;
  /**
   * The name of the country.
   */
  name: ScalarsEnums['String'];
  /**
   * The unit system used in the country.
   */
  unitSystem: ScalarsEnums['UnitSystem'];
}

/**
 * A currency.
 */
export interface Currency {
  __typename?: 'Currency';
  /**
   * The ISO code of the currency.
   */
  isoCode: ScalarsEnums['CurrencyCode'];
  /**
   * The name of the currency.
   */
  name: ScalarsEnums['String'];
  /**
   * The symbol of the currency.
   */
  symbol: ScalarsEnums['String'];
}

/**
 * A customer represents a customer account with the shop. Customer accounts store contact information for the customer, saving logged-in customers the trouble of having to provide it at every checkout.
 */
export interface Customer {
  __typename?: 'Customer';
  /**
   * Indicates whether the customer has consented to be sent marketing material via email.
   */
  acceptsMarketing: ScalarsEnums['Boolean'];
  /**
   * A list of addresses for the customer.
   */
  addresses: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => MailingAddressConnection;
  /**
   * The date and time when the customer was created.
   */
  createdAt: ScalarsEnums['DateTime'];
  /**
   * The customer’s default address.
   */
  defaultAddress?: Maybe<MailingAddress>;
  /**
   * The customer’s name, email or phone number.
   */
  displayName: ScalarsEnums['String'];
  /**
   * The customer’s email address.
   */
  email?: Maybe<ScalarsEnums['String']>;
  /**
   * The customer’s first name.
   */
  firstName?: Maybe<ScalarsEnums['String']>;
  /**
   * A unique ID for the customer.
   */
  id: ScalarsEnums['ID'];
  /**
   * The customer’s last name.
   */
  lastName?: Maybe<ScalarsEnums['String']>;
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The number of orders that the customer has made at the store in their lifetime.
   */
  numberOfOrders: ScalarsEnums['UnsignedInt64'];
  /**
   * The orders associated with the customer.
   */
  orders: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Apply one or multiple filters to the query.
     * | name | description | acceptable_values | default_value | example_use |
     * | ---- | ---- | ---- | ---- | ---- |
     * | processed_at |
     * Refer to the detailed [search syntax](https://shopify.dev/api/usage/search-syntax) for more information about using filters.
     */
    query?: Maybe<ScalarsEnums['String']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Sort the underlying list by the given key.
     * @defaultValue `"ID"`
     */
    sortKey?: Maybe<OrderSortKeys>;
  }) => OrderConnection;
  /**
   * The customer’s phone number.
   */
  phone?: Maybe<ScalarsEnums['String']>;
  /**
   * A comma separated list of tags that have been added to the customer.
   * Additional access scope required: unauthenticated_read_customer_tags.
   */
  tags: Array<ScalarsEnums['String']>;
  /**
   * The date and time when the customer information was updated.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * A CustomerAccessToken represents the unique token required to make modifications to the customer object.
 */
export interface CustomerAccessToken {
  __typename?: 'CustomerAccessToken';
  /**
   * The customer’s access token.
   */
  accessToken: ScalarsEnums['String'];
  /**
   * The date and time when the customer access token expires.
   */
  expiresAt: ScalarsEnums['DateTime'];
}

/**
 * Return type for `customerAccessTokenCreate` mutation.
 */
export interface CustomerAccessTokenCreatePayload {
  __typename?: 'CustomerAccessTokenCreatePayload';
  /**
   * The newly created customer access token object.
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerAccessTokenCreateWithMultipass` mutation.
 */
export interface CustomerAccessTokenCreateWithMultipassPayload {
  __typename?: 'CustomerAccessTokenCreateWithMultipassPayload';
  /**
   * An access token object associated with the customer.
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
}

/**
 * Return type for `customerAccessTokenDelete` mutation.
 */
export interface CustomerAccessTokenDeletePayload {
  __typename?: 'CustomerAccessTokenDeletePayload';
  /**
   * The destroyed access token.
   */
  deletedAccessToken?: Maybe<ScalarsEnums['String']>;
  /**
   * ID of the destroyed customer access token.
   */
  deletedCustomerAccessTokenId?: Maybe<ScalarsEnums['String']>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerAccessTokenRenew` mutation.
 */
export interface CustomerAccessTokenRenewPayload {
  __typename?: 'CustomerAccessTokenRenewPayload';
  /**
   * The renewed customer access token object.
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerActivateByUrl` mutation.
 */
export interface CustomerActivateByUrlPayload {
  __typename?: 'CustomerActivateByUrlPayload';
  /**
   * The customer that was activated.
   */
  customer?: Maybe<Customer>;
  /**
   * A new customer access token for the customer.
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
}

/**
 * Return type for `customerActivate` mutation.
 */
export interface CustomerActivatePayload {
  __typename?: 'CustomerActivatePayload';
  /**
   * The customer object.
   */
  customer?: Maybe<Customer>;
  /**
   * A newly created customer access token object for the customer.
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerAddressCreate` mutation.
 */
export interface CustomerAddressCreatePayload {
  __typename?: 'CustomerAddressCreatePayload';
  /**
   * The new customer address object.
   */
  customerAddress?: Maybe<MailingAddress>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerAddressDelete` mutation.
 */
export interface CustomerAddressDeletePayload {
  __typename?: 'CustomerAddressDeletePayload';
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * ID of the deleted customer address.
   */
  deletedCustomerAddressId?: Maybe<ScalarsEnums['String']>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerAddressUpdate` mutation.
 */
export interface CustomerAddressUpdatePayload {
  __typename?: 'CustomerAddressUpdatePayload';
  /**
   * The customer’s updated mailing address.
   */
  customerAddress?: Maybe<MailingAddress>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerCreate` mutation.
 */
export interface CustomerCreatePayload {
  __typename?: 'CustomerCreatePayload';
  /**
   * The created customer object.
   */
  customer?: Maybe<Customer>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerDefaultAddressUpdate` mutation.
 */
export interface CustomerDefaultAddressUpdatePayload {
  __typename?: 'CustomerDefaultAddressUpdatePayload';
  /**
   * The updated customer object.
   */
  customer?: Maybe<Customer>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerRecover` mutation.
 */
export interface CustomerRecoverPayload {
  __typename?: 'CustomerRecoverPayload';
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerResetByUrl` mutation.
 */
export interface CustomerResetByUrlPayload {
  __typename?: 'CustomerResetByUrlPayload';
  /**
   * The customer object which was reset.
   */
  customer?: Maybe<Customer>;
  /**
   * A newly created customer access token object for the customer.
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerReset` mutation.
 */
export interface CustomerResetPayload {
  __typename?: 'CustomerResetPayload';
  /**
   * The customer object which was reset.
   */
  customer?: Maybe<Customer>;
  /**
   * A newly created customer access token object for the customer.
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Return type for `customerUpdate` mutation.
 */
export interface CustomerUpdatePayload {
  __typename?: 'CustomerUpdatePayload';
  /**
   * The updated customer object.
   */
  customer?: Maybe<Customer>;
  /**
   * The newly created customer access token. If the customer's password is updated, all previous access tokens
   * (including the one used to perform this mutation) become invalid, and a new token is generated.
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
}

/**
 * Represents an error that happens during execution of a customer mutation.
 */
export interface CustomerUserError {
  __typename?: 'CustomerUserError';
  /**
   * The error code.
   */
  code?: Maybe<ScalarsEnums['CustomerErrorCode']>;
  /**
   * The path to the input field that caused the error.
   */
  field?: Maybe<Array<ScalarsEnums['String']>>;
  /**
   * The error message.
   */
  message: ScalarsEnums['String'];
}

/**
 * A delivery address of the buyer that is interacting with the cart.
 */
export interface DeliveryAddress {
  __typename?: 'MailingAddress';
  $on: $DeliveryAddress;
}

/**
 * An amount discounting the line that has been allocated by a discount.
 */
export interface DiscountAllocation {
  __typename?: 'DiscountAllocation';
  /**
   * Amount of discount allocated.
   */
  allocatedAmount: MoneyV2;
  /**
   * The discount this allocated amount originated from.
   */
  discountApplication: DiscountApplication;
}

/**
 * Discount applications capture the intentions of a discount source at
 * the time of application.
 */
export interface DiscountApplication {
  __typename?:
    | 'AutomaticDiscountApplication'
    | 'DiscountCodeApplication'
    | 'ManualDiscountApplication'
    | 'ScriptDiscountApplication';
  /**
   * The method by which the discount's value is allocated to its entitled items.
   */
  allocationMethod: ScalarsEnums['DiscountApplicationAllocationMethod'];
  /**
   * Which lines of targetType that the discount is allocated over.
   */
  targetSelection: ScalarsEnums['DiscountApplicationTargetSelection'];
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
  /**
   * The value of the discount application.
   */
  value: PricingValue;
  $on: $DiscountApplication;
}

/**
 * An auto-generated type for paginating through multiple DiscountApplications.
 */
export interface DiscountApplicationConnection {
  __typename?: 'DiscountApplicationConnection';
  /**
   * A list of edges.
   */
  edges: Array<DiscountApplicationEdge>;
  /**
   * A list of the nodes contained in DiscountApplicationEdge.
   */
  nodes: Array<DiscountApplication>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one DiscountApplication and a cursor during pagination.
 */
export interface DiscountApplicationEdge {
  __typename?: 'DiscountApplicationEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of DiscountApplicationEdge.
   */
  node: DiscountApplication;
}

/**
 * Discount code applications capture the intentions of a discount code at
 * the time that it is applied.
 */
export interface DiscountCodeApplication {
  __typename?: 'DiscountCodeApplication';
  /**
   * The method by which the discount's value is allocated to its entitled items.
   */
  allocationMethod: ScalarsEnums['DiscountApplicationAllocationMethod'];
  /**
   * Specifies whether the discount code was applied successfully.
   */
  applicable: ScalarsEnums['Boolean'];
  /**
   * The string identifying the discount code that was used at the time of application.
   */
  code: ScalarsEnums['String'];
  /**
   * Which lines of targetType that the discount is allocated over.
   */
  targetSelection: ScalarsEnums['DiscountApplicationTargetSelection'];
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
  /**
   * The value of the discount application.
   */
  value: PricingValue;
}

/**
 * Represents an error in the input of a mutation.
 */
export interface DisplayableError {
  __typename?:
    | 'CartUserError'
    | 'CustomerUserError'
    | 'MetafieldDeleteUserError'
    | 'MetafieldsSetUserError'
    | 'UserError'
    | 'UserErrorsShopPayPaymentRequestSessionUserErrors';
  /**
   * The path to the input field that caused the error.
   */
  field?: Maybe<Array<ScalarsEnums['String']>>;
  /**
   * The error message.
   */
  message: ScalarsEnums['String'];
  $on: $DisplayableError;
}

/**
 * Represents a web address.
 */
export interface Domain {
  __typename?: 'Domain';
  /**
   * The host name of the domain (eg: `example.com`).
   */
  host: ScalarsEnums['String'];
  /**
   * Whether SSL is enabled or not.
   */
  sslEnabled: ScalarsEnums['Boolean'];
  /**
   * The URL of the domain (eg: `https://example.com`).
   */
  url: ScalarsEnums['URL'];
}

/**
 * Represents a video hosted outside of Shopify.
 */
export interface ExternalVideo {
  __typename?: 'ExternalVideo';
  /**
   * A word or phrase to share the nature or contents of a media.
   */
  alt?: Maybe<ScalarsEnums['String']>;
  /**
   * The embed URL of the video for the respective host.
   */
  embedUrl: ScalarsEnums['URL'];
  /**
   * The URL.
   * @deprecated Use `originUrl` instead.
   */
  embeddedUrl: ScalarsEnums['URL'];
  /**
   * The host of the external video.
   */
  host: ScalarsEnums['MediaHost'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The media content type.
   */
  mediaContentType: ScalarsEnums['MediaContentType'];
  /**
   * The origin URL of the video on the respective host.
   */
  originUrl: ScalarsEnums['URL'];
  /**
   * The presentation for a media.
   */
  presentation?: Maybe<MediaPresentation>;
  /**
   * The preview image for the media.
   */
  previewImage?: Maybe<Image>;
}

/**
 * A filter that is supported on the parent field.
 */
export interface Filter {
  __typename?: 'Filter';
  /**
   * A unique identifier.
   */
  id: ScalarsEnums['String'];
  /**
   * A human-friendly string for this filter.
   */
  label: ScalarsEnums['String'];
  /**
   * Describes how to present the filter values.
   * Returns a value only for filters of type `LIST`. Returns null for other types.
   */
  presentation?: Maybe<ScalarsEnums['FilterPresentation']>;
  /**
   * An enumeration that denotes the type of data this filter represents.
   */
  type: ScalarsEnums['FilterType'];
  /**
   * The list of values for this filter.
   */
  values: Array<FilterValue>;
}

/**
 * A selectable value within a filter.
 */
export interface FilterValue {
  __typename?: 'FilterValue';
  /**
   * The number of results that match this filter value.
   */
  count: ScalarsEnums['Int'];
  /**
   * A unique identifier.
   */
  id: ScalarsEnums['String'];
  /**
   * The visual representation when the filter's presentation is `IMAGE`.
   */
  image?: Maybe<MediaImage>;
  /**
   * An input object that can be used to filter by this value on the parent field.
   *
   * The value is provided as a helper for building dynamic filtering UI. For
   * example, if you have a list of selected `FilterValue` objects, you can combine
   * their respective `input` values to use in a subsequent query.
   */
  input: ScalarsEnums['JSON'];
  /**
   * A human-friendly string for this filter value.
   */
  label: ScalarsEnums['String'];
  /**
   * The visual representation when the filter's presentation is `SWATCH`.
   */
  swatch?: Maybe<Swatch>;
}

/**
 * Represents a single fulfillment in an order.
 */
export interface Fulfillment {
  __typename?: 'Fulfillment';
  /**
   * List of the fulfillment's line items.
   */
  fulfillmentLineItems: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => FulfillmentLineItemConnection;
  /**
   * The name of the tracking company.
   */
  trackingCompany?: Maybe<ScalarsEnums['String']>;
  /**
   * Tracking information associated with the fulfillment,
   * such as the tracking number and tracking URL.
   */
  trackingInfo: (args?: {
    /**
     * Truncate the array result to this size.
     */
    first?: Maybe<ScalarsEnums['Int']>;
  }) => Array<FulfillmentTrackingInfo>;
}

/**
 * Represents a single line item in a fulfillment. There is at most one fulfillment line item for each order line item.
 */
export interface FulfillmentLineItem {
  __typename?: 'FulfillmentLineItem';
  /**
   * The associated order's line item.
   */
  lineItem: OrderLineItem;
  /**
   * The amount fulfilled in this fulfillment.
   */
  quantity: ScalarsEnums['Int'];
}

/**
 * An auto-generated type for paginating through multiple FulfillmentLineItems.
 */
export interface FulfillmentLineItemConnection {
  __typename?: 'FulfillmentLineItemConnection';
  /**
   * A list of edges.
   */
  edges: Array<FulfillmentLineItemEdge>;
  /**
   * A list of the nodes contained in FulfillmentLineItemEdge.
   */
  nodes: Array<FulfillmentLineItem>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one FulfillmentLineItem and a cursor during pagination.
 */
export interface FulfillmentLineItemEdge {
  __typename?: 'FulfillmentLineItemEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of FulfillmentLineItemEdge.
   */
  node: FulfillmentLineItem;
}

/**
 * Tracking information associated with the fulfillment.
 */
export interface FulfillmentTrackingInfo {
  __typename?: 'FulfillmentTrackingInfo';
  /**
   * The tracking number of the fulfillment.
   */
  number?: Maybe<ScalarsEnums['String']>;
  /**
   * The URL to track the fulfillment.
   */
  url?: Maybe<ScalarsEnums['URL']>;
}

/**
 * The generic file resource lets you manage files in a merchant’s store. Generic files include any file that doesn’t fit into a designated type such as image or video. Example: PDF, JSON.
 */
export interface GenericFile {
  __typename?: 'GenericFile';
  /**
   * A word or phrase to indicate the contents of a file.
   */
  alt?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The MIME type of the file.
   */
  mimeType?: Maybe<ScalarsEnums['String']>;
  /**
   * The size of the original file in bytes.
   */
  originalFileSize?: Maybe<ScalarsEnums['Int']>;
  /**
   * The preview image for the file.
   */
  previewImage?: Maybe<Image>;
  /**
   * The URL of the file.
   */
  url?: Maybe<ScalarsEnums['URL']>;
}

/**
 * Represents information about the metafields associated to the specified resource.
 */
export interface HasMetafields {
  __typename?:
    | 'Article'
    | 'Blog'
    | 'Cart'
    | 'Collection'
    | 'Company'
    | 'CompanyLocation'
    | 'Customer'
    | 'Location'
    | 'Market'
    | 'Order'
    | 'Page'
    | 'Product'
    | 'ProductVariant'
    | 'SellingPlan'
    | 'Shop';
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  $on: $HasMetafields;
}

/**
 * Represents an image resource.
 */
export interface Image {
  __typename?: 'Image';
  /**
   * A word or phrase to share the nature or contents of an image.
   */
  altText?: Maybe<ScalarsEnums['String']>;
  /**
   * The original height of the image in pixels. Returns `null` if the image isn't hosted by Shopify.
   */
  height?: Maybe<ScalarsEnums['Int']>;
  /**
   * A unique ID for the image.
   */
  id?: Maybe<ScalarsEnums['ID']>;
  /**
   * The location of the original image as a URL.
   *
   * If there are any existing transformations in the original source URL, they will remain and not be stripped.
   * @deprecated Use `url` instead.
   */
  originalSrc: ScalarsEnums['URL'];
  /**
   * The location of the image as a URL.
   * @deprecated Use `url` instead.
   */
  src: ScalarsEnums['URL'];
  /**
   * The location of the transformed image as a URL.
   *
   * All transformation arguments are considered "best-effort". If they can be applied to an image, they will be.
   * Otherwise any transformations which an image type doesn't support will be ignored.
   * @deprecated Use `url(transform:)` instead
   */
  transformedSrc: (args?: {
    /**
     * Crops the image according to the specified region.
     */
    crop?: Maybe<CropRegion>;
    /**
     * Image height in pixels between 1 and 5760.
     */
    maxHeight?: Maybe<ScalarsEnums['Int']>;
    /**
     * Image width in pixels between 1 and 5760.
     */
    maxWidth?: Maybe<ScalarsEnums['Int']>;
    /**
     * Best effort conversion of image into content type (SVG -> PNG, Anything -> JPG, Anything -> WEBP are supported).
     */
    preferredContentType?: Maybe<ImageContentType>;
    /**
     * Image size multiplier for high-resolution retina displays. Must be between 1 and 3.
     * @defaultValue `1`
     */
    scale?: Maybe<ScalarsEnums['Int']>;
  }) => ScalarsEnums['URL'];
  /**
   * The location of the image as a URL.
   *
   * If no transform options are specified, then the original image will be preserved including any pre-applied transforms.
   *
   * All transformation options are considered "best-effort". Any transformation that the original image type doesn't support will be ignored.
   *
   * If you need multiple variations of the same image, then you can use [GraphQL aliases](https://graphql.org/learn/queries/#aliases).
   */
  url: (args?: {
    /**
     * A set of options to transform the original image.
     */
    transform?: Maybe<ImageTransformInput>;
  }) => ScalarsEnums['URL'];
  /**
   * The original width of the image in pixels. Returns `null` if the image isn't hosted by Shopify.
   */
  width?: Maybe<ScalarsEnums['Int']>;
}

/**
 * An auto-generated type for paginating through multiple Images.
 */
export interface ImageConnection {
  __typename?: 'ImageConnection';
  /**
   * A list of edges.
   */
  edges: Array<ImageEdge>;
  /**
   * A list of the nodes contained in ImageEdge.
   */
  nodes: Array<Image>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Image and a cursor during pagination.
 */
export interface ImageEdge {
  __typename?: 'ImageEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of ImageEdge.
   */
  node: Image;
}

/**
 * Provide details about the contexts influenced by the @inContext directive on a field.
 */
export interface InContextAnnotation {
  __typename?: 'InContextAnnotation';
  description: ScalarsEnums['String'];
  type: InContextAnnotationType;
}

/**
 * This gives information about the type of context that impacts a field. For example, for a query with @inContext(language: "EN"), the type would point to the name: LanguageCode and kind: ENUM.
 */
export interface InContextAnnotationType {
  __typename?: 'InContextAnnotationType';
  kind: ScalarsEnums['String'];
  name: ScalarsEnums['String'];
}

/**
 * A language.
 */
export interface Language {
  __typename?: 'Language';
  /**
   * The name of the language in the language itself. If the language uses capitalization, it is capitalized for a mid-sentence position.
   */
  endonymName: ScalarsEnums['String'];
  /**
   * The ISO code.
   */
  isoCode: ScalarsEnums['LanguageCode'];
  /**
   * The name of the language in the current language.
   */
  name: ScalarsEnums['String'];
}

/**
 * Information about the localized experiences configured for the shop.
 */
export interface Localization {
  __typename?: 'Localization';
  /**
   * The list of countries with enabled localized experiences.
   */
  availableCountries: Array<Country>;
  /**
   * The list of languages available for the active country.
   */
  availableLanguages: Array<Language>;
  /**
   * The country of the active localized experience. Use the `@inContext` directive to change this value.
   */
  country: Country;
  /**
   * The language of the active localized experience. Use the `@inContext` directive to change this value.
   */
  language: Language;
  /**
   * The market including the country of the active localized experience. Use the `@inContext` directive to change this value.
   */
  market: Market;
}

/**
 * Represents a location where product inventory is held.
 */
export interface Location {
  __typename?: 'Location';
  /**
   * The address of the location.
   */
  address: LocationAddress;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The name of the location.
   */
  name: ScalarsEnums['String'];
}

/**
 * Represents the address of a location.
 */
export interface LocationAddress {
  __typename?: 'LocationAddress';
  /**
   * The first line of the address for the location.
   */
  address1?: Maybe<ScalarsEnums['String']>;
  /**
   * The second line of the address for the location.
   */
  address2?: Maybe<ScalarsEnums['String']>;
  /**
   * The city of the location.
   */
  city?: Maybe<ScalarsEnums['String']>;
  /**
   * The country of the location.
   */
  country?: Maybe<ScalarsEnums['String']>;
  /**
   * The country code of the location.
   */
  countryCode?: Maybe<ScalarsEnums['String']>;
  /**
   * A formatted version of the address for the location.
   */
  formatted: Array<ScalarsEnums['String']>;
  /**
   * The latitude coordinates of the location.
   */
  latitude?: Maybe<ScalarsEnums['Float']>;
  /**
   * The longitude coordinates of the location.
   */
  longitude?: Maybe<ScalarsEnums['Float']>;
  /**
   * The phone number of the location.
   */
  phone?: Maybe<ScalarsEnums['String']>;
  /**
   * The province of the location.
   */
  province?: Maybe<ScalarsEnums['String']>;
  /**
   * The code for the province, state, or district of the address of the location.
   */
  provinceCode?: Maybe<ScalarsEnums['String']>;
  /**
   * The ZIP code of the location.
   */
  zip?: Maybe<ScalarsEnums['String']>;
}

/**
 * An auto-generated type for paginating through multiple Locations.
 */
export interface LocationConnection {
  __typename?: 'LocationConnection';
  /**
   * A list of edges.
   */
  edges: Array<LocationEdge>;
  /**
   * A list of the nodes contained in LocationEdge.
   */
  nodes: Array<Location>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Location and a cursor during pagination.
 */
export interface LocationEdge {
  __typename?: 'LocationEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of LocationEdge.
   */
  node: Location;
}

/**
 * Represents a mailing address for customers and shipping.
 */
export interface MailingAddress {
  __typename?: 'MailingAddress';
  /**
   * The first line of the address. Typically the street address or PO Box number.
   */
  address1?: Maybe<ScalarsEnums['String']>;
  /**
   * The second line of the address. Typically the number of the apartment, suite, or unit.
   */
  address2?: Maybe<ScalarsEnums['String']>;
  /**
   * The name of the city, district, village, or town.
   */
  city?: Maybe<ScalarsEnums['String']>;
  /**
   * The name of the customer's company or organization.
   */
  company?: Maybe<ScalarsEnums['String']>;
  /**
   * The name of the country.
   */
  country?: Maybe<ScalarsEnums['String']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   * @deprecated Use `countryCodeV2` instead.
   */
  countryCode?: Maybe<ScalarsEnums['String']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   */
  countryCodeV2?: Maybe<ScalarsEnums['CountryCode']>;
  /**
   * The first name of the customer.
   */
  firstName?: Maybe<ScalarsEnums['String']>;
  /**
   * A formatted version of the address, customized by the provided arguments.
   */
  formatted: (args?: {
    /**
     * Whether to include the customer's company in the formatted address.
     * @defaultValue `true`
     */
    withCompany?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Whether to include the customer's name in the formatted address.
     * @defaultValue `false`
     */
    withName?: Maybe<ScalarsEnums['Boolean']>;
  }) => Array<ScalarsEnums['String']>;
  /**
   * A comma-separated list of the values for city, province, and country.
   */
  formattedArea?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The last name of the customer.
   */
  lastName?: Maybe<ScalarsEnums['String']>;
  /**
   * The latitude coordinate of the customer address.
   */
  latitude?: Maybe<ScalarsEnums['Float']>;
  /**
   * The longitude coordinate of the customer address.
   */
  longitude?: Maybe<ScalarsEnums['Float']>;
  /**
   * The full name of the customer, based on firstName and lastName.
   */
  name?: Maybe<ScalarsEnums['String']>;
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   */
  phone?: Maybe<ScalarsEnums['String']>;
  /**
   * The region of the address, such as the province, state, or district.
   */
  province?: Maybe<ScalarsEnums['String']>;
  /**
   * The alphanumeric code for the region.
   *
   * For example, ON.
   */
  provinceCode?: Maybe<ScalarsEnums['String']>;
  /**
   * The zip or postal code of the address.
   */
  zip?: Maybe<ScalarsEnums['String']>;
}

/**
 * An auto-generated type for paginating through multiple MailingAddresses.
 */
export interface MailingAddressConnection {
  __typename?: 'MailingAddressConnection';
  /**
   * A list of edges.
   */
  edges: Array<MailingAddressEdge>;
  /**
   * A list of the nodes contained in MailingAddressEdge.
   */
  nodes: Array<MailingAddress>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one MailingAddress and a cursor during pagination.
 */
export interface MailingAddressEdge {
  __typename?: 'MailingAddressEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of MailingAddressEdge.
   */
  node: MailingAddress;
}

/**
 * Manual discount applications capture the intentions of a discount that was manually created.
 */
export interface ManualDiscountApplication {
  __typename?: 'ManualDiscountApplication';
  /**
   * The method by which the discount's value is allocated to its entitled items.
   */
  allocationMethod: ScalarsEnums['DiscountApplicationAllocationMethod'];
  /**
   * The description of the application.
   */
  description?: Maybe<ScalarsEnums['String']>;
  /**
   * Which lines of targetType that the discount is allocated over.
   */
  targetSelection: ScalarsEnums['DiscountApplicationTargetSelection'];
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
  /**
   * The title of the application.
   */
  title: ScalarsEnums['String'];
  /**
   * The value of the discount application.
   */
  value: PricingValue;
}

/**
 * A group of one or more regions of the world that a merchant is targeting for sales. To learn more about markets, refer to [the Shopify Markets conceptual overview](/docs/apps/markets).
 */
export interface Market {
  __typename?: 'Market';
  /**
   * A human-readable unique string for the market automatically generated from its title.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
}

/**
 * Represents a media interface.
 */
export interface Media {
  __typename?: 'ExternalVideo' | 'MediaImage' | 'Model3d' | 'Video';
  /**
   * A word or phrase to share the nature or contents of a media.
   */
  alt?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The media content type.
   */
  mediaContentType: ScalarsEnums['MediaContentType'];
  /**
   * The presentation for a media.
   */
  presentation?: Maybe<MediaPresentation>;
  /**
   * The preview image for the media.
   */
  previewImage?: Maybe<Image>;
  $on: $Media;
}

/**
 * An auto-generated type for paginating through multiple Media.
 */
export interface MediaConnection {
  __typename?: 'MediaConnection';
  /**
   * A list of edges.
   */
  edges: Array<MediaEdge>;
  /**
   * A list of the nodes contained in MediaEdge.
   */
  nodes: Array<Media>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Media and a cursor during pagination.
 */
export interface MediaEdge {
  __typename?: 'MediaEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of MediaEdge.
   */
  node: Media;
}

/**
 * Represents a Shopify hosted image.
 */
export interface MediaImage {
  __typename?: 'MediaImage';
  /**
   * A word or phrase to share the nature or contents of a media.
   */
  alt?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The image for the media.
   */
  image?: Maybe<Image>;
  /**
   * The media content type.
   */
  mediaContentType: ScalarsEnums['MediaContentType'];
  /**
   * The presentation for a media.
   */
  presentation?: Maybe<MediaPresentation>;
  /**
   * The preview image for the media.
   */
  previewImage?: Maybe<Image>;
}

/**
 * A media presentation.
 */
export interface MediaPresentation {
  __typename?: 'MediaPresentation';
  /**
   * A JSON object representing a presentation view.
   */
  asJson: (args: {
    /**
     * The format to transform the settings.
     */
    format: MediaPresentationFormat;
  }) => Maybe<ScalarsEnums['JSON']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
}

/**
 * A [navigation menu](https://help.shopify.com/manual/online-store/menus-and-links) representing a hierarchy
 * of hyperlinks (items).
 */
export interface Menu {
  __typename?: 'Menu';
  /**
   * The menu's handle.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The menu's child items.
   */
  items: Array<MenuItem>;
  /**
   * The count of items on the menu.
   */
  itemsCount: ScalarsEnums['Int'];
  /**
   * The menu's title.
   */
  title: ScalarsEnums['String'];
}

/**
 * A menu item within a parent menu.
 */
export interface MenuItem {
  __typename?: 'MenuItem';
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The menu item's child items.
   */
  items: Array<MenuItem>;
  /**
   * The linked resource.
   */
  resource?: Maybe<MenuItemResource>;
  /**
   * The ID of the linked resource.
   */
  resourceId?: Maybe<ScalarsEnums['ID']>;
  /**
   * The menu item's tags to filter a collection.
   */
  tags: Array<ScalarsEnums['String']>;
  /**
   * The menu item's title.
   */
  title: ScalarsEnums['String'];
  /**
   * The menu item's type.
   */
  type: ScalarsEnums['MenuItemType'];
  /**
   * The menu item's URL.
   */
  url?: Maybe<ScalarsEnums['URL']>;
}

/**
 * The list of possible resources a `MenuItem` can reference.
 */
export interface MenuItemResource {
  __typename?:
    | 'Article'
    | 'Blog'
    | 'Collection'
    | 'Metaobject'
    | 'Page'
    | 'Product'
    | 'ShopPolicy';
  $on: $MenuItemResource;
}

/**
 * The merchandise to be purchased at checkout.
 */
export interface Merchandise {
  __typename?: 'ProductVariant';
  $on: $Merchandise;
}

/**
 * Metafields represent custom metadata attached to a resource. Metafields can be sorted into namespaces and are
 * comprised of keys, values, and value types.
 */
export interface Metafield {
  __typename?: 'Metafield';
  /**
   * The date and time when the storefront metafield was created.
   */
  createdAt: ScalarsEnums['DateTime'];
  /**
   * The description of a metafield.
   */
  description?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The unique identifier for the metafield within its namespace.
   */
  key: ScalarsEnums['String'];
  /**
   * The container for a group of metafields that the metafield is associated with.
   */
  namespace: ScalarsEnums['String'];
  /**
   * The type of resource that the metafield is attached to.
   */
  parentResource: MetafieldParentResource;
  /**
   * Returns a reference object if the metafield's type is a resource reference.
   */
  reference?: Maybe<MetafieldReference>;
  /**
   * A list of reference objects if the metafield's type is a resource reference list.
   */
  references: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
  }) => Maybe<MetafieldReferenceConnection>;
  /**
   * The type name of the metafield.
   * Refer to the list of [supported types](https://shopify.dev/apps/metafields/definitions/types).
   */
  type: ScalarsEnums['String'];
  /**
   * The date and time when the metafield was last updated.
   */
  updatedAt: ScalarsEnums['DateTime'];
  /**
   * The data stored in the metafield. Always stored as a string, regardless of the metafield's type.
   */
  value: ScalarsEnums['String'];
}

/**
 * An error that occurs during the execution of cart metafield deletion.
 */
export interface MetafieldDeleteUserError {
  __typename?: 'MetafieldDeleteUserError';
  /**
   * The error code.
   */
  code?: Maybe<ScalarsEnums['MetafieldDeleteErrorCode']>;
  /**
   * The path to the input field that caused the error.
   */
  field?: Maybe<Array<ScalarsEnums['String']>>;
  /**
   * The error message.
   */
  message: ScalarsEnums['String'];
}

/**
 * A resource that the metafield belongs to.
 */
export interface MetafieldParentResource {
  __typename?:
    | 'Article'
    | 'Blog'
    | 'Cart'
    | 'Collection'
    | 'Company'
    | 'CompanyLocation'
    | 'Customer'
    | 'Location'
    | 'Market'
    | 'Order'
    | 'Page'
    | 'Product'
    | 'ProductVariant'
    | 'SellingPlan'
    | 'Shop';
  $on: $MetafieldParentResource;
}

/**
 * Returns the resource which is being referred to by a metafield.
 */
export interface MetafieldReference {
  __typename?:
    | 'Collection'
    | 'GenericFile'
    | 'MediaImage'
    | 'Metaobject'
    | 'Model3d'
    | 'Page'
    | 'Product'
    | 'ProductVariant'
    | 'Video';
  $on: $MetafieldReference;
}

/**
 * An auto-generated type for paginating through multiple MetafieldReferences.
 */
export interface MetafieldReferenceConnection {
  __typename?: 'MetafieldReferenceConnection';
  /**
   * A list of edges.
   */
  edges: Array<MetafieldReferenceEdge>;
  /**
   * A list of the nodes contained in MetafieldReferenceEdge.
   */
  nodes: Array<MetafieldReference>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one MetafieldReference and a cursor during pagination.
 */
export interface MetafieldReferenceEdge {
  __typename?: 'MetafieldReferenceEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of MetafieldReferenceEdge.
   */
  node: MetafieldReference;
}

/**
 * An error that occurs during the execution of `MetafieldsSet`.
 */
export interface MetafieldsSetUserError {
  __typename?: 'MetafieldsSetUserError';
  /**
   * The error code.
   */
  code?: Maybe<ScalarsEnums['MetafieldsSetUserErrorCode']>;
  /**
   * The index of the array element that's causing the error.
   */
  elementIndex?: Maybe<ScalarsEnums['Int']>;
  /**
   * The path to the input field that caused the error.
   */
  field?: Maybe<Array<ScalarsEnums['String']>>;
  /**
   * The error message.
   */
  message: ScalarsEnums['String'];
}

/**
 * An instance of a user-defined model based on a MetaobjectDefinition.
 */
export interface Metaobject {
  __typename?: 'Metaobject';
  /**
   * Accesses a field of the object by key.
   */
  field: (args: {
    /**
     * The key of the field.
     */
    key: ScalarsEnums['String'];
  }) => Maybe<MetaobjectField>;
  /**
   * All object fields with defined values.
   * Omitted object keys can be assumed null, and no guarantees are made about field order.
   */
  fields: Array<MetaobjectField>;
  /**
   * The unique handle of the metaobject. Useful as a custom ID.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The URL used for viewing the metaobject on the shop's Online Store. Returns `null` if the metaobject definition doesn't have the `online_store` capability.
   */
  onlineStoreUrl?: Maybe<ScalarsEnums['URL']>;
  /**
   * The metaobject's SEO information. Returns `null` if the metaobject definition
   * doesn't have the `renderable` capability.
   */
  seo?: Maybe<MetaobjectSEO>;
  /**
   * The type of the metaobject. Defines the namespace of its associated metafields.
   */
  type: ScalarsEnums['String'];
  /**
   * The date and time when the metaobject was last updated.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * An auto-generated type for paginating through multiple Metaobjects.
 */
export interface MetaobjectConnection {
  __typename?: 'MetaobjectConnection';
  /**
   * A list of edges.
   */
  edges: Array<MetaobjectEdge>;
  /**
   * A list of the nodes contained in MetaobjectEdge.
   */
  nodes: Array<Metaobject>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Metaobject and a cursor during pagination.
 */
export interface MetaobjectEdge {
  __typename?: 'MetaobjectEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of MetaobjectEdge.
   */
  node: Metaobject;
}

/**
 * Provides the value of a Metaobject field.
 */
export interface MetaobjectField {
  __typename?: 'MetaobjectField';
  /**
   * The field key.
   */
  key: ScalarsEnums['String'];
  /**
   * A referenced object if the field type is a resource reference.
   */
  reference?: Maybe<MetafieldReference>;
  /**
   * A list of referenced objects if the field type is a resource reference list.
   */
  references: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
  }) => Maybe<MetafieldReferenceConnection>;
  /**
   * The type name of the field.
   * See the list of [supported types](https://shopify.dev/apps/metafields/definitions/types).
   */
  type: ScalarsEnums['String'];
  /**
   * The field value.
   */
  value?: Maybe<ScalarsEnums['String']>;
}

/**
 * SEO information for a metaobject.
 */
export interface MetaobjectSEO {
  __typename?: 'MetaobjectSEO';
  /**
   * The meta description.
   */
  description?: Maybe<MetaobjectField>;
  /**
   * The SEO title.
   */
  title?: Maybe<MetaobjectField>;
}

/**
 * Represents a Shopify hosted 3D model.
 */
export interface Model3d {
  __typename?: 'Model3d';
  /**
   * A word or phrase to share the nature or contents of a media.
   */
  alt?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The media content type.
   */
  mediaContentType: ScalarsEnums['MediaContentType'];
  /**
   * The presentation for a media.
   */
  presentation?: Maybe<MediaPresentation>;
  /**
   * The preview image for the media.
   */
  previewImage?: Maybe<Image>;
  /**
   * The sources for a 3d model.
   */
  sources: Array<Model3dSource>;
}

/**
 * Represents a source for a Shopify hosted 3d model.
 */
export interface Model3dSource {
  __typename?: 'Model3dSource';
  /**
   * The filesize of the 3d model.
   */
  filesize: ScalarsEnums['Int'];
  /**
   * The format of the 3d model.
   */
  format: ScalarsEnums['String'];
  /**
   * The MIME type of the 3d model.
   */
  mimeType: ScalarsEnums['String'];
  /**
   * The URL of the 3d model.
   */
  url: ScalarsEnums['String'];
}

/**
 * A monetary value with currency.
 */
export interface MoneyV2 {
  __typename?: 'MoneyV2';
  /**
   * Decimal money amount.
   */
  amount: ScalarsEnums['Decimal'];
  /**
   * Currency of the money.
   */
  currencyCode: ScalarsEnums['CurrencyCode'];
}

/**
 * An object with an ID field to support global identification, in accordance with the
 * [Relay specification](https://relay.dev/graphql/objectidentification.htm#sec-Node-Interface).
 * This interface is used by the [node](/docs/api/storefront/latest/queries/node)
 * and [nodes](/docs/api/storefront/latest/queries/nodes) queries.
 */
export interface Node {
  __typename?:
    | 'AppliedGiftCard'
    | 'Article'
    | 'Blog'
    | 'Cart'
    | 'CartLine'
    | 'Collection'
    | 'Comment'
    | 'Company'
    | 'CompanyContact'
    | 'CompanyLocation'
    | 'ComponentizableCartLine'
    | 'ExternalVideo'
    | 'GenericFile'
    | 'Location'
    | 'MailingAddress'
    | 'Market'
    | 'MediaImage'
    | 'MediaPresentation'
    | 'Menu'
    | 'MenuItem'
    | 'Metafield'
    | 'Metaobject'
    | 'Model3d'
    | 'Order'
    | 'Page'
    | 'Product'
    | 'ProductOption'
    | 'ProductOptionValue'
    | 'ProductVariant'
    | 'Shop'
    | 'ShopPayInstallmentsFinancingPlan'
    | 'ShopPayInstallmentsFinancingPlanTerm'
    | 'ShopPayInstallmentsProductVariantPricing'
    | 'ShopPolicy'
    | 'TaxonomyCategory'
    | 'UrlRedirect'
    | 'Video';
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  $on: $Node;
}

/**
 * Represents a resource that can be published to the Online Store sales channel.
 */
export interface OnlineStorePublishable {
  __typename?:
    | 'Article'
    | 'Blog'
    | 'Collection'
    | 'Metaobject'
    | 'Page'
    | 'Product';
  /**
   * The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel.
   */
  onlineStoreUrl?: Maybe<ScalarsEnums['URL']>;
  $on: $OnlineStorePublishable;
}

/**
 * An order is a customer’s completed request to purchase one or more products from a shop. An order is created when a customer completes the checkout process, during which time they provides an email address, billing address and payment information.
 */
export interface Order {
  __typename?: 'Order';
  /**
   * The address associated with the payment method.
   */
  billingAddress?: Maybe<MailingAddress>;
  /**
   * The reason for the order's cancellation. Returns `null` if the order wasn't canceled.
   */
  cancelReason?: Maybe<ScalarsEnums['OrderCancelReason']>;
  /**
   * The date and time when the order was canceled. Returns null if the order wasn't canceled.
   */
  canceledAt?: Maybe<ScalarsEnums['DateTime']>;
  /**
   * The code of the currency used for the payment.
   */
  currencyCode: ScalarsEnums['CurrencyCode'];
  /**
   * The subtotal of line items and their discounts, excluding line items that have been removed. Does not contain order-level discounts, duties, shipping costs, or shipping discounts. Taxes aren't included unless the order is a taxes-included order.
   */
  currentSubtotalPrice: MoneyV2;
  /**
   * The total cost of duties for the order, including refunds.
   */
  currentTotalDuties?: Maybe<MoneyV2>;
  /**
   * The total amount of the order, including duties, taxes and discounts, minus amounts for line items that have been removed.
   */
  currentTotalPrice: MoneyV2;
  /**
   * The total cost of shipping, excluding shipping lines that have been refunded or removed. Taxes aren't included unless the order is a taxes-included order.
   */
  currentTotalShippingPrice: MoneyV2;
  /**
   * The total of all taxes applied to the order, excluding taxes for returned line items.
   */
  currentTotalTax: MoneyV2;
  /**
   * A list of the custom attributes added to the order. For example, whether an order is a customer's first.
   */
  customAttributes: Array<Attribute>;
  /**
   * The locale code in which this specific order happened.
   */
  customerLocale?: Maybe<ScalarsEnums['String']>;
  /**
   * The unique URL that the customer can use to access the order.
   */
  customerUrl?: Maybe<ScalarsEnums['URL']>;
  /**
   * Discounts that have been applied on the order.
   */
  discountApplications: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => DiscountApplicationConnection;
  /**
   * Whether the order has had any edits applied or not.
   */
  edited: ScalarsEnums['Boolean'];
  /**
   * The customer's email address.
   */
  email?: Maybe<ScalarsEnums['String']>;
  /**
   * The financial status of the order.
   */
  financialStatus?: Maybe<ScalarsEnums['OrderFinancialStatus']>;
  /**
   * The fulfillment status for the order.
   */
  fulfillmentStatus: ScalarsEnums['OrderFulfillmentStatus'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * List of the order’s line items.
   */
  lineItems: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => OrderLineItemConnection;
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * Unique identifier for the order that appears on the order.
   * For example, _#1000_ or _Store1001.
   */
  name: ScalarsEnums['String'];
  /**
   * A unique numeric identifier for the order for use by shop owner and customer.
   */
  orderNumber: ScalarsEnums['Int'];
  /**
   * The total cost of duties charged at checkout.
   */
  originalTotalDuties?: Maybe<MoneyV2>;
  /**
   * The total price of the order before any applied edits.
   */
  originalTotalPrice: MoneyV2;
  /**
   * The customer's phone number for receiving SMS notifications.
   */
  phone?: Maybe<ScalarsEnums['String']>;
  /**
   * The date and time when the order was imported.
   * This value can be set to dates in the past when importing from other systems.
   * If no value is provided, it will be auto-generated based on current date and time.
   */
  processedAt: ScalarsEnums['DateTime'];
  /**
   * The address to where the order will be shipped.
   */
  shippingAddress?: Maybe<MailingAddress>;
  /**
   * The discounts that have been allocated onto the shipping line by discount applications.
   */
  shippingDiscountAllocations: Array<DiscountAllocation>;
  /**
   * The unique URL for the order's status page.
   */
  statusUrl: ScalarsEnums['URL'];
  /**
   * Price of the order before shipping and taxes.
   */
  subtotalPrice?: Maybe<MoneyV2>;
  /**
   * Price of the order before duties, shipping and taxes.
   * @deprecated Use `subtotalPrice` instead.
   */
  subtotalPriceV2?: Maybe<MoneyV2>;
  /**
   * List of the order’s successful fulfillments.
   */
  successfulFulfillments: (args?: {
    /**
     * Truncate the array result to this size.
     */
    first?: Maybe<ScalarsEnums['Int']>;
  }) => Maybe<Array<Fulfillment>>;
  /**
   * The sum of all the prices of all the items in the order, duties, taxes and discounts included (must be positive).
   */
  totalPrice: MoneyV2;
  /**
   * The sum of all the prices of all the items in the order, duties, taxes and discounts included (must be positive).
   * @deprecated Use `totalPrice` instead.
   */
  totalPriceV2: MoneyV2;
  /**
   * The total amount that has been refunded.
   */
  totalRefunded: MoneyV2;
  /**
   * The total amount that has been refunded.
   * @deprecated Use `totalRefunded` instead.
   */
  totalRefundedV2: MoneyV2;
  /**
   * The total cost of shipping.
   */
  totalShippingPrice: MoneyV2;
  /**
   * The total cost of shipping.
   * @deprecated Use `totalShippingPrice` instead.
   */
  totalShippingPriceV2: MoneyV2;
  /**
   * The total cost of taxes.
   */
  totalTax?: Maybe<MoneyV2>;
  /**
   * The total cost of taxes.
   * @deprecated Use `totalTax` instead.
   */
  totalTaxV2?: Maybe<MoneyV2>;
}

/**
 * An auto-generated type for paginating through multiple Orders.
 */
export interface OrderConnection {
  __typename?: 'OrderConnection';
  /**
   * A list of edges.
   */
  edges: Array<OrderEdge>;
  /**
   * A list of the nodes contained in OrderEdge.
   */
  nodes: Array<Order>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
  /**
   * The total count of Orders.
   */
  totalCount: ScalarsEnums['UnsignedInt64'];
}

/**
 * An auto-generated type which holds one Order and a cursor during pagination.
 */
export interface OrderEdge {
  __typename?: 'OrderEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of OrderEdge.
   */
  node: Order;
}

/**
 * Represents a single line in an order. There is one line item for each distinct product variant.
 */
export interface OrderLineItem {
  __typename?: 'OrderLineItem';
  /**
   * The number of entries associated to the line item minus the items that have been removed.
   */
  currentQuantity: ScalarsEnums['Int'];
  /**
   * List of custom attributes associated to the line item.
   */
  customAttributes: Array<Attribute>;
  /**
   * The discounts that have been allocated onto the order line item by discount applications.
   */
  discountAllocations: Array<DiscountAllocation>;
  /**
   * The total price of the line item, including discounts, and displayed in the presentment currency.
   */
  discountedTotalPrice: MoneyV2;
  /**
   * The total price of the line item, not including any discounts. The total price is calculated using the original unit price multiplied by the quantity, and it's displayed in the presentment currency.
   */
  originalTotalPrice: MoneyV2;
  /**
   * The number of products variants associated to the line item.
   */
  quantity: ScalarsEnums['Int'];
  /**
   * The title of the product combined with title of the variant.
   */
  title: ScalarsEnums['String'];
  /**
   * The product variant object associated to the line item.
   */
  variant?: Maybe<ProductVariant>;
}

/**
 * An auto-generated type for paginating through multiple OrderLineItems.
 */
export interface OrderLineItemConnection {
  __typename?: 'OrderLineItemConnection';
  /**
   * A list of edges.
   */
  edges: Array<OrderLineItemEdge>;
  /**
   * A list of the nodes contained in OrderLineItemEdge.
   */
  nodes: Array<OrderLineItem>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one OrderLineItem and a cursor during pagination.
 */
export interface OrderLineItemEdge {
  __typename?: 'OrderLineItemEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of OrderLineItemEdge.
   */
  node: OrderLineItem;
}

/**
 * Shopify merchants can create pages to hold static HTML content. Each Page object represents a custom page on the online store.
 */
export interface Page {
  __typename?: 'Page';
  /**
   * The description of the page, complete with HTML formatting.
   */
  body: ScalarsEnums['HTML'];
  /**
   * Summary of the page body.
   */
  bodySummary: ScalarsEnums['String'];
  /**
   * The timestamp of the page creation.
   */
  createdAt: ScalarsEnums['DateTime'];
  /**
   * A human-friendly unique string for the page automatically generated from its title.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel.
   */
  onlineStoreUrl?: Maybe<ScalarsEnums['URL']>;
  /**
   * The page's SEO information.
   */
  seo?: Maybe<SEO>;
  /**
   * The title of the page.
   */
  title: ScalarsEnums['String'];
  /**
   * URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null.
   */
  trackingParameters?: Maybe<ScalarsEnums['String']>;
  /**
   * The timestamp of the latest page update.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * An auto-generated type for paginating through multiple Pages.
 */
export interface PageConnection {
  __typename?: 'PageConnection';
  /**
   * A list of edges.
   */
  edges: Array<PageEdge>;
  /**
   * A list of the nodes contained in PageEdge.
   */
  nodes: Array<Page>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Page and a cursor during pagination.
 */
export interface PageEdge {
  __typename?: 'PageEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of PageEdge.
   */
  node: Page;
}

/**
 * Returns information about pagination in a connection, in accordance with the
 * [Relay specification](https://relay.dev/graphql/connections.htm#sec-undefined.PageInfo).
 * For more information, please read our [GraphQL Pagination Usage Guide](https://shopify.dev/api/usage/pagination-graphql).
 */
export interface PageInfo {
  __typename?: 'PageInfo';
  /**
   * The cursor corresponding to the last node in edges.
   */
  endCursor?: Maybe<ScalarsEnums['String']>;
  /**
   * Whether there are more pages to fetch following the current page.
   */
  hasNextPage: ScalarsEnums['Boolean'];
  /**
   * Whether there are any pages prior to the current page.
   */
  hasPreviousPage: ScalarsEnums['Boolean'];
  /**
   * The cursor corresponding to the first node in edges.
   */
  startCursor?: Maybe<ScalarsEnums['String']>;
}

/**
 * Type for paginating through multiple sitemap's resources.
 */
export interface PaginatedSitemapResources {
  __typename?: 'PaginatedSitemapResources';
  /**
   * Whether there are more pages to fetch following the current page.
   */
  hasNextPage: ScalarsEnums['Boolean'];
  /**
   * List of sitemap resources for the current page.
   * Note: The number of items varies between 0 and 250 per page.
   */
  items: Array<SitemapResourceInterface>;
}

/**
 * Settings related to payments.
 */
export interface PaymentSettings {
  __typename?: 'PaymentSettings';
  /**
   * List of the card brands which the business entity accepts.
   */
  acceptedCardBrands: Array<ScalarsEnums['CardBrand']>;
  /**
   * The url pointing to the endpoint to vault credit cards.
   */
  cardVaultUrl: ScalarsEnums['URL'];
  /**
   * The country where the shop is located. When multiple business entities operate within the shop, then this will represent the country of the business entity that's serving the specified buyer context.
   */
  countryCode: ScalarsEnums['CountryCode'];
  /**
   * The three-letter code for the shop's primary currency.
   */
  currencyCode: ScalarsEnums['CurrencyCode'];
  /**
   * A list of enabled currencies (ISO 4217 format) that the shop accepts.
   * Merchants can enable currencies from their Shopify Payments settings in the Shopify admin.
   */
  enabledPresentmentCurrencies: Array<ScalarsEnums['CurrencyCode']>;
  /**
   * The shop’s Shopify Payments account ID.
   */
  shopifyPaymentsAccountId?: Maybe<ScalarsEnums['String']>;
  /**
   * List of the digital wallets which the business entity supports.
   */
  supportedDigitalWallets: Array<ScalarsEnums['DigitalWallet']>;
}

/**
 * A predictive search result represents a list of products, collections, pages, articles, and query suggestions
 * that matches the predictive search query.
 */
export interface PredictiveSearchResult {
  __typename?: 'PredictiveSearchResult';
  /**
   * The articles that match the search query.
   */
  articles: Array<Article>;
  /**
   * The articles that match the search query.
   */
  collections: Array<Collection>;
  /**
   * The pages that match the search query.
   */
  pages: Array<Page>;
  /**
   * The products that match the search query.
   */
  products: Array<Product>;
  /**
   * The query suggestions that are relevant to the search query.
   */
  queries: Array<SearchQuerySuggestion>;
}

/**
 * The value of the percentage pricing object.
 */
export interface PricingPercentageValue {
  __typename?: 'PricingPercentageValue';
  /**
   * The percentage value of the object.
   */
  percentage: ScalarsEnums['Float'];
}

/**
 * The price value (fixed or percentage) for a discount application.
 */
export interface PricingValue {
  __typename?: 'MoneyV2' | 'PricingPercentageValue';
  $on: $PricingValue;
}

/**
 * The `Product` object lets you manage products in a merchant’s store.
 *
 * Products are the goods and services that merchants offer to customers.
 * They can include various details such as title, description, price, images, and options such as size or color.
 * You can use [product variants](/docs/api/storefront/latest/objects/ProductVariant)
 * to create or update different versions of the same product.
 * You can also add or update product [media](/docs/api/storefront/latest/interfaces/Media).
 * Products can be organized by grouping them into a [collection](/docs/api/storefront/latest/objects/Collection).
 *
 * Learn more about working with [products and collections](/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 */
export interface Product {
  __typename?: 'Product';
  /**
   * A list of variants whose selected options differ with the provided selected options by one, ordered by variant id.
   * If selected options are not provided, adjacent variants to the first available variant is returned.
   *
   * Note that this field returns an array of variants. In most cases, the number of variants in this array will be low.
   * However, with a low number of options and a high number of values per option, the number of variants returned
   * here can be high. In such cases, it recommended to avoid using this field.
   *
   * This list of variants can be used in combination with the `options` field to build a rich variant picker that
   * includes variant availability or other variant information.
   */
  adjacentVariants: (args?: {
    /**
     * Whether to perform case insensitive match on option names and values.
     * @defaultValue `false`
     */
    caseInsensitiveMatch?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Whether to ignore product options that are not present on the requested product.
     * @defaultValue `true`
     */
    ignoreUnknownOptions?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * The input fields used for a selected option.
     *
     * The input must not contain more than `250` values.
     */
    selectedOptions?: Maybe<Array<SelectedOptionInput>>;
  }) => Array<ProductVariant>;
  /**
   * Indicates if at least one product variant is available for sale.
   */
  availableForSale: ScalarsEnums['Boolean'];
  /**
   * The category of a product from [Shopify's Standard Product Taxonomy](https://shopify.github.io/product-taxonomy/releases/unstable/?categoryId=sg-4-17-2-17).
   */
  category?: Maybe<TaxonomyCategory>;
  /**
   * A list of [collections](/docs/api/storefront/latest/objects/Collection) that include the product.
   */
  collections: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => CollectionConnection;
  /**
   * The [compare-at price range](https://help.shopify.com/manual/products/details/product-pricing/sale-pricing) of the product in the shop's default currency.
   */
  compareAtPriceRange: ProductPriceRange;
  /**
   * The date and time when the product was created.
   */
  createdAt: ScalarsEnums['DateTime'];
  /**
   * A single-line description of the product, with [HTML tags](https://developer.mozilla.org/en-US/docs/Web/HTML) removed.
   */
  description: (args?: {
    /**
     * Truncates a string after the given length.
     */
    truncateAt?: Maybe<ScalarsEnums['Int']>;
  }) => ScalarsEnums['String'];
  /**
   * The description of the product, with
   * HTML tags. For example, the description might include
   * bold `<strong></strong>` and italic `<i></i>` text.
   */
  descriptionHtml: ScalarsEnums['HTML'];
  /**
   * An encoded string containing all option value combinations
   * with a corresponding variant that is currently available for sale.
   *
   * Integers represent option and values:
   * [0,1] represents option_value at array index 0 for the option at array index 0
   *
   * `:`, `,`, ` ` and `-` are control characters.
   * `:` indicates a new option. ex: 0:1 indicates value 0 for the option in position 1, value 1 for the option in position 2.
   * `,` indicates the end of a repeated prefix, mulitple consecutive commas indicate the end of multiple repeated prefixes.
   * ` ` indicates a gap in the sequence of option values. ex: 0 4 indicates option values in position 0 and 4 are present.
   * `-` indicates a continuous range of option values. ex: 0 1-3 4
   *
   * Decoding process:
   *
   * Example options: [Size, Color, Material]
   * Example values: [[Small, Medium, Large], [Red, Blue], [Cotton, Wool]]
   * Example encoded string: "0:0:0,1:0-1,,1:0:0-1,1:1,,2:0:1,1:0,,"
   *
   * Step 1: Expand ranges into the numbers they represent: "0:0:0,1:0 1,,1:0:0 1,1:1,,2:0:1,1:0,,"
   * Step 2: Expand repeated prefixes: "0:0:0,0:1:0 1,1:0:0 1,1:1:1,2:0:1,2:1:0,"
   * Step 3: Expand shared prefixes so data is encoded as a string: "0:0:0,0:1:0,0:1:1,1:0:0,1:0:1,1:1:1,2:0:1,2:1:0,"
   * Step 4: Map to options + option values to determine existing variants:
   *
   * [Small, Red, Cotton] (0:0:0), [Small, Blue, Cotton] (0:1:0), [Small, Blue, Wool] (0:1:1),
   * [Medium, Red, Cotton] (1:0:0), [Medium, Red, Wool] (1:0:1), [Medium, Blue, Wool] (1:1:1),
   * [Large, Red, Wool] (2:0:1), [Large, Blue, Cotton] (2:1:0).
   */
  encodedVariantAvailability?: Maybe<ScalarsEnums['String']>;
  /**
   * An encoded string containing all option value combinations with a corresponding variant.
   *
   * Integers represent option and values:
   * [0,1] represents option_value at array index 0 for the option at array index 0
   *
   * `:`, `,`, ` ` and `-` are control characters.
   * `:` indicates a new option. ex: 0:1 indicates value 0 for the option in position 1, value 1 for the option in position 2.
   * `,` indicates the end of a repeated prefix, mulitple consecutive commas indicate the end of multiple repeated prefixes.
   * ` ` indicates a gap in the sequence of option values. ex: 0 4 indicates option values in position 0 and 4 are present.
   * `-` indicates a continuous range of option values. ex: 0 1-3 4
   *
   * Decoding process:
   *
   * Example options: [Size, Color, Material]
   * Example values: [[Small, Medium, Large], [Red, Blue], [Cotton, Wool]]
   * Example encoded string: "0:0:0,1:0-1,,1:0:0-1,1:1,,2:0:1,1:0,,"
   *
   * Step 1: Expand ranges into the numbers they represent: "0:0:0,1:0 1,,1:0:0 1,1:1,,2:0:1,1:0,,"
   * Step 2: Expand repeated prefixes: "0:0:0,0:1:0 1,1:0:0 1,1:1:1,2:0:1,2:1:0,"
   * Step 3: Expand shared prefixes so data is encoded as a string: "0:0:0,0:1:0,0:1:1,1:0:0,1:0:1,1:1:1,2:0:1,2:1:0,"
   * Step 4: Map to options + option values to determine existing variants:
   *
   * [Small, Red, Cotton] (0:0:0), [Small, Blue, Cotton] (0:1:0), [Small, Blue, Wool] (0:1:1),
   * [Medium, Red, Cotton] (1:0:0), [Medium, Red, Wool] (1:0:1), [Medium, Blue, Wool] (1:1:1),
   * [Large, Red, Wool] (2:0:1), [Large, Blue, Cotton] (2:1:0).
   */
  encodedVariantExistence?: Maybe<ScalarsEnums['String']>;
  /**
   * The featured image for the product.
   *
   * This field is functionally equivalent to `images(first: 1)`.
   */
  featuredImage?: Maybe<Image>;
  /**
   * A unique, human-readable string of the product's title.
   * A handle can contain letters, hyphens (`-`), and numbers, but no spaces.
   * The handle is used in the online store URL for the product.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * List of images associated with the product.
   */
  images: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Sort the underlying list by the given key.
     * @defaultValue `"POSITION"`
     */
    sortKey?: Maybe<ProductImageSortKeys>;
  }) => ImageConnection;
  /**
   * Whether the product is a gift card.
   */
  isGiftCard: ScalarsEnums['Boolean'];
  /**
   * The [media](/docs/apps/build/online-store/product-media) that are associated with the product. Valid media are images, 3D models, videos.
   */
  media: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Sort the underlying list by the given key.
     * @defaultValue `"POSITION"`
     */
    sortKey?: Maybe<ProductMediaSortKeys>;
  }) => MediaConnection;
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The product's URL on the online store.
   * If `null`, then the product isn't published to the online store sales channel.
   */
  onlineStoreUrl?: Maybe<ScalarsEnums['URL']>;
  /**
   * A list of product options. The limit is defined by the [shop's resource limits for product options](/docs/api/admin-graphql/latest/objects/Shop#field-resourcelimits) (`Shop.resourceLimits.maxProductOptions`).
   */
  options: (args?: {
    /**
     * Truncate the array result to this size.
     */
    first?: Maybe<ScalarsEnums['Int']>;
  }) => Array<ProductOption>;
  /**
   * The minimum and maximum prices of a product, expressed in decimal numbers.
   * For example, if the product is priced between $10.00 and $50.00,
   * then the price range is $10.00 - $50.00.
   */
  priceRange: ProductPriceRange;
  /**
   * The [product type](https://help.shopify.com/manual/products/details/product-type)
   * that merchants define.
   */
  productType: ScalarsEnums['String'];
  /**
   * The date and time when the product was published to the channel.
   */
  publishedAt: ScalarsEnums['DateTime'];
  /**
   * Whether the product can only be purchased with a [selling plan](/docs/apps/build/purchase-options/subscriptions/selling-plans). Products that are sold on subscription (`requiresSellingPlan: true`) can be updated only for online stores. If you update a product to be subscription-only (`requiresSellingPlan:false`), then the product is unpublished from all channels, except the online store.
   */
  requiresSellingPlan: ScalarsEnums['Boolean'];
  /**
   * Find an active product variant based on selected options, availability or the first variant.
   *
   * All arguments are optional. If no selected options are provided, the first available variant is returned.
   * If no variants are available, the first variant is returned.
   */
  selectedOrFirstAvailableVariant: (args?: {
    /**
     * Whether to perform case insensitive match on option names and values.
     * @defaultValue `false`
     */
    caseInsensitiveMatch?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Whether to ignore unknown product options.
     * @defaultValue `true`
     */
    ignoreUnknownOptions?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * The input fields used for a selected option.
     *
     * The input must not contain more than `250` values.
     */
    selectedOptions?: Maybe<Array<SelectedOptionInput>>;
  }) => Maybe<ProductVariant>;
  /**
   * A list of all [selling plan groups](/docs/apps/build/purchase-options/subscriptions/selling-plans/build-a-selling-plan) that are associated with the product either directly, or through the product's variants.
   */
  sellingPlanGroups: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => SellingPlanGroupConnection;
  /**
   * The [SEO title and description](https://help.shopify.com/manual/promoting-marketing/seo/adding-keywords)
   * that are associated with a product.
   */
  seo: SEO;
  /**
   * A comma-separated list of searchable keywords that are
   * associated with the product. For example, a merchant might apply the `sports`
   * and `summer` tags to products that are associated with sportwear for summer.
   * Updating `tags` overwrites any existing tags that were previously added to the product.
   * To add new tags without overwriting existing tags,
   * use the GraphQL Admin API's [`tagsAdd`](/docs/api/admin-graphql/latest/mutations/tagsadd)
   * mutation.
   */
  tags: Array<ScalarsEnums['String']>;
  /**
   * The name for the product that displays to customers. The title is used to construct the product's handle.
   * For example, if a product is titled "Black Sunglasses", then the handle is `black-sunglasses`.
   */
  title: ScalarsEnums['String'];
  /**
   * The quantity of inventory that's in stock.
   */
  totalInventory?: Maybe<ScalarsEnums['Int']>;
  /**
   * URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null.
   */
  trackingParameters?: Maybe<ScalarsEnums['String']>;
  /**
   * The date and time when the product was last modified.
   * A product's `updatedAt` value can change for different reasons. For example, if an order
   * is placed for a product that has inventory tracking set up, then the inventory adjustment
   * is counted as an update.
   */
  updatedAt: ScalarsEnums['DateTime'];
  /**
   * Find a product’s variant based on its selected options.
   * This is useful for converting a user’s selection of product options into a single matching variant.
   * If there is not a variant for the selected options, `null` will be returned.
   */
  variantBySelectedOptions: (args: {
    /**
     * Whether to perform case insensitive match on option names and values.
     * @defaultValue `false`
     */
    caseInsensitiveMatch?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Whether to ignore unknown product options.
     * @defaultValue `false`
     */
    ignoreUnknownOptions?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * The input fields used for a selected option.
     *
     * The input must not contain more than `250` values.
     */
    selectedOptions: Array<SelectedOptionInput>;
  }) => Maybe<ProductVariant>;
  /**
   * A list of [variants](/docs/api/storefront/latest/objects/ProductVariant) that are associated with the product.
   */
  variants: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    /**
     * Sort the underlying list by the given key.
     * @defaultValue `"POSITION"`
     */
    sortKey?: Maybe<ProductVariantSortKeys>;
  }) => ProductVariantConnection;
  /**
   * The number of [variants](/docs/api/storefront/latest/objects/ProductVariant) that are associated with the product.
   */
  variantsCount?: Maybe<Count>;
  /**
   * The name of the product's vendor.
   */
  vendor: ScalarsEnums['String'];
}

/**
 * An auto-generated type for paginating through multiple Products.
 */
export interface ProductConnection {
  __typename?: 'ProductConnection';
  /**
   * A list of edges.
   */
  edges: Array<ProductEdge>;
  /**
   * A list of available filters.
   */
  filters: Array<Filter>;
  /**
   * A list of the nodes contained in ProductEdge.
   */
  nodes: Array<Product>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one Product and a cursor during pagination.
 */
export interface ProductEdge {
  __typename?: 'ProductEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of ProductEdge.
   */
  node: Product;
}

/**
 * Product property names like "Size", "Color", and "Material" that the customers can select.
 * Variants are selected based on permutations of these options.
 * 255 characters limit each.
 */
export interface ProductOption {
  __typename?: 'ProductOption';
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The product option’s name.
   */
  name: ScalarsEnums['String'];
  /**
   * The corresponding option value to the product option.
   */
  optionValues: Array<ProductOptionValue>;
  /**
   * The corresponding value to the product option name.
   * @deprecated Use `optionValues` instead.
   */
  values: Array<ScalarsEnums['String']>;
}

/**
 * The product option value names. For example, "Red", "Blue", and "Green" for a "Color" option.
 */
export interface ProductOptionValue {
  __typename?: 'ProductOptionValue';
  /**
   * The product variant that combines this option value with the
   * lowest-position option values for all other options.
   *
   * This field will always return a variant, provided a variant including this option value exists.
   */
  firstSelectableVariant?: Maybe<ProductVariant>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The name of the product option value.
   */
  name: ScalarsEnums['String'];
  /**
   * The swatch of the product option value.
   */
  swatch?: Maybe<ProductOptionValueSwatch>;
}

/**
 * The product option value swatch.
 */
export interface ProductOptionValueSwatch {
  __typename?: 'ProductOptionValueSwatch';
  /**
   * The swatch color.
   */
  color?: Maybe<ScalarsEnums['Color']>;
  /**
   * The swatch image.
   */
  image?: Maybe<Media>;
}

/**
 * The price range of the product.
 */
export interface ProductPriceRange {
  __typename?: 'ProductPriceRange';
  /**
   * The highest variant's price.
   */
  maxVariantPrice: MoneyV2;
  /**
   * The lowest variant's price.
   */
  minVariantPrice: MoneyV2;
}

/**
 * A product variant represents a different version of a product, such as differing sizes or differing colors.
 */
export interface ProductVariant {
  __typename?: 'ProductVariant';
  /**
   * Indicates if the product variant is available for sale.
   */
  availableForSale: ScalarsEnums['Boolean'];
  /**
   * The barcode (for example, ISBN, UPC, or GTIN) associated with the variant.
   */
  barcode?: Maybe<ScalarsEnums['String']>;
  /**
   * The compare at price of the variant. This can be used to mark a variant as on sale, when `compareAtPrice` is higher than `price`.
   */
  compareAtPrice?: Maybe<MoneyV2>;
  /**
   * The compare at price of the variant. This can be used to mark a variant as on sale, when `compareAtPriceV2` is higher than `priceV2`.
   * @deprecated Use `compareAtPrice` instead.
   */
  compareAtPriceV2?: Maybe<MoneyV2>;
  /**
   * List of bundles components included in the variant considering only fixed bundles.
   */
  components: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
  }) => ProductVariantComponentConnection;
  /**
   * Whether a product is out of stock but still available for purchase (used for backorders).
   */
  currentlyNotInStock: ScalarsEnums['Boolean'];
  /**
   * List of bundles that include this variant considering only fixed bundles.
   */
  groupedBy: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
  }) => ProductVariantConnection;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * Image associated with the product variant. This field falls back to the product image if no image is available.
   */
  image?: Maybe<Image>;
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The product variant’s price.
   */
  price: MoneyV2;
  /**
   * The product variant’s price.
   * @deprecated Use `price` instead.
   */
  priceV2: MoneyV2;
  /**
   * The product object that the product variant belongs to.
   */
  product: Product;
  /**
   * The total sellable quantity of the variant for online sales channels.
   */
  quantityAvailable?: Maybe<ScalarsEnums['Int']>;
  /**
   * A list of quantity breaks for the product variant.
   */
  quantityPriceBreaks: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
  }) => QuantityPriceBreakConnection;
  /**
   * The quantity rule for the product variant in a given context.
   */
  quantityRule: QuantityRule;
  /**
   * Whether a product variant requires components. The default value is `false`.
   * If `true`, then the product variant can only be purchased as a parent bundle with components.
   */
  requiresComponents: ScalarsEnums['Boolean'];
  /**
   * Whether a customer needs to provide a shipping address when placing an order for the product variant.
   */
  requiresShipping: ScalarsEnums['Boolean'];
  /**
   * List of product options applied to the variant.
   */
  selectedOptions: Array<SelectedOption>;
  /**
   * Represents an association between a variant and a selling plan. Selling plan allocations describe which selling plans are available for each variant, and what their impact is on pricing.
   */
  sellingPlanAllocations: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => SellingPlanAllocationConnection;
  /**
   * The Shop Pay Installments pricing information for the product variant.
   */
  shopPayInstallmentsPricing?: Maybe<ShopPayInstallmentsProductVariantPricing>;
  /**
   * The SKU (stock keeping unit) associated with the variant.
   */
  sku?: Maybe<ScalarsEnums['String']>;
  /**
   * The in-store pickup availability of this variant by location.
   */
  storeAvailability: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Used to sort results based on proximity to the provided location.
     */
    near?: Maybe<GeoCoordinateInput>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => StoreAvailabilityConnection;
  /**
   * Whether tax is charged when the product variant is sold.
   */
  taxable: ScalarsEnums['Boolean'];
  /**
   * The product variant’s title.
   */
  title: ScalarsEnums['String'];
  /**
   * The unit price value for the variant based on the variant's measurement.
   */
  unitPrice?: Maybe<MoneyV2>;
  /**
   * The unit price measurement for the variant.
   */
  unitPriceMeasurement?: Maybe<UnitPriceMeasurement>;
  /**
   * The weight of the product variant in the unit system specified with `weight_unit`.
   */
  weight?: Maybe<ScalarsEnums['Float']>;
  /**
   * Unit of measurement for weight.
   */
  weightUnit: ScalarsEnums['WeightUnit'];
}

/**
 * Represents a component of a bundle variant.
 */
export interface ProductVariantComponent {
  __typename?: 'ProductVariantComponent';
  /**
   * The product variant object that the component belongs to.
   */
  productVariant: ProductVariant;
  /**
   * The quantity of component present in the bundle.
   */
  quantity: ScalarsEnums['Int'];
}

/**
 * An auto-generated type for paginating through multiple ProductVariantComponents.
 */
export interface ProductVariantComponentConnection {
  __typename?: 'ProductVariantComponentConnection';
  /**
   * A list of edges.
   */
  edges: Array<ProductVariantComponentEdge>;
  /**
   * A list of the nodes contained in ProductVariantComponentEdge.
   */
  nodes: Array<ProductVariantComponent>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one ProductVariantComponent and a cursor during pagination.
 */
export interface ProductVariantComponentEdge {
  __typename?: 'ProductVariantComponentEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of ProductVariantComponentEdge.
   */
  node: ProductVariantComponent;
}

/**
 * An auto-generated type for paginating through multiple ProductVariants.
 */
export interface ProductVariantConnection {
  __typename?: 'ProductVariantConnection';
  /**
   * A list of edges.
   */
  edges: Array<ProductVariantEdge>;
  /**
   * A list of the nodes contained in ProductVariantEdge.
   */
  nodes: Array<ProductVariant>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one ProductVariant and a cursor during pagination.
 */
export interface ProductVariantEdge {
  __typename?: 'ProductVariantEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of ProductVariantEdge.
   */
  node: ProductVariant;
}

/**
 * Represents information about the buyer that is interacting with the cart.
 */
export interface PurchasingCompany {
  __typename?: 'PurchasingCompany';
  /**
   * The company associated to the order or draft order.
   */
  company: Company;
  /**
   * The company contact associated to the order or draft order.
   */
  contact?: Maybe<CompanyContact>;
  /**
   * The company location associated to the order or draft order.
   */
  location: CompanyLocation;
}

/**
 * Quantity price breaks lets you offer different rates that are based on the
 * amount of a specific variant being ordered.
 */
export interface QuantityPriceBreak {
  __typename?: 'QuantityPriceBreak';
  /**
   * Minimum quantity required to reach new quantity break price.
   */
  minimumQuantity: ScalarsEnums['Int'];
  /**
   * The price of variant after reaching the minimum quanity.
   */
  price: MoneyV2;
}

/**
 * An auto-generated type for paginating through multiple QuantityPriceBreaks.
 */
export interface QuantityPriceBreakConnection {
  __typename?: 'QuantityPriceBreakConnection';
  /**
   * A list of edges.
   */
  edges: Array<QuantityPriceBreakEdge>;
  /**
   * A list of the nodes contained in QuantityPriceBreakEdge.
   */
  nodes: Array<QuantityPriceBreak>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one QuantityPriceBreak and a cursor during pagination.
 */
export interface QuantityPriceBreakEdge {
  __typename?: 'QuantityPriceBreakEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of QuantityPriceBreakEdge.
   */
  node: QuantityPriceBreak;
}

/**
 * The quantity rule for the product variant in a given context.
 */
export interface QuantityRule {
  __typename?: 'QuantityRule';
  /**
   * The value that specifies the quantity increment between minimum and maximum of the rule.
   * Only quantities divisible by this value will be considered valid.
   *
   * The increment must be lower than or equal to the minimum and the maximum, and both minimum and maximum
   * must be divisible by this value.
   */
  increment: ScalarsEnums['Int'];
  /**
   * An optional value that defines the highest allowed quantity purchased by the customer.
   * If defined, maximum must be lower than or equal to the minimum and must be a multiple of the increment.
   */
  maximum?: Maybe<ScalarsEnums['Int']>;
  /**
   * The value that defines the lowest allowed quantity purchased by the customer.
   * The minimum must be a multiple of the quantity rule's increment.
   */
  minimum: ScalarsEnums['Int'];
}

/**
 * SEO information.
 */
export interface SEO {
  __typename?: 'SEO';
  /**
   * The meta description.
   */
  description?: Maybe<ScalarsEnums['String']>;
  /**
   * The SEO title.
   */
  title?: Maybe<ScalarsEnums['String']>;
}

/**
 * Script discount applications capture the intentions of a discount that
 * was created by a Shopify Script.
 */
export interface ScriptDiscountApplication {
  __typename?: 'ScriptDiscountApplication';
  /**
   * The method by which the discount's value is allocated to its entitled items.
   */
  allocationMethod: ScalarsEnums['DiscountApplicationAllocationMethod'];
  /**
   * Which lines of targetType that the discount is allocated over.
   */
  targetSelection: ScalarsEnums['DiscountApplicationTargetSelection'];
  /**
   * The type of line that the discount is applicable towards.
   */
  targetType: ScalarsEnums['DiscountApplicationTargetType'];
  /**
   * The title of the application as defined by the Script.
   */
  title: ScalarsEnums['String'];
  /**
   * The value of the discount application.
   */
  value: PricingValue;
}

/**
 * A search query suggestion.
 */
export interface SearchQuerySuggestion {
  __typename?: 'SearchQuerySuggestion';
  /**
   * The text of the search query suggestion with highlighted HTML tags.
   */
  styledText: ScalarsEnums['String'];
  /**
   * The text of the search query suggestion.
   */
  text: ScalarsEnums['String'];
  /**
   * URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null.
   */
  trackingParameters?: Maybe<ScalarsEnums['String']>;
}

/**
 * A search result that matches the search query.
 */
export interface SearchResultItem {
  __typename?: 'Article' | 'Page' | 'Product';
  $on: $SearchResultItem;
}

/**
 * An auto-generated type for paginating through multiple SearchResultItems.
 */
export interface SearchResultItemConnection {
  __typename?: 'SearchResultItemConnection';
  /**
   * A list of edges.
   */
  edges: Array<SearchResultItemEdge>;
  /**
   * A list of the nodes contained in SearchResultItemEdge.
   */
  nodes: Array<SearchResultItem>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
  /**
   * A list of available filters.
   */
  productFilters: Array<Filter>;
  /**
   * The total number of results.
   */
  totalCount: ScalarsEnums['Int'];
}

/**
 * An auto-generated type which holds one SearchResultItem and a cursor during pagination.
 */
export interface SearchResultItemEdge {
  __typename?: 'SearchResultItemEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of SearchResultItemEdge.
   */
  node: SearchResultItem;
}

/**
 * Properties used by customers to select a product variant.
 * Products can have multiple options, like different sizes or colors.
 */
export interface SelectedOption {
  __typename?: 'SelectedOption';
  /**
   * The product option’s name.
   */
  name: ScalarsEnums['String'];
  /**
   * The product option’s value.
   */
  value: ScalarsEnums['String'];
}

/**
 * Represents how products and variants can be sold and purchased.
 */
export interface SellingPlan {
  __typename?: 'SellingPlan';
  /**
   * The billing policy for the selling plan.
   */
  billingPolicy?: Maybe<SellingPlanBillingPolicy>;
  /**
   * The initial payment due for the purchase.
   */
  checkoutCharge: SellingPlanCheckoutCharge;
  /**
   * The delivery policy for the selling plan.
   */
  deliveryPolicy?: Maybe<SellingPlanDeliveryPolicy>;
  /**
   * The description of the selling plan.
   */
  description?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * The name of the selling plan. For example, '6 weeks of prepaid granola, delivered weekly'.
   */
  name: ScalarsEnums['String'];
  /**
   * The selling plan options available in the drop-down list in the storefront. For example, 'Delivery every week' or 'Delivery every 2 weeks' specifies the delivery frequency options for the product. Individual selling plans contribute their options to the associated selling plan group. For example, a selling plan group might have an option called `option1: Delivery every`. One selling plan in that group could contribute `option1: 2 weeks` with the pricing for that option, and another selling plan could contribute `option1: 4 weeks`, with different pricing.
   */
  options: Array<SellingPlanOption>;
  /**
   * The price adjustments that a selling plan makes when a variant is purchased with a selling plan.
   */
  priceAdjustments: Array<SellingPlanPriceAdjustment>;
  /**
   * Whether purchasing the selling plan will result in multiple deliveries.
   */
  recurringDeliveries: ScalarsEnums['Boolean'];
}

/**
 * Represents an association between a variant and a selling plan. Selling plan allocations describe the options offered for each variant, and the price of the variant when purchased with a selling plan.
 */
export interface SellingPlanAllocation {
  __typename?: 'SellingPlanAllocation';
  /**
   * The checkout charge amount due for the purchase.
   */
  checkoutChargeAmount: MoneyV2;
  /**
   * A list of price adjustments, with a maximum of two. When there are two, the first price adjustment goes into effect at the time of purchase, while the second one starts after a certain number of orders. A price adjustment represents how a selling plan affects pricing when a variant is purchased with a selling plan. Prices display in the customer's currency if the shop is configured for it.
   */
  priceAdjustments: Array<SellingPlanAllocationPriceAdjustment>;
  /**
   * The remaining balance charge amount due for the purchase.
   */
  remainingBalanceChargeAmount: MoneyV2;
  /**
   * A representation of how products and variants can be sold and purchased. For example, an individual selling plan could be '6 weeks of prepaid granola, delivered weekly'.
   */
  sellingPlan: SellingPlan;
}

/**
 * An auto-generated type for paginating through multiple SellingPlanAllocations.
 */
export interface SellingPlanAllocationConnection {
  __typename?: 'SellingPlanAllocationConnection';
  /**
   * A list of edges.
   */
  edges: Array<SellingPlanAllocationEdge>;
  /**
   * A list of the nodes contained in SellingPlanAllocationEdge.
   */
  nodes: Array<SellingPlanAllocation>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one SellingPlanAllocation and a cursor during pagination.
 */
export interface SellingPlanAllocationEdge {
  __typename?: 'SellingPlanAllocationEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of SellingPlanAllocationEdge.
   */
  node: SellingPlanAllocation;
}

/**
 * The resulting prices for variants when they're purchased with a specific selling plan.
 */
export interface SellingPlanAllocationPriceAdjustment {
  __typename?: 'SellingPlanAllocationPriceAdjustment';
  /**
   * The price of the variant when it's purchased without a selling plan for the same number of deliveries. For example, if a customer purchases 6 deliveries of $10.00 granola separately, then the price is 6 x $10.00 = $60.00.
   */
  compareAtPrice: MoneyV2;
  /**
   * The effective price for a single delivery. For example, for a prepaid subscription plan that includes 6 deliveries at the price of $48.00, the per delivery price is $8.00.
   */
  perDeliveryPrice: MoneyV2;
  /**
   * The price of the variant when it's purchased with a selling plan For example, for a prepaid subscription plan that includes 6 deliveries of $10.00 granola, where the customer gets 20% off, the price is 6 x $10.00 x 0.80 = $48.00.
   */
  price: MoneyV2;
  /**
   * The resulting price per unit for the variant associated with the selling plan. If the variant isn't sold by quantity or measurement, then this field returns `null`.
   */
  unitPrice?: Maybe<MoneyV2>;
}

/**
 * The selling plan billing policy.
 */
export interface SellingPlanBillingPolicy {
  __typename?: 'SellingPlanRecurringBillingPolicy';
  $on: $SellingPlanBillingPolicy;
}

/**
 * The initial payment due for the purchase.
 */
export interface SellingPlanCheckoutCharge {
  __typename?: 'SellingPlanCheckoutCharge';
  /**
   * The charge type for the checkout charge.
   */
  type: ScalarsEnums['SellingPlanCheckoutChargeType'];
  /**
   * The charge value for the checkout charge.
   */
  value: SellingPlanCheckoutChargeValue;
}

/**
 * The percentage value of the price used for checkout charge.
 */
export interface SellingPlanCheckoutChargePercentageValue {
  __typename?: 'SellingPlanCheckoutChargePercentageValue';
  /**
   * The percentage value of the price used for checkout charge.
   */
  percentage: ScalarsEnums['Float'];
}

/**
 * The portion of the price to be charged at checkout.
 */
export interface SellingPlanCheckoutChargeValue {
  __typename?: 'MoneyV2' | 'SellingPlanCheckoutChargePercentageValue';
  $on: $SellingPlanCheckoutChargeValue;
}

/**
 * An auto-generated type for paginating through multiple SellingPlans.
 */
export interface SellingPlanConnection {
  __typename?: 'SellingPlanConnection';
  /**
   * A list of edges.
   */
  edges: Array<SellingPlanEdge>;
  /**
   * A list of the nodes contained in SellingPlanEdge.
   */
  nodes: Array<SellingPlan>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * The selling plan delivery policy.
 */
export interface SellingPlanDeliveryPolicy {
  __typename?: 'SellingPlanRecurringDeliveryPolicy';
  $on: $SellingPlanDeliveryPolicy;
}

/**
 * An auto-generated type which holds one SellingPlan and a cursor during pagination.
 */
export interface SellingPlanEdge {
  __typename?: 'SellingPlanEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of SellingPlanEdge.
   */
  node: SellingPlan;
}

/**
 * A fixed amount that's deducted from the original variant price. For example, $10.00 off.
 */
export interface SellingPlanFixedAmountPriceAdjustment {
  __typename?: 'SellingPlanFixedAmountPriceAdjustment';
  /**
   * The money value of the price adjustment.
   */
  adjustmentAmount: MoneyV2;
}

/**
 * A fixed price adjustment for a variant that's purchased with a selling plan.
 */
export interface SellingPlanFixedPriceAdjustment {
  __typename?: 'SellingPlanFixedPriceAdjustment';
  /**
   * A new price of the variant when it's purchased with the selling plan.
   */
  price: MoneyV2;
}

/**
 * Represents a selling method. For example, 'Subscribe and save' is a selling method where customers pay for goods or services per delivery. A selling plan group contains individual selling plans.
 */
export interface SellingPlanGroup {
  __typename?: 'SellingPlanGroup';
  /**
   * A display friendly name for the app that created the selling plan group.
   */
  appName?: Maybe<ScalarsEnums['String']>;
  /**
   * The name of the selling plan group.
   */
  name: ScalarsEnums['String'];
  /**
   * Represents the selling plan options available in the drop-down list in the storefront. For example, 'Delivery every week' or 'Delivery every 2 weeks' specifies the delivery frequency options for the product.
   */
  options: Array<SellingPlanGroupOption>;
  /**
   * A list of selling plans in a selling plan group. A selling plan is a representation of how products and variants can be sold and purchased. For example, an individual selling plan could be '6 weeks of prepaid granola, delivered weekly'.
   */
  sellingPlans: (args?: {
    /**
     * Returns the elements that come after the specified cursor.
     */
    after?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns the elements that come before the specified cursor.
     */
    before?: Maybe<ScalarsEnums['String']>;
    /**
     * Returns up to the first `n` elements from the list.
     */
    first?: Maybe<ScalarsEnums['Int']>;
    /**
     * Returns up to the last `n` elements from the list.
     */
    last?: Maybe<ScalarsEnums['Int']>;
    /**
     * Reverse the order of the underlying list.
     * @defaultValue `false`
     */
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => SellingPlanConnection;
}

/**
 * An auto-generated type for paginating through multiple SellingPlanGroups.
 */
export interface SellingPlanGroupConnection {
  __typename?: 'SellingPlanGroupConnection';
  /**
   * A list of edges.
   */
  edges: Array<SellingPlanGroupEdge>;
  /**
   * A list of the nodes contained in SellingPlanGroupEdge.
   */
  nodes: Array<SellingPlanGroup>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one SellingPlanGroup and a cursor during pagination.
 */
export interface SellingPlanGroupEdge {
  __typename?: 'SellingPlanGroupEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of SellingPlanGroupEdge.
   */
  node: SellingPlanGroup;
}

/**
 * Represents an option on a selling plan group that's available in the drop-down list in the storefront.
 *
 * Individual selling plans contribute their options to the associated selling plan group. For example, a selling plan group might have an option called `option1: Delivery every`. One selling plan in that group could contribute `option1: 2 weeks` with the pricing for that option, and another selling plan could contribute `option1: 4 weeks`, with different pricing.
 */
export interface SellingPlanGroupOption {
  __typename?: 'SellingPlanGroupOption';
  /**
   * The name of the option. For example, 'Delivery every'.
   */
  name: ScalarsEnums['String'];
  /**
   * The values for the options specified by the selling plans in the selling plan group. For example, '1 week', '2 weeks', '3 weeks'.
   */
  values: Array<ScalarsEnums['String']>;
}

/**
 * An option provided by a Selling Plan.
 */
export interface SellingPlanOption {
  __typename?: 'SellingPlanOption';
  /**
   * The name of the option (ie "Delivery every").
   */
  name?: Maybe<ScalarsEnums['String']>;
  /**
   * The value of the option (ie "Month").
   */
  value?: Maybe<ScalarsEnums['String']>;
}

/**
 * A percentage amount that's deducted from the original variant price. For example, 10% off.
 */
export interface SellingPlanPercentagePriceAdjustment {
  __typename?: 'SellingPlanPercentagePriceAdjustment';
  /**
   * The percentage value of the price adjustment.
   */
  adjustmentPercentage: ScalarsEnums['Int'];
}

/**
 * Represents by how much the price of a variant associated with a selling plan is adjusted. Each variant can have up to two price adjustments. If a variant has multiple price adjustments, then the first price adjustment applies when the variant is initially purchased. The second price adjustment applies after a certain number of orders (specified by the `orderCount` field) are made. If a selling plan doesn't have any price adjustments, then the unadjusted price of the variant is the effective price.
 */
export interface SellingPlanPriceAdjustment {
  __typename?: 'SellingPlanPriceAdjustment';
  /**
   * The type of price adjustment. An adjustment value can have one of three types: percentage, amount off, or a new price.
   */
  adjustmentValue: SellingPlanPriceAdjustmentValue;
  /**
   * The number of orders that the price adjustment applies to. If the price adjustment always applies, then this field is `null`.
   */
  orderCount?: Maybe<ScalarsEnums['Int']>;
}

/**
 * Represents by how much the price of a variant associated with a selling plan is adjusted. Each variant can have up to two price adjustments.
 */
export interface SellingPlanPriceAdjustmentValue {
  __typename?:
    | 'SellingPlanFixedAmountPriceAdjustment'
    | 'SellingPlanFixedPriceAdjustment'
    | 'SellingPlanPercentagePriceAdjustment';
  $on: $SellingPlanPriceAdjustmentValue;
}

/**
 * The recurring billing policy for the selling plan.
 */
export interface SellingPlanRecurringBillingPolicy {
  __typename?: 'SellingPlanRecurringBillingPolicy';
  /**
   * The billing frequency, it can be either: day, week, month or year.
   */
  interval: ScalarsEnums['SellingPlanInterval'];
  /**
   * The number of intervals between billings.
   */
  intervalCount: ScalarsEnums['Int'];
}

/**
 * The recurring delivery policy for the selling plan.
 */
export interface SellingPlanRecurringDeliveryPolicy {
  __typename?: 'SellingPlanRecurringDeliveryPolicy';
  /**
   * The delivery frequency, it can be either: day, week, month or year.
   */
  interval: ScalarsEnums['SellingPlanInterval'];
  /**
   * The number of intervals between deliveries.
   */
  intervalCount: ScalarsEnums['Int'];
}

/**
 * Shop represents a collection of the general settings and information about the shop.
 */
export interface Shop {
  __typename?: 'Shop';
  /**
   * The shop's branding configuration.
   */
  brand?: Maybe<Brand>;
  /**
   * A description of the shop.
   */
  description?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information.
   */
  metafield: (args: {
    /**
     * The identifier for the metafield.
     */
    key: ScalarsEnums['String'];
    /**
     * The container the metafield belongs to. If omitted, the app-reserved namespace will be used.
     */
    namespace?: Maybe<ScalarsEnums['String']>;
  }) => Maybe<Metafield>;
  /**
   * A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource.
   */
  metafields: (args: {
    /**
     * The list of metafields to retrieve by namespace and key.
     *
     * The input must not contain more than `250` values.
     */
    identifiers: Array<HasMetafieldsIdentifier>;
  }) => Array<Maybe<Metafield>>;
  /**
   * A string representing the way currency is formatted when the currency isn’t specified.
   */
  moneyFormat: ScalarsEnums['String'];
  /**
   * The shop’s name.
   */
  name: ScalarsEnums['String'];
  /**
   * Settings related to payments.
   */
  paymentSettings: PaymentSettings;
  /**
   * The primary domain of the shop’s Online Store.
   */
  primaryDomain: Domain;
  /**
   * The shop’s privacy policy.
   */
  privacyPolicy?: Maybe<ShopPolicy>;
  /**
   * The shop’s refund policy.
   */
  refundPolicy?: Maybe<ShopPolicy>;
  /**
   * The shop’s shipping policy.
   */
  shippingPolicy?: Maybe<ShopPolicy>;
  /**
   * Countries that the shop ships to.
   */
  shipsToCountries: Array<ScalarsEnums['CountryCode']>;
  /**
   * The Shop Pay Installments pricing information for the shop.
   */
  shopPayInstallmentsPricing?: Maybe<ShopPayInstallmentsPricing>;
  /**
   * The shop’s subscription policy.
   */
  subscriptionPolicy?: Maybe<ShopPolicyWithDefault>;
  /**
   * The shop’s terms of service.
   */
  termsOfService?: Maybe<ShopPolicy>;
}

/**
 * The financing plan in Shop Pay Installments.
 */
export interface ShopPayInstallmentsFinancingPlan {
  __typename?: 'ShopPayInstallmentsFinancingPlan';
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The maximum price to qualify for the financing plan.
   */
  maxPrice: MoneyV2;
  /**
   * The minimum price to qualify for the financing plan.
   */
  minPrice: MoneyV2;
  /**
   * The terms of the financing plan.
   */
  terms: Array<ShopPayInstallmentsFinancingPlanTerm>;
}

/**
 * The terms of the financing plan in Shop Pay Installments.
 */
export interface ShopPayInstallmentsFinancingPlanTerm {
  __typename?: 'ShopPayInstallmentsFinancingPlanTerm';
  /**
   * The annual percentage rate (APR) of the financing plan.
   */
  apr: ScalarsEnums['Int'];
  /**
   * The payment frequency for the financing plan.
   */
  frequency: ScalarsEnums['ShopPayInstallmentsFinancingPlanFrequency'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The number of installments for the financing plan.
   */
  installmentsCount?: Maybe<Count>;
  /**
   * The type of loan for the financing plan.
   */
  loanType: ScalarsEnums['ShopPayInstallmentsLoan'];
}

/**
 * The result for a Shop Pay Installments pricing request.
 */
export interface ShopPayInstallmentsPricing {
  __typename?: 'ShopPayInstallmentsPricing';
  /**
   * The financing plans available for the given price range.
   */
  financingPlans: Array<ShopPayInstallmentsFinancingPlan>;
  /**
   * The maximum price to qualify for financing.
   */
  maxPrice: MoneyV2;
  /**
   * The minimum price to qualify for financing.
   */
  minPrice: MoneyV2;
}

/**
 * The shop pay installments pricing information for a product variant.
 */
export interface ShopPayInstallmentsProductVariantPricing {
  __typename?: 'ShopPayInstallmentsProductVariantPricing';
  /**
   * Whether the product variant is available.
   */
  available: ScalarsEnums['Boolean'];
  /**
   * Whether the product variant is eligible for Shop Pay Installments.
   */
  eligible: ScalarsEnums['Boolean'];
  /**
   * The full price of the product variant.
   */
  fullPrice: MoneyV2;
  /**
   * The ID of the product variant.
   */
  id: ScalarsEnums['ID'];
  /**
   * The number of payment terms available for the product variant.
   */
  installmentsCount?: Maybe<Count>;
  /**
   * The price per term for the product variant.
   */
  pricePerTerm: MoneyV2;
}

/**
 * Represents a Shop Pay payment request.
 */
export interface ShopPayPaymentRequest {
  __typename?: 'ShopPayPaymentRequest';
  /**
   * The delivery methods for the payment request.
   */
  deliveryMethods: Array<ShopPayPaymentRequestDeliveryMethod>;
  /**
   * The discount codes for the payment request.
   */
  discountCodes: Array<ScalarsEnums['String']>;
  /**
   * The discounts for the payment request order.
   */
  discounts?: Maybe<Array<ShopPayPaymentRequestDiscount>>;
  /**
   * The line items for the payment request.
   */
  lineItems: Array<ShopPayPaymentRequestLineItem>;
  /**
   * The locale for the payment request.
   */
  locale: ScalarsEnums['String'];
  /**
   * The presentment currency for the payment request.
   */
  presentmentCurrency: ScalarsEnums['CurrencyCode'];
  /**
   * The delivery method type for the payment request.
   */
  selectedDeliveryMethodType: ScalarsEnums['ShopPayPaymentRequestDeliveryMethodType'];
  /**
   * The shipping address for the payment request.
   */
  shippingAddress?: Maybe<ShopPayPaymentRequestContactField>;
  /**
   * The shipping lines for the payment request.
   */
  shippingLines: Array<ShopPayPaymentRequestShippingLine>;
  /**
   * The subtotal amount for the payment request.
   */
  subtotal: MoneyV2;
  /**
   * The total amount for the payment request.
   */
  total: MoneyV2;
  /**
   * The total shipping price for the payment request.
   */
  totalShippingPrice?: Maybe<ShopPayPaymentRequestTotalShippingPrice>;
  /**
   * The total tax for the payment request.
   */
  totalTax?: Maybe<MoneyV2>;
}

/**
 * Represents a contact field for a Shop Pay payment request.
 */
export interface ShopPayPaymentRequestContactField {
  __typename?: 'ShopPayPaymentRequestContactField';
  /**
   * The first address line of the contact field.
   */
  address1: ScalarsEnums['String'];
  /**
   * The second address line of the contact field.
   */
  address2?: Maybe<ScalarsEnums['String']>;
  /**
   * The city of the contact field.
   */
  city: ScalarsEnums['String'];
  /**
   * The company name of the contact field.
   */
  companyName?: Maybe<ScalarsEnums['String']>;
  /**
   * The country of the contact field.
   */
  countryCode: ScalarsEnums['String'];
  /**
   * The email of the contact field.
   */
  email?: Maybe<ScalarsEnums['String']>;
  /**
   * The first name of the contact field.
   */
  firstName: ScalarsEnums['String'];
  /**
   * The first name of the contact field.
   */
  lastName: ScalarsEnums['String'];
  /**
   * The phone number of the contact field.
   */
  phone?: Maybe<ScalarsEnums['String']>;
  /**
   * The postal code of the contact field.
   */
  postalCode?: Maybe<ScalarsEnums['String']>;
  /**
   * The province of the contact field.
   */
  provinceCode?: Maybe<ScalarsEnums['String']>;
}

/**
 * Represents a delivery method for a Shop Pay payment request.
 */
export interface ShopPayPaymentRequestDeliveryMethod {
  __typename?: 'ShopPayPaymentRequestDeliveryMethod';
  /**
   * The amount for the delivery method.
   */
  amount: MoneyV2;
  /**
   * The code of the delivery method.
   */
  code: ScalarsEnums['String'];
  /**
   * The detail about when the delivery may be expected.
   */
  deliveryExpectationLabel?: Maybe<ScalarsEnums['String']>;
  /**
   * The detail of the delivery method.
   */
  detail?: Maybe<ScalarsEnums['String']>;
  /**
   * The label of the delivery method.
   */
  label: ScalarsEnums['String'];
  /**
   * The maximum delivery date for the delivery method.
   */
  maxDeliveryDate?: Maybe<ScalarsEnums['ISO8601DateTime']>;
  /**
   * The minimum delivery date for the delivery method.
   */
  minDeliveryDate?: Maybe<ScalarsEnums['ISO8601DateTime']>;
}

/**
 * Represents a discount for a Shop Pay payment request.
 */
export interface ShopPayPaymentRequestDiscount {
  __typename?: 'ShopPayPaymentRequestDiscount';
  /**
   * The amount of the discount.
   */
  amount: MoneyV2;
  /**
   * The label of the discount.
   */
  label: ScalarsEnums['String'];
}

/**
 * Represents an image for a Shop Pay payment request line item.
 */
export interface ShopPayPaymentRequestImage {
  __typename?: 'ShopPayPaymentRequestImage';
  /**
   * The alt text of the image.
   */
  alt?: Maybe<ScalarsEnums['String']>;
  /**
   * The source URL of the image.
   */
  url: ScalarsEnums['String'];
}

/**
 * Represents a line item for a Shop Pay payment request.
 */
export interface ShopPayPaymentRequestLineItem {
  __typename?: 'ShopPayPaymentRequestLineItem';
  /**
   * The final item price for the line item.
   */
  finalItemPrice: MoneyV2;
  /**
   * The final line price for the line item.
   */
  finalLinePrice: MoneyV2;
  /**
   * The image of the line item.
   */
  image?: Maybe<ShopPayPaymentRequestImage>;
  /**
   * The item discounts for the line item.
   */
  itemDiscounts?: Maybe<Array<ShopPayPaymentRequestDiscount>>;
  /**
   * The label of the line item.
   */
  label: ScalarsEnums['String'];
  /**
   * The line discounts for the line item.
   */
  lineDiscounts?: Maybe<Array<ShopPayPaymentRequestDiscount>>;
  /**
   * The original item price for the line item.
   */
  originalItemPrice?: Maybe<MoneyV2>;
  /**
   * The original line price for the line item.
   */
  originalLinePrice?: Maybe<MoneyV2>;
  /**
   * The quantity of the line item.
   */
  quantity: ScalarsEnums['Int'];
  /**
   * Whether the line item requires shipping.
   */
  requiresShipping?: Maybe<ScalarsEnums['Boolean']>;
  /**
   * The SKU of the line item.
   */
  sku?: Maybe<ScalarsEnums['String']>;
}

/**
 * Represents a receipt for a Shop Pay payment request.
 */
export interface ShopPayPaymentRequestReceipt {
  __typename?: 'ShopPayPaymentRequestReceipt';
  /**
   * The payment request object.
   */
  paymentRequest: ShopPayPaymentRequest;
  /**
   * The processing status.
   */
  processingStatusType: ScalarsEnums['String'];
  /**
   * The token of the receipt.
   */
  token: ScalarsEnums['String'];
}

/**
 * Represents a Shop Pay payment request session.
 */
export interface ShopPayPaymentRequestSession {
  __typename?: 'ShopPayPaymentRequestSession';
  /**
   * The checkout URL of the Shop Pay payment request session.
   */
  checkoutUrl: ScalarsEnums['URL'];
  /**
   * The payment request associated with the Shop Pay payment request session.
   */
  paymentRequest: ShopPayPaymentRequest;
  /**
   * The source identifier of the Shop Pay payment request session.
   */
  sourceIdentifier: ScalarsEnums['String'];
  /**
   * The token of the Shop Pay payment request session.
   */
  token: ScalarsEnums['String'];
}

/**
 * Return type for `shopPayPaymentRequestSessionCreate` mutation.
 */
export interface ShopPayPaymentRequestSessionCreatePayload {
  __typename?: 'ShopPayPaymentRequestSessionCreatePayload';
  /**
   * The new Shop Pay payment request session object.
   */
  shopPayPaymentRequestSession?: Maybe<ShopPayPaymentRequestSession>;
  /**
   * Error codes for failed Shop Pay payment request session mutations.
   */
  userErrors: Array<UserErrorsShopPayPaymentRequestSessionUserErrors>;
}

/**
 * Return type for `shopPayPaymentRequestSessionSubmit` mutation.
 */
export interface ShopPayPaymentRequestSessionSubmitPayload {
  __typename?: 'ShopPayPaymentRequestSessionSubmitPayload';
  /**
   * The checkout on which the payment was applied.
   */
  paymentRequestReceipt?: Maybe<ShopPayPaymentRequestReceipt>;
  /**
   * Error codes for failed Shop Pay payment request session mutations.
   */
  userErrors: Array<UserErrorsShopPayPaymentRequestSessionUserErrors>;
}

/**
 * Represents a shipping line for a Shop Pay payment request.
 */
export interface ShopPayPaymentRequestShippingLine {
  __typename?: 'ShopPayPaymentRequestShippingLine';
  /**
   * The amount for the shipping line.
   */
  amount: MoneyV2;
  /**
   * The code of the shipping line.
   */
  code: ScalarsEnums['String'];
  /**
   * The label of the shipping line.
   */
  label: ScalarsEnums['String'];
}

/**
 * Represents a shipping total for a Shop Pay payment request.
 */
export interface ShopPayPaymentRequestTotalShippingPrice {
  __typename?: 'ShopPayPaymentRequestTotalShippingPrice';
  /**
   * The discounts for the shipping total.
   */
  discounts: Array<ShopPayPaymentRequestDiscount>;
  /**
   * The final total for the shipping total.
   */
  finalTotal: MoneyV2;
  /**
   * The original total for the shipping total.
   */
  originalTotal?: Maybe<MoneyV2>;
}

/**
 * Policy that a merchant has configured for their store, such as their refund or privacy policy.
 */
export interface ShopPolicy {
  __typename?: 'ShopPolicy';
  /**
   * Policy text, maximum size of 64kb.
   */
  body: ScalarsEnums['String'];
  /**
   * Policy’s handle.
   */
  handle: ScalarsEnums['String'];
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * Policy’s title.
   */
  title: ScalarsEnums['String'];
  /**
   * Public URL to the policy.
   */
  url: ScalarsEnums['URL'];
}

/**
 * A policy for the store that comes with a default value, such as a subscription policy.
 * If the merchant hasn't configured a policy for their store, then the policy will return the default value.
 * Otherwise, the policy will return the merchant-configured value.
 */
export interface ShopPolicyWithDefault {
  __typename?: 'ShopPolicyWithDefault';
  /**
   * The text of the policy. Maximum size: 64KB.
   */
  body: ScalarsEnums['String'];
  /**
   * The handle of the policy.
   */
  handle: ScalarsEnums['String'];
  /**
   * The unique ID of the policy. A default policy doesn't have an ID.
   */
  id?: Maybe<ScalarsEnums['ID']>;
  /**
   * The title of the policy.
   */
  title: ScalarsEnums['String'];
  /**
   * Public URL to the policy.
   */
  url: ScalarsEnums['URL'];
}

/**
 * Contains all fields required to generate sitemaps.
 */
export interface Sitemap {
  __typename?: 'Sitemap';
  /**
   * The number of sitemap's pages for a given type.
   */
  pagesCount?: Maybe<Count>;
  /**
   * A list of sitemap's resources for a given type.
   *
   * Important Notes:
   *   - The number of items per page varies from 0 to 250.
   *   - Empty pages (0 items) may occur and do not necessarily indicate the end of results.
   *   - Always check `hasNextPage` to determine if more pages are available.
   */
  resources: (args: {
    /**
     * The page number to fetch.
     */
    page: ScalarsEnums['Int'];
  }) => Maybe<PaginatedSitemapResources>;
}

/**
 * Represents a sitemap's image.
 */
export interface SitemapImage {
  __typename?: 'SitemapImage';
  /**
   * Image's alt text.
   */
  alt?: Maybe<ScalarsEnums['String']>;
  /**
   * Path to the image.
   */
  filepath?: Maybe<ScalarsEnums['String']>;
  /**
   * The date and time when the image was updated.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * Represents a sitemap resource that is not a metaobject.
 */
export interface SitemapResource {
  __typename?: 'SitemapResource';
  /**
   * Resource's handle.
   */
  handle: ScalarsEnums['String'];
  /**
   * Resource's image.
   */
  image?: Maybe<SitemapImage>;
  /**
   * Resource's title.
   */
  title?: Maybe<ScalarsEnums['String']>;
  /**
   * The date and time when the resource was updated.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * Represents the common fields for all sitemap resource types.
 */
export interface SitemapResourceInterface {
  __typename?: 'SitemapResource' | 'SitemapResourceMetaobject';
  /**
   * Resource's handle.
   */
  handle: ScalarsEnums['String'];
  /**
   * The date and time when the resource was updated.
   */
  updatedAt: ScalarsEnums['DateTime'];
  $on: $SitemapResourceInterface;
}

/**
 * A SitemapResourceMetaobject represents a metaobject with
 * [the `renderable` capability](https://shopify.dev/docs/apps/build/custom-data/metaobjects/use-metaobject-capabilities#render-metaobjects-as-web-pages).
 */
export interface SitemapResourceMetaobject {
  __typename?: 'SitemapResourceMetaobject';
  /**
   * Resource's handle.
   */
  handle: ScalarsEnums['String'];
  /**
   * The URL handle for accessing pages of this metaobject type in the Online Store.
   */
  onlineStoreUrlHandle?: Maybe<ScalarsEnums['String']>;
  /**
   * The type of the metaobject. Defines the namespace of its associated metafields.
   */
  type: ScalarsEnums['String'];
  /**
   * The date and time when the resource was updated.
   */
  updatedAt: ScalarsEnums['DateTime'];
}

/**
 * The availability of a product variant at a particular location.
 * Local pick-up must be enabled in the  store's shipping settings, otherwise this will return an empty result.
 */
export interface StoreAvailability {
  __typename?: 'StoreAvailability';
  /**
   * Whether the product variant is in-stock at this location.
   */
  available: ScalarsEnums['Boolean'];
  /**
   * The location where this product variant is stocked at.
   */
  location: Location;
  /**
   * Returns the estimated amount of time it takes for pickup to be ready (Example: Usually ready in 24 hours).
   */
  pickUpTime: ScalarsEnums['String'];
  /**
   * The quantity of the product variant in-stock at this location.
   */
  quantityAvailable: ScalarsEnums['Int'];
}

/**
 * An auto-generated type for paginating through multiple StoreAvailabilities.
 */
export interface StoreAvailabilityConnection {
  __typename?: 'StoreAvailabilityConnection';
  /**
   * A list of edges.
   */
  edges: Array<StoreAvailabilityEdge>;
  /**
   * A list of the nodes contained in StoreAvailabilityEdge.
   */
  nodes: Array<StoreAvailability>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one StoreAvailability and a cursor during pagination.
 */
export interface StoreAvailabilityEdge {
  __typename?: 'StoreAvailabilityEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of StoreAvailabilityEdge.
   */
  node: StoreAvailability;
}

/**
 * An auto-generated type for paginating through multiple Strings.
 */
export interface StringConnection {
  __typename?: 'StringConnection';
  /**
   * A list of edges.
   */
  edges: Array<StringEdge>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one String and a cursor during pagination.
 */
export interface StringEdge {
  __typename?: 'StringEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of StringEdge.
   */
  node: ScalarsEnums['String'];
}

/**
 * An error that occurred during cart submit for completion.
 */
export interface SubmissionError {
  __typename?: 'SubmissionError';
  /**
   * The error code.
   */
  code: ScalarsEnums['SubmissionErrorCode'];
  /**
   * The error message.
   */
  message?: Maybe<ScalarsEnums['String']>;
}

/**
 * Cart submit for checkout completion is successful.
 */
export interface SubmitAlreadyAccepted {
  __typename?: 'SubmitAlreadyAccepted';
  /**
   * The ID of the cart completion attempt that will be used for polling for the result.
   */
  attemptId: ScalarsEnums['String'];
}

/**
 * Cart submit for checkout completion failed.
 */
export interface SubmitFailed {
  __typename?: 'SubmitFailed';
  /**
   * The URL of the checkout for the cart.
   */
  checkoutUrl?: Maybe<ScalarsEnums['URL']>;
  /**
   * The list of errors that occurred from executing the mutation.
   */
  errors: Array<SubmissionError>;
}

/**
 * Cart submit for checkout completion is already accepted.
 */
export interface SubmitSuccess {
  __typename?: 'SubmitSuccess';
  /**
   * The ID of the cart completion attempt that will be used for polling for the result.
   */
  attemptId: ScalarsEnums['String'];
}

/**
 * Cart submit for checkout completion is throttled.
 */
export interface SubmitThrottled {
  __typename?: 'SubmitThrottled';
  /**
   * UTC date time string that indicates the time after which clients should make their next
   * poll request. Any poll requests sent before this time will be ignored. Use this value to schedule the
   * next poll request.
   */
  pollAfter: ScalarsEnums['DateTime'];
}

/**
 * Color and image for visual representation.
 */
export interface Swatch {
  __typename?: 'Swatch';
  /**
   * The swatch color.
   */
  color?: Maybe<ScalarsEnums['Color']>;
  /**
   * The swatch image.
   */
  image?: Maybe<MediaImage>;
}

/**
 * The taxonomy category for the product.
 */
export interface TaxonomyCategory {
  __typename?: 'TaxonomyCategory';
  /**
   * All parent nodes of the current taxonomy category.
   */
  ancestors: Array<TaxonomyCategory>;
  /**
   * A static identifier for the taxonomy category.
   */
  id: ScalarsEnums['ID'];
  /**
   * The localized name of the taxonomy category.
   */
  name: ScalarsEnums['String'];
}

/**
 * Represents a resource that you can track the origin of the search traffic.
 */
export interface Trackable {
  __typename?:
    | 'Article'
    | 'Collection'
    | 'Page'
    | 'Product'
    | 'SearchQuerySuggestion';
  /**
   * URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null.
   */
  trackingParameters?: Maybe<ScalarsEnums['String']>;
  $on: $Trackable;
}

/**
 * The measurement used to calculate a unit price for a product variant (e.g. $9.99 / 100ml).
 */
export interface UnitPriceMeasurement {
  __typename?: 'UnitPriceMeasurement';
  /**
   * The type of unit of measurement for the unit price measurement.
   */
  measuredType?: Maybe<ScalarsEnums['UnitPriceMeasurementMeasuredType']>;
  /**
   * The quantity unit for the unit price measurement.
   */
  quantityUnit?: Maybe<ScalarsEnums['UnitPriceMeasurementMeasuredUnit']>;
  /**
   * The quantity value for the unit price measurement.
   */
  quantityValue: ScalarsEnums['Float'];
  /**
   * The reference unit for the unit price measurement.
   */
  referenceUnit?: Maybe<ScalarsEnums['UnitPriceMeasurementMeasuredUnit']>;
  /**
   * The reference value for the unit price measurement.
   */
  referenceValue: ScalarsEnums['Int'];
}

/**
 * A redirect on the online store.
 */
export interface UrlRedirect {
  __typename?: 'UrlRedirect';
  /**
   * The ID of the URL redirect.
   */
  id: ScalarsEnums['ID'];
  /**
   * The old path to be redirected from. When the user visits this path, they'll be redirected to the target location.
   */
  path: ScalarsEnums['String'];
  /**
   * The target location where the user will be redirected to.
   */
  target: ScalarsEnums['String'];
}

/**
 * An auto-generated type for paginating through multiple UrlRedirects.
 */
export interface UrlRedirectConnection {
  __typename?: 'UrlRedirectConnection';
  /**
   * A list of edges.
   */
  edges: Array<UrlRedirectEdge>;
  /**
   * A list of the nodes contained in UrlRedirectEdge.
   */
  nodes: Array<UrlRedirect>;
  /**
   * Information to aid in pagination.
   */
  pageInfo: PageInfo;
}

/**
 * An auto-generated type which holds one UrlRedirect and a cursor during pagination.
 */
export interface UrlRedirectEdge {
  __typename?: 'UrlRedirectEdge';
  /**
   * A cursor for use in pagination.
   */
  cursor: ScalarsEnums['String'];
  /**
   * The item at the end of UrlRedirectEdge.
   */
  node: UrlRedirect;
}

/**
 * Represents an error in the input of a mutation.
 */
export interface UserError {
  __typename?: 'UserError';
  /**
   * The path to the input field that caused the error.
   */
  field?: Maybe<Array<ScalarsEnums['String']>>;
  /**
   * The error message.
   */
  message: ScalarsEnums['String'];
}

/**
 * Error codes for failed Shop Pay payment request session mutations.
 */
export interface UserErrorsShopPayPaymentRequestSessionUserErrors {
  __typename?: 'UserErrorsShopPayPaymentRequestSessionUserErrors';
  /**
   * The error code.
   */
  code?: Maybe<
    ScalarsEnums['UserErrorsShopPayPaymentRequestSessionUserErrorsCode']
  >;
  /**
   * The path to the input field that caused the error.
   */
  field?: Maybe<Array<ScalarsEnums['String']>>;
  /**
   * The error message.
   */
  message: ScalarsEnums['String'];
}

/**
 * Represents a Shopify hosted video.
 */
export interface Video {
  __typename?: 'Video';
  /**
   * A word or phrase to share the nature or contents of a media.
   */
  alt?: Maybe<ScalarsEnums['String']>;
  /**
   * A globally-unique ID.
   */
  id: ScalarsEnums['ID'];
  /**
   * The media content type.
   */
  mediaContentType: ScalarsEnums['MediaContentType'];
  /**
   * The presentation for a media.
   */
  presentation?: Maybe<MediaPresentation>;
  /**
   * The preview image for the media.
   */
  previewImage?: Maybe<Image>;
  /**
   * The sources for a video.
   */
  sources: Array<VideoSource>;
}

/**
 * Represents a source for a Shopify hosted video.
 */
export interface VideoSource {
  __typename?: 'VideoSource';
  /**
   * The format of the video source.
   */
  format: ScalarsEnums['String'];
  /**
   * The height of the video.
   */
  height: ScalarsEnums['Int'];
  /**
   * The video MIME type.
   */
  mimeType: ScalarsEnums['String'];
  /**
   * The URL of the video.
   */
  url: ScalarsEnums['String'];
  /**
   * The width of the video.
   */
  width: ScalarsEnums['Int'];
}

/**
 * The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start.
 */
export interface Mutation {
  __typename?: 'Mutation';
  /**
   * Updates the attributes on a cart.
   */
  cartAttributesUpdate: (args: {
    /**
     * An array of key-value pairs that contains additional information about the cart.
     *
     * The input must not contain more than `250` values.
     */
    attributes: Array<AttributeInput>;
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
  }) => Maybe<CartAttributesUpdatePayload>;
  /**
   * Updates the billing address on the cart.
   */
  cartBillingAddressUpdate: (args: {
    /**
     * The customer's billing address.
     */
    billingAddress?: Maybe<MailingAddressInput>;
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
  }) => Maybe<CartBillingAddressUpdatePayload>;
  /**
   * Updates customer information associated with a cart.
   * Buyer identity is used to determine
   * [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing)
   * and should match the customer's shipping address.
   */
  cartBuyerIdentityUpdate: (args: {
    /**
     * The customer associated with the cart. Used to determine
     * [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing).
     * Buyer identity should match the customer's shipping address.
     */
    buyerIdentity: CartBuyerIdentityInput;
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
  }) => Maybe<CartBuyerIdentityUpdatePayload>;
  /**
   * Creates a new cart.
   */
  cartCreate: (args?: {
    /**
     * The fields used to create a cart.
     */
    input?: Maybe<CartInput>;
  }) => Maybe<CartCreatePayload>;
  /**
   * Updates the discount codes applied to the cart.
   */
  cartDiscountCodesUpdate: (args: {
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
    /**
     * The case-insensitive discount codes that the customer added at checkout.
     *
     * The input must not contain more than `250` values.
     */
    discountCodes?: Maybe<Array<ScalarsEnums['String']>>;
  }) => Maybe<CartDiscountCodesUpdatePayload>;
  /**
   * Updates the gift card codes applied to the cart.
   */
  cartGiftCardCodesUpdate: (args: {
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
    /**
     * The case-insensitive gift card codes.
     *
     * The input must not contain more than `250` values.
     */
    giftCardCodes: Array<ScalarsEnums['String']>;
  }) => Maybe<CartGiftCardCodesUpdatePayload>;
  /**
   * Adds a merchandise line to the cart.
   */
  cartLinesAdd: (args: {
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
    /**
     * A list of merchandise lines to add to the cart.
     *
     * The input must not contain more than `250` values.
     */
    lines: Array<CartLineInput>;
  }) => Maybe<CartLinesAddPayload>;
  /**
   * Removes one or more merchandise lines from the cart.
   */
  cartLinesRemove: (args: {
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
    /**
     * The merchandise line IDs to remove.
     *
     * The input must not contain more than `250` values.
     */
    lineIds: Array<ScalarsEnums['ID']>;
  }) => Maybe<CartLinesRemovePayload>;
  /**
   * Updates one or more merchandise lines on a cart.
   */
  cartLinesUpdate: (args: {
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
    /**
     * The merchandise lines to update.
     *
     * The input must not contain more than `250` values.
     */
    lines: Array<CartLineUpdateInput>;
  }) => Maybe<CartLinesUpdatePayload>;
  /**
   * Deletes a cart metafield.
   */
  cartMetafieldDelete: (args: {
    /**
     * The input fields used to delete a cart metafield.
     */
    input: CartMetafieldDeleteInput;
  }) => Maybe<CartMetafieldDeletePayload>;
  /**
   * Sets cart metafield values. Cart metafield values will be set regardless if they were previously created or not.
   *
   * Allows a maximum of 25 cart metafields to be set at a time.
   */
  cartMetafieldsSet: (args: {
    /**
     * The list of Cart metafield values to set. Maximum of 25.
     *
     * The input must not contain more than `250` values.
     */
    metafields: Array<CartMetafieldsSetInput>;
  }) => Maybe<CartMetafieldsSetPayload>;
  /**
   * Updates the note on the cart.
   */
  cartNoteUpdate: (args: {
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
    /**
     * The note on the cart.
     */
    note: ScalarsEnums['String'];
  }) => Maybe<CartNoteUpdatePayload>;
  /**
   * Update the customer's payment method that will be used to checkout.
   */
  cartPaymentUpdate: (args: {
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
    /**
     * The payment information for the cart that will be used at checkout.
     */
    payment: CartPaymentInput;
  }) => Maybe<CartPaymentUpdatePayload>;
  /**
   * Update the selected delivery options for a delivery group.
   */
  cartSelectedDeliveryOptionsUpdate: (args: {
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
    /**
     * The selected delivery options.
     *
     * The input must not contain more than `250` values.
     */
    selectedDeliveryOptions: Array<CartSelectedDeliveryOptionInput>;
  }) => Maybe<CartSelectedDeliveryOptionsUpdatePayload>;
  /**
   * Submit the cart for checkout completion.
   */
  cartSubmitForCompletion: (args: {
    /**
     * The attemptToken is used to guarantee an idempotent result.
     * If more than one call uses the same attemptToken within a short period of time, only one will be accepted.
     */
    attemptToken: ScalarsEnums['String'];
    /**
     * The ID of the cart.
     */
    cartId: ScalarsEnums['ID'];
  }) => Maybe<CartSubmitForCompletionPayload>;
  /**
   * Creates a customer access token.
   * The customer access token is required to modify the customer object in any way.
   */
  customerAccessTokenCreate: (args: {
    /**
     * The fields used to create a customer access token.
     */
    input: CustomerAccessTokenCreateInput;
  }) => Maybe<CustomerAccessTokenCreatePayload>;
  /**
   * Creates a customer access token using a
   * [multipass token](https://shopify.dev/api/multipass) instead of email and
   * password. A customer record is created if the customer doesn't exist. If a customer
   * record already exists but the record is disabled, then the customer record is enabled.
   */
  customerAccessTokenCreateWithMultipass: (args: {
    /**
     * A valid [multipass token](https://shopify.dev/api/multipass) to be authenticated.
     */
    multipassToken: ScalarsEnums['String'];
  }) => Maybe<CustomerAccessTokenCreateWithMultipassPayload>;
  /**
   * Permanently destroys a customer access token.
   */
  customerAccessTokenDelete: (args: {
    /**
     * The access token used to identify the customer.
     */
    customerAccessToken: ScalarsEnums['String'];
  }) => Maybe<CustomerAccessTokenDeletePayload>;
  /**
   * Renews a customer access token.
   *
   * Access token renewal must happen *before* a token expires.
   * If a token has already expired, a new one should be created instead via `customerAccessTokenCreate`.
   */
  customerAccessTokenRenew: (args: {
    /**
     * The access token used to identify the customer.
     */
    customerAccessToken: ScalarsEnums['String'];
  }) => Maybe<CustomerAccessTokenRenewPayload>;
  /**
   * Activates a customer.
   */
  customerActivate: (args: {
    /**
     * Specifies the customer to activate.
     */
    id: ScalarsEnums['ID'];
    /**
     * The fields used to activate a customer.
     */
    input: CustomerActivateInput;
  }) => Maybe<CustomerActivatePayload>;
  /**
   * Activates a customer with the activation url received from `customerCreate`.
   */
  customerActivateByUrl: (args: {
    /**
     * The customer activation URL.
     */
    activationUrl: ScalarsEnums['URL'];
    /**
     * A new password set during activation.
     */
    password: ScalarsEnums['String'];
  }) => Maybe<CustomerActivateByUrlPayload>;
  /**
   * Creates a new address for a customer.
   */
  customerAddressCreate: (args: {
    /**
     * The customer mailing address to create.
     */
    address: MailingAddressInput;
    /**
     * The access token used to identify the customer.
     */
    customerAccessToken: ScalarsEnums['String'];
  }) => Maybe<CustomerAddressCreatePayload>;
  /**
   * Permanently deletes the address of an existing customer.
   */
  customerAddressDelete: (args: {
    /**
     * The access token used to identify the customer.
     */
    customerAccessToken: ScalarsEnums['String'];
    /**
     * Specifies the address to delete.
     */
    id: ScalarsEnums['ID'];
  }) => Maybe<CustomerAddressDeletePayload>;
  /**
   * Updates the address of an existing customer.
   */
  customerAddressUpdate: (args: {
    /**
     * The customer’s mailing address.
     */
    address: MailingAddressInput;
    /**
     * The access token used to identify the customer.
     */
    customerAccessToken: ScalarsEnums['String'];
    /**
     * Specifies the customer address to update.
     */
    id: ScalarsEnums['ID'];
  }) => Maybe<CustomerAddressUpdatePayload>;
  /**
   * Creates a new customer.
   */
  customerCreate: (args: {
    /**
     * The fields used to create a new customer.
     */
    input: CustomerCreateInput;
  }) => Maybe<CustomerCreatePayload>;
  /**
   * Updates the default address of an existing customer.
   */
  customerDefaultAddressUpdate: (args: {
    /**
     * ID of the address to set as the new default for the customer.
     */
    addressId: ScalarsEnums['ID'];
    /**
     * The access token used to identify the customer.
     */
    customerAccessToken: ScalarsEnums['String'];
  }) => Maybe<CustomerDefaultAddressUpdatePayload>;
  /**
   * Sends a reset password email to the customer. The reset password
   * email contains a reset password URL and token that you can pass to
   * the [`customerResetByUrl`](https://shopify.dev/api/storefront/latest/mutations/customerResetByUrl) or
   * [`customerReset`](https://shopify.dev/api/storefront/latest/mutations/customerReset) mutation to reset the
   * customer password.
   *
   * This mutation is throttled by IP. With private access,
   * you can provide a [`Shopify-Storefront-Buyer-IP`](https://shopify.dev/api/usage/authentication#optional-ip-header) instead of the request IP.
   * The header is case-sensitive and must be sent as `Shopify-Storefront-Buyer-IP`.
   *
   * Make sure that the value provided to `Shopify-Storefront-Buyer-IP` is trusted. Unthrottled access to this
   * mutation presents a security risk.
   */
  customerRecover: (args: {
    /**
     * The email address of the customer to recover.
     */
    email: ScalarsEnums['String'];
  }) => Maybe<CustomerRecoverPayload>;
  /**
   * "Resets a customer’s password with the token received from a reset password email. You can send a reset password email with the [`customerRecover`](https://shopify.dev/api/storefront/latest/mutations/customerRecover) mutation."
   */
  customerReset: (args: {
    /**
     * Specifies the customer to reset.
     */
    id: ScalarsEnums['ID'];
    /**
     * The fields used to reset a customer’s password.
     */
    input: CustomerResetInput;
  }) => Maybe<CustomerResetPayload>;
  /**
   * "Resets a customer’s password with the reset password URL received from a reset password email. You can send a reset password email with the [`customerRecover`](https://shopify.dev/api/storefront/latest/mutations/customerRecover) mutation."
   */
  customerResetByUrl: (args: {
    /**
     * New password that will be set as part of the reset password process.
     */
    password: ScalarsEnums['String'];
    /**
     * The customer's reset password url.
     */
    resetUrl: ScalarsEnums['URL'];
  }) => Maybe<CustomerResetByUrlPayload>;
  /**
   * Updates an existing customer.
   */
  customerUpdate: (args: {
    /**
     * The customer object input.
     */
    customer: CustomerUpdateInput;
    /**
     * The access token used to identify the customer.
     */
    customerAccessToken: ScalarsEnums['String'];
  }) => Maybe<CustomerUpdatePayload>;
  /**
   * Create a new Shop Pay payment request session.
   */
  shopPayPaymentRequestSessionCreate: (args: {
    /**
     * A payment request object.
     */
    paymentRequest: ShopPayPaymentRequestInput;
    /**
     * A unique identifier for the payment request session.
     */
    sourceIdentifier: ScalarsEnums['String'];
  }) => Maybe<ShopPayPaymentRequestSessionCreatePayload>;
  /**
   * Submits a Shop Pay payment request session.
   */
  shopPayPaymentRequestSessionSubmit: (args: {
    /**
     * The idempotency key is used to guarantee an idempotent result.
     */
    idempotencyKey: ScalarsEnums['String'];
    /**
     * The order name to be used for the order created from the payment request.
     */
    orderName?: Maybe<ScalarsEnums['String']>;
    /**
     * The final payment request object.
     */
    paymentRequest: ShopPayPaymentRequestInput;
    /**
     * A token representing a payment session request.
     */
    token: ScalarsEnums['String'];
  }) => Maybe<ShopPayPaymentRequestSessionSubmitPayload>;
}

export interface Query {
  __typename?: 'Query';
  article: (args: {id: ScalarsEnums['ID']}) => Maybe<Article>;
  articles: (args?: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    query?: Maybe<ScalarsEnums['String']>;
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    sortKey?: Maybe<ArticleSortKeys>;
  }) => ArticleConnection;
  blog: (args?: {
    handle?: Maybe<ScalarsEnums['String']>;
    id?: Maybe<ScalarsEnums['ID']>;
  }) => Maybe<Blog>;
  blogByHandle: (args: {handle: ScalarsEnums['String']}) => Maybe<Blog>;
  blogs: (args?: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    query?: Maybe<ScalarsEnums['String']>;
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    sortKey?: Maybe<BlogSortKeys>;
  }) => BlogConnection;
  cart: (args: {id: ScalarsEnums['ID']}) => Maybe<Cart>;
  cartCompletionAttempt: (args: {
    attemptId: ScalarsEnums['String'];
  }) => Maybe<CartCompletionAttemptResult>;
  collection: (args?: {
    handle?: Maybe<ScalarsEnums['String']>;
    id?: Maybe<ScalarsEnums['ID']>;
  }) => Maybe<Collection>;
  collectionByHandle: (args: {
    handle: ScalarsEnums['String'];
  }) => Maybe<Collection>;
  collections: (args?: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    query?: Maybe<ScalarsEnums['String']>;
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    sortKey?: Maybe<CollectionSortKeys>;
  }) => CollectionConnection;
  customer: (args: {
    customerAccessToken: ScalarsEnums['String'];
  }) => Maybe<Customer>;
  localization: Localization;
  locations: (args?: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    near?: Maybe<GeoCoordinateInput>;
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    sortKey?: Maybe<LocationSortKeys>;
  }) => LocationConnection;
  menu: (args: {handle: ScalarsEnums['String']}) => Maybe<Menu>;
  metaobject: (args?: {
    handle?: Maybe<MetaobjectHandleInput>;
    id?: Maybe<ScalarsEnums['ID']>;
  }) => Maybe<Metaobject>;
  metaobjects: (args: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    sortKey?: Maybe<ScalarsEnums['String']>;
    type: ScalarsEnums['String'];
  }) => MetaobjectConnection;
  node: (args: {id: ScalarsEnums['ID']}) => Maybe<Node>;
  nodes: (args: {ids: Array<ScalarsEnums['ID']>}) => Array<Maybe<Node>>;
  page: (args?: {
    handle?: Maybe<ScalarsEnums['String']>;
    id?: Maybe<ScalarsEnums['ID']>;
  }) => Maybe<Page>;
  pageByHandle: (args: {handle: ScalarsEnums['String']}) => Maybe<Page>;
  pages: (args?: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    query?: Maybe<ScalarsEnums['String']>;
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    sortKey?: Maybe<PageSortKeys>;
  }) => PageConnection;
  paymentSettings: PaymentSettings;
  predictiveSearch: (args: {
    limit?: Maybe<ScalarsEnums['Int']>;
    limitScope?: Maybe<PredictiveSearchLimitScope>;
    query: ScalarsEnums['String'];
    searchableFields?: Maybe<Array<SearchableField>>;
    types?: Maybe<Array<PredictiveSearchType>>;
    unavailableProducts?: Maybe<SearchUnavailableProductsType>;
  }) => Maybe<PredictiveSearchResult>;
  product: (args?: {
    handle?: Maybe<ScalarsEnums['String']>;
    id?: Maybe<ScalarsEnums['ID']>;
  }) => Maybe<Product>;
  productByHandle: (args: {handle: ScalarsEnums['String']}) => Maybe<Product>;
  productRecommendations: (args?: {
    intent?: Maybe<ProductRecommendationIntent>;
    productHandle?: Maybe<ScalarsEnums['String']>;
    productId?: Maybe<ScalarsEnums['ID']>;
  }) => Maybe<Array<Product>>;
  productTags: (args: {first: ScalarsEnums['Int']}) => StringConnection;
  productTypes: (args: {first: ScalarsEnums['Int']}) => StringConnection;
  products: (args?: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    query?: Maybe<ScalarsEnums['String']>;
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    sortKey?: Maybe<ProductSortKeys>;
  }) => ProductConnection;
  publicApiVersions: Array<ApiVersion>;
  search: (args: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    prefix?: Maybe<SearchPrefixQueryType>;
    productFilters?: Maybe<Array<ProductFilter>>;
    query: ScalarsEnums['String'];
    reverse?: Maybe<ScalarsEnums['Boolean']>;
    sortKey?: Maybe<SearchSortKeys>;
    types?: Maybe<Array<SearchType>>;
    unavailableProducts?: Maybe<SearchUnavailableProductsType>;
  }) => SearchResultItemConnection;
  shop: Shop;
  sitemap: (args: {type: SitemapType}) => Sitemap;
  urlRedirects: (args?: {
    after?: Maybe<ScalarsEnums['String']>;
    before?: Maybe<ScalarsEnums['String']>;
    first?: Maybe<ScalarsEnums['Int']>;
    last?: Maybe<ScalarsEnums['Int']>;
    query?: Maybe<ScalarsEnums['String']>;
    reverse?: Maybe<ScalarsEnums['Boolean']>;
  }) => UrlRedirectConnection;
}

export interface Subscription {
  __typename?: 'Subscription';
}

export interface $BaseCartLine {
  CartLine?: CartLine;
  ComponentizableCartLine?: ComponentizableCartLine;
}

export interface $CartCompletionAction {
  CompletePaymentChallenge?: CompletePaymentChallenge;
}

export interface $CartCompletionAttemptResult {
  CartCompletionActionRequired?: CartCompletionActionRequired;
  CartCompletionFailed?: CartCompletionFailed;
  CartCompletionProcessing?: CartCompletionProcessing;
  CartCompletionSuccess?: CartCompletionSuccess;
}

export interface $CartDiscountAllocation {
  CartAutomaticDiscountAllocation?: CartAutomaticDiscountAllocation;
  CartCodeDiscountAllocation?: CartCodeDiscountAllocation;
  CartCustomDiscountAllocation?: CartCustomDiscountAllocation;
}

export interface $CartSubmitForCompletionResult {
  SubmitAlreadyAccepted?: SubmitAlreadyAccepted;
  SubmitFailed?: SubmitFailed;
  SubmitSuccess?: SubmitSuccess;
  SubmitThrottled?: SubmitThrottled;
}

export interface $DeliveryAddress {
  MailingAddress?: MailingAddress;
}

export interface $DiscountApplication {
  AutomaticDiscountApplication?: AutomaticDiscountApplication;
  DiscountCodeApplication?: DiscountCodeApplication;
  ManualDiscountApplication?: ManualDiscountApplication;
  ScriptDiscountApplication?: ScriptDiscountApplication;
}

export interface $DisplayableError {
  CartUserError?: CartUserError;
  CustomerUserError?: CustomerUserError;
  MetafieldDeleteUserError?: MetafieldDeleteUserError;
  MetafieldsSetUserError?: MetafieldsSetUserError;
  UserError?: UserError;
  UserErrorsShopPayPaymentRequestSessionUserErrors?: UserErrorsShopPayPaymentRequestSessionUserErrors;
}

export interface $HasMetafields {
  Article?: Article;
  Blog?: Blog;
  Cart?: Cart;
  Collection?: Collection;
  Company?: Company;
  CompanyLocation?: CompanyLocation;
  Customer?: Customer;
  Location?: Location;
  Market?: Market;
  Order?: Order;
  Page?: Page;
  Product?: Product;
  ProductVariant?: ProductVariant;
  SellingPlan?: SellingPlan;
  Shop?: Shop;
}

export interface $Media {
  ExternalVideo?: ExternalVideo;
  MediaImage?: MediaImage;
  Model3d?: Model3d;
  Video?: Video;
}

export interface $MenuItemResource {
  Article?: Article;
  Blog?: Blog;
  Collection?: Collection;
  Metaobject?: Metaobject;
  Page?: Page;
  Product?: Product;
  ShopPolicy?: ShopPolicy;
}

export interface $Merchandise {
  ProductVariant?: ProductVariant;
}

export interface $MetafieldParentResource {
  Article?: Article;
  Blog?: Blog;
  Cart?: Cart;
  Collection?: Collection;
  Company?: Company;
  CompanyLocation?: CompanyLocation;
  Customer?: Customer;
  Location?: Location;
  Market?: Market;
  Order?: Order;
  Page?: Page;
  Product?: Product;
  ProductVariant?: ProductVariant;
  SellingPlan?: SellingPlan;
  Shop?: Shop;
}

export interface $MetafieldReference {
  Collection?: Collection;
  GenericFile?: GenericFile;
  MediaImage?: MediaImage;
  Metaobject?: Metaobject;
  Model3d?: Model3d;
  Page?: Page;
  Product?: Product;
  ProductVariant?: ProductVariant;
  Video?: Video;
}

export interface $Node {
  AppliedGiftCard?: AppliedGiftCard;
  Article?: Article;
  Blog?: Blog;
  Cart?: Cart;
  CartLine?: CartLine;
  Collection?: Collection;
  Comment?: Comment;
  Company?: Company;
  CompanyContact?: CompanyContact;
  CompanyLocation?: CompanyLocation;
  ComponentizableCartLine?: ComponentizableCartLine;
  ExternalVideo?: ExternalVideo;
  GenericFile?: GenericFile;
  Location?: Location;
  MailingAddress?: MailingAddress;
  Market?: Market;
  MediaImage?: MediaImage;
  MediaPresentation?: MediaPresentation;
  Menu?: Menu;
  MenuItem?: MenuItem;
  Metafield?: Metafield;
  Metaobject?: Metaobject;
  Model3d?: Model3d;
  Order?: Order;
  Page?: Page;
  Product?: Product;
  ProductOption?: ProductOption;
  ProductOptionValue?: ProductOptionValue;
  ProductVariant?: ProductVariant;
  Shop?: Shop;
  ShopPayInstallmentsFinancingPlan?: ShopPayInstallmentsFinancingPlan;
  ShopPayInstallmentsFinancingPlanTerm?: ShopPayInstallmentsFinancingPlanTerm;
  ShopPayInstallmentsProductVariantPricing?: ShopPayInstallmentsProductVariantPricing;
  ShopPolicy?: ShopPolicy;
  TaxonomyCategory?: TaxonomyCategory;
  UrlRedirect?: UrlRedirect;
  Video?: Video;
}

export interface $OnlineStorePublishable {
  Article?: Article;
  Blog?: Blog;
  Collection?: Collection;
  Metaobject?: Metaobject;
  Page?: Page;
  Product?: Product;
}

export interface $PricingValue {
  MoneyV2?: MoneyV2;
  PricingPercentageValue?: PricingPercentageValue;
}

export interface $SearchResultItem {
  Article?: Article;
  Page?: Page;
  Product?: Product;
}

export interface $SellingPlanBillingPolicy {
  SellingPlanRecurringBillingPolicy?: SellingPlanRecurringBillingPolicy;
}

export interface $SellingPlanCheckoutChargeValue {
  MoneyV2?: MoneyV2;
  SellingPlanCheckoutChargePercentageValue?: SellingPlanCheckoutChargePercentageValue;
}

export interface $SellingPlanDeliveryPolicy {
  SellingPlanRecurringDeliveryPolicy?: SellingPlanRecurringDeliveryPolicy;
}

export interface $SellingPlanPriceAdjustmentValue {
  SellingPlanFixedAmountPriceAdjustment?: SellingPlanFixedAmountPriceAdjustment;
  SellingPlanFixedPriceAdjustment?: SellingPlanFixedPriceAdjustment;
  SellingPlanPercentagePriceAdjustment?: SellingPlanPercentagePriceAdjustment;
}

export interface $SitemapResourceInterface {
  SitemapResource?: SitemapResource;
  SitemapResourceMetaobject?: SitemapResourceMetaobject;
}

export interface $Trackable {
  Article?: Article;
  Collection?: Collection;
  Page?: Page;
  Product?: Product;
  SearchQuerySuggestion?: SearchQuerySuggestion;
}

export interface GeneratedSchema {
  query: Query;
  mutation: Mutation;
  subscription: Subscription;
}

export type ScalarsEnums = {
  [Key in keyof Scalars]: Scalars[Key] extends {output: unknown}
    ? Scalars[Key]['output']
    : never;
} & {
  ArticleSortKeys: ArticleSortKeys;
  BlogSortKeys: BlogSortKeys;
  CardBrand: CardBrand;
  CartCardSource: CartCardSource;
  CartDeliveryGroupType: CartDeliveryGroupType;
  CartErrorCode: CartErrorCode;
  CartWarningCode: CartWarningCode;
  CollectionSortKeys: CollectionSortKeys;
  CompletionErrorCode: CompletionErrorCode;
  CountPrecision: CountPrecision;
  CountryCode: CountryCode;
  CropRegion: CropRegion;
  CurrencyCode: CurrencyCode;
  CustomerErrorCode: CustomerErrorCode;
  DeliveryAddressValidationStrategy: DeliveryAddressValidationStrategy;
  DeliveryMethodType: DeliveryMethodType;
  DigitalWallet: DigitalWallet;
  DiscountApplicationAllocationMethod: DiscountApplicationAllocationMethod;
  DiscountApplicationTargetSelection: DiscountApplicationTargetSelection;
  DiscountApplicationTargetType: DiscountApplicationTargetType;
  FilterPresentation: FilterPresentation;
  FilterType: FilterType;
  ImageContentType: ImageContentType;
  LanguageCode: LanguageCode;
  LocationSortKeys: LocationSortKeys;
  MediaContentType: MediaContentType;
  MediaHost: MediaHost;
  MediaPresentationFormat: MediaPresentationFormat;
  MenuItemType: MenuItemType;
  MetafieldDeleteErrorCode: MetafieldDeleteErrorCode;
  MetafieldsSetUserErrorCode: MetafieldsSetUserErrorCode;
  OrderCancelReason: OrderCancelReason;
  OrderFinancialStatus: OrderFinancialStatus;
  OrderFulfillmentStatus: OrderFulfillmentStatus;
  OrderSortKeys: OrderSortKeys;
  PageSortKeys: PageSortKeys;
  PredictiveSearchLimitScope: PredictiveSearchLimitScope;
  PredictiveSearchType: PredictiveSearchType;
  PreferenceDeliveryMethodType: PreferenceDeliveryMethodType;
  ProductCollectionSortKeys: ProductCollectionSortKeys;
  ProductImageSortKeys: ProductImageSortKeys;
  ProductMediaSortKeys: ProductMediaSortKeys;
  ProductRecommendationIntent: ProductRecommendationIntent;
  ProductSortKeys: ProductSortKeys;
  ProductVariantSortKeys: ProductVariantSortKeys;
  SearchPrefixQueryType: SearchPrefixQueryType;
  SearchSortKeys: SearchSortKeys;
  SearchType: SearchType;
  SearchUnavailableProductsType: SearchUnavailableProductsType;
  SearchableField: SearchableField;
  SellingPlanCheckoutChargeType: SellingPlanCheckoutChargeType;
  SellingPlanInterval: SellingPlanInterval;
  ShopPayInstallmentsFinancingPlanFrequency: ShopPayInstallmentsFinancingPlanFrequency;
  ShopPayInstallmentsLoan: ShopPayInstallmentsLoan;
  ShopPayPaymentRequestDeliveryMethodType: ShopPayPaymentRequestDeliveryMethodType;
  SitemapType: SitemapType;
  SubmissionErrorCode: SubmissionErrorCode;
  UnitPriceMeasurementMeasuredType: UnitPriceMeasurementMeasuredType;
  UnitPriceMeasurementMeasuredUnit: UnitPriceMeasurementMeasuredUnit;
  UnitSystem: UnitSystem;
  UserErrorsShopPayPaymentRequestSessionUserErrorsCode: UserErrorsShopPayPaymentRequestSessionUserErrorsCode;
  WeightUnit: WeightUnit;
};
