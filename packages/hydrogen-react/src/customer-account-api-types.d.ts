/**
 * THIS FILE IS AUTO-GENERATED, DO NOT EDIT
 * Based on Customer Account API 2024-01
 * If changes need to happen to the types defined in this file, then generally the Storefront API needs to update. After it's updated, you can run `npm run graphql-types`.
 * Except custom Scalars, which are defined in the `codegen.ts` file
 */
/* eslint-disable */
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
export type Scalars = {
  ID: {input: string; output: string};
  String: {input: string; output: string};
  Boolean: {input: boolean; output: boolean};
  Int: {input: number; output: number};
  Float: {input: number; output: number};
  DateTime: {input: string; output: string};
  Decimal: {input: string; output: string};
  HTML: {input: string; output: string};
  ISO8601DateTime: {input: string; output: string};
  URL: {input: string; output: string};
  UnsignedInt64: {input: string; output: string};
};

/** A sale that includes an additional fee charge. */
export type AdditionalFeeSale = Node &
  Sale & {
    __typename?: 'AdditionalFeeSale';
    /** The type of order action represented by the sale. */
    actionType: SaleActionType;
    /** The unique ID of the sale. */
    id: Scalars['ID']['output'];
    /** The type of line associated with the sale. */
    lineType: SaleLineType;
    /** The number of units ordered or intended to be returned. */
    quantity?: Maybe<Scalars['Int']['output']>;
    /** The individual taxes associated with the sale. */
    taxes: Array<SaleTax>;
    /** The total sale amount after taxes and discounts. */
    totalAmount: MoneyV2;
    /** The total amount of discounts allocated to the sale after taxes. */
    totalDiscountAmountAfterTaxes: MoneyV2;
    /** The total discounts allocated to the sale before taxes. */
    totalDiscountAmountBeforeTaxes: MoneyV2;
    /** The total tax amount for the sale. */
    totalTaxAmount: MoneyV2;
  };

/** Return type for `addressCreate` mutation. */
export type AddressCreatePayload = {
  __typename?: 'AddressCreatePayload';
  /** The created address. */
  address?: Maybe<CustomerMailingAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsAddressUserErrors>;
};

/** Return type for `addressDelete` mutation. */
export type AddressDeletePayload = {
  __typename?: 'AddressDeletePayload';
  /** The ID of the deleted address. */
  deletedAddressId?: Maybe<Scalars['ID']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsAddressUserErrors>;
};

/** The address form field. */
export type AddressFormField = {
  __typename?: 'AddressFormField';
  /** The mode of the address field. */
  mode: AddressFormFieldMode;
};

/** Defines the mode for an address form field. */
export type AddressFormFieldMode =
  /**
   * Indicates that the form field should be hidden from the UI.
   * Any values provided by the client will be ignored by the backend.
   *
   */
  | 'IGNORED'
  /**
   * Indicates that the form field is visible in the UI and can be left empty.
   *
   */
  | 'OPTIONAL'
  /**
   * Indicates that the form field is visible in the UI and requires a non-empty value.
   *
   */
  | 'REQUIRED';

/** The settings for the address form. */
export type AddressFormSettings = {
  __typename?: 'AddressFormSettings';
  /** The setting for the Address2 form field. */
  address2: AddressFormField;
  /** Whether the address autocompletion is enabled. */
  addressAutocompletion: Scalars['Boolean']['output'];
  /** The setting for the Company form field. */
  company: AddressFormField;
  /** The setting for the First name form field. */
  firstName: AddressFormField;
  /** The setting for the Phone form field. */
  phone: AddressFormField;
};

/** Return type for `addressUpdate` mutation. */
export type AddressUpdatePayload = {
  __typename?: 'AddressUpdatePayload';
  /** The updated address. */
  address?: Maybe<CustomerMailingAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsAddressUserErrors>;
};

/** A sale event that results in an adjustment to the order price. */
export type AdjustmentSale = Node &
  Sale & {
    __typename?: 'AdjustmentSale';
    /** The type of order action represented by the sale. */
    actionType: SaleActionType;
    /** The unique ID of the sale. */
    id: Scalars['ID']['output'];
    /** The type of line associated with the sale. */
    lineType: SaleLineType;
    /** The number of units ordered or intended to be returned. */
    quantity?: Maybe<Scalars['Int']['output']>;
    /** The individual taxes associated with the sale. */
    taxes: Array<SaleTax>;
    /** The total sale amount after taxes and discounts. */
    totalAmount: MoneyV2;
    /** The total amount of discounts allocated to the sale after taxes. */
    totalDiscountAmountAfterTaxes: MoneyV2;
    /** The total discounts allocated to the sale before taxes. */
    totalDiscountAmountBeforeTaxes: MoneyV2;
    /** The total tax amount for the sale. */
    totalTaxAmount: MoneyV2;
  };

/** The input fields for the billing address received from Apple Pay. */
export type ApplePayBillingAddressInput = {
  /** The first line of the address, typically the street address or PO Box number. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** The second line of the address, typically the apartment, suite, or unit number. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** The region of the address, such as the province, state, or district. */
  administrativeArea?: InputMaybe<Scalars['String']['input']>;
  /** The name of the country. */
  country?: InputMaybe<Scalars['String']['input']>;
  /** The two-letter code for the country of the address. */
  countryCode?: InputMaybe<CountryCode>;
  /** The family name of the customer. */
  familyName?: InputMaybe<Scalars['String']['input']>;
  /** The given name of the customer. */
  givenName?: InputMaybe<Scalars['String']['input']>;
  /** The name of the city, district, village, or town. */
  locality?: InputMaybe<Scalars['String']['input']>;
  /** The telephone number of the customer. */
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  postalCode?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `applePayCreditCardAdd` mutation. */
export type ApplePayCreditCardAddPayload = {
  __typename?: 'ApplePayCreditCardAddPayload';
  /** The newly added credit card. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** If the card verification result is processing. When this is true, credit_card will be null. */
  processing?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** Return type for `applePayCreditCardUpdate` mutation. */
export type ApplePayCreditCardUpdatePayload = {
  __typename?: 'ApplePayCreditCardUpdatePayload';
  /** The updated credit card. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** If the card verification result is processing. When this is true, credit_card will be null. */
  processing?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** Return type for `applePaySessionCreate` mutation. */
export type ApplePaySessionCreatePayload = {
  __typename?: 'ApplePaySessionCreatePayload';
  /** The object that contains the session data. */
  body?: Maybe<Scalars['String']['output']>;
  /** The ID for the created session. */
  id?: Maybe<Scalars['String']['output']>;
  /**
   * Whether the session is ready. The `body` field is `null` while this value is `false`.
   *
   */
  ready?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<ApplePaySessionUserError>;
};

/** The error codes for failures to create Apple Pay sessions. */
export type ApplePaySessionUserError = DisplayableError & {
  __typename?: 'ApplePaySessionUserError';
  /** The error code. */
  code?: Maybe<ApplePaySessionUserErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `ApplePaySessionUserError`. */
export type ApplePaySessionUserErrorCode =
  /** Apple Pay session could not be created. */
  | 'SESSION_COULD_NOT_BE_CREATED'
  /** Validation URL is not an Apple Pay gateway endpoint. */
  | 'VALIDATION_URL_IS_INVALID';

/** The configuration settings for the Apple Pay wallet. */
export type ApplePayWalletConfig = {
  __typename?: 'ApplePayWalletConfig';
  /** Supported card networks for Apple Pay. */
  supportedNetworks: Array<Scalars['String']['output']>;
};

/** The details about the gift card used on the checkout. */
export type AppliedGiftCard = Node & {
  __typename?: 'AppliedGiftCard';
  /** The amount deducted from the gift card. */
  amountUsed: MoneyV2;
  /** The remaining amount on the gift card. */
  balance: MoneyV2;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The last characters of the gift card. */
  lastCharacters: Scalars['String']['output'];
  /** The amount applied to the checkout in its currency. */
  presentmentAmountUsed: MoneyV2;
};

/** Represents a generic custom attribute. */
export type Attribute = {
  __typename?: 'Attribute';
  /** Key or name of the attribute. */
  key: Scalars['String']['output'];
  /** Value of the attribute. */
  value?: Maybe<Scalars['String']['output']>;
};

/**
 * Captures the intentions of a discount that was automatically applied.
 *
 */
export type AutomaticDiscountApplication = DiscountApplication & {
  __typename?: 'AutomaticDiscountApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** The lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The title of the application. */
  title: Scalars['String']['output'];
  /** The value of the discount application. */
  value: PricingValue;
};

/** A collection of available shipping rates for a checkout. */
export type AvailableShippingRates = {
  __typename?: 'AvailableShippingRates';
  /**
   * Whether the shipping rates are ready.
   * The `shippingRates` field is `null` when this value is `false`.
   * This field should be polled until its value becomes `true`.
   *
   */
  ready: Scalars['Boolean']['output'];
  /** The fetched shipping rates. `null` until the `ready` field is `true`. */
  shippingRates?: Maybe<Array<ShippingRate>>;
};

/** Represents the business account information. */
export type BusinessAccount = {
  __typename?: 'BusinessAccount';
  /** The list of companies the customer operates in. */
  companies: CompanyConnection;
  /** The information of the customer's company. */
  company?: Maybe<Company>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The profile of the customer. */
  profile?: Maybe<Contact>;
  /** The profile of the customer. */
  profileV1?: Maybe<Contact>;
};

/** Represents the business account information. */
export type BusinessAccountCompaniesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents the business account information. */
export type BusinessAccountCompanyArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * The input fields required for updating a business contact.
 *
 */
export type BusinessContactUpdateInput = {
  /** The first name of the business contact. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The last name of the business contact. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The locale of the business contact. */
  locale?: InputMaybe<Scalars['String']['input']>;
  /** The title of the business contact. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `businessContactUpdate` mutation. */
export type BusinessContactUpdatePayload = {
  __typename?: 'BusinessContactUpdatePayload';
  /** The updated business contact information. */
  businessContact?: Maybe<CompanyContact>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsBusinessContactUserErrors>;
};

/** Return type for `businessContactUpdateV1` mutation. */
export type BusinessContactUpdateV1Payload = {
  __typename?: 'BusinessContactUpdateV1Payload';
  /** The updated business contact information. */
  businessContact?: Maybe<Contact>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsBusinessContactUserErrors>;
};

/** Possible error codes that can be returned by `BusinessCustomerUserError`. */
export type BusinessCustomerErrorCode =
  /** The input value is blank. */
  | 'BLANK'
  /** Business location doesn't exist. */
  | 'BUSINESS_LOCATION_NOT_FOUND'
  /** Deleting the resource failed. */
  | 'FAILED_TO_DELETE'
  /** An internal error occurred. */
  | 'INTERNAL_ERROR'
  /** The input value is invalid. */
  | 'INVALID'
  /** The input is invalid. */
  | 'INVALID_INPUT'
  /** The number of resources exceeded the limit. */
  | 'LIMIT_REACHED'
  /** The input is empty. */
  | 'NO_INPUT'
  /** Permission denied. */
  | 'PERMISSION_DENIED'
  /** Missing a required field. */
  | 'REQUIRED'
  /** The resource wasn't found. */
  | 'RESOURCE_NOT_FOUND'
  /** The input value is already taken. */
  | 'TAKEN'
  /** The field value is too long. */
  | 'TOO_LONG'
  /** Unexpected type. */
  | 'UNEXPECTED_TYPE';

/** An error that happens during the execution of a business customer mutation. */
export type BusinessCustomerUserError = DisplayableError & {
  __typename?: 'BusinessCustomerUserError';
  /** The error code. */
  code?: Maybe<BusinessCustomerErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Return type for `businessLocationBillingAddressCreate` mutation. */
export type BusinessLocationBillingAddressCreatePayload = {
  __typename?: 'BusinessLocationBillingAddressCreatePayload';
  /** The created address. */
  businessLocationBillingAddress?: Maybe<CompanyAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCompanyAddressUserErrors>;
};

/** Return type for `businessLocationBillingAddressUpdate` mutation. */
export type BusinessLocationBillingAddressUpdatePayload = {
  __typename?: 'BusinessLocationBillingAddressUpdatePayload';
  /** The updated address. */
  businessLocationBillingAddress?: Maybe<CompanyAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCompanyAddressUserErrors>;
};

/** Return type for `businessLocationCreditCardAdd` mutation. */
export type BusinessLocationCreditCardAddPayload = {
  __typename?: 'BusinessLocationCreditCardAddPayload';
  /** The newly added credit card. */
  creditCard?: Maybe<CustomerCreditCard>;
  /**
   * The URL to redirect the customer to for completing the 3D Secure payment flow.
   *
   */
  nextActionUrl?: Maybe<Scalars['URL']['output']>;
  /** If the card verification result is processing. When this is true, credit_card will be null. */
  processing?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsBusinessLocationPaymentInstrumentUserErrors>;
};

/** Return type for `businessLocationCreditCardUpdate` mutation. */
export type BusinessLocationCreditCardUpdatePayload = {
  __typename?: 'BusinessLocationCreditCardUpdatePayload';
  /** The updated credit card. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** If the card verification result is processing. When this is true, credit_card will be null. */
  processing?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsBusinessLocationPaymentInstrumentUserErrors>;
};

/** Return type for `businessLocationPaymentInstrumentRemove` mutation. */
export type BusinessLocationPaymentInstrumentRemovePayload = {
  __typename?: 'BusinessLocationPaymentInstrumentRemovePayload';
  /** The ID of the removed payment instrument. */
  deletedPaymentInstrumentId?: Maybe<Scalars['ID']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsBusinessLocationPaymentInstrumentUserErrors>;
};

/** Return type for `businessLocationShippingAddressCreate` mutation. */
export type BusinessLocationShippingAddressCreatePayload = {
  __typename?: 'BusinessLocationShippingAddressCreatePayload';
  /** The created address. */
  businessLocationShippingAddress?: Maybe<CompanyAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCompanyAddressUserErrors>;
};

/** Return type for `businessLocationShippingAddressUpdate` mutation. */
export type BusinessLocationShippingAddressUpdatePayload = {
  __typename?: 'BusinessLocationShippingAddressUpdatePayload';
  /** The updated address. */
  businessLocationShippingAddress?: Maybe<CompanyAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCompanyAddressUserErrors>;
};

/** The configuration for the buyer's checkout. */
export type BuyerExperienceConfiguration = {
  __typename?: 'BuyerExperienceConfiguration';
  /**
   * Whether the buyer must pay at checkout or
   * can choose to pay at checkout or pay later using net terms.
   *
   */
  payNowOnly: Scalars['Boolean']['output'];
  /** The merchant configured payment terms. */
  paymentTermsTemplate?: Maybe<PaymentTermsTemplate>;
};

/** The card payment details related to a transaction. */
export type CardPaymentDetails = {
  __typename?: 'CardPaymentDetails';
  /** The brand of the credit card used. */
  cardBrand: Scalars['String']['output'];
  /** The last four digits of the credit card used. */
  last4?: Maybe<Scalars['String']['output']>;
};

/** A container for information required to checkout items and pay. */
export type Checkout = Node & {
  __typename?: 'Checkout';
  /** The gift cards used on the checkout. */
  appliedGiftCards: Array<AppliedGiftCard>;
  /**
   * The available shipping rates for this Checkout.
   * Should only be used when checkout `requiresShipping` is `true` and
   * the shipping address is valid.
   *
   */
  availableShippingRates?: Maybe<AvailableShippingRates>;
  /** The date and time when the checkout was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The currency code for the checkout. */
  currencyCode: CurrencyCode;
  /** The extra information added to the checkout. */
  customAttributes: Array<Attribute>;
  /** The discounts applied on the checkout. */
  discountApplications: DiscountApplicationConnection;
  /** The email associated with this checkout. */
  email?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** A list of line item objects, each containing information about an item in the checkout. */
  lineItems: CheckoutLineItemConnection;
  /**
   * The sum of all the prices of all the items in the checkout,
   * excluding duties, taxes, shipping, and discounts.
   *
   */
  lineItemsSubtotalPrice: MoneyV2;
  /** The note associated with the checkout. */
  note?: Maybe<Scalars['String']['output']>;
  /** The amount left to be paid. This is equal to the cost of the line items, duties, taxes, and shipping, minus discounts and gift cards. */
  paymentDue: MoneyV2;
  /**
   * Whether the Checkout is ready and can be completed. Checkouts may
   * have asynchronous operations that can take time to finish. If you want
   * to complete a checkout or ensure all the fields are populated and up to
   * date, polling is required until the value is true.
   *
   */
  ready: Scalars['Boolean']['output'];
  /** Whether the fulfillment requires shipping. */
  requiresShipping: Scalars['Boolean']['output'];
  /** The address where the line items will be shipped. */
  shippingAddress?: Maybe<CustomerMailingAddress>;
  /**
   * The discounts allocated to the shipping line by discount applications.
   *
   */
  shippingDiscountAllocations: Array<DiscountAllocation>;
  /** The selected shipping rate, transitioned to a `shipping_line` object. */
  shippingLine?: Maybe<ShippingRate>;
  /** The configuration values used to initialize a Shop Pay checkout. */
  shopPayConfiguration?: Maybe<ShopPayConfiguration>;
  /** The price at checkout before duties, shipping, and taxes. */
  subtotalPrice: MoneyV2;
  /** Whether the checkout is tax exempt. */
  taxExempt: Scalars['Boolean']['output'];
  /** Whether taxes are included in the line item and shipping line prices. */
  taxesIncluded: Scalars['Boolean']['output'];
  /** The sum of all the duties applied to the line items in the checkout. */
  totalDuties?: Maybe<MoneyV2>;
  /**
   * The sum of all the prices of all the items in the checkout,
   * duties, taxes, and discounts included.
   *
   */
  totalPrice: MoneyV2;
  /** The sum of all the taxes applied to the line items and shipping lines in the checkout. */
  totalTax: MoneyV2;
  /** The URL for the checkout, accessible from the web. */
  webUrl: Scalars['URL']['output'];
};

/** A container for information required to checkout items and pay. */
export type CheckoutDiscountApplicationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A container for information required to checkout items and pay. */
export type CheckoutLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A line item in the checkout, grouped by variant and attributes. */
export type CheckoutLineItem = Node & {
  __typename?: 'CheckoutLineItem';
  /** An array of Key-Value pairs providing extra information about the line item. */
  customAttributes: Array<Attribute>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The price of the line item. */
  price?: Maybe<MoneyV2>;
  /** The quantity of the line item. */
  quantity: Scalars['Int']['output'];
  /** The title of the line item. Defaults to the product's title. */
  title: Scalars['String']['output'];
  /** The unit price of the line item. */
  unitPrice?: Maybe<MoneyV2>;
  /** The name of the variant. */
  variantTitle?: Maybe<Scalars['String']['output']>;
};

/**
 * An auto-generated type for paginating through multiple CheckoutLineItems.
 *
 */
export type CheckoutLineItemConnection = {
  __typename?: 'CheckoutLineItemConnection';
  /** A list of edges. */
  edges: Array<CheckoutLineItemEdge>;
  /** A list of the nodes contained in CheckoutLineItemEdge. */
  nodes: Array<CheckoutLineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one CheckoutLineItem and a cursor during pagination.
 *
 */
export type CheckoutLineItemEdge = {
  __typename?: 'CheckoutLineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CheckoutLineItemEdge. */
  node: CheckoutLineItem;
};

/** Represents a company's information. */
export type Company = Node & {
  __typename?: 'Company';
  /** The list of company draft orders. */
  draftOrders: DraftOrderConnection;
  /** A unique externally-supplied ID for the company. */
  externalId?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The list of locations that the business of the business contact belongs to. */
  locations: CompanyLocationConnection;
  /** The name of the company. */
  name: Scalars['String']['output'];
  /** The list of customer orders under the company. */
  orders: OrderConnection;
  /** The profile of the customer. */
  profile?: Maybe<CompanyContact>;
  /** The profile of the customer. */
  profileV1?: Maybe<Contact>;
};

/** Represents a company's information. */
export type CompanyDraftOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<DraftOrderByCompanySortKeys>;
};

/** Represents a company's information. */
export type CompanyLocationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyLocationSortKeys>;
};

/** Represents a company's information. */
export type CompanyOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<OrderByCompanySortKeys>;
};

/** The address of a company location, either billing or shipping. */
export type CompanyAddress = Node & {
  __typename?: 'CompanyAddress';
  /** The first line of the address. It is typically the street address or PO Box number. */
  address1: Scalars['String']['output'];
  /** The second line of the address. It is typically the apartment, suite, or unit number. */
  address2?: Maybe<Scalars['String']['output']>;
  /** The city, district, village, or town. */
  city?: Maybe<Scalars['String']['output']>;
  /** The name of the company. */
  company: Scalars['String']['output'];
  /** The name of the company. */
  companyName: Scalars['String']['output'];
  /** The name of the country of the address. */
  country?: Maybe<Scalars['String']['output']>;
  /** The two-letter code for the country of the address, for example, US. */
  countryCode: CountryCode;
  /** The two-letter code for the country of the address, for example, US. */
  countryCodeV2: CountryCode;
  /**
   * The date and time (in [ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601))
   * when the company address was created.
   *
   */
  createdAt: Scalars['DateTime']['output'];
  /** The first name of the recipient. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** The formatted version of the address. */
  formatted: Array<Scalars['String']['output']>;
  /** The formatted version of the address. */
  formattedAddress: Array<Scalars['String']['output']>;
  /** A comma-separated list of the city, province, and country values. */
  formattedArea?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The last name of the recipient. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** The latitude coordinate of the address. */
  latitude?: Maybe<Scalars['Float']['output']>;
  /** The longitude coordinate of the address. */
  longitude?: Maybe<Scalars['Float']['output']>;
  /**
   * The unique phone number of the customer, formatted using the E.164 standard, for example, _+16135551111_.
   *
   */
  phone?: Maybe<Scalars['String']['output']>;
  /** The region of the address, such as the province, state, or district. */
  province?: Maybe<Scalars['String']['output']>;
  /** The two-letter code for the region, for example, ON. */
  provinceCode?: Maybe<Scalars['String']['output']>;
  /** The identity of the recipient, for example, 'Receiving Department'. */
  recipient?: Maybe<Scalars['String']['output']>;
  /**
   * The date and time (in [ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601))
   * when the company address was last updated.
   *
   */
  updatedAt: Scalars['DateTime']['output'];
  /** The zip or postal code of the address. */
  zip?: Maybe<Scalars['String']['output']>;
  /** The two-letter code for the region, for example, ON. */
  zoneCode?: Maybe<Scalars['String']['output']>;
};

/** The address of a company location, either billing or shipping. */
export type CompanyAddressFormattedArgs = {
  withCompanyName?: InputMaybe<Scalars['Boolean']['input']>;
  withName?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The address of a company location, either billing or shipping. */
export type CompanyAddressFormattedAddressArgs = {
  withCompanyName?: InputMaybe<Scalars['Boolean']['input']>;
  withName?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The input fields for creating or updating a company location address. */
export type CompanyAddressInput = {
  /** The first line of the address, typically the street address or PO Box number. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** The second line of the address, typically the number of the apartment, suite, or unit. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** The name of the city, district, village, or town. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** The two-letter code for the country of the address. */
  countryCode?: InputMaybe<CountryCode>;
  /** The first name in the address. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The last name in the address. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** A unique phone number for the business location, formatted using the E.164 standard, for example, _+16135551111_. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** The identity of the recipient, for example, 'Receiving Department'. */
  recipient?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  zip?: InputMaybe<Scalars['String']['input']>;
  /** The code for the region of the address, such as the province, state, or district, for example, QC for Quebec, Canada. */
  zoneCode?: InputMaybe<Scalars['String']['input']>;
};

/** The valid values for the address type of a company. */
export type CompanyAddressType =
  /** The address is a billing address. */
  | 'BILLING'
  /** The address is a shipping address. */
  | 'SHIPPING';

/**
 * An auto-generated type for paginating through multiple Companies.
 *
 */
export type CompanyConnection = {
  __typename?: 'CompanyConnection';
  /** A list of edges. */
  edges: Array<CompanyEdge>;
  /** A list of the nodes contained in CompanyEdge. */
  nodes: Array<Company>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** Represents the customer's contact information. */
export type CompanyContact = Node & {
  __typename?: 'CompanyContact';
  /** The information of the copmany contact's company. */
  company?: Maybe<Company>;
  /** The customer associated to this contact. */
  customer: Customer;
  /** The list of company contact's draft orders. */
  draftOrders: DraftOrderConnection;
  /** Whether the company contact has permissions on locations in the scope. */
  hasPermissionOnLocations: Scalars['Boolean']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The list of locations that the company contact belongs to. */
  locations: CompanyLocationConnection;
  /** The list of locations that the company contact belongs to. */
  locationsV1: LocationConnection;
  /** The list of company contact's orders. */
  orders: OrderConnection;
  /** The current status of the company contact. */
  status: CompanyContactStatusType;
  /** The list of tax exemptions applied to the company contact with additional details. */
  taxExemptionsDetails: Array<TaxExemptionDetails>;
  /** The job title of the company contact. */
  title?: Maybe<Scalars['String']['output']>;
};

/** Represents the customer's contact information. */
export type CompanyContactDraftOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<DraftOrderSortKeys>;
};

/** Represents the customer's contact information. */
export type CompanyContactHasPermissionOnLocationsArgs = {
  permissions: Array<PermittedOperation>;
  resource: ResourceType;
  scope: ContactPermissionLocationScopeType;
};

/** Represents the customer's contact information. */
export type CompanyContactLocationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyLocationSortKeys>;
};

/** Represents the customer's contact information. */
export type CompanyContactLocationsV1Args = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyLocationSortKeys>;
};

/** Represents the customer's contact information. */
export type CompanyContactOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<OrderByContactSortKeys>;
};

/**
 * An auto-generated type for paginating through multiple CompanyContacts.
 *
 */
export type CompanyContactConnection = {
  __typename?: 'CompanyContactConnection';
  /** A list of edges. */
  edges: Array<CompanyContactEdge>;
  /** A list of the nodes contained in CompanyContactEdge. */
  nodes: Array<CompanyContact>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one CompanyContact and a cursor during pagination.
 *
 */
export type CompanyContactEdge = {
  __typename?: 'CompanyContactEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CompanyContactEdge. */
  node: CompanyContact;
};

/** A role for a company contact. */
export type CompanyContactRole = Node & {
  __typename?: 'CompanyContactRole';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The name of the role. */
  name: Scalars['String']['output'];
  /** The permissions on a specified resource. */
  resourcePermission: Array<PermittedOperation>;
  /** A list of permissions on all resources. */
  resourcePermissions: Array<ResourcePermission>;
};

/** A role for a company contact. */
export type CompanyContactRoleResourcePermissionArgs = {
  resource: ResourceType;
};

/** Represents information about a company contact role assignment. */
export type CompanyContactRoleAssignment = Node & {
  __typename?: 'CompanyContactRoleAssignment';
  /** The company contact for whom this role is assigned. */
  contact: CompanyContact;
  /** The company contact for whom this role is assigned. */
  contactV1: Contact;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The role that's assigned. */
  role: CompanyContactRole;
};

/**
 * An auto-generated type for paginating through multiple CompanyContactRoleAssignments.
 *
 */
export type CompanyContactRoleAssignmentConnection = {
  __typename?: 'CompanyContactRoleAssignmentConnection';
  /** A list of edges. */
  edges: Array<CompanyContactRoleAssignmentEdge>;
  /** A list of the nodes contained in CompanyContactRoleAssignmentEdge. */
  nodes: Array<CompanyContactRoleAssignment>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one CompanyContactRoleAssignment and a cursor during pagination.
 *
 */
export type CompanyContactRoleAssignmentEdge = {
  __typename?: 'CompanyContactRoleAssignmentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CompanyContactRoleAssignmentEdge. */
  node: CompanyContactRoleAssignment;
};

/** The set of valid sort keys for the CompanyContactRoleAssignment query. */
export type CompanyContactRoleAssignmentSortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `location_name` value. */
  | 'LOCATION_NAME'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** The set of valid sort keys for the CompanyContact query. */
export type CompanyContactSortKeys =
  /** Sort by the `company_id` value. */
  | 'COMPANY_ID'
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `email` value. */
  | 'EMAIL'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `name` value. */
  | 'NAME'
  /** Sort by the `name_email` value. */
  | 'NAME_EMAIL'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `title` value. */
  | 'TITLE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** A flag to describe the current status of a company contact. */
export type CompanyContactStatusType =
  /** The contact is disabled and removed from the company. */
  | 'DISABLED'
  /** The contact is enabled and active. */
  | 'ENABLED';

/**
 * An auto-generated type which holds one Company and a cursor during pagination.
 *
 */
export type CompanyEdge = {
  __typename?: 'CompanyEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CompanyEdge. */
  node: Company;
};

/** Represents a company's business location. */
export type CompanyLocation = Node & {
  __typename?: 'CompanyLocation';
  /** The billing address of the company location. */
  billingAddress?: Maybe<CompanyAddress>;
  /** The configuration of the buyer's B2B checkout. */
  buyerExperienceConfiguration?: Maybe<BuyerExperienceConfiguration>;
  /** The list of contacts under a particular business location. */
  contacts: CompanyContactConnection;
  /** The list of contacts under a particular business location. */
  contactsV1: ContactConnection;
  /** The credit card corresponding to the provided ID. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** The list of stored credit cards. */
  creditCards: CustomerCreditCardConnection;
  /** The list of company draft orders. */
  draftOrders: DraftOrderConnection;
  /** A unique externally-supplied ID for the location. */
  externalId?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The market that includes the location's shipping address. If the shipping address is empty, the shop's primary market is returned. */
  market: Market;
  /** The name of the company location. */
  name: Scalars['String']['output'];
  /** The list of customer orders under the company. */
  orders: OrderConnection;
  /** The list of roles assigned to this location. */
  roleAssignments: CompanyContactRoleAssignmentConnection;
  /** The shipping address of the company location. */
  shippingAddress?: Maybe<CompanyAddress>;
  /** The list of tax exemptions applied to the location. */
  taxExemptions: Array<TaxExemption>;
  /** The list of tax exemptions applied to the location with additional details. */
  taxExemptionsDetails: Array<TaxExemptionDetails>;
  /** The tax id of the company location. */
  taxIdentifier?: Maybe<Scalars['String']['output']>;
};

/** Represents a company's business location. */
export type CompanyLocationContactsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyContactSortKeys>;
};

/** Represents a company's business location. */
export type CompanyLocationContactsV1Args = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyContactSortKeys>;
};

/** Represents a company's business location. */
export type CompanyLocationCreditCardArgs = {
  id: Scalars['ID']['input'];
};

/** Represents a company's business location. */
export type CompanyLocationCreditCardsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents a company's business location. */
export type CompanyLocationDraftOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<DraftOrderByLocationSortKeys>;
};

/** Represents a company's business location. */
export type CompanyLocationOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<OrderByLocationSortKeys>;
};

/** Represents a company's business location. */
export type CompanyLocationRoleAssignmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyContactRoleAssignmentSortKeys>;
};

/** Return type for `companyLocationAssignAddress` mutation. */
export type CompanyLocationAssignAddressPayload = {
  __typename?: 'CompanyLocationAssignAddressPayload';
  /** The list of updated addresses on the company location. */
  addresses?: Maybe<Array<CompanyAddress>>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<BusinessCustomerUserError>;
};

/**
 * An auto-generated type for paginating through multiple CompanyLocations.
 *
 */
export type CompanyLocationConnection = {
  __typename?: 'CompanyLocationConnection';
  /** A list of edges. */
  edges: Array<CompanyLocationEdge>;
  /** A list of the nodes contained in CompanyLocationEdge. */
  nodes: Array<CompanyLocation>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one CompanyLocation and a cursor during pagination.
 *
 */
export type CompanyLocationEdge = {
  __typename?: 'CompanyLocationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CompanyLocationEdge. */
  node: CompanyLocation;
};

/** The set of valid sort keys for the CompanyLocation query. */
export type CompanyLocationSortKeys =
  /** Sort by the `company_and_location_name` value. */
  | 'COMPANY_AND_LOCATION_NAME'
  /** Sort by the `company_id` value. */
  | 'COMPANY_ID'
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `name` value. */
  | 'NAME'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** Represents customer's personal information. */
export type Contact = Node & {
  __typename?: 'Contact';
  /** The Draft Order corresponding to the provided ID. */
  draftOrder?: Maybe<DraftOrder>;
  /** The list of company draft orders. */
  draftOrders: DraftOrderConnection;
  /** The email address of the customer. */
  email?: Maybe<Scalars['String']['output']>;
  /** The email address of the contact. */
  emailAddress?: Maybe<CustomerEmailAddress>;
  /** The first name of the customer. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** Whether the company contact has view permission on any location. */
  hasOrdersViewPermissionOnAnyLocation: Scalars['Boolean']['output'];
  /** Whether the company contact has permissions on locations in the scope. */
  hasPermissionOnLocations: Scalars['Boolean']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The last name of the customer. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** The locale of the customer. */
  locale?: Maybe<Scalars['String']['output']>;
  /** The Location corresponding to the provided ID. */
  location?: Maybe<CompanyLocation>;
  /** The Location corresponding to the provided ID. */
  locationV1?: Maybe<Location>;
  /** The list of locations that the business of the business contact belongs to. */
  locations: CompanyLocationConnection;
  /** The list of locations that the business of the business contact belongs to. */
  locationsV1: LocationConnection;
  /** The Order corresponding to the provided ID. */
  order?: Maybe<Order>;
  /** The Order corresponding to the provided ID. */
  orderDetailsPageOrder?: Maybe<OrderDetailsPageOrder>;
  /** The list of contact orders. */
  orders: OrderConnection;
  /** The phone number of the customer. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The phone number of the customer. */
  phoneNumber?: Maybe<CustomerPhoneNumber>;
  /** The current status of the customer. */
  status: CompanyContactStatusType;
  /** Whether the company contact is exempt from being charged taxes on their orders. */
  taxExempt: Scalars['Boolean']['output'];
  /** The list of tax exemption types applied to the company_contact. */
  taxExemptions: Array<TaxExemption>;
  /** The list of tax exemptions applied to the company contact with additional details. */
  taxExemptionsDetails: Array<TaxExemptionDetails>;
  /** The title of the customer. */
  title?: Maybe<Scalars['String']['output']>;
};

/** Represents customer's personal information. */
export type ContactDraftOrderArgs = {
  id: Scalars['ID']['input'];
};

/** Represents customer's personal information. */
export type ContactDraftOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<DraftOrderSortKeys>;
};

/** Represents customer's personal information. */
export type ContactHasPermissionOnLocationsArgs = {
  permissions: Array<PermittedOperation>;
  resource: ResourceType;
  scope: ContactPermissionLocationScopeType;
};

/** Represents customer's personal information. */
export type ContactLocationArgs = {
  id: Scalars['ID']['input'];
};

/** Represents customer's personal information. */
export type ContactLocationV1Args = {
  id: Scalars['ID']['input'];
};

/** Represents customer's personal information. */
export type ContactLocationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyLocationSortKeys>;
};

/** Represents customer's personal information. */
export type ContactLocationsV1Args = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyLocationSortKeys>;
};

/** Represents customer's personal information. */
export type ContactOrderArgs = {
  id: Scalars['ID']['input'];
};

/** Represents customer's personal information. */
export type ContactOrderDetailsPageOrderArgs = {
  id: Scalars['ID']['input'];
};

/** Represents customer's personal information. */
export type ContactOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<OrderByContactSortKeys>;
};

/**
 * An auto-generated type for paginating through multiple Contacts.
 *
 */
export type ContactConnection = {
  __typename?: 'ContactConnection';
  /** A list of edges. */
  edges: Array<ContactEdge>;
  /** A list of the nodes contained in ContactEdge. */
  nodes: Array<Contact>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Contact and a cursor during pagination.
 *
 */
export type ContactEdge = {
  __typename?: 'ContactEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ContactEdge. */
  node: Contact;
};

/**
 * Defines the extent of locations for which a contact holds permissions on a resource.
 *
 */
export type ContactPermissionLocationScopeType =
  /**
   * The contact has permission on all locations.
   *
   */
  | 'ALL'
  /**
   * The contact has permission for at least one location.
   *
   */
  | 'ANY'
  /**
   * The contact has no permission on any location.
   *
   */
  | 'NONE'
  /**
   * The contact has permission on only one location.
   *
   */
  | 'ONE';

/**
 * The code designating a country/region, which generally follows ISO 3166-1 alpha-2 guidelines.
 * If a territory doesn't have a country code value in the `CountryCode` enum, then it might be considered a subdivision
 * of another country. For example, the territories associated with Spain are represented by the country code `ES`,
 * and the territories associated with the United States of America are represented by the country code `US`.
 *
 */
export type CountryCode =
  /** Ascension Island. */
  | 'AC'
  /** Andorra. */
  | 'AD'
  /** United Arab Emirates. */
  | 'AE'
  /** Afghanistan. */
  | 'AF'
  /** Antigua & Barbuda. */
  | 'AG'
  /** Anguilla. */
  | 'AI'
  /** Albania. */
  | 'AL'
  /** Armenia. */
  | 'AM'
  /** Netherlands Antilles. */
  | 'AN'
  /** Angola. */
  | 'AO'
  /** Argentina. */
  | 'AR'
  /** Austria. */
  | 'AT'
  /** Australia. */
  | 'AU'
  /** Aruba. */
  | 'AW'
  /** Åland Islands. */
  | 'AX'
  /** Azerbaijan. */
  | 'AZ'
  /** Bosnia & Herzegovina. */
  | 'BA'
  /** Barbados. */
  | 'BB'
  /** Bangladesh. */
  | 'BD'
  /** Belgium. */
  | 'BE'
  /** Burkina Faso. */
  | 'BF'
  /** Bulgaria. */
  | 'BG'
  /** Bahrain. */
  | 'BH'
  /** Burundi. */
  | 'BI'
  /** Benin. */
  | 'BJ'
  /** St. Barthélemy. */
  | 'BL'
  /** Bermuda. */
  | 'BM'
  /** Brunei. */
  | 'BN'
  /** Bolivia. */
  | 'BO'
  /** Caribbean Netherlands. */
  | 'BQ'
  /** Brazil. */
  | 'BR'
  /** Bahamas. */
  | 'BS'
  /** Bhutan. */
  | 'BT'
  /** Bouvet Island. */
  | 'BV'
  /** Botswana. */
  | 'BW'
  /** Belarus. */
  | 'BY'
  /** Belize. */
  | 'BZ'
  /** Canada. */
  | 'CA'
  /** Cocos (Keeling) Islands. */
  | 'CC'
  /** Congo - Kinshasa. */
  | 'CD'
  /** Central African Republic. */
  | 'CF'
  /** Congo - Brazzaville. */
  | 'CG'
  /** Switzerland. */
  | 'CH'
  /** Côte d’Ivoire. */
  | 'CI'
  /** Cook Islands. */
  | 'CK'
  /** Chile. */
  | 'CL'
  /** Cameroon. */
  | 'CM'
  /** China. */
  | 'CN'
  /** Colombia. */
  | 'CO'
  /** Costa Rica. */
  | 'CR'
  /** Cuba. */
  | 'CU'
  /** Cape Verde. */
  | 'CV'
  /** Curaçao. */
  | 'CW'
  /** Christmas Island. */
  | 'CX'
  /** Cyprus. */
  | 'CY'
  /** Czechia. */
  | 'CZ'
  /** Germany. */
  | 'DE'
  /** Djibouti. */
  | 'DJ'
  /** Denmark. */
  | 'DK'
  /** Dominica. */
  | 'DM'
  /** Dominican Republic. */
  | 'DO'
  /** Algeria. */
  | 'DZ'
  /** Ecuador. */
  | 'EC'
  /** Estonia. */
  | 'EE'
  /** Egypt. */
  | 'EG'
  /** Western Sahara. */
  | 'EH'
  /** Eritrea. */
  | 'ER'
  /** Spain. */
  | 'ES'
  /** Ethiopia. */
  | 'ET'
  /** Finland. */
  | 'FI'
  /** Fiji. */
  | 'FJ'
  /** Falkland Islands. */
  | 'FK'
  /** Faroe Islands. */
  | 'FO'
  /** France. */
  | 'FR'
  /** Gabon. */
  | 'GA'
  /** United Kingdom. */
  | 'GB'
  /** Grenada. */
  | 'GD'
  /** Georgia. */
  | 'GE'
  /** French Guiana. */
  | 'GF'
  /** Guernsey. */
  | 'GG'
  /** Ghana. */
  | 'GH'
  /** Gibraltar. */
  | 'GI'
  /** Greenland. */
  | 'GL'
  /** Gambia. */
  | 'GM'
  /** Guinea. */
  | 'GN'
  /** Guadeloupe. */
  | 'GP'
  /** Equatorial Guinea. */
  | 'GQ'
  /** Greece. */
  | 'GR'
  /** South Georgia & South Sandwich Islands. */
  | 'GS'
  /** Guatemala. */
  | 'GT'
  /** Guinea-Bissau. */
  | 'GW'
  /** Guyana. */
  | 'GY'
  /** Hong Kong SAR. */
  | 'HK'
  /** Heard & McDonald Islands. */
  | 'HM'
  /** Honduras. */
  | 'HN'
  /** Croatia. */
  | 'HR'
  /** Haiti. */
  | 'HT'
  /** Hungary. */
  | 'HU'
  /** Indonesia. */
  | 'ID'
  /** Ireland. */
  | 'IE'
  /** Israel. */
  | 'IL'
  /** Isle of Man. */
  | 'IM'
  /** India. */
  | 'IN'
  /** British Indian Ocean Territory. */
  | 'IO'
  /** Iraq. */
  | 'IQ'
  /** Iran. */
  | 'IR'
  /** Iceland. */
  | 'IS'
  /** Italy. */
  | 'IT'
  /** Jersey. */
  | 'JE'
  /** Jamaica. */
  | 'JM'
  /** Jordan. */
  | 'JO'
  /** Japan. */
  | 'JP'
  /** Kenya. */
  | 'KE'
  /** Kyrgyzstan. */
  | 'KG'
  /** Cambodia. */
  | 'KH'
  /** Kiribati. */
  | 'KI'
  /** Comoros. */
  | 'KM'
  /** St. Kitts & Nevis. */
  | 'KN'
  /** North Korea. */
  | 'KP'
  /** South Korea. */
  | 'KR'
  /** Kuwait. */
  | 'KW'
  /** Cayman Islands. */
  | 'KY'
  /** Kazakhstan. */
  | 'KZ'
  /** Laos. */
  | 'LA'
  /** Lebanon. */
  | 'LB'
  /** St. Lucia. */
  | 'LC'
  /** Liechtenstein. */
  | 'LI'
  /** Sri Lanka. */
  | 'LK'
  /** Liberia. */
  | 'LR'
  /** Lesotho. */
  | 'LS'
  /** Lithuania. */
  | 'LT'
  /** Luxembourg. */
  | 'LU'
  /** Latvia. */
  | 'LV'
  /** Libya. */
  | 'LY'
  /** Morocco. */
  | 'MA'
  /** Monaco. */
  | 'MC'
  /** Moldova. */
  | 'MD'
  /** Montenegro. */
  | 'ME'
  /** St. Martin. */
  | 'MF'
  /** Madagascar. */
  | 'MG'
  /** North Macedonia. */
  | 'MK'
  /** Mali. */
  | 'ML'
  /** Myanmar (Burma). */
  | 'MM'
  /** Mongolia. */
  | 'MN'
  /** Macao SAR. */
  | 'MO'
  /** Martinique. */
  | 'MQ'
  /** Mauritania. */
  | 'MR'
  /** Montserrat. */
  | 'MS'
  /** Malta. */
  | 'MT'
  /** Mauritius. */
  | 'MU'
  /** Maldives. */
  | 'MV'
  /** Malawi. */
  | 'MW'
  /** Mexico. */
  | 'MX'
  /** Malaysia. */
  | 'MY'
  /** Mozambique. */
  | 'MZ'
  /** Namibia. */
  | 'NA'
  /** New Caledonia. */
  | 'NC'
  /** Niger. */
  | 'NE'
  /** Norfolk Island. */
  | 'NF'
  /** Nigeria. */
  | 'NG'
  /** Nicaragua. */
  | 'NI'
  /** Netherlands. */
  | 'NL'
  /** Norway. */
  | 'NO'
  /** Nepal. */
  | 'NP'
  /** Nauru. */
  | 'NR'
  /** Niue. */
  | 'NU'
  /** New Zealand. */
  | 'NZ'
  /** Oman. */
  | 'OM'
  /** Panama. */
  | 'PA'
  /** Peru. */
  | 'PE'
  /** French Polynesia. */
  | 'PF'
  /** Papua New Guinea. */
  | 'PG'
  /** Philippines. */
  | 'PH'
  /** Pakistan. */
  | 'PK'
  /** Poland. */
  | 'PL'
  /** St. Pierre & Miquelon. */
  | 'PM'
  /** Pitcairn Islands. */
  | 'PN'
  /** Palestinian Territories. */
  | 'PS'
  /** Portugal. */
  | 'PT'
  /** Paraguay. */
  | 'PY'
  /** Qatar. */
  | 'QA'
  /** Réunion. */
  | 'RE'
  /** Romania. */
  | 'RO'
  /** Serbia. */
  | 'RS'
  /** Russia. */
  | 'RU'
  /** Rwanda. */
  | 'RW'
  /** Saudi Arabia. */
  | 'SA'
  /** Solomon Islands. */
  | 'SB'
  /** Seychelles. */
  | 'SC'
  /** Sudan. */
  | 'SD'
  /** Sweden. */
  | 'SE'
  /** Singapore. */
  | 'SG'
  /** St. Helena. */
  | 'SH'
  /** Slovenia. */
  | 'SI'
  /** Svalbard & Jan Mayen. */
  | 'SJ'
  /** Slovakia. */
  | 'SK'
  /** Sierra Leone. */
  | 'SL'
  /** San Marino. */
  | 'SM'
  /** Senegal. */
  | 'SN'
  /** Somalia. */
  | 'SO'
  /** Suriname. */
  | 'SR'
  /** South Sudan. */
  | 'SS'
  /** São Tomé & Príncipe. */
  | 'ST'
  /** El Salvador. */
  | 'SV'
  /** Sint Maarten. */
  | 'SX'
  /** Syria. */
  | 'SY'
  /** Eswatini. */
  | 'SZ'
  /** Tristan da Cunha. */
  | 'TA'
  /** Turks & Caicos Islands. */
  | 'TC'
  /** Chad. */
  | 'TD'
  /** French Southern Territories. */
  | 'TF'
  /** Togo. */
  | 'TG'
  /** Thailand. */
  | 'TH'
  /** Tajikistan. */
  | 'TJ'
  /** Tokelau. */
  | 'TK'
  /** Timor-Leste. */
  | 'TL'
  /** Turkmenistan. */
  | 'TM'
  /** Tunisia. */
  | 'TN'
  /** Tonga. */
  | 'TO'
  /** Turkey. */
  | 'TR'
  /** Trinidad & Tobago. */
  | 'TT'
  /** Tuvalu. */
  | 'TV'
  /** Taiwan. */
  | 'TW'
  /** Tanzania. */
  | 'TZ'
  /** Ukraine. */
  | 'UA'
  /** Uganda. */
  | 'UG'
  /** U.S. Outlying Islands. */
  | 'UM'
  /** United States. */
  | 'US'
  /** Uruguay. */
  | 'UY'
  /** Uzbekistan. */
  | 'UZ'
  /** Vatican City. */
  | 'VA'
  /** St. Vincent & Grenadines. */
  | 'VC'
  /** Venezuela. */
  | 'VE'
  /** British Virgin Islands. */
  | 'VG'
  /** Vietnam. */
  | 'VN'
  /** Vanuatu. */
  | 'VU'
  /** Wallis & Futuna. */
  | 'WF'
  /** Samoa. */
  | 'WS'
  /** Kosovo. */
  | 'XK'
  /** Yemen. */
  | 'YE'
  /** Mayotte. */
  | 'YT'
  /** South Africa. */
  | 'ZA'
  /** Zambia. */
  | 'ZM'
  /** Zimbabwe. */
  | 'ZW'
  /** Unknown Region. */
  | 'ZZ';

/** Return type for `creditCardAdd` mutation. */
export type CreditCardAddPayload = {
  __typename?: 'CreditCardAddPayload';
  /** The newly added credit card. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** The URL to which the customer should be redirected to complete the 3D Secure payment flow. */
  nextActionUrl?: Maybe<Scalars['URL']['output']>;
  /** If the card verification result is processing. When this is true, credit_card will be null. */
  processing?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** Return type for `creditCardUpdate` mutation. */
export type CreditCardUpdatePayload = {
  __typename?: 'CreditCardUpdatePayload';
  /** The updated credit card. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** If the card verification result is processing. When this is true, `credit_card` will be null. */
  processing?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** The part of the image that should remain after cropping. */
export type CropRegion =
  /** Keep the bottom of the image. */
  | 'BOTTOM'
  /** Keep the center of the image. */
  | 'CENTER'
  /** Keep the left of the image. */
  | 'LEFT'
  /** Keep the right of the image. */
  | 'RIGHT'
  /** Keep the top of the image. */
  | 'TOP';

/**
 * The three-letter currency codes that represent the world currencies used in stores. These include standard ISO 4217 codes, legacy codes,
 * and non-standard codes.
 *
 */
export type CurrencyCode =
  /** United Arab Emirates Dirham (AED). */
  | 'AED'
  /** Afghan Afghani (AFN). */
  | 'AFN'
  /** Albanian Lek (ALL). */
  | 'ALL'
  /** Armenian Dram (AMD). */
  | 'AMD'
  /** Netherlands Antillean Guilder. */
  | 'ANG'
  /** Angolan Kwanza (AOA). */
  | 'AOA'
  /** Argentine Pesos (ARS). */
  | 'ARS'
  /** Australian Dollars (AUD). */
  | 'AUD'
  /** Aruban Florin (AWG). */
  | 'AWG'
  /** Azerbaijani Manat (AZN). */
  | 'AZN'
  /** Bosnia and Herzegovina Convertible Mark (BAM). */
  | 'BAM'
  /** Barbadian Dollar (BBD). */
  | 'BBD'
  /** Bangladesh Taka (BDT). */
  | 'BDT'
  /** Bulgarian Lev (BGN). */
  | 'BGN'
  /** Bahraini Dinar (BHD). */
  | 'BHD'
  /** Burundian Franc (BIF). */
  | 'BIF'
  /** Bermudian Dollar (BMD). */
  | 'BMD'
  /** Brunei Dollar (BND). */
  | 'BND'
  /** Bolivian Boliviano (BOB). */
  | 'BOB'
  /** Brazilian Real (BRL). */
  | 'BRL'
  /** Bahamian Dollar (BSD). */
  | 'BSD'
  /** Bhutanese Ngultrum (BTN). */
  | 'BTN'
  /** Botswana Pula (BWP). */
  | 'BWP'
  /** Belarusian Ruble (BYN). */
  | 'BYN'
  /** Belarusian Ruble (BYR). */
  | 'BYR'
  /** Belize Dollar (BZD). */
  | 'BZD'
  /** Canadian Dollars (CAD). */
  | 'CAD'
  /** Congolese franc (CDF). */
  | 'CDF'
  /** Swiss Francs (CHF). */
  | 'CHF'
  /** Chilean Peso (CLP). */
  | 'CLP'
  /** Chinese Yuan Renminbi (CNY). */
  | 'CNY'
  /** Colombian Peso (COP). */
  | 'COP'
  /** Costa Rican Colones (CRC). */
  | 'CRC'
  /** Cape Verdean escudo (CVE). */
  | 'CVE'
  /** Czech Koruny (CZK). */
  | 'CZK'
  /** Djiboutian Franc (DJF). */
  | 'DJF'
  /** Danish Kroner (DKK). */
  | 'DKK'
  /** Dominican Peso (DOP). */
  | 'DOP'
  /** Algerian Dinar (DZD). */
  | 'DZD'
  /** Egyptian Pound (EGP). */
  | 'EGP'
  /** Eritrean Nakfa (ERN). */
  | 'ERN'
  /** Ethiopian Birr (ETB). */
  | 'ETB'
  /** Euro (EUR). */
  | 'EUR'
  /** Fijian Dollars (FJD). */
  | 'FJD'
  /** Falkland Islands Pounds (FKP). */
  | 'FKP'
  /** United Kingdom Pounds (GBP). */
  | 'GBP'
  /** Georgian Lari (GEL). */
  | 'GEL'
  /** Ghanaian Cedi (GHS). */
  | 'GHS'
  /** Gibraltar Pounds (GIP). */
  | 'GIP'
  /** Gambian Dalasi (GMD). */
  | 'GMD'
  /** Guinean Franc (GNF). */
  | 'GNF'
  /** Guatemalan Quetzal (GTQ). */
  | 'GTQ'
  /** Guyanese Dollar (GYD). */
  | 'GYD'
  /** Hong Kong Dollars (HKD). */
  | 'HKD'
  /** Honduran Lempira (HNL). */
  | 'HNL'
  /** Croatian Kuna (HRK). */
  | 'HRK'
  /** Haitian Gourde (HTG). */
  | 'HTG'
  /** Hungarian Forint (HUF). */
  | 'HUF'
  /** Indonesian Rupiah (IDR). */
  | 'IDR'
  /** Israeli New Shekel (NIS). */
  | 'ILS'
  /** Indian Rupees (INR). */
  | 'INR'
  /** Iraqi Dinar (IQD). */
  | 'IQD'
  /** Iranian Rial (IRR). */
  | 'IRR'
  /** Icelandic Kronur (ISK). */
  | 'ISK'
  /** Jersey Pound. */
  | 'JEP'
  /** Jamaican Dollars (JMD). */
  | 'JMD'
  /** Jordanian Dinar (JOD). */
  | 'JOD'
  /** Japanese Yen (JPY). */
  | 'JPY'
  /** Kenyan Shilling (KES). */
  | 'KES'
  /** Kyrgyzstani Som (KGS). */
  | 'KGS'
  /** Cambodian Riel. */
  | 'KHR'
  /** Kiribati Dollar (KID). */
  | 'KID'
  /** Comorian Franc (KMF). */
  | 'KMF'
  /** South Korean Won (KRW). */
  | 'KRW'
  /** Kuwaiti Dinar (KWD). */
  | 'KWD'
  /** Cayman Dollars (KYD). */
  | 'KYD'
  /** Kazakhstani Tenge (KZT). */
  | 'KZT'
  /** Laotian Kip (LAK). */
  | 'LAK'
  /** Lebanese Pounds (LBP). */
  | 'LBP'
  /** Sri Lankan Rupees (LKR). */
  | 'LKR'
  /** Liberian Dollar (LRD). */
  | 'LRD'
  /** Lesotho Loti (LSL). */
  | 'LSL'
  /** Lithuanian Litai (LTL). */
  | 'LTL'
  /** Latvian Lati (LVL). */
  | 'LVL'
  /** Libyan Dinar (LYD). */
  | 'LYD'
  /** Moroccan Dirham. */
  | 'MAD'
  /** Moldovan Leu (MDL). */
  | 'MDL'
  /** Malagasy Ariary (MGA). */
  | 'MGA'
  /** Macedonia Denar (MKD). */
  | 'MKD'
  /** Burmese Kyat (MMK). */
  | 'MMK'
  /** Mongolian Tugrik. */
  | 'MNT'
  /** Macanese Pataca (MOP). */
  | 'MOP'
  /** Mauritanian Ouguiya (MRU). */
  | 'MRU'
  /** Mauritian Rupee (MUR). */
  | 'MUR'
  /** Maldivian Rufiyaa (MVR). */
  | 'MVR'
  /** Malawian Kwacha (MWK). */
  | 'MWK'
  /** Mexican Pesos (MXN). */
  | 'MXN'
  /** Malaysian Ringgits (MYR). */
  | 'MYR'
  /** Mozambican Metical. */
  | 'MZN'
  /** Namibian Dollar. */
  | 'NAD'
  /** Nigerian Naira (NGN). */
  | 'NGN'
  /** Nicaraguan Córdoba (NIO). */
  | 'NIO'
  /** Norwegian Kroner (NOK). */
  | 'NOK'
  /** Nepalese Rupee (NPR). */
  | 'NPR'
  /** New Zealand Dollars (NZD). */
  | 'NZD'
  /** Omani Rial (OMR). */
  | 'OMR'
  /** Panamian Balboa (PAB). */
  | 'PAB'
  /** Peruvian Nuevo Sol (PEN). */
  | 'PEN'
  /** Papua New Guinean Kina (PGK). */
  | 'PGK'
  /** Philippine Peso (PHP). */
  | 'PHP'
  /** Pakistani Rupee (PKR). */
  | 'PKR'
  /** Polish Zlotych (PLN). */
  | 'PLN'
  /** Paraguayan Guarani (PYG). */
  | 'PYG'
  /** Qatari Rial (QAR). */
  | 'QAR'
  /** Romanian Lei (RON). */
  | 'RON'
  /** Serbian dinar (RSD). */
  | 'RSD'
  /** Russian Rubles (RUB). */
  | 'RUB'
  /** Rwandan Franc (RWF). */
  | 'RWF'
  /** Saudi Riyal (SAR). */
  | 'SAR'
  /** Solomon Islands Dollar (SBD). */
  | 'SBD'
  /** Seychellois Rupee (SCR). */
  | 'SCR'
  /** Sudanese Pound (SDG). */
  | 'SDG'
  /** Swedish Kronor (SEK). */
  | 'SEK'
  /** Singapore Dollars (SGD). */
  | 'SGD'
  /** Saint Helena Pounds (SHP). */
  | 'SHP'
  /** Sierra Leonean Leone (SLL). */
  | 'SLL'
  /** Somali Shilling (SOS). */
  | 'SOS'
  /** Surinamese Dollar (SRD). */
  | 'SRD'
  /** South Sudanese Pound (SSP). */
  | 'SSP'
  /** Sao Tome And Principe Dobra (STD). */
  | 'STD'
  /** Sao Tome And Principe Dobra (STN). */
  | 'STN'
  /** Syrian Pound (SYP). */
  | 'SYP'
  /** Swazi Lilangeni (SZL). */
  | 'SZL'
  /** Thai baht (THB). */
  | 'THB'
  /** Tajikistani Somoni (TJS). */
  | 'TJS'
  /** Turkmenistani Manat (TMT). */
  | 'TMT'
  /** Tunisian Dinar (TND). */
  | 'TND'
  /** Tongan Pa'anga (TOP). */
  | 'TOP'
  /** Turkish Lira (TRY). */
  | 'TRY'
  /** Trinidad and Tobago Dollars (TTD). */
  | 'TTD'
  /** Taiwan Dollars (TWD). */
  | 'TWD'
  /** Tanzanian Shilling (TZS). */
  | 'TZS'
  /** Ukrainian Hryvnia (UAH). */
  | 'UAH'
  /** Ugandan Shilling (UGX). */
  | 'UGX'
  /** United States Dollars (USD). */
  | 'USD'
  /** Uruguayan Pesos (UYU). */
  | 'UYU'
  /** Uzbekistan som (UZS). */
  | 'UZS'
  /** Venezuelan Bolivares (VED). */
  | 'VED'
  /** Venezuelan Bolivares (VEF). */
  | 'VEF'
  /** Venezuelan Bolivares Soberanos (VES). */
  | 'VES'
  /** Vietnamese đồng (VND). */
  | 'VND'
  /** Vanuatu Vatu (VUV). */
  | 'VUV'
  /** Samoan Tala (WST). */
  | 'WST'
  /** Central African CFA Franc (XAF). */
  | 'XAF'
  /** East Caribbean Dollar (XCD). */
  | 'XCD'
  /** West African CFA franc (XOF). */
  | 'XOF'
  /** CFP Franc (XPF). */
  | 'XPF'
  /** Unrecognized currency. */
  | 'XXX'
  /** Yemeni Rial (YER). */
  | 'YER'
  /** South African Rand (ZAR). */
  | 'ZAR'
  /** Zambian Kwacha (ZMW). */
  | 'ZMW';

/** Represents the personal information of a customer. */
export type Customer = HasMetafields &
  Node & {
    __typename?: 'Customer';
    /** The addresses associated with the customer. */
    addresses: CustomerAddressConnection;
    /** The list of wallet payment configs for providers that the payment method accepts. */
    availableWalletPaymentConfigs: Array<WalletPaymentConfig>;
    /** The list of contacts the customer is associated with. */
    companyContacts: CompanyContactConnection;
    /** The date and time when the customer was created. */
    createdAt: Scalars['DateTime']['output'];
    /** The date and time when the customer was created. */
    creationDate: Scalars['DateTime']['output'];
    /** A Credit Card resource identified by ID. */
    creditCard?: Maybe<CustomerCreditCard>;
    /** The stored Credit Cards associated with the customer. */
    creditCards: CustomerCreditCardConnection;
    /** The default address of the customer. */
    defaultAddress?: Maybe<CustomerAddress>;
    /**
     * The full name of the customer, based on the first_name and last_name values. If these aren't available, it falls back to the customer's email address, and if that isn't available, the customer's phone number.
     *
     */
    displayName: Scalars['String']['output'];
    /** The Draft Orders associated with the customer. */
    draftOrders: DraftOrderConnection;
    /** The email address of the customer. */
    emailAddress?: Maybe<CustomerEmailAddress>;
    /** The first name of the customer. */
    firstName?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The URL to the avatar image of the customer. */
    imageUrl: Scalars['URL']['output'];
    /** The customer's most recently updated, incomplete checkout. */
    lastIncompleteCheckout?: Maybe<Checkout>;
    /** The last name of the customer. */
    lastName?: Maybe<Scalars['String']['output']>;
    /** A metafield found by namespace and key. */
    metafield?: Maybe<Metafield>;
    /**
     * The metafields associated with the resource matching the
     * supplied list of namespaces and keys.
     *
     */
    metafields: Array<Maybe<Metafield>>;
    /** The orders associated with the customer. */
    orders: OrderConnection;
    /** A PayPal Billing Agreement resource. */
    paypalBillingAgreement?: Maybe<PaypalBillingAgreement>;
    /** The phone number of the customer. */
    phoneNumber?: Maybe<CustomerPhoneNumber>;
    /** A Return identified by ID. */
    return?: Maybe<Return>;
    /** A Subscription Contract resource identified by ID. */
    subscriptionContract?: Maybe<SubscriptionContract>;
    /** The Subscription Contracts associated with the customer. */
    subscriptionContracts: SubscriptionContractConnection;
    /** A comma-separated list of tags that have been added to the customer. */
    tags: Array<Scalars['String']['output']>;
    /** The list of tax exemptions applied to the customer with additional details. */
    taxExemptionsDetails: Array<TaxExemptionDetails>;
  };

/** Represents the personal information of a customer. */
export type CustomerAddressesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  skipDefault?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents the personal information of a customer. */
export type CustomerCompanyContactsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents the personal information of a customer. */
export type CustomerCreditCardArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type CustomerCreditCardsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents the personal information of a customer. */
export type CustomerDraftOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<DraftOrderSortKeys>;
};

/** Represents the personal information of a customer. */
export type CustomerMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

/** Represents the personal information of a customer. */
export type CustomerMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** Represents the personal information of a customer. */
export type CustomerOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<OrderSortKeys>;
};

/** Represents the personal information of a customer. */
export type CustomerReturnArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type CustomerSubscriptionContractArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type CustomerSubscriptionContractsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<SubscriptionContractsSortKeys>;
};

/**
 * Represents a customer's mailing address.
 * For example, a customer's default address and an order's billing address are both mailing addresses.
 *
 */
export type CustomerAddress = Node & {
  __typename?: 'CustomerAddress';
  /** The first line of the address. Typically the street address or PO Box number. */
  address1?: Maybe<Scalars['String']['output']>;
  /**
   * The second line of the address. This is typically the apartment, suite, or unit number.
   *
   */
  address2?: Maybe<Scalars['String']['output']>;
  /**
   * The name of the city, district, village, or town.
   *
   */
  city?: Maybe<Scalars['String']['output']>;
  /**
   * The name of the customer's company or organization.
   *
   */
  company?: Maybe<Scalars['String']['output']>;
  /**
   * The name of the country.
   *
   */
  country?: Maybe<Scalars['String']['output']>;
  /** The first name of the customer. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** A formatted version of the address, customized by the provided arguments. */
  formatted: Array<Scalars['String']['output']>;
  /** A comma-separated list of the values for city, province, and country. */
  formattedArea?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The last name of the customer. */
  lastName?: Maybe<Scalars['String']['output']>;
  /**
   * The full name of the customer, based on firstName and lastName.
   *
   */
  name?: Maybe<Scalars['String']['output']>;
  /**
   * The customer's unique phone number.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   *
   */
  phoneNumber?: Maybe<Scalars['String']['output']>;
  /** The region of the address, such as the province, state, or district. */
  province?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   *
   */
  territoryCode?: Maybe<CountryCode>;
  /** The zip or postal code of the address. */
  zip?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the region.
   *
   * For example, ON.
   *
   */
  zoneCode?: Maybe<Scalars['String']['output']>;
};

/**
 * Represents a customer's mailing address.
 * For example, a customer's default address and an order's billing address are both mailing addresses.
 *
 */
export type CustomerAddressFormattedArgs = {
  withCompany?: InputMaybe<Scalars['Boolean']['input']>;
  withName?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An auto-generated type for paginating through multiple CustomerAddresses.
 *
 */
export type CustomerAddressConnection = {
  __typename?: 'CustomerAddressConnection';
  /** A list of edges. */
  edges: Array<CustomerAddressEdge>;
  /** A list of the nodes contained in CustomerAddressEdge. */
  nodes: Array<CustomerAddress>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** Return type for `customerAddressCreate` mutation. */
export type CustomerAddressCreatePayload = {
  __typename?: 'CustomerAddressCreatePayload';
  /** The created customer address. */
  customerAddress?: Maybe<CustomerAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCustomerAddressUserErrors>;
};

/** Return type for `customerAddressDelete` mutation. */
export type CustomerAddressDeletePayload = {
  __typename?: 'CustomerAddressDeletePayload';
  /** The ID of the deleted address. */
  deletedAddressId?: Maybe<Scalars['ID']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCustomerAddressUserErrors>;
};

/**
 * An auto-generated type which holds one CustomerAddress and a cursor during pagination.
 *
 */
export type CustomerAddressEdge = {
  __typename?: 'CustomerAddressEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CustomerAddressEdge. */
  node: CustomerAddress;
};

/** The input fields to create or update a mailing address. */
export type CustomerAddressInput = {
  /** The first line of the address. Typically the street address or PO Box number. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** The second line of the address. Typically the apartment, suite, or unit number. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** The name of the city, district, village, or town. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** The name of the customer's company or organization. */
  company?: InputMaybe<Scalars['String']['input']>;
  /** The first name of the customer. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The last name of the customer. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The customer's unique phone number, formatted using E.164 standard. For example, _+16135551111_. */
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  /** The territory code for the country of the address. */
  territoryCode?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  zip?: InputMaybe<Scalars['String']['input']>;
  /**
   * The code for the region of the address, such as the province,
   * state, or district. For example, QC for Quebec, Canada.
   *
   */
  zoneCode?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `customerAddressUpdate` mutation. */
export type CustomerAddressUpdatePayload = {
  __typename?: 'CustomerAddressUpdatePayload';
  /** The updated address. */
  customerAddress?: Maybe<CustomerAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsAddressUserErrors>;
};

/** The credit card payment instrument. */
export type CustomerCreditCard = Node &
  PaymentInstrument & {
    __typename?: 'CustomerCreditCard';
    /** The billing address associated with the credit card. */
    billingAddress?: Maybe<PaymentInstrumentBillingAddress>;
    /** The brand of the credit card. */
    brand: Scalars['String']['output'];
    /** Whether the credit card is the default payment method. */
    default: Scalars['Boolean']['output'];
    /** Whether the credit card is about to expire. */
    expiresSoon: Scalars['Boolean']['output'];
    /** The expiry month of the credit card. */
    expiryMonth: Scalars['Int']['output'];
    /** The expiry year of the credit card. */
    expiryYear: Scalars['Int']['output'];
    /** The BIN number of the credit card. */
    firstDigits?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The last 4 digits of the credit card. */
    lastDigits: Scalars['String']['output'];
    /** The masked credit card number, displaying only the last 4 digits. */
    maskedNumber: Scalars['String']['output'];
    /** The name of the card holder. */
    name: Scalars['String']['output'];
    /** The list of open draft orders of an associated credit card. */
    openDraftOrders: DraftOrderConnection;
    /** The list of pending orders associated with this credit card. */
    pendingOrders: OrderConnection;
    /** Whether this credit card has permission to be shown at checkout for future purchases. */
    permissionToShowAtCheckout: Scalars['Boolean']['output'];
    /** The list of subscription contracts charged against this credit card. */
    subscriptionContracts: SubscriptionContractConnection;
    /** The last 4 digits of the Device Account Number. */
    virtualLastDigits?: Maybe<Scalars['String']['output']>;
    /** The type of wallet, if the credit card is associated with a wallet. */
    walletType?: Maybe<PaymentInstrumentWalletType>;
  };

/** The credit card payment instrument. */
export type CustomerCreditCardOpenDraftOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The credit card payment instrument. */
export type CustomerCreditCardPendingOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The credit card payment instrument. */
export type CustomerCreditCardSubscriptionContractsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<SubscriptionContractsSortKeys>;
};

/**
 * An auto-generated type for paginating through multiple CustomerCreditCards.
 *
 */
export type CustomerCreditCardConnection = {
  __typename?: 'CustomerCreditCardConnection';
  /** A list of edges. */
  edges: Array<CustomerCreditCardEdge>;
  /** A list of the nodes contained in CustomerCreditCardEdge. */
  nodes: Array<CustomerCreditCard>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one CustomerCreditCard and a cursor during pagination.
 *
 */
export type CustomerCreditCardEdge = {
  __typename?: 'CustomerCreditCardEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CustomerCreditCardEdge. */
  node: CustomerCreditCard;
};

/** An email address associated with a customer. */
export type CustomerEmailAddress = {
  __typename?: 'CustomerEmailAddress';
  /** The email address of the customer. */
  emailAddress?: Maybe<Scalars['String']['output']>;
  /** The customer's subscription status for email marketing. */
  marketingState: EmailMarketingState;
};

/** Return type for `customerEmailMarketingOptIn` mutation. */
export type CustomerEmailMarketingOptInPayload = {
  __typename?: 'CustomerEmailMarketingOptInPayload';
  /** The customer who was force subscribed to email marketing. */
  customerEmailAddress?: Maybe<CustomerEmailAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCustomerEmailMarketingOptInUserErrors>;
};

/** Return type for `customerEmailMarketingSubscribe` mutation. */
export type CustomerEmailMarketingSubscribePayload = {
  __typename?: 'CustomerEmailMarketingSubscribePayload';
  /** The customer's email address that's subscribed to the email marketing. */
  emailAddress?: Maybe<CustomerEmailAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCustomerEmailMarketingUserErrors>;
};

/** Return type for `customerEmailMarketingUnsubscribe` mutation. */
export type CustomerEmailMarketingUnsubscribePayload = {
  __typename?: 'CustomerEmailMarketingUnsubscribePayload';
  /** The customer's email address that's unsubscribed from the email marketing. */
  emailAddress?: Maybe<CustomerEmailAddress>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCustomerEmailMarketingUserErrors>;
};

/**
 * Represents a customer's mailing address.
 * For example, a customer's default address and an order's billing address are both mailing addresses.
 *
 */
export type CustomerMailingAddress = Node & {
  __typename?: 'CustomerMailingAddress';
  /** The first line of the address. Typically the street address or PO Box number. */
  address1?: Maybe<Scalars['String']['output']>;
  /**
   * The second line of the address. This is typically the apartment, suite, or unit number.
   *
   */
  address2?: Maybe<Scalars['String']['output']>;
  /**
   * The name of the city, district, village, or town.
   *
   */
  city?: Maybe<Scalars['String']['output']>;
  /**
   * The name of the customer's company or organization.
   *
   */
  company?: Maybe<Scalars['String']['output']>;
  /**
   * The name of the country.
   *
   */
  country?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   *
   */
  countryCode?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   *
   */
  countryCodeV2?: Maybe<CountryCode>;
  /** Indicates whether the address is the default address or not. */
  defaultAddress: Scalars['Boolean']['output'];
  /** The first name of the customer. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** A formatted version of the address, customized by the provided arguments. */
  formatted: Array<Scalars['String']['output']>;
  /** A comma-separated list of the values for city, province, and country. */
  formattedArea?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The last name of the customer. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** The latitude coordinate of the customer's address. */
  latitude?: Maybe<Scalars['Float']['output']>;
  /** The longitude coordinate of the customer's address. */
  longitude?: Maybe<Scalars['Float']['output']>;
  /**
   * The full name of the customer, based on firstName and lastName.
   *
   */
  name?: Maybe<Scalars['String']['output']>;
  /**
   * The customer's unique phone number.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   *
   */
  phone?: Maybe<Scalars['String']['output']>;
  /**
   * The customer's unique phone number.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   *
   */
  phoneNumber?: Maybe<Scalars['String']['output']>;
  /** The region of the address, such as the province, state, or district. */
  province?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the region.
   *
   * For example, ON.
   *
   */
  provinceCode?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   *
   */
  territoryCode?: Maybe<CountryCode>;
  /** Indicates whether the address was geolocated and is a valid address. The field returns `false` if the verification failed, or if the job to verify this address was never started. */
  verified: Scalars['Boolean']['output'];
  /** The zip or postal code of the address. */
  zip?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the region.
   *
   * For example, ON.
   *
   */
  zoneCode?: Maybe<Scalars['String']['output']>;
};

/**
 * Represents a customer's mailing address.
 * For example, a customer's default address and an order's billing address are both mailing addresses.
 *
 */
export type CustomerMailingAddressFormattedArgs = {
  withCompany?: InputMaybe<Scalars['Boolean']['input']>;
  withName?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An auto-generated type for paginating through multiple CustomerMailingAddresses.
 *
 */
export type CustomerMailingAddressConnection = {
  __typename?: 'CustomerMailingAddressConnection';
  /** A list of edges. */
  edges: Array<CustomerMailingAddressEdge>;
  /** A list of the nodes contained in CustomerMailingAddressEdge. */
  nodes: Array<CustomerMailingAddress>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one CustomerMailingAddress and a cursor during pagination.
 *
 */
export type CustomerMailingAddressEdge = {
  __typename?: 'CustomerMailingAddressEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CustomerMailingAddressEdge. */
  node: CustomerMailingAddress;
};

/** The input fields to create or update a mailing address. */
export type CustomerMailingAddressInput = {
  /** The first line of the address. Typically the street address or PO Box number. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** The second line of the address. Typically the apartment, suite, or unit number. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** The name of the city, district, village, or town. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** The name of the customer's company or organization. */
  company?: InputMaybe<Scalars['String']['input']>;
  /** The two-letter code for the country of the address. */
  countryCode?: InputMaybe<CountryCode>;
  /** The first name of the customer. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The last name of the customer. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The customer's unique phone number, formatted using E.164 standard. For example, _+16135551111_. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** The customer's unique phone number, formatted using E.164 standard. For example, _+16135551111_. */
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  /** The two-letter code for the country of the address. */
  territoryCode?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  zip?: InputMaybe<Scalars['String']['input']>;
  /**
   * The code for the region of the address, such as the province,
   * state, or district. For example, QC for Quebec, Canada.
   *
   */
  zoneCode?: InputMaybe<Scalars['String']['input']>;
};

/** Defines the phone number of the customer. */
export type CustomerPhoneNumber = {
  __typename?: 'CustomerPhoneNumber';
  /** Indicates whether the customer has subscribed to SMS marketing material. */
  marketingState: SmsMarketingState;
  /** The customer's phone number. */
  phoneNumber: Scalars['String']['output'];
};

/**
 * The input fields to update a customer's personal information.
 *
 */
export type CustomerUpdateInput = {
  /** The customer's first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The customer's last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `customerUpdate` mutation. */
export type CustomerUpdatePayload = {
  __typename?: 'CustomerUpdatePayload';
  /** The customer's personal information that has been updated. */
  customer?: Maybe<Customer>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsCustomerUserErrors>;
};

/** The different types of delivery option groups. */
export type DeliveryOptionGroupType =
  /** A one-time purchase. */
  | 'ONE_TIME_PURCHASE'
  /** A subscription. */
  | 'SUBSCRIPTION';

/**
 * Represents an amount discounting the line that has been allocated by a discount.
 *
 */
export type DiscountAllocation = {
  __typename?: 'DiscountAllocation';
  /** The amount of discount allocated. */
  allocatedAmount: MoneyV2;
  /** The discount from which this allocated amount originated. */
  discountApplication:
    | AutomaticDiscountApplication
    | DiscountCodeApplication
    | ManualDiscountApplication
    | ScriptDiscountApplication;
};

/**
 * Captures the intentions of a discount source at the time of application.
 *
 */
export type DiscountApplication = {
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** The lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The value of the discount application. */
  value: PricingValue;
};

/** The method by which the discount's value is allocated onto its entitled lines. */
export type DiscountApplicationAllocationMethod =
  /** The value is spread across all entitled lines. */
  | 'ACROSS'
  /** The value is applied onto every entitled line. */
  | 'EACH'
  /** The value is specifically applied onto a particular line. */
  | 'ONE';

/**
 * An auto-generated type for paginating through multiple DiscountApplications.
 *
 */
export type DiscountApplicationConnection = {
  __typename?: 'DiscountApplicationConnection';
  /** A list of edges. */
  edges: Array<DiscountApplicationEdge>;
  /** A list of the nodes contained in DiscountApplicationEdge. */
  nodes: Array<
    | AutomaticDiscountApplication
    | DiscountCodeApplication
    | ManualDiscountApplication
    | ScriptDiscountApplication
  >;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one DiscountApplication and a cursor during pagination.
 *
 */
export type DiscountApplicationEdge = {
  __typename?: 'DiscountApplicationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of DiscountApplicationEdge. */
  node:
    | AutomaticDiscountApplication
    | DiscountCodeApplication
    | ManualDiscountApplication
    | ScriptDiscountApplication;
};

/**
 * The lines on the order to which the discount is applied, of the type defined by
 * the discount application's `targetType`. For example, the value `ENTITLED`, combined with a `targetType` of
 * `LINE_ITEM`, applies the discount on all line items that are entitled to the discount.
 * The value `ALL`, combined with a `targetType` of `SHIPPING_LINE`, applies the discount on all shipping lines.
 *
 */
export type DiscountApplicationTargetSelection =
  /** The discount is allocated onto all the lines. */
  | 'ALL'
  /** The discount is allocated onto only the lines that it's entitled for. */
  | 'ENTITLED'
  /** The discount is allocated onto explicitly chosen lines. */
  | 'EXPLICIT';

/**
 * The type of line (i.e. line item or shipping line) on an order that the discount is applicable towards.
 *
 */
export type DiscountApplicationTargetType =
  /** The discount applies onto line items. */
  | 'LINE_ITEM'
  /** The discount applies onto shipping lines. */
  | 'SHIPPING_LINE';

/**
 * The type of the discount application.
 *
 */
export type DiscountApplicationType =
  /** Automatic discount application type. */
  | 'AUTOMATIC'
  /** Discount code discount application type. */
  | 'DISCOUNT_CODE'
  /** Manual discount application type. */
  | 'MANUAL'
  /** Script discount application type. */
  | 'SCRIPT';

/**
 * Captures the intentions of a discount code at the time that it is applied.
 *
 */
export type DiscountCodeApplication = DiscountApplication & {
  __typename?: 'DiscountCodeApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** The string identifying the discount code used at the time of application. */
  code: Scalars['String']['output'];
  /** The lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The value of the discount application. */
  value: PricingValue;
};

/** Represents an error in the input of a mutation. */
export type DisplayableError = {
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** A unique string representing the address of a Shopify store on the Internet. */
export type Domain = Node & {
  __typename?: 'Domain';
  /** The host name of the domain (for example, `example.com`). */
  host: Scalars['String']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The host of the primary domain that this domain redirects to (for example, `example.com`). */
  redirectHost?: Maybe<Scalars['String']['output']>;
  /** The URL of the domain (for example, `example.com`). */
  url: Scalars['URL']['output'];
};

/** A draft order for the customer. Any fields related to money are in the presentment currency. */
export type DraftOrder = Node & {
  __typename?: 'DraftOrder';
  /**
   * The billing address of the customer.
   *
   */
  billingAddress?: Maybe<CustomerAddress>;
  /** Whether the customer who made the draft order has an associated enabled contact. */
  contactExists: Scalars['Boolean']['output'];
  /** The date and time when the draft order was created in Shopify. */
  createdAt: Scalars['DateTime']['output'];
  /**
   * The three-letter code for the currency of the store at the time that the invoice is sent.
   *
   */
  currencyCode: CurrencyCode;
  /** The customer who placed the order. */
  customer?: Maybe<Customer>;
  /** The customer who placed the order. */
  customerV1?: Maybe<PersonalAccount>;
  /** The discount information for the draft order. */
  discountInformation: DraftOrderDiscountInformation;
  /** The email address of the customer, which is used to send notifications to. */
  email?: Maybe<Scalars['String']['output']>;
  /** The email address of the customer, which is used to send notifications to. */
  emailAddress?: Maybe<CustomerEmailAddress>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** Whether the draft order is created from the online store and is open. */
  inReview: Scalars['Boolean']['output'];
  /** The link to the checkout, which is sent to the customer in the invoice email. */
  invoiceUrl?: Maybe<Scalars['URL']['output']>;
  /** The list of the line items in the draft order. */
  lineItems: DraftOrderLineItemConnection;
  /** The summary of draft order line items quantity. */
  lineItemsSummary?: Maybe<DraftOrderLineItemsSummary>;
  /**
   * The unique identifier for the draft order, which is unique within the store. For example, _#D1223_.
   *
   */
  name: Scalars['String']['output'];
  /** The order that was created from this draft order. */
  order?: Maybe<Order>;
  /** The phone number assigned to the draft order. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The purchasing entity for the draft order. */
  purchasingEntity?: Maybe<PurchasingEntity>;
  /** The purchasing entity for the draft order. */
  purchasingEntityV1?: Maybe<PurchasingEntityV1>;
  /** Whether the draft order requires shipping or not. */
  requiresShipping: Scalars['Boolean']['output'];
  /** The shipping address of the customer. */
  shippingAddress?: Maybe<CustomerAddress>;
  /** The status of the draft order. */
  status: DraftOrderStatus;
  /**
   * The subtotal of the line items (doesn't include shipping charges, shipping discounts, or taxes).
   *
   */
  subtotalPrice: MoneyV2;
  /**
   * The subtotal of the line items (doesn't include shipping charges, taxes, or any discounts).
   *
   */
  subtotalPriceBeforeDiscounts: MoneyV2;
  /** Indicates whether the draft order is tax exempt. */
  taxExempt: Scalars['Boolean']['output'];
  /** Whether the line item prices include taxes. */
  taxesIncluded: Scalars['Boolean']['output'];
  /** The total price of line items for this draft order. */
  totalLineItemsPrice: MoneyV2;
  /**
   * The total amount of the draft order (includes taxes, shipping charges, and discounts).
   *
   */
  totalPrice: MoneyV2;
  /**
   * The total shipping charge for the draft order.
   *
   */
  totalShippingPrice: MoneyV2;
  /**
   * The total amount of taxes for the draft order.
   *
   */
  totalTax: MoneyV2;
  /** The total weight (in grams) of the draft order. */
  totalWeight: Scalars['UnsignedInt64']['output'];
  /**
   * The date and time when the draft order was last changed.
   * The format is YYYY-MM-DD HH:mm:ss (for example, 2016-02-05 17:04:01).
   *
   */
  updatedAt: Scalars['DateTime']['output'];
};

/** A draft order for the customer. Any fields related to money are in the presentment currency. */
export type DraftOrderLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The order-level discount applied to a draft order. */
export type DraftOrderAppliedDiscount = {
  __typename?: 'DraftOrderAppliedDiscount';
  /** The amount of money discounted. */
  discountValue: MoneyV2;
  /** The name of the order-level discount. */
  title?: Maybe<Scalars['String']['output']>;
};

/** The set of valid sort keys for the DraftOrderByCompany query. */
export type DraftOrderByCompanySortKeys =
  /** Sort by the `customer_name` value. */
  | 'CUSTOMER_NAME'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `number` value. */
  | 'NUMBER'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `status` value. */
  | 'STATUS'
  /** Sort by the `total_price` value. */
  | 'TOTAL_PRICE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** The set of valid sort keys for the DraftOrderByLocation query. */
export type DraftOrderByLocationSortKeys =
  /** Sort by the `customer_name` value. */
  | 'CUSTOMER_NAME'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `number` value. */
  | 'NUMBER'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `status` value. */
  | 'STATUS'
  /** Sort by the `total_price` value. */
  | 'TOTAL_PRICE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/**
 * An auto-generated type for paginating through multiple DraftOrders.
 *
 */
export type DraftOrderConnection = {
  __typename?: 'DraftOrderConnection';
  /** A list of edges. */
  edges: Array<DraftOrderEdge>;
  /** A list of the nodes contained in DraftOrderEdge. */
  nodes: Array<DraftOrder>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** The discount information associated with a draft order. */
export type DraftOrderDiscountInformation = {
  __typename?: 'DraftOrderDiscountInformation';
  /** The order-level discount applied to the draft order. */
  appliedDiscount?: Maybe<DraftOrderAppliedDiscount>;
  /** The total discounts applied to the draft order. */
  totalDiscounts: MoneyV2;
};

/**
 * An auto-generated type which holds one DraftOrder and a cursor during pagination.
 *
 */
export type DraftOrderEdge = {
  __typename?: 'DraftOrderEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of DraftOrderEdge. */
  node: DraftOrder;
};

/** A line item included in a draft order. */
export type DraftOrderLineItem = Node & {
  __typename?: 'DraftOrderLineItem';
  /** The discount information for the draft order line item. */
  discountInformation: DraftOrderLineItemDiscountInformation;
  /**
   * The total price of the line item after discounts have been applied.
   *
   */
  discountedTotal: MoneyV2;
  /**
   * The discounted total divided by the quantity, resulting in the value of the discount per unit.
   *
   */
  discountedUnitPrice: MoneyV2;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The image associated with the line item. */
  image?: Maybe<Image>;
  /** The name of the product. */
  name: Scalars['String']['output'];
  /**
   * The total price of the line item, based on the original unit price of the variant multiplied by the quantity. This total doesn't include any discounts.
   *
   */
  originalTotal: MoneyV2;
  /** The price of the variant without any discounts applied. */
  originalUnitPrice: MoneyV2;
  /** The quantity of this variant item in the draft order. */
  quantity: Scalars['Int']['output'];
  /** Whether the variant requires physical shipping. */
  requiresShipping: Scalars['Boolean']['output'];
  /** The SKU number of the variant. */
  sku?: Maybe<Scalars['String']['output']>;
  /** Whether the variant is taxable. */
  taxable: Scalars['Boolean']['output'];
  /** The title of the product or variant. This only applies to custom line items. */
  title: Scalars['String']['output'];
  /** The name of the product variant. */
  variantTitle?: Maybe<Scalars['String']['output']>;
  /** The name of the vendor of the variant. */
  vendor?: Maybe<Scalars['String']['output']>;
  /** The weight of the line item, including the unit and value. */
  weight?: Maybe<Weight>;
};

/** A line item included in a draft order. */
export type DraftOrderLineItemImageArgs = {
  crop?: InputMaybe<CropRegion>;
  maxHeight?: InputMaybe<Scalars['Int']['input']>;
  maxWidth?: InputMaybe<Scalars['Int']['input']>;
  scale?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * An auto-generated type for paginating through multiple DraftOrderLineItems.
 *
 */
export type DraftOrderLineItemConnection = {
  __typename?: 'DraftOrderLineItemConnection';
  /** A list of edges. */
  edges: Array<DraftOrderLineItemEdge>;
  /** A list of the nodes contained in DraftOrderLineItemEdge. */
  nodes: Array<DraftOrderLineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** The discount information for the draft order line item. */
export type DraftOrderLineItemDiscountInformation = {
  __typename?: 'DraftOrderLineItemDiscountInformation';
  /** The title of the discount. */
  title?: Maybe<Scalars['String']['output']>;
  /** The total discount applied to the line item. */
  totalDiscount: MoneyV2;
};

/**
 * An auto-generated type which holds one DraftOrderLineItem and a cursor during pagination.
 *
 */
export type DraftOrderLineItemEdge = {
  __typename?: 'DraftOrderLineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of DraftOrderLineItemEdge. */
  node: DraftOrderLineItem;
};

/** The quantitative summary of the line items in a specific draft order. */
export type DraftOrderLineItemsSummary = {
  __typename?: 'DraftOrderLineItemsSummary';
  /** The total number of line items in the draft order. */
  lineItemCount: Scalars['Int']['output'];
  /** The total quantity of all line items in the draft order. */
  totalQuantityOfLineItems: Scalars['Int']['output'];
};

/** The set of valid sort keys for the DraftOrder query. */
export type DraftOrderSortKeys =
  /** Sort by the `customer_name` value. */
  | 'CUSTOMER_NAME'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `number` value. */
  | 'NUMBER'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `status` value. */
  | 'STATUS'
  /** Sort by the `total_price` value. */
  | 'TOTAL_PRICE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** The valid statuses for a draft order. */
export type DraftOrderStatus =
  /** The draft order has been paid. */
  | 'COMPLETED'
  /** An invoice for the draft order has been sent to the customer. */
  | 'INVOICE_SENT'
  /** The draft order is open. It has not been paid, and an invoice hasn't been sent. */
  | 'OPEN';

/** A sale that includes a duty charge. */
export type DutySale = Node &
  Sale & {
    __typename?: 'DutySale';
    /** The type of order action represented by the sale. */
    actionType: SaleActionType;
    /** The unique ID of the sale. */
    id: Scalars['ID']['output'];
    /** The type of line associated with the sale. */
    lineType: SaleLineType;
    /** The number of units ordered or intended to be returned. */
    quantity?: Maybe<Scalars['Int']['output']>;
    /** The individual taxes associated with the sale. */
    taxes: Array<SaleTax>;
    /** The total sale amount after taxes and discounts. */
    totalAmount: MoneyV2;
    /** The total amount of discounts allocated to the sale after taxes. */
    totalDiscountAmountAfterTaxes: MoneyV2;
    /** The total discounts allocated to the sale before taxes. */
    totalDiscountAmountBeforeTaxes: MoneyV2;
    /** The total tax amount for the sale. */
    totalTaxAmount: MoneyV2;
  };

/**
 * Represents the customer's consent to receive marketing material by email.
 *
 */
export type EmailMarketingConsentState = Node & {
  __typename?: 'EmailMarketingConsentState';
  /**
   * The date and time when the customer consented to receive marketing material by email.
   *
   */
  consentUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /**
   * The marketing subscription opt-in level that the customer gave when they consented to receive marketing material by email.
   *
   */
  marketingOptInLevel?: Maybe<MarketingOptInLevel>;
  /** The current email marketing state for the customer. */
  marketingState: EmailMarketingState;
};

/**
 * Represents the possible email marketing states for a customer.
 *
 */
export type EmailMarketingState =
  /**
   * The customer’s email marketing state is invalid.
   *
   */
  | 'INVALID'
  /**
   * The customer isn't subscribed to email marketing.
   *
   */
  | 'NOT_SUBSCRIBED'
  /**
   * The customer is in the process of subscribing to email marketing.
   *
   */
  | 'PENDING'
  /**
   * The customer's personal data has been erased. This value is internally-set and read-only.
   *
   */
  | 'REDACTED'
  /**
   * The customer is subscribed to email marketing.
   *
   */
  | 'SUBSCRIBED'
  /**
   * The customer is not currently subscribed to email marketing but was previously subscribed.
   *
   */
  | 'UNSUBSCRIBED';

/** Tokens used by ui extensions to query various APIs. */
export type ExtensionApiTokens = {
  __typename?: 'ExtensionApiTokens';
  /** The token for querying the storefront API. */
  storefrontApi?: Maybe<ExtensionStorefrontApiToken>;
};

/** Ephemeral token used by ui extensions to query the storefront API. */
export type ExtensionStorefrontApiToken = {
  __typename?: 'ExtensionStorefrontApiToken';
  /** The expiration time of the token. */
  expiresAt: Scalars['ISO8601DateTime']['output'];
  /** The ephemeral token used for querying the storefront API. */
  token: Scalars['String']['output'];
};

/** Represents a single fulfillment in an order. */
export type Fulfillment = Node & {
  __typename?: 'Fulfillment';
  /** The date and time when the fulfillment was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The estimated delivery time of this fulfillment. */
  estimatedDeliveryAt?: Maybe<Scalars['DateTime']['output']>;
  /** A collection of fulfillment events. */
  events: FulfillmentEventConnection;
  /** The line items in the fulfillment. */
  fulfillmentLineItems: FulfillmentLineItemConnection;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** Whether the fulfillment is picked up locally. */
  isPickedUp: Scalars['Boolean']['output'];
  /** The latest shipment status for the fulfillment. */
  latestShipmentStatus?: Maybe<FulfillmentEventStatus>;
  /** The pickup address for the fulfillment. */
  pickupAddress?: Maybe<PickupAddress>;
  /** Whether any line items in the fulfillment require shipping. */
  requiresShipping: Scalars['Boolean']['output'];
  /** The status of the fulfillment. */
  status?: Maybe<FulfillmentStatus>;
  /** The tracking information associated with the fulfillment. */
  trackingInformation: Array<TrackingInformation>;
  /** The date and time when the fulfillment was updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Represents a single fulfillment in an order. */
export type FulfillmentEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<FulfillmentEventSortKeys>;
};

/** Represents a single fulfillment in an order. */
export type FulfillmentFulfillmentLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An auto-generated type for paginating through multiple Fulfillments.
 *
 */
export type FulfillmentConnection = {
  __typename?: 'FulfillmentConnection';
  /** A list of edges. */
  edges: Array<FulfillmentEdge>;
  /** A list of the nodes contained in FulfillmentEdge. */
  nodes: Array<Fulfillment>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Fulfillment and a cursor during pagination.
 *
 */
export type FulfillmentEdge = {
  __typename?: 'FulfillmentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of FulfillmentEdge. */
  node: Fulfillment;
};

/** An event that occurred for a fulfillment. */
export type FulfillmentEvent = Node & {
  __typename?: 'FulfillmentEvent';
  /**
   * The time when this fulfillment event occurred.
   *
   */
  happenedAt: Scalars['DateTime']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /**
   * The status of the fulfillment event.
   *
   */
  status: FulfillmentEventStatus;
};

/**
 * An auto-generated type for paginating through multiple FulfillmentEvents.
 *
 */
export type FulfillmentEventConnection = {
  __typename?: 'FulfillmentEventConnection';
  /** A list of edges. */
  edges: Array<FulfillmentEventEdge>;
  /** A list of the nodes contained in FulfillmentEventEdge. */
  nodes: Array<FulfillmentEvent>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one FulfillmentEvent and a cursor during pagination.
 *
 */
export type FulfillmentEventEdge = {
  __typename?: 'FulfillmentEventEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of FulfillmentEventEdge. */
  node: FulfillmentEvent;
};

/** The set of valid sort keys for the FulfillmentEvent query. */
export type FulfillmentEventSortKeys =
  /** Sort by the `happened_at` value. */
  | 'HAPPENED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE';

/**
 * The status of a fulfillment event.
 *
 */
export type FulfillmentEventStatus =
  /**
   * A delivery was attempted.
   *
   */
  | 'ATTEMPTED_DELIVERY'
  /**
   * The fulfillment has been picked up by the carrier.
   *
   */
  | 'CARRIER_PICKED_UP'
  /**
   * The fulfillment is confirmed.
   *
   */
  | 'CONFIRMED'
  /**
   * The fulfillment is delayed.
   *
   */
  | 'DELAYED'
  /**
   * The fulfillment was successfully delivered.
   *
   */
  | 'DELIVERED'
  /**
   * The fulfillment request failed.
   *
   */
  | 'FAILURE'
  /**
   * The fulfillment is in transit.
   *
   */
  | 'IN_TRANSIT'
  /**
   * A purchased shipping label has been printed.
   *
   */
  | 'LABEL_PRINTED'
  /**
   * A shipping label has been purchased.
   *
   */
  | 'LABEL_PURCHASED'
  /**
   * The fulfillment is out for delivery.
   *
   */
  | 'OUT_FOR_DELIVERY'
  /**
   * The fulfillment was successfully picked up.
   *
   */
  | 'PICKED_UP'
  /**
   * The fulfillment is ready to be picked up.
   *
   */
  | 'READY_FOR_PICKUP';

/** Represents a line item from an order that's included in a fulfillment. */
export type FulfillmentLineItem = Node & {
  __typename?: 'FulfillmentLineItem';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The line item associated with the order. */
  lineItem: LineItem;
  /** The number of line items in the fulfillment. */
  quantity?: Maybe<Scalars['Int']['output']>;
};

/**
 * An auto-generated type for paginating through multiple FulfillmentLineItems.
 *
 */
export type FulfillmentLineItemConnection = {
  __typename?: 'FulfillmentLineItemConnection';
  /** A list of edges. */
  edges: Array<FulfillmentLineItemEdge>;
  /** A list of the nodes contained in FulfillmentLineItemEdge. */
  nodes: Array<FulfillmentLineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one FulfillmentLineItem and a cursor during pagination.
 *
 */
export type FulfillmentLineItemEdge = {
  __typename?: 'FulfillmentLineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of FulfillmentLineItemEdge. */
  node: FulfillmentLineItem;
};

/** The set of valid sort keys for the Fulfillment query. */
export type FulfillmentSortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE';

/** The status of a fulfillment. */
export type FulfillmentStatus =
  /** The fulfillment was canceled. */
  | 'CANCELLED'
  /** There was an error with the fulfillment request. */
  | 'ERROR'
  /** The fulfillment request failed. */
  | 'FAILURE'
  /**
   * The third-party fulfillment service has acknowledged the fulfillment and is processing it.
   *
   */
  | 'OPEN'
  /**
   * Shopify has created the fulfillment and is waiting for the third-party fulfillment service to transition it to `open` or `success`.
   *
   */
  | 'PENDING'
  /** The fulfillment was completed successfully. */
  | 'SUCCESS';

/** The gift card payment details related to a transaction. */
export type GiftCardDetails = {
  __typename?: 'GiftCardDetails';
  /** The balance of the gift card in shop and presentment currencies. */
  balance: MoneyV2;
  /** The last characters of the gift card. */
  last4: Scalars['String']['output'];
};

/** A sale associated with a gift card. */
export type GiftCardSale = Node &
  Sale & {
    __typename?: 'GiftCardSale';
    /** The type of order action represented by the sale. */
    actionType: SaleActionType;
    /** The unique ID of the sale. */
    id: Scalars['ID']['output'];
    /** The line item associated with the sale. */
    lineItem: LineItem;
    /** The type of line associated with the sale. */
    lineType: SaleLineType;
    /** The number of units ordered or intended to be returned. */
    quantity?: Maybe<Scalars['Int']['output']>;
    /** The individual taxes associated with the sale. */
    taxes: Array<SaleTax>;
    /** The total sale amount after taxes and discounts. */
    totalAmount: MoneyV2;
    /** The total amount of discounts allocated to the sale after taxes. */
    totalDiscountAmountAfterTaxes: MoneyV2;
    /** The total discounts allocated to the sale before taxes. */
    totalDiscountAmountBeforeTaxes: MoneyV2;
    /** The total tax amount for the sale. */
    totalTaxAmount: MoneyV2;
  };

/** The input fields for the billing address received from Google Pay. */
export type GooglePayBillingAddressInput = {
  /** The first line of the address, typically the street address or PO Box number. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** The second line of the address, typically the apartment, suite, or unit number. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** The region of the address, such as the province, state, or district. */
  administrativeArea?: InputMaybe<Scalars['String']['input']>;
  /** The two-letter code for the country of the address. */
  countryCode?: InputMaybe<CountryCode>;
  /** The name of the city, district, village, or town. */
  locality?: InputMaybe<Scalars['String']['input']>;
  /** The name of the customer. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The telephone number of the customer. */
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  postalCode?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `googlePayCreditCardAdd` mutation. */
export type GooglePayCreditCardAddPayload = {
  __typename?: 'GooglePayCreditCardAddPayload';
  /** The updated credit card. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** If the card verification result is processing. When this is true, credit_card will be null. */
  processing?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** Return type for `googlePayCreditCardUpdate` mutation. */
export type GooglePayCreditCardUpdatePayload = {
  __typename?: 'GooglePayCreditCardUpdatePayload';
  /** The updated credit card. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** If the card verification result is processing. When this is true, credit_card will be null. */
  processing?: Maybe<Scalars['Boolean']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** The configuration settings for the Google Pay wallet. */
export type GooglePayWalletConfig = {
  __typename?: 'GooglePayWalletConfig';
  /** The authentication methods allowed by Google Pay. */
  allowedAuthMethods: Array<Scalars['String']['output']>;
  /** The card networks accepted by Google Pay. */
  allowedCardNetworks: Array<Scalars['String']['output']>;
  /** The Auth JWT used for Google Pay requests. */
  authJwt: Scalars['String']['output'];
  /** The current operating environment (TEST or PRODUCTION). */
  environment: Scalars['String']['output'];
  /** The gateway name for Google Pay. */
  gateway: Scalars['String']['output'];
  /** The gateway merchant ID for Google Pay. */
  gatewayMerchantId: Scalars['String']['output'];
  /** The merchant ID for Google Pay. */
  merchantId: Scalars['String']['output'];
  /** The merchant name for Google Pay. */
  merchantName: Scalars['String']['output'];
  /** The merchant origin for Google Pay. */
  merchantOrigin: Scalars['String']['output'];
};

/** The information about the metafields associated with the specified resource. */
export type HasMetafields = {
  /** A metafield found by namespace and key. */
  metafield?: Maybe<Metafield>;
  /**
   * The metafields associated with the resource matching the
   * supplied list of namespaces and keys.
   *
   */
  metafields: Array<Maybe<Metafield>>;
};

/** The information about the metafields associated with the specified resource. */
export type HasMetafieldsMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

/** The information about the metafields associated with the specified resource. */
export type HasMetafieldsMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** The input fields to identify a metafield on an owner resource by namespace and key. */
export type HasMetafieldsIdentifier = {
  /** The identifier for the metafield. */
  key: Scalars['String']['input'];
  /** A container for a set of metafields. */
  namespace: Scalars['String']['input'];
};

/** Represents an image resource. */
export type Image = {
  __typename?: 'Image';
  /** A word or phrase to share the nature or contents of an image. */
  altText?: Maybe<Scalars['String']['output']>;
  /** The original height of the image in pixels. Returns `null` if the image isn't hosted by Shopify. */
  height?: Maybe<Scalars['Int']['output']>;
  /** A unique ID for the image. */
  id?: Maybe<Scalars['ID']['output']>;
  /**
   * The location of the original image as a URL.
   *
   * If there are any existing transformations in the original source URL, they will remain and not be stripped.
   *
   * @deprecated Use `url` instead.
   */
  originalSrc: Scalars['URL']['output'];
  /**
   * The location of the image as a URL.
   * @deprecated Use `url` instead.
   */
  src: Scalars['URL']['output'];
  /**
   * The location of the transformed image as a URL.
   *
   * All transformation arguments are considered "best-effort". If they can be applied to an image, they will be.
   * Otherwise any transformations which an image type doesn't support will be ignored.
   *
   * @deprecated Use `url(transform:)` instead
   */
  transformedSrc: Scalars['URL']['output'];
  /**
   * The location of the image as a URL.
   *
   * If no transform options are specified, then the original image will be preserved including any pre-applied transforms.
   *
   * All transformation options are considered "best-effort". Any transformation that the original image type doesn't support will be ignored.
   *
   * If you need multiple variations of the same image, then you can use [GraphQL aliases](https://graphql.org/learn/queries/#aliases).
   *
   */
  url: Scalars['URL']['output'];
  /** The original width of the image in pixels. Returns `null` if the image isn't hosted by Shopify. */
  width?: Maybe<Scalars['Int']['output']>;
};

/** Represents an image resource. */
export type ImageTransformedSrcArgs = {
  crop?: InputMaybe<CropRegion>;
  maxHeight?: InputMaybe<Scalars['Int']['input']>;
  maxWidth?: InputMaybe<Scalars['Int']['input']>;
  preferredContentType?: InputMaybe<ImageContentType>;
  scale?: InputMaybe<Scalars['Int']['input']>;
};

/** Represents an image resource. */
export type ImageUrlArgs = {
  transform?: InputMaybe<ImageTransformInput>;
};

/** List of supported image content types. */
export type ImageContentType =
  /** A JPG image. */
  | 'JPG'
  /** A PNG image. */
  | 'PNG'
  /** A WEBP image. */
  | 'WEBP';

/**
 * The available options for transforming an image.
 *
 * All transformation options are considered best effort. Any transformation that the original image type doesn't support will be ignored.
 *
 */
export type ImageTransformInput = {
  /**
   * The region of the image to remain after cropping.
   * Must be used in conjunction with the `maxWidth` and/or `maxHeight` fields, where the `maxWidth` and `maxHeight` aren't equal.
   * The `crop` argument should coincide with the smaller value. A smaller `maxWidth` indicates a `LEFT` or `RIGHT` crop, while
   * a smaller `maxHeight` indicates a `TOP` or `BOTTOM` crop. For example, `{ maxWidth: 5, maxHeight: 10, crop: LEFT }` will result
   * in an image with a width of 5 and height of 10, where the right side of the image is removed.
   *
   */
  crop?: InputMaybe<CropRegion>;
  /**
   * Image height in pixels between 1 and 5760.
   *
   */
  maxHeight?: InputMaybe<Scalars['Int']['input']>;
  /**
   * Image width in pixels between 1 and 5760.
   *
   */
  maxWidth?: InputMaybe<Scalars['Int']['input']>;
  /**
   * Convert the source image into the preferred content type.
   * Supported conversions: `.svg` to `.png`, any file type to `.jpg`, and any file type to `.webp`.
   *
   */
  preferredContentType?: InputMaybe<ImageContentType>;
  /**
   * Image size multiplier for high-resolution retina displays. Must be within 1..3.
   *
   */
  scale?: InputMaybe<Scalars['Int']['input']>;
};

/** A single line item in an order. */
export type LineItem = Node & {
  __typename?: 'LineItem';
  /**
   * The total price of the line item, calculated by multiplying the current unit price of the variant by the quantity, expressed in presentment currencies.
   *
   */
  currentTotalPrice?: Maybe<MoneyV2>;
  /** The list of custom attributes associated with the line item. */
  customAttributes: Array<Attribute>;
  /** The discounts that have been allocated onto the line item by discount applications. */
  discountAllocations: Array<DiscountAllocation>;
  /** The discount information for the line item. */
  discountInformation: Array<LineItemDiscountInformation>;
  /** Whether the line item represents the purchase of a gift card. */
  giftCard: Scalars['Boolean']['output'];
  /** The title of the line item group associated with the line item. */
  groupTitle?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The image object associated with the line item. */
  image?: Maybe<Image>;
  /** The name of the product. */
  name: Scalars['String']['output'];
  /** The title of the line item variant. */
  presentmentTitle?: Maybe<Scalars['String']['output']>;
  /** The product variant price without any discounts applied, in presentment currencies. */
  price?: Maybe<MoneyV2>;
  /** The product's ID. */
  productId?: Maybe<Scalars['ID']['output']>;
  /** The product's type. */
  productType?: Maybe<Scalars['String']['output']>;
  /** The number of variant items ordered. */
  quantity: Scalars['Int']['output'];
  /** The quantity of the line item, minus the removed quantity. */
  refundableQuantity: Scalars['Int']['output'];
  /** Whether physical shipping is required for the variant. */
  requiresShipping: Scalars['Boolean']['output'];
  /** The selling plan details associated with the line item. */
  sellingPlan?: Maybe<LineItemSellingPlan>;
  /** The SKU number of the variant. */
  sku?: Maybe<Scalars['String']['output']>;
  /** The discounts that have been allocated onto the line item, ignoring returns. */
  soldDiscountInformation: Array<LineItemDiscountInformation>;
  /** The total price of the line item, ignoring returns, with discounts included. */
  soldDiscountedTotalPrice?: Maybe<MoneyV2>;
  /** The quantity of sold line item, ignoring returns. */
  soldQuantity?: Maybe<Scalars['Int']['output']>;
  /** The total price of the line item, ignoring returns, before discounts. */
  soldTotalPrice?: Maybe<MoneyV2>;
  /** The reasons that the customer can return this line item. */
  supportedReturnReasons: Array<ReturnSupportedReason>;
  /** The title of the product or variant. This field only applies to custom line items. */
  title: Scalars['String']['output'];
  /**
   * The total of the discount allocations on this line item, resulting from discounts applied specifically to this line item.
   *
   */
  totalDiscount: MoneyV2;
  /**
   * The total price of the line item, calculated by multiplying the current unit price of the variant by the quantity, expressed in presentment currencies.
   *
   */
  totalPrice?: Maybe<MoneyV2>;
  /**
   * The total price of the line item, calculated by multiplying the unit price of the variant (before any discounts) by the quantity, expressed in presentment currencies.
   *
   */
  totalPriceBeforeDiscounts?: Maybe<MoneyV2>;
  /**
   * The total price of the line item, calculated by multiplying the unit price of the variant (after line item discounts) by the quantity, expressed in presentment currencies.
   *
   */
  totalPriceWithDiscounts?: Maybe<MoneyV2>;
  /** The unit price of the line item in presentment currencies. */
  unitPrice?: Maybe<UnitPrice>;
  /** The ID of the variant. */
  variantId?: Maybe<Scalars['ID']['output']>;
  /** The options of the product variant. */
  variantOptions?: Maybe<Array<LineItemVariantOption>>;
  /** The name of the variant. */
  variantTitle?: Maybe<Scalars['String']['output']>;
  /** The product's vendor. */
  vendor?: Maybe<Scalars['String']['output']>;
};

/**
 * An auto-generated type for paginating through multiple LineItems.
 *
 */
export type LineItemConnection = {
  __typename?: 'LineItemConnection';
  /** A list of edges. */
  edges: Array<LineItemEdge>;
  /** A list of the nodes contained in LineItemEdge. */
  nodes: Array<LineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * The information about the line item category for the order.
 *
 */
export type LineItemContainer =
  | RemainingLineItemContainer
  | UnfulfilledDigitalLineItemContainer
  | UnfulfilledGiftCardLineItemContainer
  | UnfulfilledLineItemContainer
  | UnfulfilledPhysicalLineItemContainer;

/**
 * The information about the line item in the line item container.
 *
 */
export type LineItemContainerLineItem = Node & {
  __typename?: 'LineItemContainerLineItem';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The line item associated with the container. */
  lineItem: LineItem;
  /** The number of units yet to be fulfilled. */
  remainingQuantity: Scalars['Int']['output'];
  /** The total number of units in this fulfillment. */
  totalQuantity: Scalars['Int']['output'];
};

/**
 * An auto-generated type for paginating through multiple LineItemContainerLineItems.
 *
 */
export type LineItemContainerLineItemConnection = {
  __typename?: 'LineItemContainerLineItemConnection';
  /** A list of edges. */
  edges: Array<LineItemContainerLineItemEdge>;
  /** A list of the nodes contained in LineItemContainerLineItemEdge. */
  nodes: Array<LineItemContainerLineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one LineItemContainerLineItem and a cursor during pagination.
 *
 */
export type LineItemContainerLineItemEdge = {
  __typename?: 'LineItemContainerLineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of LineItemContainerLineItemEdge. */
  node: LineItemContainerLineItem;
};

/** The discount information for a specific line item. */
export type LineItemDiscountInformation = {
  __typename?: 'LineItemDiscountInformation';
  /** The value of the applied discount. */
  discountValue: MoneyV2;
  /** The title of the discount. */
  title?: Maybe<Scalars['String']['output']>;
};

/**
 * An auto-generated type which holds one LineItem and a cursor during pagination.
 *
 */
export type LineItemEdge = {
  __typename?: 'LineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of LineItemEdge. */
  node: LineItem;
};

/** The selling plan for a line item. */
export type LineItemSellingPlan = {
  __typename?: 'LineItemSellingPlan';
  /**
   * The name of the selling plan for display purposes.
   *
   */
  name: Scalars['String']['output'];
  /**
   * The ID of the selling plan associated with the line item.
   *
   */
  sellingPlanId?: Maybe<Scalars['ID']['output']>;
};

/** The line item's variant option. */
export type LineItemVariantOption = {
  __typename?: 'LineItemVariantOption';
  /** The name of the option. */
  name: Scalars['String']['output'];
  /** The value of the option. */
  value: Scalars['String']['output'];
};

/** Represents a company's business location. */
export type Location = Node & {
  __typename?: 'Location';
  /** The billing address of the company location. */
  billingAddress?: Maybe<CompanyAddress>;
  /** The configuration of the buyer's B2B checkout. */
  buyerExperienceConfiguration?: Maybe<BuyerExperienceConfiguration>;
  /** The list of contacts under a particular business location. */
  contacts: CompanyContactConnection;
  /** The list of contacts under a particular business location. */
  contactsV1: ContactConnection;
  /** The credit card corresponding to the provided ID. */
  creditCard?: Maybe<CustomerCreditCard>;
  /** The list of stored credit cards. */
  creditCards: CustomerCreditCardConnection;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The market that includes the location's shipping address. If the shipping address is empty, the shop's primary market is returned. */
  market: Market;
  /** The name of the company location. */
  name: Scalars['String']['output'];
  /** The list of roles assigned to this location. */
  roleAssignments: CompanyContactRoleAssignmentConnection;
  /** The shipping address of the company location. */
  shippingAddress?: Maybe<CompanyAddress>;
  /** The list of tax exemptions applied to the location. */
  taxExemptions: Array<TaxExemption>;
  /** The list of tax exemptions applied to the location with additional details. */
  taxExemptionsDetails: Array<TaxExemptionDetails>;
  /** The tax id of the company location. */
  taxIdentifier?: Maybe<Scalars['String']['output']>;
};

/** Represents a company's business location. */
export type LocationContactsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyContactSortKeys>;
};

/** Represents a company's business location. */
export type LocationContactsV1Args = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyContactSortKeys>;
};

/** Represents a company's business location. */
export type LocationCreditCardArgs = {
  id: Scalars['ID']['input'];
};

/** Represents a company's business location. */
export type LocationCreditCardsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents a company's business location. */
export type LocationRoleAssignmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CompanyContactRoleAssignmentSortKeys>;
};

/**
 * An auto-generated type for paginating through multiple Locations.
 *
 */
export type LocationConnection = {
  __typename?: 'LocationConnection';
  /** A list of edges. */
  edges: Array<LocationEdge>;
  /** A list of the nodes contained in LocationEdge. */
  nodes: Array<Location>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Location and a cursor during pagination.
 *
 */
export type LocationEdge = {
  __typename?: 'LocationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of LocationEdge. */
  node: Location;
};

/**
 * Captures the intentions of a discount that was manually created.
 *
 */
export type ManualDiscountApplication = DiscountApplication & {
  __typename?: 'ManualDiscountApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** The description of the application. */
  description?: Maybe<Scalars['String']['output']>;
  /** The lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The title of the application. */
  title: Scalars['String']['output'];
  /** The value of the discount application. */
  value: PricingValue;
};

/**
 * A market, which is a group of one or more regions targeted for international sales.
 * A market allows configuration of a distinct, localized shopping experience for customers from a specific area of the world.
 *
 */
export type Market = Node & {
  __typename?: 'Market';
  /** The short, human-readable unique identifier for the market. */
  handle: Scalars['String']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /**
   * The web presence of the market, defining its SEO strategy. This can be a different domain,
   * subdomain, or subfolders of the primary domain. Each web presence comprises one or more
   * language variants. If a market doesn't have its own web presence, then the market is accessible on the
   * shop’s primary domain using [country
   * selectors](https://shopify.dev/themes/internationalization/multiple-currencies-languages#the-country-selector).
   *
   */
  webPresence?: Maybe<MarketWebPresence>;
};

/**
 * The web presence of the market, defining its SEO strategy. This can be a different domain
 * (e.g. `example.ca`), subdomain (e.g. `ca.example.com`), or subfolders of the primary
 * domain (e.g. `example.com/en-ca`). Each web presence comprises one or more language
 * variants. If a market does not have its own web presence, it is accessible on the shop’s
 * primary domain via [country
 * selectors](https://shopify.dev/themes/internationalization/multiple-currencies-languages#the-country-selector).
 *
 * Note: while the domain/subfolders defined by a market’s web presence are not applicable to
 * custom storefronts, which must manage their own domains and routing, the languages chosen
 * here do govern [the languages available on the Storefront
 * API](https://shopify.dev/custom-storefronts/internationalization/multiple-languages) for the countries in
 * this market.
 *
 */
export type MarketWebPresence = Node & {
  __typename?: 'MarketWebPresence';
  /**
   * The domain of the web presence.
   * This field will be null if `subfolderSuffix` isn't null.
   *
   */
  domain?: Maybe<Domain>;
  /** A globally-unique identifier. */
  id: Scalars['ID']['output'];
  /**
   * The list of root URLs for each of the web presence’s locales.
   *
   */
  rootUrls: Array<MarketWebPresenceRootUrl>;
  /** The market-specific suffix of the subfolders defined by the web presence. Example: in `/en-us` the subfolder suffix is `us`. This field will be null if `domain` isn't null. */
  subfolderSuffix?: Maybe<Scalars['String']['output']>;
};

/**
 * The URL for the homepage of the online store in the context of a particular market and a particular locale.
 *
 */
export type MarketWebPresenceRootUrl = {
  __typename?: 'MarketWebPresenceRootUrl';
  /** The locale in which the storefront loads. */
  locale: Scalars['String']['output'];
  /** The URL of the homepage. */
  url: Scalars['URL']['output'];
};

/**
 * The possible values for the marketing subscription opt-in level enabled
 * when the customer consented to receive marketing information.
 *
 * The levels follow the M3AAWG best practices guideline
 * [document](https://www.m3aawg.org/sites/maawg/files/news/M3AAWG_Senders_BCP_Ver3-2015-02.pdf).
 *
 */
export type MarketingOptInLevel =
  /**
   * The customer gets a confirmation and needs to
   * perform an intermediate step before getting marketing information after providing their information.
   *
   */
  | 'CONFIRMED_OPT_IN'
  /**
   * The customer gets marketing information without any
   * intermediate steps after providing their information.
   *
   */
  | 'SINGLE_OPT_IN'
  /**
   * The customer gets marketing information, but the opt-in method is unknown.
   *
   */
  | 'UNKNOWN';

/**
 * The custom metadata attached to a resource. Metafields can be sorted into namespaces and are
 * comprised of keys, values, and value types.
 *
 */
export type Metafield = Node & {
  __typename?: 'Metafield';
  /** The date and time when the metafield was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The description of a metafield. */
  description?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The key name for a metafield. */
  key: Scalars['String']['output'];
  /** The namespace for a metafield. */
  namespace: Scalars['String']['output'];
  /**
   * The type name of the metafield.
   * See the list of [supported types](https://shopify.dev/apps/metafields/definitions/types).
   *
   */
  type: Scalars['String']['output'];
  /** The date and time when the metafield was updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The value of a metafield. */
  value: Scalars['String']['output'];
};

/** Value type to describe the Metafield value. */
export type MetafieldValueType =
  /** A boolean metafield. */
  | 'BOOLEAN'
  /** A float. */
  | 'FLOAT'
  /** An integer. */
  | 'INTEGER'
  /** A JSON string. */
  | 'JSON_STRING'
  /** A string. */
  | 'STRING';

/**
 * A collection of monetary values in their respective currencies. Typically used in the context of multi-currency pricing and transactions,
 * when an amount in the shop's currency is converted to the customer's currency of choice (the presentment currency).
 *
 */
export type MoneyBag = {
  __typename?: 'MoneyBag';
  /** Amount in presentment currency. */
  presentmentMoney: MoneyV2;
  /** Amount in shop currency. */
  shopMoney: MoneyV2;
};

/**
 * A monetary value with currency.
 *
 */
export type MoneyV2 = {
  __typename?: 'MoneyV2';
  /** Decimal money amount. */
  amount: Scalars['Decimal']['output'];
  /** Currency of the money. */
  currencyCode: CurrencyCode;
};

/** This is the schema's entry point for all mutation operations. */
export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Creates a new address for a customer.
   *
   */
  addressCreate?: Maybe<AddressCreatePayload>;
  /**
   * Deletes a specific address for a customer.
   *
   */
  addressDelete?: Maybe<AddressDeletePayload>;
  /**
   * Updates a specific address for a customer.
   *
   */
  addressUpdate?: Maybe<AddressUpdatePayload>;
  /** Adds a new credit card using Apple Pay. */
  applePayCreditCardAdd?: Maybe<ApplePayCreditCardAddPayload>;
  /** Updates a credit card using Apple Pay. */
  applePayCreditCardUpdate?: Maybe<ApplePayCreditCardUpdatePayload>;
  /** Creates a new Apple Pay session. */
  applePaySessionCreate?: Maybe<ApplePaySessionCreatePayload>;
  /**
   * Updates the information for a business contact.
   *
   */
  businessContactUpdate?: Maybe<BusinessContactUpdatePayload>;
  /**
   * Updates the information for a business contact.
   *
   */
  businessContactUpdateV1?: Maybe<BusinessContactUpdateV1Payload>;
  /**
   * Creates a billing address for a business location and optionally a shipping address with the same input.
   *
   */
  businessLocationBillingAddressCreate?: Maybe<BusinessLocationBillingAddressCreatePayload>;
  /**
   * Updates the billing address of a business location.
   *
   */
  businessLocationBillingAddressUpdate?: Maybe<BusinessLocationBillingAddressUpdatePayload>;
  /**
   * Adds a new credit card to the available payment methods of a customer.
   *
   */
  businessLocationCreditCardAdd?: Maybe<BusinessLocationCreditCardAddPayload>;
  /**
   * Updates the details of a credit card for a customer.
   *
   */
  businessLocationCreditCardUpdate?: Maybe<BusinessLocationCreditCardUpdatePayload>;
  /**
   * Removes a payment instrument from a customer.
   *
   */
  businessLocationPaymentInstrumentRemove?: Maybe<BusinessLocationPaymentInstrumentRemovePayload>;
  /**
   * Creates a shipping address for a business location and optionally a billing address with the same input.
   *
   */
  businessLocationShippingAddressCreate?: Maybe<BusinessLocationShippingAddressCreatePayload>;
  /**
   * Updates the shipping address of a business location.
   *
   */
  businessLocationShippingAddressUpdate?: Maybe<BusinessLocationShippingAddressUpdatePayload>;
  /** Updates an address on a company location. */
  companyLocationAssignAddress?: Maybe<CompanyLocationAssignAddressPayload>;
  /** Adds a new credit card to a customer's list of available payment methods. */
  creditCardAdd?: Maybe<CreditCardAddPayload>;
  /** Updates the details of a customer's credit card. */
  creditCardUpdate?: Maybe<CreditCardUpdatePayload>;
  /**
   * Creates a new address for a customer.
   *
   */
  customerAddressCreate?: Maybe<CustomerAddressCreatePayload>;
  /**
   * Deletes a specific address for a customer.
   *
   */
  customerAddressDelete?: Maybe<CustomerAddressDeletePayload>;
  /**
   * Updates a specific address for a customer.
   *
   */
  customerAddressUpdate?: Maybe<CustomerAddressUpdatePayload>;
  /** Subscribes the customer's email to marketing. */
  customerEmailMarketingOptIn?: Maybe<CustomerEmailMarketingOptInPayload>;
  /** Subscribes the customer to email marketing. */
  customerEmailMarketingSubscribe?: Maybe<CustomerEmailMarketingSubscribePayload>;
  /** Unsubscribes the customer from email marketing. */
  customerEmailMarketingUnsubscribe?: Maybe<CustomerEmailMarketingUnsubscribePayload>;
  /**
   * Updates the customer's personal information.
   *
   */
  customerUpdate?: Maybe<CustomerUpdatePayload>;
  /** Adds a new credit card by using Google Pay. */
  googlePayCreditCardAdd?: Maybe<GooglePayCreditCardAddPayload>;
  /** Updates a credit card using Google Pay. */
  googlePayCreditCardUpdate?: Maybe<GooglePayCreditCardUpdatePayload>;
  /** Request a new return on behalf of a customer. */
  orderRequestReturn?: Maybe<OrderRequestReturnPayload>;
  /** Removes a payment instrument from a customer's account. */
  paymentInstrumentRemove?: Maybe<PaymentInstrumentRemovePayload>;
  /**
   * Updates a customer's default payment instrument.
   *
   */
  paymentInstrumentUpdateDefault?: Maybe<PaymentInstrumentUpdateDefaultPayload>;
  /** Connects a customer's PayPal account for use as a payment method. */
  paypalAccountEnable?: Maybe<PaypalAccountEnablePayload>;
  /** Creates a PayPal Express token. */
  paypalTokenCreate?: Maybe<PaypalTokenCreatePayload>;
  /**
   * Updates the customer's personal information.
   *
   */
  personalInformationUpdate?: Maybe<PersonalInformationUpdatePayload>;
  /** Resends a gift card to the customer. */
  resendGiftCard?: Maybe<ResendGiftCardPayload>;
  /** Provides a URL that enables the customer to update a Shop Pay credit card. */
  shopPayCreditCardGetUpdateUrl?: Maybe<ShopPayCreditCardGetUpdateUrlPayload>;
  /** Skips a Subscription Billing Cycle. */
  subscriptionBillingCycleSkip?: Maybe<SubscriptionBillingCycleSkipPayload>;
  /** Unskips a Subscription Billing Cycle. */
  subscriptionBillingCycleUnskip?: Maybe<SubscriptionBillingCycleUnskipPayload>;
  /** Activates a Subscription Contract. */
  subscriptionContractActivate?: Maybe<SubscriptionContractActivatePayload>;
  /** Cancels a Subscription Contract. */
  subscriptionContractCancel?: Maybe<SubscriptionContractCancelPayload>;
  /** Changes the payment instrument used for future billing cycles of a Subscription Contract. */
  subscriptionContractChangePaymentInstrument?: Maybe<SubscriptionContractChangePaymentInstrumentPayload>;
  /** Fetches the available delivery options for a Subscription Contract. */
  subscriptionContractFetchDeliveryOptions?: Maybe<SubscriptionContractFetchDeliveryOptionsPayload>;
  /** Pauses a Subscription Contract. */
  subscriptionContractPause?: Maybe<SubscriptionContractPausePayload>;
  /** Selects an option from a delivery options result and updates the delivery method on a Subscription Contract. */
  subscriptionContractSelectDeliveryMethod?: Maybe<SubscriptionContractSelectDeliveryMethodPayload>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationAddressCreateArgs = {
  address: CustomerMailingAddressInput;
  defaultAddress?: InputMaybe<Scalars['Boolean']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationAddressDeleteArgs = {
  addressId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationAddressUpdateArgs = {
  address?: InputMaybe<CustomerMailingAddressInput>;
  addressId: Scalars['ID']['input'];
  defaultAddress?: InputMaybe<Scalars['Boolean']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationApplePayCreditCardAddArgs = {
  applePayTokenizedCard: Scalars['String']['input'];
  billingAddress: ApplePayBillingAddressInput;
  displayLastDigits?: InputMaybe<Scalars['String']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationApplePayCreditCardUpdateArgs = {
  applePayTokenizedCard: Scalars['String']['input'];
  billingAddress: ApplePayBillingAddressInput;
  displayLastDigits?: InputMaybe<Scalars['String']['input']>;
  paymentMethodId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationApplePaySessionCreateArgs = {
  resourceId: Scalars['String']['input'];
  validationUrl: Scalars['String']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessContactUpdateArgs = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  input: BusinessContactUpdateInput;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessContactUpdateV1Args = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  input: BusinessContactUpdateInput;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessLocationBillingAddressCreateArgs = {
  address: CompanyAddressInput;
  companyLocationId: Scalars['ID']['input'];
  useAsShipping?: InputMaybe<Scalars['Boolean']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessLocationBillingAddressUpdateArgs = {
  address: CompanyAddressInput;
  companyLocationId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessLocationCreditCardAddArgs = {
  billingAddress: CustomerMailingAddressInput;
  companyLocationId: Scalars['ID']['input'];
  sessionId: Scalars['String']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessLocationCreditCardUpdateArgs = {
  billingAddress: CustomerMailingAddressInput;
  companyLocationId: Scalars['ID']['input'];
  paymentMethodId: Scalars['ID']['input'];
  sessionId: Scalars['String']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessLocationPaymentInstrumentRemoveArgs = {
  companyLocationId: Scalars['ID']['input'];
  paymentInstrumentId: Scalars['ID']['input'];
  replacementPaymentInstrumentId?: InputMaybe<Scalars['ID']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessLocationShippingAddressCreateArgs = {
  address: CompanyAddressInput;
  companyLocationId: Scalars['ID']['input'];
  useAsBilling?: InputMaybe<Scalars['Boolean']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationBusinessLocationShippingAddressUpdateArgs = {
  address: CompanyAddressInput;
  companyLocationId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationCompanyLocationAssignAddressArgs = {
  address: CompanyAddressInput;
  addressTypes: Array<CompanyAddressType>;
  locationId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationCreditCardAddArgs = {
  billingAddress: CustomerMailingAddressInput;
  default?: InputMaybe<Scalars['Boolean']['input']>;
  sessionId: Scalars['String']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationCreditCardUpdateArgs = {
  billingAddress: CustomerMailingAddressInput;
  paymentMethodId: Scalars['ID']['input'];
  sessionId: Scalars['String']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationCustomerAddressCreateArgs = {
  address: CustomerAddressInput;
  defaultAddress?: InputMaybe<Scalars['Boolean']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationCustomerAddressDeleteArgs = {
  addressId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationCustomerAddressUpdateArgs = {
  address?: InputMaybe<CustomerAddressInput>;
  addressId: Scalars['ID']['input'];
  defaultAddress?: InputMaybe<Scalars['Boolean']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationCustomerUpdateArgs = {
  input: CustomerUpdateInput;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationGooglePayCreditCardAddArgs = {
  billingAddress: GooglePayBillingAddressInput;
  googlePayTokenizedCard: Scalars['String']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationGooglePayCreditCardUpdateArgs = {
  billingAddress: GooglePayBillingAddressInput;
  googlePayTokenizedCard: Scalars['String']['input'];
  paymentMethodId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationOrderRequestReturnArgs = {
  orderId: Scalars['ID']['input'];
  requestedLineItems: Array<RequestedLineItemInput>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationPaymentInstrumentRemoveArgs = {
  paymentInstrumentId: Scalars['ID']['input'];
  replacementPaymentInstrumentId?: InputMaybe<Scalars['ID']['input']>;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationPaymentInstrumentUpdateDefaultArgs = {
  default: Scalars['Boolean']['input'];
  paymentInstrumentId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationPaypalAccountEnableArgs = {
  paypalPayerId: Scalars['String']['input'];
  paypalToken: Scalars['String']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationPersonalInformationUpdateArgs = {
  input: PersonalInformationUpdateInput;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationResendGiftCardArgs = {
  orderId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationShopPayCreditCardGetUpdateUrlArgs = {
  paymentMethodId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationSubscriptionBillingCycleSkipArgs = {
  billingCycleInput: SubscriptionBillingCycleInput;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationSubscriptionBillingCycleUnskipArgs = {
  billingCycleInput: SubscriptionBillingCycleInput;
};

/** This is the schema's entry point for all mutation operations. */
export type MutationSubscriptionContractActivateArgs = {
  subscriptionContractId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationSubscriptionContractCancelArgs = {
  subscriptionContractId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationSubscriptionContractChangePaymentInstrumentArgs = {
  paymentInstrumentId: Scalars['ID']['input'];
  subscriptionContractId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationSubscriptionContractFetchDeliveryOptionsArgs = {
  deliveryAddress?: InputMaybe<CustomerMailingAddressInput>;
  subscriptionContractId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationSubscriptionContractPauseArgs = {
  subscriptionContractId: Scalars['ID']['input'];
};

/** This is the schema's entry point for all mutation operations. */
export type MutationSubscriptionContractSelectDeliveryMethodArgs = {
  deliveryMethodInput: SubscriptionDeliveryMethodInput;
  subscriptionContractId: Scalars['ID']['input'];
  subscriptionDeliveryOptionsResultToken: Scalars['String']['input'];
};

/**
 * An object with an ID field to support global identification, in accordance with the
 * [Relay specification](https://relay.dev/graphql/objectidentification.htm#sec-Node-Interface).
 * This interface is used by the [node](https://shopify.dev/api/admin-graphql/unstable/queries/node)
 * and [nodes](https://shopify.dev/api/admin-graphql/unstable/queries/nodes) queries.
 *
 */
export type Node = {
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
};

/** A customer’s completed request to purchase one or more products from a shop. */
export type Order = HasMetafields &
  Node & {
    __typename?: 'Order';
    /** A list of sales agreements associated with the order. */
    agreements: SalesAgreementConnection;
    /**
     * The mailing address provided by the customer. Not all orders have a mailing address.
     *
     */
    billingAddress?: Maybe<CustomerAddress>;
    /** The reason for the cancellation of the order. Returns `null` if the order wasn't canceled. */
    cancelReason?: Maybe<OrderCancelReason>;
    /**
     * The date and time when the order was canceled.
     * Returns `null` if the order wasn't canceled.
     *
     */
    cancelledAt?: Maybe<Scalars['DateTime']['output']>;
    /** The checkout token associated with this order. */
    checkoutToken?: Maybe<Scalars['String']['output']>;
    /**
     * A randomly generated alpha-numeric identifier for the order that may be shown to the customer
     * instead of the sequential order name. For example, "XPAV284CT", "R50KELTJP" or "35PKUN0UJ".
     * This value isn't guaranteed to be unique.
     *
     */
    confirmationNumber?: Maybe<Scalars['String']['output']>;
    /** Whether the customer who made the order has an enabled associated contact. */
    contactExists: Scalars['Boolean']['output'];
    /** The date and time when the order was created. */
    createdAt: Scalars['DateTime']['output'];
    /** The shop currency when the order was placed. */
    currencyCode: CurrencyCode;
    /** The list of custom attributes associated with the order. */
    customAttributes: Array<Attribute>;
    /** The customer who placed the order. */
    customer?: Maybe<Customer>;
    /** The locale code representing the region where this specific order was placed. */
    customerLocale?: Maybe<Scalars['String']['output']>;
    /** The unique URL for the customer to access the order. */
    customerStatusPageUrl?: Maybe<Scalars['URL']['output']>;
    /** The customer who placed the order. */
    customerV1?: Maybe<PersonalAccount>;
    /** The discounts that have been applied to the order. */
    discountApplications: DiscountApplicationConnection;
    /** The discount information for the order, including line-level discount applications. */
    discountInformation: OrderDiscountInformation;
    /** The draft order associated with the order. */
    draftOrder?: Maybe<DraftOrder>;
    /** The name of the associated draft order. */
    draftOrderName?: Maybe<Scalars['String']['output']>;
    /**
     * The edit summary of the order.
     *
     */
    editSummary?: Maybe<OrderEditSummary>;
    /** Whether the order has been edited or not. */
    edited: Scalars['Boolean']['output'];
    /** The email address of the customer. */
    email?: Maybe<Scalars['String']['output']>;
    /** The email address of the customer. */
    emailAddress?: Maybe<CustomerEmailAddress>;
    /** The financial status of the order. */
    financialStatus?: Maybe<OrderFinancialStatus>;
    /** The fulfillment status of the order. */
    fulfillmentStatus: OrderFulfillmentStatus;
    /** The fulfillments associated with the order. */
    fulfillments: FulfillmentConnection;
    /** Whether the customer has an email address. */
    hasEmail: Scalars['Boolean']['output'];
    /** Whether the order has multiple fulfillments. */
    hasMultipleFulfillments: Scalars['Boolean']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The delivery or estimated delivery date of the latest fulfillment. */
    latestFulfillmentDeliveryDate?: Maybe<Scalars['DateTime']['output']>;
    /** The list of the order's line item containers (e.g., Unfulfilled). */
    lineItemContainers: Array<LineItemContainer>;
    /** The list of line items of the order. */
    lineItems: LineItemConnection;
    /** The summary of the quantity of line items for the order. */
    lineItemsSummary?: Maybe<OrderLineItemsSummary>;
    /** The name of the fulfillment location assigned at the time of order creation. */
    locationName?: Maybe<Scalars['String']['output']>;
    /** The market that includes the order's shipping address. Or the shop's primary market if the shipping address is empty. */
    market: Market;
    /** A metafield found by namespace and key. */
    metafield?: Maybe<Metafield>;
    /**
     * The metafields associated with the resource matching the
     * supplied list of namespaces and keys.
     *
     */
    metafields: Array<Maybe<Metafield>>;
    /**
     * The identifier for the order that appears on the order.
     * For example, _#1000_ or _Store1001.
     *
     */
    name: Scalars['String']['output'];
    /** The order's notes. */
    note?: Maybe<Scalars['String']['output']>;
    /** A unique numeric identifier for the order, used by both the shop owner and customer. */
    number: Scalars['Int']['output'];
    /** The list of metafields associated with the order receipt. */
    orderReceiptMetafields: Array<Metafield>;
    /** The payment information for the order. */
    paymentInformation?: Maybe<OrderPaymentInformation>;
    /**
     * Represents the merchant configured payment terms.
     *
     */
    paymentTermsTemplate?: Maybe<PaymentTermsTemplate>;
    /** The phone number of the customer for SMS notifications. */
    phone?: Maybe<Scalars['String']['output']>;
    /** The pickup information for the order. */
    pickupInformation?: Maybe<OrderPickupInformation>;
    /** The purchase order number of the order. */
    poNumber?: Maybe<Scalars['String']['output']>;
    /**
     * The date and time when the order was processed.
     * This value can be set to dates in the past when importing from other systems.
     * If no value is provided, it will be auto-generated based on current date and time.
     *
     */
    processedAt: Scalars['DateTime']['output'];
    /** The purchasing entity for the order. */
    purchasingEntity?: Maybe<PurchasingEntity>;
    /** The purchasing entity for the order. */
    purchasingEntityV1?: Maybe<PurchasingEntityV1>;
    /** A list of refunds associated with the order. */
    refunds: Array<Refund>;
    /** The path to recreate the order in the cart and redirect to checkout. Will return nil if the line item count exceeds 100. */
    reorderPath?: Maybe<Scalars['String']['output']>;
    /** Whether the order requires shipping. */
    requiresShipping: Scalars['Boolean']['output'];
    /** The list of returns for the order with pagination. */
    returns: ReturnConnection;
    /**
     * The mailing address to which the order items are shipped.
     *
     */
    shippingAddress?: Maybe<CustomerAddress>;
    /**
     * The discounts that have been allocated onto the shipping line by discount applications.
     *
     */
    shippingDiscountAllocations: Array<DiscountAllocation>;
    /** A summary of all shipping costs on the order. */
    shippingLine?: Maybe<ShippingLine>;
    /** The list of shipping line groups for the order. */
    shippingLineGroups: Array<OrderShippingLineGroup>;
    /** A summary of the shipping titles for the order. */
    shippingTitle?: Maybe<Scalars['String']['output']>;
    /** The various fields for subscribing to order updates via Shop Pay. */
    shopAppLinksAndResources?: Maybe<ShopAppLinksAndResources>;
    /** The totals and quantities for the order, ignoring returns. */
    soldInformation: OrderSoldInformation;
    /** The unique URL for the status page of the order. */
    statusPageUrl: Scalars['URL']['output'];
    /** The unique URL for the status page of the order. */
    statusUrl: Scalars['URL']['output'];
    /** The price of the order before duties, shipping, and taxes. */
    subtotal?: Maybe<MoneyV2>;
    /** The price of the order before order-level discounts, duties, shipping. It includes taxes in  tax-inclusive orders. */
    subtotalBeforeDiscounts?: Maybe<MoneyV2>;
    /** The total cost of shipping after discounts. */
    totalDiscountedShipping: MoneyV2;
    /** The total amount of duties after returns. */
    totalDuties?: Maybe<MoneyV2>;
    /** The total duties and duties status. */
    totalDutiesSummary?: Maybe<OrderDutiesSummary>;
    /** The total amount of the order (including taxes and discounts) minus the amounts for line items that have been returned. */
    totalPrice: MoneyV2;
    /** The total amount refunded. */
    totalRefunded: MoneyV2;
    /** The total cost of shipping. */
    totalShipping: MoneyV2;
    /** The total cost of taxes. */
    totalTax?: Maybe<MoneyV2>;
    /** The total value of tips. */
    totalTip?: Maybe<MoneyV2>;
    /** A list of transactions associated with the order. */
    transactions: Array<OrderTransaction>;
  };

/** A customer’s completed request to purchase one or more products from a shop. */
export type OrderAgreementsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A customer’s completed request to purchase one or more products from a shop. */
export type OrderDiscountApplicationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A customer’s completed request to purchase one or more products from a shop. */
export type OrderFulfillmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<FulfillmentSortKeys>;
};

/** A customer’s completed request to purchase one or more products from a shop. */
export type OrderLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A customer’s completed request to purchase one or more products from a shop. */
export type OrderMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

/** A customer’s completed request to purchase one or more products from a shop. */
export type OrderMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** A customer’s completed request to purchase one or more products from a shop. */
export type OrderReturnsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ReturnSortKeys>;
};

/**
 * The possible order action types for a
 * [sales agreement](https://shopify.dev/api/admin-graphql/latest/interfaces/salesagreement).
 *
 */
export type OrderActionType =
  /** An order with a purchase or charge. */
  | 'ORDER'
  /** An edit to the order. */
  | 'ORDER_EDIT'
  /** A refund on the order. */
  | 'REFUND'
  /** An unknown agreement action. Represents new actions that may be added in future versions. */
  | 'UNKNOWN';

/** An agreement associated with an order placement. */
export type OrderAgreement = Node &
  SalesAgreement & {
    __typename?: 'OrderAgreement';
    /** The date and time when the agreement occurred. */
    happenedAt: Scalars['DateTime']['output'];
    /** The unique ID for the agreement. */
    id: Scalars['ID']['output'];
    /** The order associated with the agreement. */
    order: Order;
    /** The reason the agreement was created. */
    reason: OrderActionType;
    /** The sales associated with the agreement. */
    sales: SaleConnection;
  };

/** An agreement associated with an order placement. */
export type OrderAgreementSalesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The information about all discounts applied to a specific order. */
export type OrderAllDiscounts = {
  __typename?: 'OrderAllDiscounts';
  /** The type of the discount application. */
  discountApplicationType: DiscountApplicationType;
  /** The value of the applied discount. */
  discountValue: MoneyV2;
  /** The type of line to which the discount applies. */
  targetType: DiscountApplicationTargetType;
  /** The title of the discount. */
  title?: Maybe<Scalars['String']['output']>;
};

/** The set of valid sort keys for the OrderByCompany query. */
export type OrderByCompanySortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `order_number` value. */
  | 'ORDER_NUMBER'
  /** Sort by the `processed_at` value. */
  | 'PROCESSED_AT'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `total_price` value. */
  | 'TOTAL_PRICE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** The set of valid sort keys for the OrderByContact query. */
export type OrderByContactSortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `order_number` value. */
  | 'ORDER_NUMBER'
  /** Sort by the `processed_at` value. */
  | 'PROCESSED_AT'
  /** Sort by the `purchasing_company_location_name` value. */
  | 'PURCHASING_COMPANY_LOCATION_NAME'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `total_price` value. */
  | 'TOTAL_PRICE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** The set of valid sort keys for the OrderByLocation query. */
export type OrderByLocationSortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `order_number` value. */
  | 'ORDER_NUMBER'
  /** Sort by the `processed_at` value. */
  | 'PROCESSED_AT'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `total_price` value. */
  | 'TOTAL_PRICE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** The reason for the cancellation of the order. */
export type OrderCancelReason =
  /** The customer wanted to cancel the order. */
  | 'CUSTOMER'
  /** Payment was declined. */
  | 'DECLINED'
  /** The order was fraudulent. */
  | 'FRAUD'
  /** There was insufficient inventory. */
  | 'INVENTORY'
  /** The order was canceled for an unlisted reason. */
  | 'OTHER'
  /** Staff made an error. */
  | 'STAFF';

/**
 * An auto-generated type for paginating through multiple Orders.
 *
 */
export type OrderConnection = {
  __typename?: 'OrderConnection';
  /** A list of edges. */
  edges: Array<OrderEdge>;
  /** A list of the nodes contained in OrderEdge. */
  nodes: Array<Order>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An order that redacts data if the requester does not have authorization to view it. */
export type OrderDetailsPageOrder = Order | PublicOrder;

/** The disount information for a specific order. */
export type OrderDiscountInformation = {
  __typename?: 'OrderDiscountInformation';
  /** The discount information for the order, including line_level discount applications. */
  allAppliedDiscounts: Array<OrderAllDiscounts>;
  /** The order level discount information for the order. */
  allOrderLevelAppliedDiscounts: Array<OrderAllDiscounts>;
  /** The order level discount information for the order. */
  allOrderLevelAppliedDiscountsOnSoldItems: Array<OrderAllDiscounts>;
  /** Total discounts for the order. */
  totalDiscounts: MoneyV2;
  /** The current order-level discount amount after all order updates. */
  totalOrderLevelAppliedDiscounts: MoneyV2;
};

/**
 * The status of duties for the order.
 *
 */
export type OrderDutiesStatusType =
  /** The order is being shipped from another country, so duties and taxes may be charged on delivery. */
  | 'DUTIES_ERROR'
  /** The order is being shipped from another country, so duties have been added to the order total. */
  | 'DUTIES_OK'
  /** The order is being shipped from another country. Duties are not charged on orders of this value. */
  | 'DUTIES_ZERO';

/**
 * The summary of duties associated with an order.
 *
 */
export type OrderDutiesSummary = {
  __typename?: 'OrderDutiesSummary';
  /** The total amount of duties for the order. */
  totalDuties?: Maybe<MoneyV2>;
  /** The status of duties for the order. */
  totalDutiesStatus?: Maybe<OrderDutiesStatusType>;
};

/**
 * An auto-generated type which holds one Order and a cursor during pagination.
 *
 */
export type OrderEdge = {
  __typename?: 'OrderEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of OrderEdge. */
  node: Order;
};

/** An agreement related to an edit of the order. */
export type OrderEditAgreement = Node &
  SalesAgreement & {
    __typename?: 'OrderEditAgreement';
    /** The date and time when the agreement occurred. */
    happenedAt: Scalars['DateTime']['output'];
    /** The unique ID for the agreement. */
    id: Scalars['ID']['output'];
    /** The reason the agreement was created. */
    reason: OrderActionType;
    /** The sales associated with the agreement. */
    sales: SaleConnection;
  };

/** An agreement related to an edit of the order. */
export type OrderEditAgreementSalesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The edit summary associated with an order. */
export type OrderEditSummary = {
  __typename?: 'OrderEditSummary';
  /** The edit changes of the order. */
  changes: Array<OrderEditSummaryChange>;
  /** The date and time of the latest edit. */
  latestHappenedAt?: Maybe<Scalars['DateTime']['output']>;
};

/**
 * A change in the edit summary of an order.
 *
 */
export type OrderEditSummaryChange = Node & {
  __typename?: 'OrderEditSummaryChange';
  /** The quantity delta of the change. */
  delta: Scalars['Int']['output'];
  /** The handle that describes the change type. */
  handle?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The line item associated with the change. */
  lineItem: LineItem;
};

/** Represents the order's current financial status. */
export type OrderFinancialStatus =
  /** Displayed as **Authorized**. */
  | 'AUTHORIZED'
  /** Displayed as **Paid**. */
  | 'PAID'
  /** Displayed as **Partially paid**. */
  | 'PARTIALLY_PAID'
  /** Displayed as **Partially refunded**. */
  | 'PARTIALLY_REFUNDED'
  /** Displayed as **Pending**. */
  | 'PENDING'
  /** Displayed as **Refunded**. */
  | 'REFUNDED'
  /** Displayed as **Voided**. */
  | 'VOIDED';

/**
 * The aggregated fulfillment status of the order for display purposes.
 *
 */
export type OrderFulfillmentStatus =
  /**
   * Attempted to deliver the fulfillment.
   *
   */
  | 'ATTEMPTED_TO_DELIVER'
  /**
   * The fulfillment is confirmed.
   *
   */
  | 'CONFIRMED'
  /**
   * The fulfillment has been successfully delivered.
   *
   */
  | 'DELIVERED'
  /**
   * The fulfillment is in transit.
   *
   */
  | 'IN_TRANSIT'
  /**
   * This order has multiple fulfillments with differing statuses.
   *
   */
  | 'MULTIPLE_SHIPMENTS'
  /**
   * The fulfillment is on its way.
   *
   */
  | 'ON_ITS_WAY'
  /**
   * The fulfillment is out for delivery.
   *
   */
  | 'OUT_FOR_DELIVERY'
  /**
   * The fulfillment has been picked up.
   *
   */
  | 'PICKED_UP'
  /**
   * The fulfillment is being prepared for shipping.
   *
   */
  | 'PREPARING_FOR_SHIPPING'
  /**
   * The fulfillment is ready to be picked up.
   *
   */
  | 'READY_FOR_PICKUP'
  /**
   * There was a problem with the fulfillment.
   *
   */
  | 'THERE_WAS_A_PROBLEM';

/** The quantitative information about the line items of a specific order. */
export type OrderLineItemsSummary = {
  __typename?: 'OrderLineItemsSummary';
  /** The number of line items in the order. */
  lineItemCount: Scalars['Int']['output'];
  /** The total quantity of all line items in the order. */
  totalQuantityOfLineItems: Scalars['Int']['output'];
  /** The total quantity of all tips in the order. */
  totalQuantityOfTipLineItems: Scalars['Int']['output'];
};

/** The summary of payment status information for the order. */
export type OrderPaymentInformation = {
  __typename?: 'OrderPaymentInformation';
  /** The URL for collecting a payment on the order. */
  paymentCollectionUrl?: Maybe<Scalars['URL']['output']>;
  /** The financial status of the order. */
  paymentStatus?: Maybe<OrderPaymentStatus>;
  /** The payment terms linked with the order. */
  paymentTerms?: Maybe<PaymentTerms>;
  /** The total amount that's yet to be transacted for the order. */
  totalOutstandingAmount: MoneyV2;
  /** The total amount that has been paid for the order before any refund. */
  totalPaidAmount: MoneyV2;
};

/** The current payment status of the order. */
export type OrderPaymentStatus =
  /** The payment has been authorized. */
  | 'AUTHORIZED'
  /** The payment has expired. */
  | 'EXPIRED'
  /** The payment has been paid. */
  | 'PAID'
  /** The payment has been partially paid. */
  | 'PARTIALLY_PAID'
  /** The payment has been partially refunded. */
  | 'PARTIALLY_REFUNDED'
  /** The payment is pending. */
  | 'PENDING'
  /** The payment has been refunded. */
  | 'REFUNDED'
  /** The payment has been voided. */
  | 'VOIDED';

/**
 * The pickup information associated with an order.
 *
 */
export type OrderPickupInformation = {
  __typename?: 'OrderPickupInformation';
  /** The pickup address for the order. */
  address?: Maybe<PickupAddress>;
  /** The date and time when the pickup order was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** The pickup status for the order. */
  status?: Maybe<PickupStatus>;
  /** The date and time when the pickup order was updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Return type for `orderRequestReturn` mutation. */
export type OrderRequestReturnPayload = {
  __typename?: 'OrderRequestReturnPayload';
  /** The return request that has been made. */
  return?: Maybe<Return>;
};

/** The group including the shipping lines of the order. */
export type OrderShippingLineGroup = {
  __typename?: 'OrderShippingLineGroup';
  /** The type of the shipping group. */
  groupType: DeliveryOptionGroupType;
  /** The price of the shipping method after discounts. */
  lineAmountAfterDiscounts: MoneyV2;
};

/** A summary that regroups totals for an order, including the line items that have been returned. */
export type OrderSoldInformation = {
  __typename?: 'OrderSoldInformation';
  /** The total quantity of line items in the order, including the quantities for line items that have been returned. */
  quantity: Scalars['Int']['output'];
  /** The total quantity of line items in the order that were refunded, even if the totalRefunded amount was zero. */
  refundedQuantity: Scalars['Int']['output'];
  /** The total amount of the order (before shipping and discounts), including the amounts for line items that have been returned. */
  subtotal?: Maybe<MoneyV2>;
  /** The total amount of the order (including taxes and discounts), including the amounts for line items that have been returned. */
  total?: Maybe<MoneyV2>;
  /** The total discount amount for the order, including the amounts for line items that have been returned. */
  totalDiscount?: Maybe<MoneyV2>;
  /** The total tax amount of the order, including the amounts for line items that have been returned. */
  totalTaxes?: Maybe<MoneyV2>;
};

/** The set of valid sort keys for the Order query. */
export type OrderSortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `order_number` value. */
  | 'ORDER_NUMBER'
  /** Sort by the `processed_at` value. */
  | 'PROCESSED_AT'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `total_price` value. */
  | 'TOTAL_PRICE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** A payment transaction within an order context. */
export type OrderTransaction = Node &
  PaymentIcon & {
    __typename?: 'OrderTransaction';
    /** The date and time when the transaction was created. */
    createdAt: Scalars['DateTime']['output'];
    /** The gift card details for the transaction. */
    giftCardDetails?: Maybe<GiftCardDetails>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The kind of the transaction. */
    kind?: Maybe<OrderTransactionKind>;
    /** The payment details for the transaction. */
    paymentDetails?: Maybe<PaymentDetails>;
    /** The payment icon to display for the transaction. */
    paymentIcon?: Maybe<PaymentIconImage>;
    /** The date and time when the transaction was processed. */
    processedAt?: Maybe<Scalars['DateTime']['output']>;
    /** The status of the transaction. */
    status?: Maybe<OrderTransactionStatus>;
    /** The amount and currency of the transaction in shop and presentment currencies. */
    transactionAmount: MoneyBag;
    /** The ID of the parent transaction. */
    transactionParentId?: Maybe<Scalars['String']['output']>;
    /** The type of the transaction. */
    type: OrderTransactionType;
    /** The details of the transaction type. */
    typeDetails?: Maybe<TransactionTypeDetails>;
  };

/** The kind of order transaction. */
export type OrderTransactionKind =
  /** An authorization transaction. */
  | 'AUTHORIZATION'
  /** A capture transaction. */
  | 'CAPTURE'
  /** A card approval transaction. */
  | 'CARD_APPROVAL'
  /** A card decline transaction. */
  | 'CARD_DECLINE'
  /** A change transaction. */
  | 'CHANGE'
  /** An EMV authorization transaction. */
  | 'EMV_AUTHORIZATION'
  /** A refund transaction. */
  | 'REFUND'
  /** A refund EMV initiate transaction. */
  | 'REFUND_EMV_INITIATE'
  /** A sale transaction. */
  | 'SALE'
  /** A suggested refund transaction. */
  | 'SUGGESTED_REFUND'
  /** A void transaction. */
  | 'VOID';

/**
 * Represents the status of an order transaction.
 *
 */
export type OrderTransactionStatus =
  /** The transaction has an error. */
  | 'ERROR'
  /** The transaction has failed. */
  | 'FAILURE'
  /** The transaction is pending. */
  | 'PENDING'
  /** The transaction is pending authentication. */
  | 'PENDING_AUTHENTICATION'
  /** The transaction is successful. */
  | 'SUCCESS';

/** The type of order transaction. */
export type OrderTransactionType =
  /** A bank deposit transaction. */
  | 'BANK_DEPOSIT'
  /** A card transaction. */
  | 'CARD'
  /** A cash on delivery transaction. */
  | 'CASH_ON_DELIVERY'
  /** A custom payment transaction. */
  | 'CUSTOM'
  /** A gift card transaction. */
  | 'GIFT_CARD'
  /** A generic manual transaction. */
  | 'MANUAL'
  /** A money order transaction. */
  | 'MONEY_ORDER'
  /** A Shopify installments transaction. */
  | 'SHOPIFY_INSTALLMENTS';

/**
 * Returns information about pagination in a connection, in accordance with the
 * [Relay specification](https://relay.dev/graphql/connections.htm#sec-undefined.PageInfo).
 * For more information, please read our [GraphQL Pagination Usage Guide](https://shopify.dev/api/usage/pagination-graphql).
 *
 */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** The cursor corresponding to the last node in edges. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether there are more pages to fetch following the current page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are any pages prior to the current page. */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor corresponding to the first node in edges. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

/** Payment details related to a transaction. */
export type PaymentDetails = CardPaymentDetails;

/** The payment icon to display for the transaction. */
export type PaymentIcon = {
  /** The payment icon to display for the transaction. */
  paymentIcon?: Maybe<PaymentIconImage>;
};

/** Represents an image resource. */
export type PaymentIconImage = Node & {
  __typename?: 'PaymentIconImage';
  /** A word or phrase to share the nature or contents of an image. */
  altText?: Maybe<Scalars['String']['output']>;
  /** The original height of the image in pixels. Returns `null` if the image isn't hosted by Shopify. */
  height?: Maybe<Scalars['Int']['output']>;
  /** A unique non-nullable ID for the image. */
  id: Scalars['ID']['output'];
  /**
   * The location of the original image as a URL.
   *
   * If there are any existing transformations in the original source URL, they will remain and not be stripped.
   *
   * @deprecated Use `url` instead.
   */
  originalSrc: Scalars['URL']['output'];
  /**
   * The location of the image as a URL.
   * @deprecated Use `url` instead.
   */
  src: Scalars['URL']['output'];
  /**
   * The location of the transformed image as a URL.
   *
   * All transformation arguments are considered "best-effort". If they can be applied to an image, they will be.
   * Otherwise any transformations which an image type doesn't support will be ignored.
   *
   * @deprecated Use `url(transform:)` instead
   */
  transformedSrc: Scalars['URL']['output'];
  /**
   * The location of the image as a URL.
   *
   * If no transform options are specified, then the original image will be preserved including any pre-applied transforms.
   *
   * All transformation options are considered "best-effort". Any transformation that the original image type doesn't support will be ignored.
   *
   * If you need multiple variations of the same image, then you can use [GraphQL aliases](https://graphql.org/learn/queries/#aliases).
   *
   */
  url: Scalars['URL']['output'];
  /** The original width of the image in pixels. Returns `null` if the image isn't hosted by Shopify. */
  width?: Maybe<Scalars['Int']['output']>;
};

/** Represents an image resource. */
export type PaymentIconImageTransformedSrcArgs = {
  crop?: InputMaybe<CropRegion>;
  maxHeight?: InputMaybe<Scalars['Int']['input']>;
  maxWidth?: InputMaybe<Scalars['Int']['input']>;
  preferredContentType?: InputMaybe<ImageContentType>;
  scale?: InputMaybe<Scalars['Int']['input']>;
};

/** Represents an image resource. */
export type PaymentIconImageUrlArgs = {
  transform?: InputMaybe<ImageTransformInput>;
};

/** A payment instrument. */
export type PaymentInstrument = {
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
};

/** The billing address associated with a credit card payment instrument. */
export type PaymentInstrumentBillingAddress = {
  __typename?: 'PaymentInstrumentBillingAddress';
  /** The first line of the address, typically the street address or PO Box number. */
  address1?: Maybe<Scalars['String']['output']>;
  /** The second line of the address, typically the apartment, suite, or unit number. */
  address2?: Maybe<Scalars['String']['output']>;
  /** The name of the city, district, village, or town. */
  city?: Maybe<Scalars['String']['output']>;
  /** The name of the country. */
  country?: Maybe<Scalars['String']['output']>;
  /** The two-letter code for the country of the address, for example, US. */
  countryCode?: Maybe<CountryCode>;
  /** The first name in the address. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** The last name in the address. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** The region of the address, such as the province, state, or district. */
  province?: Maybe<Scalars['String']['output']>;
  /** The two-letter code for the region, for example, ON. */
  provinceCode?: Maybe<Scalars['String']['output']>;
  /** The zip or postal code of the address. */
  zip?: Maybe<Scalars['String']['output']>;
};

/** Return type for `paymentInstrumentRemove` mutation. */
export type PaymentInstrumentRemovePayload = {
  __typename?: 'PaymentInstrumentRemovePayload';
  /** The ID of the deleted payment instrument. */
  deletedPaymentInstrumentId?: Maybe<Scalars['ID']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** Return type for `paymentInstrumentUpdateDefault` mutation. */
export type PaymentInstrumentUpdateDefaultPayload = {
  __typename?: 'PaymentInstrumentUpdateDefaultPayload';
  /** The ID of the updated payment instrument. */
  updatedPaymentInstrumentId?: Maybe<Scalars['ID']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** The types of credit card wallets. */
export type PaymentInstrumentWalletType =
  /** The credit card is an Apple Pay wallet. */
  | 'APPLE_PAY'
  /** The credit card is a Google Pay wallet. */
  | 'GOOGLE_PAY'
  /** The credit card is a Shop Pay wallet. */
  | 'SHOP_PAY';

/** A single payment schedule defined in the payment terms. */
export type PaymentSchedule = Node & {
  __typename?: 'PaymentSchedule';
  /** The amount owed for this payment schedule. */
  amount: MoneyV2;
  /** Whether the payment has been completed. */
  completed: Scalars['Boolean']['output'];
  /** The date and time when the payment schedule was paid or fulfilled. */
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The date and time when the payment schedule is due. */
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
};

/**
 * An auto-generated type for paginating through multiple PaymentSchedules.
 *
 */
export type PaymentScheduleConnection = {
  __typename?: 'PaymentScheduleConnection';
  /** A list of edges. */
  edges: Array<PaymentScheduleEdge>;
  /** A list of the nodes contained in PaymentScheduleEdge. */
  nodes: Array<PaymentSchedule>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one PaymentSchedule and a cursor during pagination.
 *
 */
export type PaymentScheduleEdge = {
  __typename?: 'PaymentScheduleEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of PaymentScheduleEdge. */
  node: PaymentSchedule;
};

/** The payment terms associated with an order or draft order. */
export type PaymentTerms = Node & {
  __typename?: 'PaymentTerms';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /**
   * The next due date if this is the NET or FIXED type of payment terms.
   *
   */
  nextDueAt?: Maybe<Scalars['DateTime']['output']>;
  /** Whether the payment terms have overdue payment schedules. */
  overdue: Scalars['Boolean']['output'];
  /** The list of schedules associated with the payment terms. */
  paymentSchedules: PaymentScheduleConnection;
  /** The name of the payment terms template that was used to create the payment terms. */
  paymentTermsName: Scalars['String']['output'];
  /** The type of the payment terms template that was used to create the payment terms. */
  paymentTermsType: PaymentTermsType;
};

/** The payment terms associated with an order or draft order. */
export type PaymentTermsPaymentSchedulesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The template for payment terms. */
export type PaymentTermsTemplate = Node & {
  __typename?: 'PaymentTermsTemplate';
  /** The description of the payment terms template. */
  description: Scalars['String']['output'];
  /** The number of days between the issue date and due date for net-type payment terms. */
  dueInDays?: Maybe<Scalars['Int']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The name of the payment terms template. */
  name: Scalars['String']['output'];
  /** The type of the payment terms template. */
  paymentTermsType: PaymentTermsType;
  /** The translated name of the payment terms template. */
  translatedName: Scalars['String']['output'];
};

/** The type of a payment terms or a payment terms template. */
export type PaymentTermsType =
  /** The payment terms or payment terms template is fixed type (due on a specified date). */
  | 'FIXED'
  /** The payment terms or payment terms template is due upon fulfillment. */
  | 'FULFILLMENT'
  /** The payment terms or payment terms template is net type (due a number of days after issue). */
  | 'NET'
  /** The payment terms or payment terms template is due upon receipt. */
  | 'RECEIPT'
  /** The type of the payment terms or payment terms template is unknown. */
  | 'UNKNOWN';

/** Return type for `paypalAccountEnable` mutation. */
export type PaypalAccountEnablePayload = {
  __typename?: 'PaypalAccountEnablePayload';
  /** The newly established PayPal billing agreement. */
  paypalBillingAgreement?: Maybe<PaypalBillingAgreement>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaypalTokenUserErrors>;
};

/** A payment method using a PayPal billing agreement. */
export type PaypalBillingAgreement = Node &
  PaymentInstrument & {
    __typename?: 'PaypalBillingAgreement';
    /** The billing address associated with the payment method. */
    billingAddress?: Maybe<PaymentInstrumentBillingAddress>;
    /** The globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The email address associated with the PayPal account. */
    paypalAccountEmail?: Maybe<Scalars['String']['output']>;
    /** The list of pending orders associated with this PayPal billing agreement. */
    pendingOrders: OrderConnection;
    /** The list of subscription contracts charged using this PayPal billing agreement. */
    subscriptionContracts: SubscriptionContractConnection;
  };

/** A payment method using a PayPal billing agreement. */
export type PaypalBillingAgreementPendingOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A payment method using a PayPal billing agreement. */
export type PaypalBillingAgreementSubscriptionContractsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<SubscriptionContractsSortKeys>;
};

/** Return type for `paypalTokenCreate` mutation. */
export type PaypalTokenCreatePayload = {
  __typename?: 'PaypalTokenCreatePayload';
  /** The created PayPal Express token. */
  token?: Maybe<Scalars['String']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaypalTokenUserErrors>;
};

/**
 * The operations that can be performed on a B2B resource.
 *
 */
export type PermittedOperation =
  /**
   * The permission to add a resource.
   *
   */
  | 'ADD'
  /**
   * All permissions for a resource.
   *
   */
  | 'ALL'
  /**
   * The permission to delete a resource.
   *
   */
  | 'DELETE'
  /**
   * The permission to edit a resource.
   *
   */
  | 'EDIT'
  /**
   * The permission to use a resource.
   *
   */
  | 'USE'
  /**
   * The permission to view a resource.
   *
   */
  | 'VIEW';

/** Represents the personal information of a customer. */
export type PersonalAccount = HasMetafields &
  Node & {
    __typename?: 'PersonalAccount';
    /**
     * Indicates if the customer accepts email marketing communication.
     * If the customer doesn't have an email address, then this property is `false`.
     *
     */
    acceptsEmailMarketing: Scalars['Boolean']['output'];
    /**
     * Indicates if the customer accepts sms marketing communication.
     * If the customer doesn't have a phone number, then this property is `false`.
     *
     */
    acceptsSmsMarketing: Scalars['Boolean']['output'];
    /** The addresses associated with the customer. */
    addresses: CustomerMailingAddressConnection;
    /** The list of wallet payment configs for providers that the payment method accepts. */
    availableWalletPaymentConfigs: Array<WalletPaymentConfig>;
    /** The date and time when the customer was created. */
    createdAt: Scalars['DateTime']['output'];
    /** The date and time when the customer was created. */
    creationDate: Scalars['DateTime']['output'];
    /** A Credit Card resource identified by ID. */
    creditCard?: Maybe<CustomerCreditCard>;
    /** The stored Credit Cards associated with the customer. */
    creditCards: CustomerCreditCardConnection;
    /** The email address of the customer. */
    customerEmailAddress?: Maybe<CustomerEmailAddress>;
    /** The phone number of the customer. */
    customerPhoneNumber?: Maybe<CustomerPhoneNumber>;
    /** The default mailing address of the customer. */
    defaultAddress?: Maybe<CustomerMailingAddress>;
    /**
     * The full name of the customer, based on the first_name and last_name values. If these aren't available, it falls back to the customer's email address, and if that isn't available, the customer's phone number.
     *
     */
    displayName: Scalars['String']['output'];
    /** A Draft Order resource identified by ID. */
    draftOrder?: Maybe<DraftOrder>;
    /** The Draft Orders associated with the customer. */
    draftOrders: DraftOrderConnection;
    /** The email address of the customer. */
    email?: Maybe<Scalars['String']['output']>;
    /**
     * The current email marketing state for the customer.
     * If the customer doesn't have an email address, then this property is `null`.
     *
     */
    emailMarketingConsent?: Maybe<EmailMarketingConsentState>;
    /** The first name of the customer. */
    firstName?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The URL to the avatar image of the customer. */
    imageUrl: Scalars['URL']['output'];
    /** The customer's most recently updated, incomplete checkout. */
    lastIncompleteCheckout?: Maybe<Checkout>;
    /** The last name of the customer. */
    lastName?: Maybe<Scalars['String']['output']>;
    /** A metafield found by namespace and key. */
    metafield?: Maybe<Metafield>;
    /**
     * The metafields associated with the resource matching the
     * supplied list of namespaces and keys.
     *
     */
    metafields: Array<Maybe<Metafield>>;
    /** Returns an Order resource by ID. */
    order?: Maybe<Order>;
    /** An Order resource identified by ID. */
    orderDetailsPageOrder?: Maybe<OrderDetailsPageOrder>;
    /** The orders associated with the customer. */
    orders: OrderConnection;
    /** A PayPal Billing Agreement resource. */
    paypalBillingAgreement?: Maybe<PaypalBillingAgreement>;
    /** The phone number of the customer. */
    phone?: Maybe<Scalars['String']['output']>;
    /** A Return identified by ID. */
    return?: Maybe<Return>;
    /** A Subscription Contract resource identified by ID. */
    subscriptionContract?: Maybe<SubscriptionContract>;
    /** The Subscription Contracts associated with the customer. */
    subscriptionContracts: SubscriptionContractConnection;
    /** A comma-separated list of tags that have been added to the customer. */
    tags: Array<Scalars['String']['output']>;
    /** Indicates whether the customer is exempt from being charged taxes on their orders. */
    taxExempt: Scalars['Boolean']['output'];
    /** The list of tax exemption types applied to the customer. */
    taxExemptions: Array<TaxExemption>;
    /** The list of tax exemptions applied to the customer with additional details. */
    taxExemptionsDetails: Array<TaxExemptionDetails>;
  };

/** Represents the personal information of a customer. */
export type PersonalAccountAddressesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  skipDefault?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents the personal information of a customer. */
export type PersonalAccountCreditCardArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type PersonalAccountCreditCardsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents the personal information of a customer. */
export type PersonalAccountDraftOrderArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type PersonalAccountDraftOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<DraftOrderSortKeys>;
};

/** Represents the personal information of a customer. */
export type PersonalAccountMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

/** Represents the personal information of a customer. */
export type PersonalAccountMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** Represents the personal information of a customer. */
export type PersonalAccountOrderArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type PersonalAccountOrderDetailsPageOrderArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type PersonalAccountOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<OrderSortKeys>;
};

/** Represents the personal information of a customer. */
export type PersonalAccountReturnArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type PersonalAccountSubscriptionContractArgs = {
  id: Scalars['ID']['input'];
};

/** Represents the personal information of a customer. */
export type PersonalAccountSubscriptionContractsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<SubscriptionContractsSortKeys>;
};

/**
 * The input fields to update a customer's personal information.
 *
 */
export type PersonalInformationUpdateInput = {
  /** The customer's first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The customer's last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `personalInformationUpdate` mutation. */
export type PersonalInformationUpdatePayload = {
  __typename?: 'PersonalInformationUpdatePayload';
  /** The customer's personal information that has been updated. */
  personalInformation?: Maybe<PersonalAccount>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPersonalInformationUserErrors>;
};

/**
 * The address of a pickup location.
 *
 */
export type PickupAddress = {
  __typename?: 'PickupAddress';
  /** The street address for the pickup location. */
  address1: Scalars['String']['output'];
  /** Any additional address information for the pickup location. */
  address2?: Maybe<Scalars['String']['output']>;
  /** The city of the pickup location. */
  city: Scalars['String']['output'];
  /** The country code for the pickup location. */
  countryCode: CountryCode;
  /** The phone number for the pickup location. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The ZIP code for the pickup location. */
  zip?: Maybe<Scalars['String']['output']>;
  /** The province code for the pickup location. */
  zoneCode?: Maybe<Scalars['String']['output']>;
};

/** The status of the order's pickup. */
export type PickupStatus =
  /** The pickup of the order has been confirmed. */
  | 'CLOSED'
  /** The order has been picked up. */
  | 'IN_PROGRESS'
  /** The order is ready for pick up. */
  | 'OPEN';

/** Represents the value of the percentage pricing object. */
export type PricingPercentageValue = {
  __typename?: 'PricingPercentageValue';
  /** The percentage value of the object. */
  percentage: Scalars['Float']['output'];
};

/** The price value (fixed or percentage) for a discount application. */
export type PricingValue = MoneyV2 | PricingPercentageValue;

/** A sale associated with a product. */
export type ProductSale = Node &
  Sale & {
    __typename?: 'ProductSale';
    /** The type of order action represented by the sale. */
    actionType: SaleActionType;
    /** The unique ID of the sale. */
    id: Scalars['ID']['output'];
    /** The line item for the associated sale. */
    lineItem: LineItem;
    /** The type of line associated with the sale. */
    lineType: SaleLineType;
    /** The number of units ordered or intended to be returned. */
    quantity?: Maybe<Scalars['Int']['output']>;
    /** The individual taxes associated with the sale. */
    taxes: Array<SaleTax>;
    /** The total sale amount after taxes and discounts. */
    totalAmount: MoneyV2;
    /** The total amount of discounts allocated to the sale after taxes. */
    totalDiscountAmountAfterTaxes: MoneyV2;
    /** The total discounts allocated to the sale before taxes. */
    totalDiscountAmountBeforeTaxes: MoneyV2;
    /** The total tax amount for the sale. */
    totalTaxAmount: MoneyV2;
  };

/** The data that about an order that is visible to anyone with the order ID. */
export type PublicOrder = Node & {
  __typename?: 'PublicOrder';
  /**
   * The date and time when the order was canceled.
   * Returns `null` if the order wasn't canceled.
   *
   */
  cancelledAt?: Maybe<Scalars['DateTime']['output']>;
  /**
   * A randomly generated alpha-numeric identifier for the order that may be shown to the customer
   * instead of the sequential order name. For example, "XPAV284CT", "R50KELTJP" or "35PKUN0UJ".
   * This value isn't guaranteed to be unique.
   *
   */
  confirmationNumber?: Maybe<Scalars['String']['output']>;
  /** The discount information for the order, including line-level discount applications. */
  discountInformation: OrderDiscountInformation;
  /** The name of the associated draft order. */
  draftOrderName?: Maybe<Scalars['String']['output']>;
  /**
   * The edit summary of the order.
   *
   */
  editSummary?: Maybe<OrderEditSummary>;
  /** The financial status of the order. */
  financialStatus?: Maybe<OrderFinancialStatus>;
  /** The fulfillment status of the order. */
  fulfillmentStatus: OrderFulfillmentStatus;
  /** The fulfillments associated with the order. */
  fulfillments: FulfillmentConnection;
  /** Whether the customer has an email address. */
  hasEmail: Scalars['Boolean']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The list of the order's line item containers (e.g., Unfulfilled). */
  lineItemContainers: Array<LineItemContainer>;
  /** The list of line items of the order. */
  lineItems: LineItemConnection;
  /** The market that includes the order's shipping address. Or the shop's primary market if the shipping address is empty. */
  market: Market;
  /**
   * The identifier for the order that appears on the order.
   * For example, _#1000_ or _Store1001.
   *
   */
  name: Scalars['String']['output'];
  /** The payment information for the order. */
  paymentInformation?: Maybe<OrderPaymentInformation>;
  /** The pickup information for the order. */
  pickupInformation?: Maybe<OrderPickupInformation>;
  /** The purchase order number of the order. */
  poNumber?: Maybe<Scalars['String']['output']>;
  /**
   * The date and time when the order was processed.
   * This value can be set to dates in the past when importing from other systems.
   * If no value is provided, it will be auto-generated based on current date and time.
   *
   */
  processedAt: Scalars['DateTime']['output'];
  /** The purchasing entity for the order. */
  purchasingEntity?: Maybe<PurchasingEntity>;
  /** The purchasing entity for the order. */
  purchasingEntityV1?: Maybe<PurchasingEntityV1>;
  /** A list of refunds associated with the order. */
  refunds: Array<Refund>;
  /** The path to recreate the order in the cart and redirect to checkout. Will return nil if the line item count exceeds 100. */
  reorderPath?: Maybe<Scalars['String']['output']>;
  /** Whether the order requires shipping. */
  requiresShipping: Scalars['Boolean']['output'];
  /** The list of returns for the order with pagination. */
  returns: ReturnConnection;
  /** The list of shipping line groups for the order. */
  shippingLineGroups: Array<OrderShippingLineGroup>;
  /** The totals and quantities for the order, ignoring returns. */
  soldInformation: OrderSoldInformation;
  /** The price of the order before duties, shipping, and taxes. */
  subtotal?: Maybe<MoneyV2>;
  /** The price of the order before order-level discounts, duties, shipping. It includes taxes in  tax-inclusive orders. */
  subtotalBeforeDiscounts?: Maybe<MoneyV2>;
  /** The total cost of shipping after discounts. */
  totalDiscountedShipping: MoneyV2;
  /** The total amount of duties after returns. */
  totalDuties?: Maybe<MoneyV2>;
  /** The total duties and duties status. */
  totalDutiesSummary?: Maybe<OrderDutiesSummary>;
  /** The total amount of the order (including taxes and discounts) minus the amounts for line items that have been returned. */
  totalPrice: MoneyV2;
  /** The total amount refunded. */
  totalRefunded: MoneyV2;
  /** The total cost of shipping. */
  totalShipping: MoneyV2;
  /** The total cost of taxes. */
  totalTax?: Maybe<MoneyV2>;
  /** The total value of tips. */
  totalTip?: Maybe<MoneyV2>;
  /** A list of transactions associated with the order. */
  transactions: Array<OrderTransaction>;
};

/** The data that about an order that is visible to anyone with the order ID. */
export type PublicOrderFulfillmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<FulfillmentSortKeys>;
};

/** The data that about an order that is visible to anyone with the order ID. */
export type PublicOrderLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The data that about an order that is visible to anyone with the order ID. */
export type PublicOrderReturnsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ReturnSortKeys>;
};

/**
 * The information of the purchasing company for an order or draft order.
 *
 */
export type PurchasingCompany = {
  __typename?: 'PurchasingCompany';
  /** The company associated with the order or draft order. */
  company: Company;
  /** The company contact associated with the order or draft order. */
  contact?: Maybe<CompanyContact>;
  /** The company contact associated with the order or draft order. */
  contactV1?: Maybe<Contact>;
  /** The company location associated with the order or draft order. */
  location: CompanyLocation;
  /** The company location associated with the order or draft order. */
  locationV1: Location;
};

/**
 * Represents information about the purchasing entity for the order or draft order.
 *
 */
export type PurchasingEntity = Customer | PurchasingCompany;

/**
 * Represents information about the purchasing entity for the order or draft order.
 *
 */
export type PurchasingEntityV1 = PersonalAccount | PurchasingCompany;

/** This acts as the public, top-level API from which all queries start. */
export type QueryRoot = {
  __typename?: 'QueryRoot';
  /** Returns the settings for the address form. */
  addressFormSettings: AddressFormSettings;
  /** Returns the business account of the customer. */
  businessAccount: BusinessAccount;
  /** The information of the customer's company. */
  company?: Maybe<Company>;
  /** The Location corresponding to the provided ID. */
  companyLocation?: Maybe<CompanyLocation>;
  /** Returns the Customer resource. */
  customer: Customer;
  /** Returns a Draft Order resource by ID. */
  draftOrder?: Maybe<DraftOrder>;
  /** The API tokens for UI extensions. */
  extensionApiTokens?: Maybe<ExtensionApiTokens>;
  /** Returns an Order resource by ID. */
  order?: Maybe<Order>;
  /** An Order resource identified by ID. */
  orderDetailsPageOrder?: Maybe<OrderDetailsPageOrder>;
  /** Returns the personal information of the customer. */
  personalAccount: PersonalAccount;
  /** Returns the information about the shop. */
  shop: Shop;
  /**
   * Public metafields for Shop, Order, Customer, Company, CompanyLocation, Product, and ProductVariant.
   * Shop metafields are always fetched if there is a match for the given namespace and key pairs.
   * Product and ProductVariant are only fetched if resource_ids are provided and there is a match for the
   * namespace and key. This is restricted to development shops for local UI extension development purposes only.
   *
   */
  uiExtensionMetafields: Array<UiExtensionMetafield>;
  /** A session token for an UI extension. */
  uiExtensionSessionToken?: Maybe<UiExtensionSessionToken>;
};

/** This acts as the public, top-level API from which all queries start. */
export type QueryRootCompanyArgs = {
  id: Scalars['ID']['input'];
};

/** This acts as the public, top-level API from which all queries start. */
export type QueryRootCompanyLocationArgs = {
  id: Scalars['ID']['input'];
};

/** This acts as the public, top-level API from which all queries start. */
export type QueryRootDraftOrderArgs = {
  id: Scalars['ID']['input'];
};

/** This acts as the public, top-level API from which all queries start. */
export type QueryRootExtensionApiTokensArgs = {
  appId: Scalars['ID']['input'];
};

/** This acts as the public, top-level API from which all queries start. */
export type QueryRootOrderArgs = {
  id: Scalars['ID']['input'];
};

/** This acts as the public, top-level API from which all queries start. */
export type QueryRootOrderDetailsPageOrderArgs = {
  id: Scalars['ID']['input'];
};

/** This acts as the public, top-level API from which all queries start. */
export type QueryRootUiExtensionMetafieldsArgs = {
  filters: Array<UiExtensionMetafieldFilterInput>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  resourceIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** This acts as the public, top-level API from which all queries start. */
export type QueryRootUiExtensionSessionTokenArgs = {
  id: Scalars['ID']['input'];
};

/**
 *         The record of refunds issued to a customer.
 *
 */
export type Refund = Node & {
  __typename?: 'Refund';
  /** The date and time when the refund was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The name of the return, if the refund was issued from a return. */
  returnName?: Maybe<Scalars['String']['output']>;
  /** The total amount refunded across all transactions, in presentment currencies. */
  totalRefunded: MoneyV2;
  /** The date and time when the refund was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** An agreement for refunding all or a portion of the order between the merchant and the customer. */
export type RefundAgreement = Node &
  SalesAgreement & {
    __typename?: 'RefundAgreement';
    /** The date and time when the agreement occurred. */
    happenedAt: Scalars['DateTime']['output'];
    /** The unique ID for the agreement. */
    id: Scalars['ID']['output'];
    /** The reason the agreement was created. */
    reason: OrderActionType;
    /** The refund that's associated with the agreement. */
    refund: Refund;
    /** The sales associated with the agreement. */
    sales: SaleConnection;
  };

/** An agreement for refunding all or a portion of the order between the merchant and the customer. */
export type RefundAgreementSalesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * The information about the line items container for items that have not been refunded or removed.
 *
 */
export type RemainingLineItemContainer = {
  __typename?: 'RemainingLineItemContainer';
  /** A unique ID for the container. */
  id: Scalars['ID']['output'];
  /** The line items contained within this container. */
  lineItems: RemainingLineItemContainerLineItemConnection;
};

/**
 * The information about the line items container for items that have not been refunded or removed.
 *
 */
export type RemainingLineItemContainerLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * The information about the line item in the line item container.
 *
 */
export type RemainingLineItemContainerLineItem = Node & {
  __typename?: 'RemainingLineItemContainerLineItem';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The line item associated with the container. */
  lineItem: LineItem;
};

/**
 * An auto-generated type for paginating through multiple RemainingLineItemContainerLineItems.
 *
 */
export type RemainingLineItemContainerLineItemConnection = {
  __typename?: 'RemainingLineItemContainerLineItemConnection';
  /** A list of edges. */
  edges: Array<RemainingLineItemContainerLineItemEdge>;
  /** A list of the nodes contained in RemainingLineItemContainerLineItemEdge. */
  nodes: Array<RemainingLineItemContainerLineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one RemainingLineItemContainerLineItem and a cursor during pagination.
 *
 */
export type RemainingLineItemContainerLineItemEdge = {
  __typename?: 'RemainingLineItemContainerLineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of RemainingLineItemContainerLineItemEdge. */
  node: RemainingLineItemContainerLineItem;
};

/** The input fields for a line item requested for return. */
export type RequestedLineItemInput = {
  /**
   * A note from the customer explaining the item to be returned.
   * For instance, the note can detail issues with the item for the merchant's information.
   * Maximum length: 300 characters.
   *
   */
  customerNote?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the line item that's to be returned. */
  lineItemId: Scalars['ID']['input'];
  /** The quantity of the item that's to be returned. */
  quantity: Scalars['Int']['input'];
  /** The reason for returning the item. */
  returnReason: ReturnReason;
};

/** Return type for `resendGiftCard` mutation. */
export type ResendGiftCardPayload = {
  __typename?: 'ResendGiftCardPayload';
  /** The ID of the order that resends the gift cards. */
  orderId?: Maybe<Scalars['ID']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsResendGiftCardErrors>;
};

/** Represents permissions on resources. */
export type ResourcePermission = {
  __typename?: 'ResourcePermission';
  /** The operations permitted on the resource. */
  permittedOperations: Array<PermittedOperation>;
  /** The name of the resource. */
  resource: ResourceType;
};

/**
 * The B2B resource types.
 *
 */
export type ResourceType =
  /**
   * The Business Profile resource type.
   *
   */
  | 'BUSINESS_PROFILE'
  /**
   * The Company resource type.
   *
   */
  | 'COMPANY'
  /**
   * The Company Contact resource type.
   *
   */
  | 'COMPANY_CONTACT'
  /**
   * The Company Contact Role resource type.
   *
   */
  | 'COMPANY_CONTACT_ROLE'
  /**
   * The Company Location resource type.
   *
   */
  | 'COMPANY_LOCATION'
  /**
   * The Company Location Billing Address resource type.
   *
   */
  | 'COMPANY_LOCATION_BILLING_ADDRESS'
  /**
   * The Company Location Shipping Address resource type.
   *
   */
  | 'COMPANY_LOCATION_SHIPPING_ADDRESS'
  /**
   * The Company Tax Exemption resource type.
   *
   */
  | 'COMPANY_TAX_EXEMPTION'
  /**
   * The Draft Order resource type.
   *
   */
  | 'DRAFT_ORDER'
  /**
   * The Order resource type.
   *
   */
  | 'ORDER'
  /**
   * The Payment Method resource type.
   *
   */
  | 'PAYMENT_METHOD';

/** A product return. */
export type Return = Node & {
  __typename?: 'Return';
  /** The date when the return was closed. */
  closedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The date when the return was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The name assigned to the return. */
  name: Scalars['String']['output'];
  /** The line items associated with the return. */
  returnLineItems: ReturnLineItemConnection;
  /** The list of reverse deliveries associated with the return. */
  reverseDeliveries: ReverseDeliveryConnection;
  /** The current status of the `Return`. */
  status: ReturnStatus;
  /** The timeline events related to the return. */
  timelineEvents: Array<TimelineEvent>;
  /** The date when the return was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A product return. */
export type ReturnReturnLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A product return. */
export type ReturnReverseDeliveriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An auto-generated type for paginating through multiple Returns.
 *
 */
export type ReturnConnection = {
  __typename?: 'ReturnConnection';
  /** A list of edges. */
  edges: Array<ReturnEdge>;
  /** A list of the nodes contained in ReturnEdge. */
  nodes: Array<Return>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Return and a cursor during pagination.
 *
 */
export type ReturnEdge = {
  __typename?: 'ReturnEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ReturnEdge. */
  node: Return;
};

/** A line item that is being returned. */
export type ReturnLineItem = Node & {
  __typename?: 'ReturnLineItem';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The specific line item that's being returned. */
  lineItem: LineItem;
  /** The quantity of the item that's being returned. */
  quantity: Scalars['Int']['output'];
  /** The reason for returning the item. */
  returnReason: ReturnReason;
};

/**
 * An auto-generated type for paginating through multiple ReturnLineItems.
 *
 */
export type ReturnLineItemConnection = {
  __typename?: 'ReturnLineItemConnection';
  /** A list of edges. */
  edges: Array<ReturnLineItemEdge>;
  /** A list of the nodes contained in ReturnLineItemEdge. */
  nodes: Array<ReturnLineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one ReturnLineItem and a cursor during pagination.
 *
 */
export type ReturnLineItemEdge = {
  __typename?: 'ReturnLineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ReturnLineItemEdge. */
  node: ReturnLineItem;
};

/** The reason for returning the item. */
export type ReturnReason =
  /** The color of the item didn't meet expectations. */
  | 'COLOR'
  /** The item was damaged or defective. */
  | 'DEFECTIVE'
  /** The item was not as described. */
  | 'NOT_AS_DESCRIBED'
  /** Other reason not listed. */
  | 'OTHER'
  /** The size of the item was too large. */
  | 'SIZE_TOO_LARGE'
  /** The size of the item was too small. */
  | 'SIZE_TOO_SMALL'
  /** The style of the item didn't meet expectations. */
  | 'STYLE'
  /** The reason is unknown. */
  | 'UNKNOWN'
  /** The customer changed their mind about the item. */
  | 'UNWANTED'
  /** The customer received the wrong item. */
  | 'WRONG_ITEM';

/** The set of valid sort keys for the Return query. */
export type ReturnSortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE';

/** The current status of a `Return`. */
export type ReturnStatus =
  /** The `Return` has been canceled by the user. */
  | 'CANCELED'
  /** The `Return` has been successfully completed. */
  | 'CLOSED'
  /** The `Return` request was declined. */
  | 'DECLINED'
  /** The `Return` is currently in progress. */
  | 'OPEN'
  /** The `Return` has been requested by the user. */
  | 'REQUESTED';

/** The supported reason for returning a line item. */
export type ReturnSupportedReason = {
  __typename?: 'ReturnSupportedReason';
  /** The specific reason for returning the line item. */
  reason: ReturnReason;
  /** The user-friendly title for the return reason. */
  title: Scalars['String']['output'];
};

/**
 * A reverse delivery represents a package being sent back by a buyer to a merchant post-fulfillment.
 * This could occur when a buyer requests a return and the merchant provides a shipping label.
 * The reverse delivery includes the context of the items being returned, the method of return
 * (for example, a shipping label), and the current status of the delivery (tracking information).
 *
 */
export type ReverseDelivery = Node & {
  __typename?: 'ReverseDelivery';
  /** Whether the label was generated by the customer. */
  customerGeneratedLabel: Scalars['Boolean']['output'];
  /** The deliverable linked with the reverse delivery. */
  deliverable?: Maybe<ReverseDeliveryDeliverable>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
};

/**
 * An auto-generated type for paginating through multiple ReverseDeliveries.
 *
 */
export type ReverseDeliveryConnection = {
  __typename?: 'ReverseDeliveryConnection';
  /** A list of edges. */
  edges: Array<ReverseDeliveryEdge>;
  /** A list of the nodes contained in ReverseDeliveryEdge. */
  nodes: Array<ReverseDelivery>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** The method and associated details of a reverse delivery. */
export type ReverseDeliveryDeliverable = ReverseDeliveryShippingDeliverable;

/**
 * An auto-generated type which holds one ReverseDelivery and a cursor during pagination.
 *
 */
export type ReverseDeliveryEdge = {
  __typename?: 'ReverseDeliveryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ReverseDeliveryEdge. */
  node: ReverseDelivery;
};

/** The return label information for a reverse delivery. */
export type ReverseDeliveryLabel = {
  __typename?: 'ReverseDeliveryLabel';
  /** The date and time when the reverse delivery label was created. */
  createdAt: Scalars['DateTime']['output'];
  /** A publicly accessible link for downloading the label image. */
  publicFileUrl?: Maybe<Scalars['URL']['output']>;
  /** The date and time when the reverse delivery label was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** A set of shipping deliverables for reverse delivery. */
export type ReverseDeliveryShippingDeliverable = {
  __typename?: 'ReverseDeliveryShippingDeliverable';
  /** The return label that's attached to the reverse delivery. */
  label?: Maybe<ReverseDeliveryLabel>;
  /** The tracking information for the reverse delivery. */
  tracking?: Maybe<ReverseDeliveryTracking>;
};

/** The tracking information for a reverse delivery. */
export type ReverseDeliveryTracking = {
  __typename?: 'ReverseDeliveryTracking';
  /** The name of the delivery service provider, in a format that's suitable for display purposes. */
  carrierName?: Maybe<Scalars['String']['output']>;
  /** The identifier that the courier uses to track the shipment. */
  trackingNumber?: Maybe<Scalars['String']['output']>;
  /** The URL used to track the shipment. */
  trackingUrl?: Maybe<Scalars['URL']['output']>;
};

/**
 * A record of an individual sale associated with a sales agreement. Every monetary value in an order's sales data is represented in the smallest unit of the currency.
 * When amounts are divided across multiple line items, such as taxes or order discounts, the amounts might not divide evenly across all of the line items on the order.
 * To address this, the remaining currency units that couldn't be divided evenly are allocated one at a time, starting with the first line item, until they are all accounted for.
 * In aggregate, the values sum up correctly. In isolation, one line item might have a different tax or discount amount than another line item of the same price, before taxes and discounts.
 * This is because the amount could not be divided evenly across the items. The allocation of currency units across line items is immutable. After they are allocated, currency units are never reallocated or redistributed among the line items.
 *
 */
export type Sale = {
  /** The type of order action represented by the sale. */
  actionType: SaleActionType;
  /** The unique ID of the sale. */
  id: Scalars['ID']['output'];
  /** The type of line associated with the sale. */
  lineType: SaleLineType;
  /** The number of units ordered or intended to be returned. */
  quantity?: Maybe<Scalars['Int']['output']>;
  /** The individual taxes associated with the sale. */
  taxes: Array<SaleTax>;
  /** The total sale amount after taxes and discounts. */
  totalAmount: MoneyV2;
  /** The total amount of discounts allocated to the sale after taxes. */
  totalDiscountAmountAfterTaxes: MoneyV2;
  /** The total discounts allocated to the sale before taxes. */
  totalDiscountAmountBeforeTaxes: MoneyV2;
  /** The total tax amount for the sale. */
  totalTaxAmount: MoneyV2;
};

/** An order action type associated with a sale. */
export type SaleActionType =
  /** A purchase or charge. */
  | 'ORDER'
  /** A removal or return. */
  | 'RETURN'
  /** An unidentified order action. Represents new actions that may be added in future versions. */
  | 'UNKNOWN'
  /** A change to the price, taxes, or discounts for a previous purchase. */
  | 'UPDATE';

/**
 * An auto-generated type for paginating through multiple Sales.
 *
 */
export type SaleConnection = {
  __typename?: 'SaleConnection';
  /** A list of edges. */
  edges: Array<SaleEdge>;
  /** A list of the nodes contained in SaleEdge. */
  nodes: Array<
    | AdditionalFeeSale
    | AdjustmentSale
    | DutySale
    | GiftCardSale
    | ProductSale
    | ShippingLineSale
    | TipSale
    | UnknownSale
  >;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Sale and a cursor during pagination.
 *
 */
export type SaleEdge = {
  __typename?: 'SaleEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SaleEdge. */
  node:
    | AdditionalFeeSale
    | AdjustmentSale
    | DutySale
    | GiftCardSale
    | ProductSale
    | ShippingLineSale
    | TipSale
    | UnknownSale;
};

/**
 * The possible line types of a sale record. A sale can be an adjustment, which occurs when a refund is issued for a line item that is either more or less than the total value of the line item.
 * Examples include restocking fees and goodwill payments. In such cases, Shopify generates a sales agreement with sale records for each line item that is returned or refunded, and an additional sale record for the adjustment, for example a restocking fee.
 * The sale records for the returned or refunded items represent the reversal of the original line item sale value. The additional adjustment sale record represents the difference between the original total value of all line items that were refunded, and the actual amount refunded.
 *
 */
export type SaleLineType =
  /** An additional fee. */
  | 'ADDITIONAL_FEE'
  /** A sale adjustment. */
  | 'ADJUSTMENT'
  /** A duty charge. */
  | 'DUTY'
  /** A gift card. */
  | 'GIFT_CARD'
  /** A product that was purchased, returned, or exchanged. */
  | 'PRODUCT'
  /** A shipping charge. */
  | 'SHIPPING'
  /** A tip given by the customer. */
  | 'TIP'
  /** An unknown sale line type. This represents new types that may be added in future versions. */
  | 'UNKNOWN';

/** The tax allocated to a sale from a single tax line. */
export type SaleTax = Node & {
  __typename?: 'SaleTax';
  /** The portion of the total tax amount on the related sale that's from the associated tax line. */
  amount: MoneyV2;
  /** The unique ID for the sale tax. */
  id: Scalars['ID']['output'];
  /** The tax line associated with the sale. */
  taxLine: TaxLine;
};

/** A contract between a merchant and a customer to do business. Shopify creates a sales agreement whenever an order is placed, edited, or refunded. A sales agreement has one or more sales records, which provide itemized details about the initial agreement or subsequent changes made to the order. For example, when a customer places an order, Shopify creates the order, generates a sales agreement, and records a sale for each line item purchased in the order. A sale record is specific to a type of order line. Order lines can represent different things such as a purchased product, a tip added by a customer, shipping costs collected at checkout, and more. */
export type SalesAgreement = {
  /** The date and time when the agreement occurred. */
  happenedAt: Scalars['DateTime']['output'];
  /** The unique ID for the agreement. */
  id: Scalars['ID']['output'];
  /** The reason the agreement was created. */
  reason: OrderActionType;
  /** The sales associated with the agreement. */
  sales: SaleConnection;
};

/** A contract between a merchant and a customer to do business. Shopify creates a sales agreement whenever an order is placed, edited, or refunded. A sales agreement has one or more sales records, which provide itemized details about the initial agreement or subsequent changes made to the order. For example, when a customer places an order, Shopify creates the order, generates a sales agreement, and records a sale for each line item purchased in the order. A sale record is specific to a type of order line. Order lines can represent different things such as a purchased product, a tip added by a customer, shipping costs collected at checkout, and more. */
export type SalesAgreementSalesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An auto-generated type for paginating through multiple SalesAgreements.
 *
 */
export type SalesAgreementConnection = {
  __typename?: 'SalesAgreementConnection';
  /** A list of edges. */
  edges: Array<SalesAgreementEdge>;
  /** A list of the nodes contained in SalesAgreementEdge. */
  nodes: Array<OrderAgreement | OrderEditAgreement | RefundAgreement>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one SalesAgreement and a cursor during pagination.
 *
 */
export type SalesAgreementEdge = {
  __typename?: 'SalesAgreementEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SalesAgreementEdge. */
  node: OrderAgreement | OrderEditAgreement | RefundAgreement;
};

/**
 * Captures the intentions of a discount that was created by a Shopify Script.
 *
 */
export type ScriptDiscountApplication = DiscountApplication & {
  __typename?: 'ScriptDiscountApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** The lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The title of the application as defined by the Script. */
  title: Scalars['String']['output'];
  /** The value of the discount application. */
  value: PricingValue;
};

/** Represents a selling plan policy anchor. */
export type SellingPlanAnchor = {
  __typename?: 'SellingPlanAnchor';
  /**
   * The cutoff day for the anchor.
   *
   * If `type` is WEEKDAY, then the value must be between 1-7. Shopify interprets
   * the days of the week according to ISO 8601, where 1 is Monday.
   *
   * If `type` is MONTHDAY, then the value must be between 1-31.
   *
   * If `type` is YEARDAY, then the value must be `null`.
   *
   */
  cutoffDay?: Maybe<Scalars['Int']['output']>;
  /**
   * The day of the anchor.
   *
   * If `type` is WEEKDAY, then the value must be between 1-7. Shopify interprets
   * the days of the week according to ISO 8601, where 1 is Monday.
   *
   * If `type` isn't WEEKDAY, then the value must be between 1-31.
   *
   */
  day: Scalars['Int']['output'];
  /**
   * The month of the anchor. If type is different than YEARDAY, then the value must
   * be `null` or between 1-12.
   *
   */
  month?: Maybe<Scalars['Int']['output']>;
  /**
   * Represents the anchor type, it can be one one of WEEKDAY, MONTHDAY, YEARDAY.
   *
   */
  type: SellingPlanAnchorType;
};

/** Defines the anchor type. */
export type SellingPlanAnchorType =
  /** Represents a day of the month, between 1-31. */
  | 'MONTHDAY'
  /** Represents a day of the week, between 1-7. */
  | 'WEEKDAY'
  /** Represents days of the month and year, month between 1-12, and day between 1-31. */
  | 'YEARDAY';

/** Defines valid selling plan intervals. */
export type SellingPlanInterval =
  /** Represents a day interval. */
  | 'DAY'
  /** Represents a month interval. */
  | 'MONTH'
  /** Represents a week interval. */
  | 'WEEK'
  /** Represents a year interval. */
  | 'YEAR';

/** Represents the shipping details that the customer chose for their order. */
export type ShippingLine = {
  __typename?: 'ShippingLine';
  /** A unique identifier for the shipping rate. */
  handle?: Maybe<Scalars['String']['output']>;
  /** The pre-tax shipping price without any discounts applied. */
  originalPrice: MoneyV2;
  /** The title of the shipping line. */
  title: Scalars['String']['output'];
};

/** A sale associated with a shipping charge. */
export type ShippingLineSale = Node &
  Sale & {
    __typename?: 'ShippingLineSale';
    /** The type of order action represented by the sale. */
    actionType: SaleActionType;
    /** The unique ID of the sale. */
    id: Scalars['ID']['output'];
    /** The type of line associated with the sale. */
    lineType: SaleLineType;
    /** The number of units ordered or intended to be returned. */
    quantity?: Maybe<Scalars['Int']['output']>;
    /** The individual taxes associated with the sale. */
    taxes: Array<SaleTax>;
    /** The total sale amount after taxes and discounts. */
    totalAmount: MoneyV2;
    /** The total amount of discounts allocated to the sale after taxes. */
    totalDiscountAmountAfterTaxes: MoneyV2;
    /** The total discounts allocated to the sale before taxes. */
    totalDiscountAmountBeforeTaxes: MoneyV2;
    /** The total tax amount for the sale. */
    totalTaxAmount: MoneyV2;
  };

/** A shipping rate to be applied to a checkout. */
export type ShippingRate = {
  __typename?: 'ShippingRate';
  /** The human-readable unique identifier for this shipping rate. */
  handle: Scalars['String']['output'];
  /** The price of this shipping rate. */
  price: MoneyV2;
  /** The title of this shipping rate. */
  title: Scalars['String']['output'];
};

/** A collection of the general information about the shop. */
export type Shop = HasMetafields &
  Node & {
    __typename?: 'Shop';
    /** Returns the settings for the address form. */
    addressFormSettings: AddressFormSettings;
    /** The email of the shop. */
    email: Scalars['String']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** A metafield found by namespace and key. */
    metafield?: Maybe<Metafield>;
    /**
     * The metafields associated with the resource matching the
     * supplied list of namespaces and keys.
     *
     */
    metafields: Array<Maybe<Metafield>>;
    /** The shop's .myshopify.com domain name. */
    myshopifyDomain: Scalars['String']['output'];
    /** The name of the shop. */
    name: Scalars['String']['output'];
    /** The list of all legal policies associated with the shop. */
    shopPolicies: Array<ShopPolicy>;
    /** The URL of the shop's online store. */
    url: Scalars['URL']['output'];
  };

/** A collection of the general information about the shop. */
export type ShopMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

/** A collection of the general information about the shop. */
export type ShopMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** The shop app links and resources for an order. */
export type ShopAppLinksAndResources = {
  __typename?: 'ShopAppLinksAndResources';
  /**
   * Whether the the buyer is associated to Shop App.
   *
   */
  buyerHasShopApp: Scalars['Boolean']['output'];
  /**
   * Whether the the buyer is associated to Shop Pay.
   *
   */
  buyerHasShopPay: Scalars['Boolean']['output'];
  /**
   * Whether or not the track order updates button should be rendered.
   *
   */
  canTrackOrderUpdates: Scalars['Boolean']['output'];
  /**
   * Whether or not showing the installments highlight is eligible.
   *
   */
  installmentsHighlightEligible: Scalars['Boolean']['output'];
  /**
   * The URL to the mobile Shop App.
   *
   */
  mobileUrl: Scalars['URL']['output'];
  /**
   * The attribution details related to the mobile url.
   *
   */
  mobileUrlAttributionPayload: Scalars['String']['output'];
  /**
   * The various options that exist for subscribing to order updates.
   *
   */
  orderUpdateOptions: Array<Scalars['String']['output']>;
  /**
   * The URL to the Shop App QR code.
   *
   */
  qrCodeUrl: Scalars['URL']['output'];
  /**
   * Whether or not Shop App eligible.
   *
   */
  shopAppEligible: Scalars['Boolean']['output'];
  /**
   * Whether QR code should be hidden.
   *
   */
  shopAppQrCodeKillswitch: Scalars['Boolean']['output'];
  /**
   * The URL to the Shop Pay Installments reminders.
   *
   */
  shopInstallmentsMobileUrl: Scalars['URL']['output'];
  /**
   * The URL to view the Shop Pay Installments schedules in the mobile Shop App.
   *
   */
  shopInstallmentsViewSchedules: Scalars['URL']['output'];
  /**
   * Whether the order was a shop pay order.
   *
   */
  shopPayOrder: Scalars['Boolean']['output'];
};

/** The configuration values used to initialize a Shop Pay checkout. */
export type ShopPayConfiguration = {
  __typename?: 'ShopPayConfiguration';
  /** Whether the checkout is a checkout one session. */
  checkoutOne: Scalars['Boolean']['output'];
  /** The URL parameters containing an encrypted blob used by Shop Pay's backend. */
  transactionParams: Scalars['String']['output'];
  /** The URL from which the Shop Pay checkout can be completed. */
  transactionUrl: Scalars['URL']['output'];
};

/** Return type for `shopPayCreditCardGetUpdateUrl` mutation. */
export type ShopPayCreditCardGetUpdateUrlPayload = {
  __typename?: 'ShopPayCreditCardGetUpdateUrlPayload';
  /** The URL to which the customer should be redirected to update their Shop Pay credit card. */
  updateShopPayCreditCardUrl?: Maybe<Scalars['URL']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserErrorsPaymentInstrumentUserErrors>;
};

/** A policy that a merchant has configured for their store, such as their refund or privacy policy. */
export type ShopPolicy = Node & {
  __typename?: 'ShopPolicy';
  /** The text of the policy. The maximum size is 512kb. */
  body: Scalars['HTML']['output'];
  /** The handle of the policy. */
  handle: Scalars['String']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The title of the policy. */
  title: Scalars['String']['output'];
  /** The public URL to the policy. */
  url: Scalars['URL']['output'];
};

/**
 * Defines the valid SMS marketing states for a customer’s phone number.
 *
 */
export type SmsMarketingState =
  /**
   * The customer has not subscribed to SMS marketing.
   *
   */
  | 'NOT_SUBSCRIBED'
  /**
   * The customer is in the process of subscribing to SMS marketing.
   *
   */
  | 'PENDING'
  /**
   * The customer's personal data has been erased. This value is internally-set and read-only.
   *
   */
  | 'REDACTED'
  /**
   * The customer has subscribed to SMS marketing.
   *
   */
  | 'SUBSCRIBED'
  /**
   * The customer is not currently subscribed to SMS marketing but was previously subscribed.
   *
   */
  | 'UNSUBSCRIBED';

/** The billing cycle of a subscription. */
export type SubscriptionBillingCycle = {
  __typename?: 'SubscriptionBillingCycle';
  /** The expected date of the billing attempt. */
  billingAttemptExpectedDate: Scalars['DateTime']['output'];
  /** The end date of the billing cycle. */
  cycleEndAt: Scalars['DateTime']['output'];
  /** The index of the billing cycle. */
  cycleIndex: Scalars['Int']['output'];
  /** The start date of the billing cycle. */
  cycleStartAt: Scalars['DateTime']['output'];
  /** Whether the billing cycle was edited. */
  edited: Scalars['Boolean']['output'];
  /** Whether the billing cycle was skipped. */
  skipped: Scalars['Boolean']['output'];
  /** The status of the billing cycle. */
  status: SubscriptionBillingCycleBillingCycleStatus;
};

/** The possible statuses of a subscription billing cycle. */
export type SubscriptionBillingCycleBillingCycleStatus =
  /** The billing cycle has been billed. */
  | 'BILLED'
  /** The billing cycle has not been billed. */
  | 'UNBILLED';

/**
 * An auto-generated type for paginating through multiple SubscriptionBillingCycles.
 *
 */
export type SubscriptionBillingCycleConnection = {
  __typename?: 'SubscriptionBillingCycleConnection';
  /** A list of edges. */
  edges: Array<SubscriptionBillingCycleEdge>;
  /** A list of the nodes contained in SubscriptionBillingCycleEdge. */
  nodes: Array<SubscriptionBillingCycle>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one SubscriptionBillingCycle and a cursor during pagination.
 *
 */
export type SubscriptionBillingCycleEdge = {
  __typename?: 'SubscriptionBillingCycleEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SubscriptionBillingCycleEdge. */
  node: SubscriptionBillingCycle;
};

/** The input fields for specifying the subscription contract and selecting the associated billing cycle. */
export type SubscriptionBillingCycleInput = {
  /** The ID of the subscription contract associated with the billing cycle. */
  contractId: Scalars['ID']['input'];
  /** Selects the billing cycle by date or index. */
  selector: SubscriptionBillingCycleSelector;
};

/** The input fields to select a SubscriptionBillingCycle by either date or index. */
export type SubscriptionBillingCycleSelector = {
  /** The date to select a billing cycle. */
  date?: InputMaybe<Scalars['DateTime']['input']>;
  /** The index to select a billing cycle. */
  index?: InputMaybe<Scalars['Int']['input']>;
};

/** Return type for `subscriptionBillingCycleSkip` mutation. */
export type SubscriptionBillingCycleSkipPayload = {
  __typename?: 'SubscriptionBillingCycleSkipPayload';
  /** The updated billing cycle. */
  billingCycle?: Maybe<SubscriptionBillingCycle>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<SubscriptionBillingCycleSkipUserError>;
};

/** An error that occurs during the execution of `SubscriptionBillingCycleSkip`. */
export type SubscriptionBillingCycleSkipUserError = DisplayableError & {
  __typename?: 'SubscriptionBillingCycleSkipUserError';
  /** The error code. */
  code?: Maybe<SubscriptionBillingCycleSkipUserErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `SubscriptionBillingCycleSkipUserError`. */
export type SubscriptionBillingCycleSkipUserErrorCode =
  /** The input value is invalid. */
  'INVALID';

/** Return type for `subscriptionBillingCycleUnskip` mutation. */
export type SubscriptionBillingCycleUnskipPayload = {
  __typename?: 'SubscriptionBillingCycleUnskipPayload';
  /** The updated billing cycle. */
  billingCycle?: Maybe<SubscriptionBillingCycle>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<SubscriptionBillingCycleUnskipUserError>;
};

/** An error that occurs during the execution of `SubscriptionBillingCycleUnskip`. */
export type SubscriptionBillingCycleUnskipUserError = DisplayableError & {
  __typename?: 'SubscriptionBillingCycleUnskipUserError';
  /** The error code. */
  code?: Maybe<SubscriptionBillingCycleUnskipUserErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `SubscriptionBillingCycleUnskipUserError`. */
export type SubscriptionBillingCycleUnskipUserErrorCode =
  /** The input value is invalid. */
  'INVALID';

/** The set of valid sort keys for the SubscriptionBillingCycles query. */
export type SubscriptionBillingCyclesSortKeys =
  /** Sort by the `cycle_end_at` value. */
  | 'CYCLE_END_AT'
  /** Sort by the `cycle_index` value. */
  | 'CYCLE_INDEX'
  /** Sort by the `id` value. */
  | 'ID'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE';

/** The billing policy of a subscription. */
export type SubscriptionBillingPolicy = {
  __typename?: 'SubscriptionBillingPolicy';
  /** The anchor dates for calculating billing intervals. */
  anchors: Array<SellingPlanAnchor>;
  /** The type of interval associated with this schedule (e.g. Monthly, Weekly, etc). */
  interval: SellingPlanInterval;
  /** The number of intervals between invoices. */
  intervalCount: Scalars['Int']['output'];
  /** The maximum number of cycles after which the subscription ends. */
  maxCycles?: Maybe<Scalars['Int']['output']>;
  /** The minimum number of cycles required for the subscription. */
  minCycles?: Maybe<Scalars['Int']['output']>;
};

/** A Subscription Contract. */
export type SubscriptionContract = Node &
  SubscriptionContractBase & {
    __typename?: 'SubscriptionContract';
    /** Whether the subscription contract is eligible for customer actions. */
    appEligibleForCustomerActions: Scalars['Boolean']['output'];
    /** The billing policy associated with the subscription contract. */
    billingPolicy: SubscriptionBillingPolicy;
    /** The date and time when the subscription contract was created. */
    createdAt: Scalars['DateTime']['output'];
    /** The currency used for the subscription contract. */
    currencyCode: CurrencyCode;
    /** A list of custom attributes to be added to the generated orders. */
    customAttributes: Array<Attribute>;
    /** The delivery method for each billing of the subscription contract. */
    deliveryMethod?: Maybe<SubscriptionDeliveryMethod>;
    /** The delivery policy associated with the subscription contract. */
    deliveryPolicy: SubscriptionDeliveryPolicy;
    /** The delivery price for each billing of the subscription contract. */
    deliveryPrice: MoneyV2;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The current status of the last payment. */
    lastPaymentStatus?: Maybe<SubscriptionContractLastPaymentStatus>;
    /** The number of lines associated with the subscription contract. */
    lineCount: Scalars['Int']['output'];
    /** A list of subscription lines associated with the subscription contract. */
    lines: SubscriptionLineConnection;
    /** The next billing date for the subscription contract. */
    nextBillingDate?: Maybe<Scalars['DateTime']['output']>;
    /** A note that will be applied to the generated orders. */
    note?: Maybe<Scalars['String']['output']>;
    /** A list of the subscription contract's orders. */
    orders: OrderConnection;
    /** The order from which the contract originated. */
    originOrder?: Maybe<Order>;
    /** The payment instrument being charged for this subscription contract. */
    paymentInstrument?: Maybe<CustomerCreditCard | PaypalBillingAgreement>;
    /** An estimate of the breakdown of the amounts that will be charged in the next billing attempt. */
    priceBreakdownEstimate?: Maybe<SubscriptionPriceBreakdown>;
    /** The revision ID of the contract. */
    revisionId: Scalars['UnsignedInt64']['output'];
    /** The current status of the subscription contract. */
    status: SubscriptionContractSubscriptionStatus;
    /** The upcoming billing cycles on the subscription contract. */
    upcomingBillingCycles: SubscriptionBillingCycleConnection;
    /** The date and time when the subscription contract was updated. */
    updatedAt: Scalars['DateTime']['output'];
  };

/** A Subscription Contract. */
export type SubscriptionContractLinesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A Subscription Contract. */
export type SubscriptionContractOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A Subscription Contract. */
export type SubscriptionContractUpcomingBillingCyclesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<SubscriptionBillingCyclesSortKeys>;
};

/** Return type for `subscriptionContractActivate` mutation. */
export type SubscriptionContractActivatePayload = {
  __typename?: 'SubscriptionContractActivatePayload';
  /** The activated Subscription Contract. */
  contract?: Maybe<SubscriptionContract>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<SubscriptionContractStatusUpdateUserError>;
};

/** The common fields of a subscription contract. */
export type SubscriptionContractBase = {
  /** Whether the subscription contract is eligible for customer actions. */
  appEligibleForCustomerActions: Scalars['Boolean']['output'];
  /** The currency used for the subscription contract. */
  currencyCode: CurrencyCode;
  /** A list of custom attributes to be added to the generated orders. */
  customAttributes: Array<Attribute>;
  /** The delivery method for each billing of the subscription contract. */
  deliveryMethod?: Maybe<SubscriptionDeliveryMethod>;
  /** The delivery price for each billing of the subscription contract. */
  deliveryPrice: MoneyV2;
  /** The number of lines associated with the subscription contract. */
  lineCount: Scalars['Int']['output'];
  /** A list of subscription lines associated with the subscription contract. */
  lines: SubscriptionLineConnection;
  /** A note that will be applied to the generated orders. */
  note?: Maybe<Scalars['String']['output']>;
  /** A list of the subscription contract's orders. */
  orders: OrderConnection;
  /** An estimate of the breakdown of the amounts that will be charged in the next billing attempt. */
  priceBreakdownEstimate?: Maybe<SubscriptionPriceBreakdown>;
  /** The date and time when the subscription contract was updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** The common fields of a subscription contract. */
export type SubscriptionContractBaseLinesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The common fields of a subscription contract. */
export type SubscriptionContractBaseOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Return type for `subscriptionContractCancel` mutation. */
export type SubscriptionContractCancelPayload = {
  __typename?: 'SubscriptionContractCancelPayload';
  /** The canceled Subscription Contract. */
  contract?: Maybe<SubscriptionContract>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<SubscriptionContractStatusUpdateUserError>;
};

/** Return type for `subscriptionContractChangePaymentInstrument` mutation. */
export type SubscriptionContractChangePaymentInstrumentPayload = {
  __typename?: 'SubscriptionContractChangePaymentInstrumentPayload';
  /** The updated Subscription Contract after the payment instrument change. */
  contract?: Maybe<SubscriptionContract>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<SubscriptionContractUserError>;
};

/**
 * An auto-generated type for paginating through multiple SubscriptionContracts.
 *
 */
export type SubscriptionContractConnection = {
  __typename?: 'SubscriptionContractConnection';
  /** A list of edges. */
  edges: Array<SubscriptionContractEdge>;
  /** A list of the nodes contained in SubscriptionContractEdge. */
  nodes: Array<SubscriptionContract>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one SubscriptionContract and a cursor during pagination.
 *
 */
export type SubscriptionContractEdge = {
  __typename?: 'SubscriptionContractEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SubscriptionContractEdge. */
  node: SubscriptionContract;
};

/** Return type for `subscriptionContractFetchDeliveryOptions` mutation. */
export type SubscriptionContractFetchDeliveryOptionsPayload = {
  __typename?: 'SubscriptionContractFetchDeliveryOptionsPayload';
  /** The available delivery options for a given delivery address. Returns `null` for pending requests. */
  deliveryOptionsResult?: Maybe<SubscriptionDeliveryOptionsResult>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<SubscriptionContractUserError>;
};

/** The status of the last payment on a subscription contract. */
export type SubscriptionContractLastPaymentStatus =
  /** A failed subscription billing attempt. */
  | 'FAILED'
  /** A successful subscription billing attempt. */
  | 'SUCCEEDED';

/** Return type for `subscriptionContractPause` mutation. */
export type SubscriptionContractPausePayload = {
  __typename?: 'SubscriptionContractPausePayload';
  /** The updated Subscription Contract after the pause operation. */
  contract?: Maybe<SubscriptionContract>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<SubscriptionContractStatusUpdateUserError>;
};

/** Return type for `subscriptionContractSelectDeliveryMethod` mutation. */
export type SubscriptionContractSelectDeliveryMethodPayload = {
  __typename?: 'SubscriptionContractSelectDeliveryMethodPayload';
  /** The updated subscription contract object. */
  contract?: Maybe<SubscriptionContract>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<SubscriptionContractUserError>;
};

/** Possible error codes that can be returned by `SubscriptionContractStatusUpdateUserError`. */
export type SubscriptionContractStatusUpdateErrorCode =
  /** Subscription contract status cannot be changed once failed. */
  | 'CONTRACT_FAILED'
  /** Subscription contract status cannot be changed once terminated. */
  | 'CONTRACT_TERMINATED'
  /** Subscription contract has a future contract or schedule edit. */
  | 'HAS_FUTURE_EDITS'
  /** The input value is invalid. */
  | 'INVALID'
  /** Subscription contract does not exist. */
  | 'SUBSCRIPTION_CONTRACT_DOES_NOT_EXIST';

/** The error codes for failed subscription contract mutations. */
export type SubscriptionContractStatusUpdateUserError = DisplayableError & {
  __typename?: 'SubscriptionContractStatusUpdateUserError';
  /** The error code. */
  code?: Maybe<SubscriptionContractStatusUpdateErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** The status of a subscription. */
export type SubscriptionContractSubscriptionStatus =
  /** The contract is active and is continuing per its policies. */
  | 'ACTIVE'
  /** The contract was ended by an unplanned customer action. */
  | 'CANCELLED'
  /** The contract has ended per the expected circumstances. All billing and delivery cycles of the subscriptions have been executed. */
  | 'EXPIRED'
  /** The contract has ended because billing failed and no further billing attempts are expected. */
  | 'FAILED'
  /** The contract is temporarily paused and is expected to resume in the future. */
  | 'PAUSED'
  /** The contract has expired due to inactivity. */
  | 'STALE';

/** The error codes for failed subscription contract mutations. */
export type SubscriptionContractUserError = DisplayableError & {
  __typename?: 'SubscriptionContractUserError';
  /** The error code. */
  code?: Maybe<SubscriptionContractUserErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `SubscriptionContractUserError`. */
export type SubscriptionContractUserErrorCode =
  /** The input value is blank. */
  | 'BLANK'
  /** Subscription contract has a future contract or schedule edit. */
  | 'HAS_FUTURE_EDITS'
  /** The input value is invalid. */
  | 'INVALID'
  /** Payment instrument does not exist. */
  | 'PAYMENT_INSTRUMENT_DOES_NOT_EXIST'
  /** Subscription contract does not exist. */
  | 'SUBSCRIPTION_CONTRACT_DOES_NOT_EXIST';

/** The set of valid sort keys for the SubscriptionContracts query. */
export type SubscriptionContractsSortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** The delivery method to use to deliver the physical goods to the customer. */
export type SubscriptionDeliveryMethod =
  | SubscriptionDeliveryMethodLocalDelivery
  | SubscriptionDeliveryMethodPickup
  | SubscriptionDeliveryMethodShipping;

/**
 * Specifies delivery method fields for a subscription contract.
 * This is an input union: one, and only one, field can be provided.
 * The field provided will determine which delivery method is to be used.
 *
 */
export type SubscriptionDeliveryMethodInput = {
  /** The input fields for the local delivery method. */
  localDelivery?: InputMaybe<SubscriptionDeliveryMethodLocalDeliveryInput>;
  /** The input fields for the pickup delivery method. */
  pickup?: InputMaybe<SubscriptionDeliveryMethodPickupInput>;
  /** The input fields for the shipping delivery method. */
  shipping?: InputMaybe<SubscriptionDeliveryMethodShippingInput>;
};

/** The local delivery method, including a mailing address and a local delivery option. */
export type SubscriptionDeliveryMethodLocalDelivery = {
  __typename?: 'SubscriptionDeliveryMethodLocalDelivery';
  /** The delivery address. */
  address: SubscriptionMailingAddress;
  /** The local delivery method details. */
  localDeliveryOption: SubscriptionDeliveryMethodLocalDeliveryOption;
};

/** The input fields for a local delivery method. */
export type SubscriptionDeliveryMethodLocalDeliveryInput = {
  /** The address to deliver to. */
  address: CustomerMailingAddressInput;
  /** The delivery instructions that the customer can provide to the merchant. */
  instructions?: InputMaybe<Scalars['String']['input']>;
  /**
   * The phone number that the customer must provide to the merchant.
   * Formatted using E.164 standard. For example, `+16135551111`.
   *
   */
  phone: Scalars['String']['input'];
};

/** The delivery option selected for a subscription contract. */
export type SubscriptionDeliveryMethodLocalDeliveryOption = {
  __typename?: 'SubscriptionDeliveryMethodLocalDeliveryOption';
  /** The description of the delivery option shown to the customer. */
  description?: Maybe<Scalars['String']['output']>;
  /** The delivery instructions provided by the customer to the merchant. */
  instructions?: Maybe<Scalars['String']['output']>;
  /**
   * The phone number of the customer provided to the merchant.
   * Formatted using E.164 standard. For example, `+16135551111`.
   *
   */
  phone: Scalars['String']['output'];
  /** The displayed title of the delivery option. */
  presentmentTitle?: Maybe<Scalars['String']['output']>;
  /** The title of the delivery option. */
  title?: Maybe<Scalars['String']['output']>;
};

/** A delivery method with a pickup option. */
export type SubscriptionDeliveryMethodPickup = {
  __typename?: 'SubscriptionDeliveryMethodPickup';
  /** The details of the pickup delivery method. */
  pickupOption: SubscriptionDeliveryMethodPickupOption;
};

/** The input fields for a pickup delivery method. */
export type SubscriptionDeliveryMethodPickupInput = {
  /** The ID of the pickup location. */
  locationId: Scalars['ID']['input'];
};

/** Represents the selected pickup option on a subscription contract. */
export type SubscriptionDeliveryMethodPickupOption = {
  __typename?: 'SubscriptionDeliveryMethodPickupOption';
  /** The details displayed to the customer to describe the pickup option. */
  description?: Maybe<Scalars['String']['output']>;
  /** The pickup address where the customer will pick up the merchandise. */
  pickupAddress: PickupAddress;
  /** The presentment title of the pickup option. */
  presentmentTitle?: Maybe<Scalars['String']['output']>;
  /** The title of the pickup option. */
  title?: Maybe<Scalars['String']['output']>;
};

/** The shipping delivery method, including a mailing address and a shipping option. */
export type SubscriptionDeliveryMethodShipping = {
  __typename?: 'SubscriptionDeliveryMethodShipping';
  /** The address for shipping. */
  address: SubscriptionMailingAddress;
  /** The details of the shipping method. */
  shippingOption: SubscriptionDeliveryMethodShippingOption;
};

/** The input fields for a shipping delivery method. */
export type SubscriptionDeliveryMethodShippingInput = {
  /** The address to ship to. */
  address: CustomerMailingAddressInput;
};

/** The selected shipping option on a subscription contract. */
export type SubscriptionDeliveryMethodShippingOption = {
  __typename?: 'SubscriptionDeliveryMethodShippingOption';
  /** The description of the shipping option. */
  description?: Maybe<Scalars['String']['output']>;
  /** The presentment title of the shipping option. */
  presentmentTitle?: Maybe<Scalars['String']['output']>;
  /** The title of the shipping option. */
  title?: Maybe<Scalars['String']['output']>;
};

/** The delivery option for a subscription contract. */
export type SubscriptionDeliveryOption =
  | SubscriptionLocalDeliveryOption
  | SubscriptionPickupOption
  | SubscriptionShippingOption;

/** The result of the query that fetches delivery options for the subscription contract. */
export type SubscriptionDeliveryOptionsResult =
  | SubscriptionDeliveryOptionsResultFailure
  | SubscriptionDeliveryOptionsResultSuccess;

/** A failed result indicating unavailability of delivery options for the subscription contract. */
export type SubscriptionDeliveryOptionsResultFailure = {
  __typename?: 'SubscriptionDeliveryOptionsResultFailure';
  /** The reason for the failure. */
  message?: Maybe<Scalars['String']['output']>;
};

/** A successful result containing the available delivery options for the subscription contract. */
export type SubscriptionDeliveryOptionsResultSuccess = {
  __typename?: 'SubscriptionDeliveryOptionsResultSuccess';
  /** The available delivery options. */
  deliveryOptions: Array<SubscriptionDeliveryOption>;
  /** The token associated with the successful result of delivery options. */
  token: Scalars['String']['output'];
};

/** Represents a Subscription Delivery Policy. */
export type SubscriptionDeliveryPolicy = {
  __typename?: 'SubscriptionDeliveryPolicy';
  /** The anchor dates for calculating delivery intervals. */
  anchors: Array<SellingPlanAnchor>;
  /** The type of interval associated with this schedule (e.g. Monthly, Weekly, etc). */
  interval: SellingPlanInterval;
  /** The number of intervals between deliveries. */
  intervalCount: Scalars['Int']['output'];
};

/** A line item in a subscription. */
export type SubscriptionLine = {
  __typename?: 'SubscriptionLine';
  /** The current price per unit for the subscription line in the contract's currency. */
  currentPrice: MoneyV2;
  /** The custom attributes associated with the line item. */
  customAttributes: Array<Attribute>;
  /** The unique ID of the line item. */
  id: Scalars['ID']['output'];
  /** The image associated with the product variant. */
  image?: Maybe<Image>;
  /** The total price of the line item after all discounts have been applied. */
  lineDiscountedPrice: MoneyV2;
  /** The name of the product. */
  name: Scalars['String']['output'];
  /**
   * The URL of the product in the online store.
   * A value of `null` indicates that the product isn't published in the Online Store sales channel.
   *
   */
  onlineStoreUrl?: Maybe<Scalars['URL']['output']>;
  /** The quantity of the unit selected for the subscription line. */
  quantity: Scalars['Int']['output'];
  /** Whether the product variant requires shipping. */
  requiresShipping: Scalars['Boolean']['output'];
  /** The SKU of the product variant associated with the subscription line. */
  sku?: Maybe<Scalars['String']['output']>;
  /** Whether the product variant is taxable. */
  taxable: Scalars['Boolean']['output'];
  /** The title of the product associated with the subscription line. */
  title: Scalars['String']['output'];
  /** The image associated with the product variant. */
  variantImage?: Maybe<Image>;
  /** The title of the product variant associated with the subscription line. */
  variantTitle?: Maybe<Scalars['String']['output']>;
};

/**
 * An auto-generated type for paginating through multiple SubscriptionLines.
 *
 */
export type SubscriptionLineConnection = {
  __typename?: 'SubscriptionLineConnection';
  /** A list of edges. */
  edges: Array<SubscriptionLineEdge>;
  /** A list of the nodes contained in SubscriptionLineEdge. */
  nodes: Array<SubscriptionLine>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one SubscriptionLine and a cursor during pagination.
 *
 */
export type SubscriptionLineEdge = {
  __typename?: 'SubscriptionLineEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SubscriptionLineEdge. */
  node: SubscriptionLine;
};

/** A local delivery option for a subscription contract. */
export type SubscriptionLocalDeliveryOption = {
  __typename?: 'SubscriptionLocalDeliveryOption';
  /** The code of the local delivery option. */
  code: Scalars['String']['output'];
  /** The description of the local delivery option. */
  description?: Maybe<Scalars['String']['output']>;
  /** Whether a phone number is required for the local delivery option. */
  phoneRequired: Scalars['Boolean']['output'];
  /** The presentment title of the local delivery option. */
  presentmentTitle?: Maybe<Scalars['String']['output']>;
  /** The price of the local delivery option. */
  price: MoneyV2;
  /** The title of the local delivery option. */
  title: Scalars['String']['output'];
};

/** The mailing address on a subscription. */
export type SubscriptionMailingAddress = {
  __typename?: 'SubscriptionMailingAddress';
  /** The first line of the address, typically the street address or PO Box number. */
  address1?: Maybe<Scalars['String']['output']>;
  /** The second line of the address, typically the apartment, suite, or unit number. */
  address2?: Maybe<Scalars['String']['output']>;
  /** The name of the city, district, village, or town. */
  city?: Maybe<Scalars['String']['output']>;
  /** The name of the customer's company or organization. */
  company?: Maybe<Scalars['String']['output']>;
  /** The name of the country. */
  country?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the country of the address.
   * For example, US.
   *
   */
  countryCode?: Maybe<CountryCode>;
  /** The first name of the customer. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** The last name of the customer. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** The full name of the customer, based on the first name and last name. */
  name?: Maybe<Scalars['String']['output']>;
  /** A unique phone number for the customer, formatted using the E.164 standard. For example, _+16135551111_. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The region of the address, such as the province, state, or district. */
  province?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the region.
   * For example, ON.
   *
   */
  provinceCode?: Maybe<Scalars['String']['output']>;
  /** The zip or postal code of the address. */
  zip?: Maybe<Scalars['String']['output']>;
};

/** A pickup option to deliver a subscription contract. */
export type SubscriptionPickupOption = {
  __typename?: 'SubscriptionPickupOption';
  /** The code of the pickup option. */
  code: Scalars['String']['output'];
  /** The description of the pickup option. */
  description?: Maybe<Scalars['String']['output']>;
  /** The ID of the pickup location. */
  locationId: Scalars['ID']['output'];
  /** Whether a phone number is required for the pickup option. */
  phoneRequired: Scalars['Boolean']['output'];
  /** The pickup address where the customer will pickup the merchandise. */
  pickupAddress: PickupAddress;
  /**
   * The estimated amount of time it takes for the pickup to be ready. For example, "Usually ready in 24 hours".
   *
   */
  pickupTime: Scalars['String']['output'];
  /** The presentment title of the pickup option. */
  presentmentTitle?: Maybe<Scalars['String']['output']>;
  /** The price of the pickup option. */
  price: MoneyV2;
  /** The title of the pickup option. */
  title: Scalars['String']['output'];
};

/** Represents the breakdown of prices to be charges in the billing attempt. */
export type SubscriptionPriceBreakdown = {
  __typename?: 'SubscriptionPriceBreakdown';
  /**
   * The sum of the prices for all line items after discounts.
   * If taxesIncluded is true, then the subtotal also includes tax.
   *
   */
  subtotalPrice: MoneyV2;
  /** Whether taxes are included in the subtotal price. */
  taxesIncluded: Scalars['Boolean']['output'];
  /**
   * The total amount discounted.
   * This includes both order and line level discounts.
   *
   */
  totalDiscounts: MoneyV2;
  /** The total price. This includes taxes and discounts. */
  totalPrice: MoneyV2;
  /** The total shipping amount before discounts and returns. */
  totalShippingPrice: MoneyV2;
  /** The total tax amount. */
  totalTax: MoneyV2;
};

/** A shipping option to deliver a subscription contract. */
export type SubscriptionShippingOption = {
  __typename?: 'SubscriptionShippingOption';
  /** The code of the shipping option. */
  code: Scalars['String']['output'];
  /** The description of the shipping option. */
  description?: Maybe<Scalars['String']['output']>;
  /** Whether a phone number is required for the shipping option. */
  phoneRequired: Scalars['Boolean']['output'];
  /** The presentment title of the shipping option. */
  presentmentTitle?: Maybe<Scalars['String']['output']>;
  /** The price of the shipping option. */
  price: MoneyV2;
  /** The title of the shipping option. */
  title: Scalars['String']['output'];
};

/** The available tax exemptions for a customer. */
export type TaxExemption =
  /** This customer is exempt from GST taxes for holding a valid exemption. The business customer should provide their GST number and account for the GST. */
  | 'AUSTRALIA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid COMMERCIAL_FISHERY_EXEMPTION in British Columbia. */
  | 'CA_BC_COMMERCIAL_FISHERY_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid CONTRACTOR_EXEMPTION in British Columbia. */
  | 'CA_BC_CONTRACTOR_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid PRODUCTION_AND_MACHINERY_EXEMPTION in British Columbia. */
  | 'CA_BC_PRODUCTION_AND_MACHINERY_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in British Columbia. */
  | 'CA_BC_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid SUB_CONTRACTOR_EXEMPTION in British Columbia. */
  | 'CA_BC_SUB_CONTRACTOR_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid DIPLOMAT_EXEMPTION in Canada. */
  | 'CA_DIPLOMAT_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid COMMERCIAL_FISHERY_EXEMPTION in Manitoba. */
  | 'CA_MB_COMMERCIAL_FISHERY_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid FARMER_EXEMPTION in Manitoba. */
  | 'CA_MB_FARMER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Manitoba. */
  | 'CA_MB_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid COMMERCIAL_FISHERY_EXEMPTION in Nova Scotia. */
  | 'CA_NS_COMMERCIAL_FISHERY_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid FARMER_EXEMPTION in Nova Scotia. */
  | 'CA_NS_FARMER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid PURCHASE_EXEMPTION in Ontario. */
  | 'CA_ON_PURCHASE_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid COMMERCIAL_FISHERY_EXEMPTION in Prince Edward Island. */
  | 'CA_PE_COMMERCIAL_FISHERY_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid COMMERCIAL_FISHERY_EXEMPTION in Saskatchewan. */
  | 'CA_SK_COMMERCIAL_FISHERY_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid CONTRACTOR_EXEMPTION in Saskatchewan. */
  | 'CA_SK_CONTRACTOR_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid FARMER_EXEMPTION in Saskatchewan. */
  | 'CA_SK_FARMER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid PRODUCTION_AND_MACHINERY_EXEMPTION in Saskatchewan. */
  | 'CA_SK_PRODUCTION_AND_MACHINERY_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Saskatchewan. */
  | 'CA_SK_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid SUB_CONTRACTOR_EXEMPTION in Saskatchewan. */
  | 'CA_SK_SUB_CONTRACTOR_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid STATUS_CARD_EXEMPTION in Canada. */
  | 'CA_STATUS_CARD_EXEMPTION'
  /** This customer is exempt from VAT for purchases within the EU that is shipping from outside of customer's country. */
  | 'EU_REVERSE_CHARGE_EXEMPTION_RULE'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Alaska. */
  | 'US_AK_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Alabama. */
  | 'US_AL_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Arkansas. */
  | 'US_AR_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Arizona. */
  | 'US_AZ_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in California. */
  | 'US_CA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Colorado. */
  | 'US_CO_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Connecticut. */
  | 'US_CT_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Washington DC. */
  | 'US_DC_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Delaware. */
  | 'US_DE_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Florida. */
  | 'US_FL_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Georgia. */
  | 'US_GA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Hawaii. */
  | 'US_HI_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Iowa. */
  | 'US_IA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Idaho. */
  | 'US_ID_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Illinois. */
  | 'US_IL_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Indiana. */
  | 'US_IN_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Kansas. */
  | 'US_KS_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Kentucky. */
  | 'US_KY_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Louisiana. */
  | 'US_LA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Massachusetts. */
  | 'US_MA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Maryland. */
  | 'US_MD_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Maine. */
  | 'US_ME_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Michigan. */
  | 'US_MI_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Minnesota. */
  | 'US_MN_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Missouri. */
  | 'US_MO_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Mississippi. */
  | 'US_MS_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Montana. */
  | 'US_MT_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in North Carolina. */
  | 'US_NC_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in North Dakota. */
  | 'US_ND_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Nebraska. */
  | 'US_NE_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in New Hampshire. */
  | 'US_NH_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in New Jersey. */
  | 'US_NJ_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in New Mexico. */
  | 'US_NM_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Nevada. */
  | 'US_NV_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in New York. */
  | 'US_NY_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Ohio. */
  | 'US_OH_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Oklahoma. */
  | 'US_OK_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Oregon. */
  | 'US_OR_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Pennsylvania. */
  | 'US_PA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Rhode Island. */
  | 'US_RI_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in South Carolina. */
  | 'US_SC_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in South Dakota. */
  | 'US_SD_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Tennessee. */
  | 'US_TN_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Texas. */
  | 'US_TX_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Utah. */
  | 'US_UT_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Virginia. */
  | 'US_VA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Vermont. */
  | 'US_VT_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Washington. */
  | 'US_WA_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Wisconsin. */
  | 'US_WI_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in West Virginia. */
  | 'US_WV_RESELLER_EXEMPTION'
  /** This customer is exempt from specific taxes for holding a valid RESELLER_EXEMPTION in Wyoming. */
  | 'US_WY_RESELLER_EXEMPTION';

/** The detailed information about tax exemptions that can be applied to customers. */
export type TaxExemptionDetails = {
  __typename?: 'TaxExemptionDetails';
  /** Whether the tax exemption can be applied on tax lines. */
  applicable: Scalars['Boolean']['output'];
  /** An identifier that groups exemptions. */
  exemptionGroup: Scalars['String']['output'];
  /** The translated display name of the tax exemption group. */
  exemptionGroupName: Scalars['String']['output'];
  /** The translated display name of the tax exemption when grouped. */
  groupedName: Scalars['String']['output'];
  /** The translated display name of the tax exemption. */
  name: Scalars['String']['output'];
  /** The code of the tax region this exemption applies to. If null, it applies in all regions. */
  taxRegionCode?: Maybe<TaxRegionCode>;
  /** The unique type of the exemption. */
  type: TaxExemption;
};

/** The details about a single tax applied to the associated line item. */
export type TaxLine = Node & {
  __typename?: 'TaxLine';
  /** Whether the channel that submitted the tax line is responsible for remitting it. */
  channelLiable: Scalars['Boolean']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The tax amount in shop and presentment currencies, calculated after discounts and before returns. */
  priceSet: MoneyV2;
  /** The proportion of the line item price represented by the tax, expressed as a decimal. */
  rate?: Maybe<Scalars['Float']['output']>;
  /** The proportion of the line item price represented by the tax, expressed as a percentage. */
  ratePercentage?: Maybe<Scalars['Float']['output']>;
  /** The origin of the tax. */
  source?: Maybe<Scalars['String']['output']>;
  /** The name of the applied tax. */
  title: Scalars['String']['output'];
};

/** The ISO 3166-1 alpha-2 codes that distinguish a region where common tax rules apply. */
export type TaxRegionCode =
  /** Ascension Island. */
  | 'AC'
  /** Andorra. */
  | 'AD'
  /** United Arab Emirates. */
  | 'AE'
  /** Afghanistan. */
  | 'AF'
  /** Antigua & Barbuda. */
  | 'AG'
  /** Anguilla. */
  | 'AI'
  /** Albania. */
  | 'AL'
  /** Armenia. */
  | 'AM'
  /** Netherlands Antilles. */
  | 'AN'
  /** Angola. */
  | 'AO'
  /** Argentina. */
  | 'AR'
  /** Austria. */
  | 'AT'
  /** Australia. */
  | 'AU'
  /** Aruba. */
  | 'AW'
  /** Åland Islands. */
  | 'AX'
  /** Azerbaijan. */
  | 'AZ'
  /** Bosnia & Herzegovina. */
  | 'BA'
  /** Barbados. */
  | 'BB'
  /** Bangladesh. */
  | 'BD'
  /** Belgium. */
  | 'BE'
  /** Burkina Faso. */
  | 'BF'
  /** Bulgaria. */
  | 'BG'
  /** Bahrain. */
  | 'BH'
  /** Burundi. */
  | 'BI'
  /** Benin. */
  | 'BJ'
  /** St. Barthélemy. */
  | 'BL'
  /** Bermuda. */
  | 'BM'
  /** Brunei. */
  | 'BN'
  /** Bolivia. */
  | 'BO'
  /** Caribbean Netherlands. */
  | 'BQ'
  /** Brazil. */
  | 'BR'
  /** Bahamas. */
  | 'BS'
  /** Bhutan. */
  | 'BT'
  /** Bouvet Island. */
  | 'BV'
  /** Botswana. */
  | 'BW'
  /** Belarus. */
  | 'BY'
  /** Belize. */
  | 'BZ'
  /** Canada. */
  | 'CA'
  /** Cocos (Keeling) Islands. */
  | 'CC'
  /** Congo - Kinshasa. */
  | 'CD'
  /** Central African Republic. */
  | 'CF'
  /** Congo - Brazzaville. */
  | 'CG'
  /** Switzerland. */
  | 'CH'
  /** Côte d’Ivoire. */
  | 'CI'
  /** Cook Islands. */
  | 'CK'
  /** Chile. */
  | 'CL'
  /** Cameroon. */
  | 'CM'
  /** China. */
  | 'CN'
  /** Colombia. */
  | 'CO'
  /** Costa Rica. */
  | 'CR'
  /** Cuba. */
  | 'CU'
  /** Cape Verde. */
  | 'CV'
  /** Curaçao. */
  | 'CW'
  /** Christmas Island. */
  | 'CX'
  /** Cyprus. */
  | 'CY'
  /** Czechia. */
  | 'CZ'
  /** Germany. */
  | 'DE'
  /** Djibouti. */
  | 'DJ'
  /** Denmark. */
  | 'DK'
  /** Dominica. */
  | 'DM'
  /** Dominican Republic. */
  | 'DO'
  /** Algeria. */
  | 'DZ'
  /** Ecuador. */
  | 'EC'
  /** Estonia. */
  | 'EE'
  /** Egypt. */
  | 'EG'
  /** Western Sahara. */
  | 'EH'
  /** Eritrea. */
  | 'ER'
  /** Spain. */
  | 'ES'
  /** Ethiopia. */
  | 'ET'
  /** European Union. */
  | 'EU'
  /** Finland. */
  | 'FI'
  /** Fiji. */
  | 'FJ'
  /** Falkland Islands. */
  | 'FK'
  /** Faroe Islands. */
  | 'FO'
  /** France. */
  | 'FR'
  /** Gabon. */
  | 'GA'
  /** United Kingdom. */
  | 'GB'
  /** Grenada. */
  | 'GD'
  /** Georgia. */
  | 'GE'
  /** French Guiana. */
  | 'GF'
  /** Guernsey. */
  | 'GG'
  /** Ghana. */
  | 'GH'
  /** Gibraltar. */
  | 'GI'
  /** Greenland. */
  | 'GL'
  /** Gambia. */
  | 'GM'
  /** Guinea. */
  | 'GN'
  /** Guadeloupe. */
  | 'GP'
  /** Equatorial Guinea. */
  | 'GQ'
  /** Greece. */
  | 'GR'
  /** South Georgia & South Sandwich Islands. */
  | 'GS'
  /** Guatemala. */
  | 'GT'
  /** Guinea-Bissau. */
  | 'GW'
  /** Guyana. */
  | 'GY'
  /** Hong Kong SAR. */
  | 'HK'
  /** Heard & McDonald Islands. */
  | 'HM'
  /** Honduras. */
  | 'HN'
  /** Croatia. */
  | 'HR'
  /** Haiti. */
  | 'HT'
  /** Hungary. */
  | 'HU'
  /** Indonesia. */
  | 'ID'
  /** Ireland. */
  | 'IE'
  /** Israel. */
  | 'IL'
  /** Isle of Man. */
  | 'IM'
  /** India. */
  | 'IN'
  /** British Indian Ocean Territory. */
  | 'IO'
  /** Iraq. */
  | 'IQ'
  /** Iran. */
  | 'IR'
  /** Iceland. */
  | 'IS'
  /** Italy. */
  | 'IT'
  /** Jersey. */
  | 'JE'
  /** Jamaica. */
  | 'JM'
  /** Jordan. */
  | 'JO'
  /** Japan. */
  | 'JP'
  /** Kenya. */
  | 'KE'
  /** Kyrgyzstan. */
  | 'KG'
  /** Cambodia. */
  | 'KH'
  /** Kiribati. */
  | 'KI'
  /** Comoros. */
  | 'KM'
  /** St. Kitts & Nevis. */
  | 'KN'
  /** North Korea. */
  | 'KP'
  /** South Korea. */
  | 'KR'
  /** Kuwait. */
  | 'KW'
  /** Cayman Islands. */
  | 'KY'
  /** Kazakhstan. */
  | 'KZ'
  /** Laos. */
  | 'LA'
  /** Lebanon. */
  | 'LB'
  /** St. Lucia. */
  | 'LC'
  /** Liechtenstein. */
  | 'LI'
  /** Sri Lanka. */
  | 'LK'
  /** Liberia. */
  | 'LR'
  /** Lesotho. */
  | 'LS'
  /** Lithuania. */
  | 'LT'
  /** Luxembourg. */
  | 'LU'
  /** Latvia. */
  | 'LV'
  /** Libya. */
  | 'LY'
  /** Morocco. */
  | 'MA'
  /** Monaco. */
  | 'MC'
  /** Moldova. */
  | 'MD'
  /** Montenegro. */
  | 'ME'
  /** St. Martin. */
  | 'MF'
  /** Madagascar. */
  | 'MG'
  /** North Macedonia. */
  | 'MK'
  /** Mali. */
  | 'ML'
  /** Myanmar (Burma). */
  | 'MM'
  /** Mongolia. */
  | 'MN'
  /** Macao SAR. */
  | 'MO'
  /** Martinique. */
  | 'MQ'
  /** Mauritania. */
  | 'MR'
  /** Montserrat. */
  | 'MS'
  /** Malta. */
  | 'MT'
  /** Mauritius. */
  | 'MU'
  /** Maldives. */
  | 'MV'
  /** Malawi. */
  | 'MW'
  /** Mexico. */
  | 'MX'
  /** Malaysia. */
  | 'MY'
  /** Mozambique. */
  | 'MZ'
  /** Namibia. */
  | 'NA'
  /** New Caledonia. */
  | 'NC'
  /** Niger. */
  | 'NE'
  /** Norfolk Island. */
  | 'NF'
  /** Nigeria. */
  | 'NG'
  /** Nicaragua. */
  | 'NI'
  /** Netherlands. */
  | 'NL'
  /** Norway. */
  | 'NO'
  /** Nepal. */
  | 'NP'
  /** Nauru. */
  | 'NR'
  /** Niue. */
  | 'NU'
  /** New Zealand. */
  | 'NZ'
  /** Oman. */
  | 'OM'
  /** Panama. */
  | 'PA'
  /** Peru. */
  | 'PE'
  /** French Polynesia. */
  | 'PF'
  /** Papua New Guinea. */
  | 'PG'
  /** Philippines. */
  | 'PH'
  /** Pakistan. */
  | 'PK'
  /** Poland. */
  | 'PL'
  /** St. Pierre & Miquelon. */
  | 'PM'
  /** Pitcairn Islands. */
  | 'PN'
  /** Palestinian Territories. */
  | 'PS'
  /** Portugal. */
  | 'PT'
  /** Paraguay. */
  | 'PY'
  /** Qatar. */
  | 'QA'
  /** Réunion. */
  | 'RE'
  /** Romania. */
  | 'RO'
  /** Serbia. */
  | 'RS'
  /** Russia. */
  | 'RU'
  /** Rwanda. */
  | 'RW'
  /** Saudi Arabia. */
  | 'SA'
  /** Solomon Islands. */
  | 'SB'
  /** Seychelles. */
  | 'SC'
  /** Sudan. */
  | 'SD'
  /** Sweden. */
  | 'SE'
  /** Singapore. */
  | 'SG'
  /** St. Helena. */
  | 'SH'
  /** Slovenia. */
  | 'SI'
  /** Svalbard & Jan Mayen. */
  | 'SJ'
  /** Slovakia. */
  | 'SK'
  /** Sierra Leone. */
  | 'SL'
  /** San Marino. */
  | 'SM'
  /** Senegal. */
  | 'SN'
  /** Somalia. */
  | 'SO'
  /** Suriname. */
  | 'SR'
  /** South Sudan. */
  | 'SS'
  /** São Tomé & Príncipe. */
  | 'ST'
  /** El Salvador. */
  | 'SV'
  /** Sint Maarten. */
  | 'SX'
  /** Syria. */
  | 'SY'
  /** Eswatini. */
  | 'SZ'
  /** Tristan da Cunha. */
  | 'TA'
  /** Turks & Caicos Islands. */
  | 'TC'
  /** Chad. */
  | 'TD'
  /** French Southern Territories. */
  | 'TF'
  /** Togo. */
  | 'TG'
  /** Thailand. */
  | 'TH'
  /** Tajikistan. */
  | 'TJ'
  /** Tokelau. */
  | 'TK'
  /** Timor-Leste. */
  | 'TL'
  /** Turkmenistan. */
  | 'TM'
  /** Tunisia. */
  | 'TN'
  /** Tonga. */
  | 'TO'
  /** Turkey. */
  | 'TR'
  /** Trinidad & Tobago. */
  | 'TT'
  /** Tuvalu. */
  | 'TV'
  /** Taiwan. */
  | 'TW'
  /** Tanzania. */
  | 'TZ'
  /** Ukraine. */
  | 'UA'
  /** Uganda. */
  | 'UG'
  /** U.S. Outlying Islands. */
  | 'UM'
  /** United States. */
  | 'US'
  /** Uruguay. */
  | 'UY'
  /** Uzbekistan. */
  | 'UZ'
  /** Vatican City. */
  | 'VA'
  /** St. Vincent & Grenadines. */
  | 'VC'
  /** Venezuela. */
  | 'VE'
  /** British Virgin Islands. */
  | 'VG'
  /** Vietnam. */
  | 'VN'
  /** Vanuatu. */
  | 'VU'
  /** Wallis & Futuna. */
  | 'WF'
  /** Samoa. */
  | 'WS'
  /** Kosovo. */
  | 'XK'
  /** Yemen. */
  | 'YE'
  /** Mayotte. */
  | 'YT'
  /** South Africa. */
  | 'ZA'
  /** Zambia. */
  | 'ZM'
  /** Zimbabwe. */
  | 'ZW';

/**
 * The events that chronicle resource activities available to the customer.
 *
 */
export type TimelineEvent = Node & {
  __typename?: 'TimelineEvent';
  /** The date and time when the event occurred. */
  happenedAt: Scalars['DateTime']['output'];
  /** The unique ID for the timeline event. */
  id: Scalars['ID']['output'];
  /** Additional details about the event. */
  message?: Maybe<Scalars['String']['output']>;
  /** The subtitle of the event. */
  subtitle?: Maybe<Scalars['String']['output']>;
  /** The title of the event. */
  title: Scalars['String']['output'];
};

/** A sale that is associated with a tip. */
export type TipSale = Node &
  Sale & {
    __typename?: 'TipSale';
    /** The type of order action represented by the sale. */
    actionType: SaleActionType;
    /** The unique ID of the sale. */
    id: Scalars['ID']['output'];
    /** The line item associated with the sale. */
    lineItem: LineItem;
    /** The type of line associated with the sale. */
    lineType: SaleLineType;
    /** The number of units ordered or intended to be returned. */
    quantity?: Maybe<Scalars['Int']['output']>;
    /** The individual taxes associated with the sale. */
    taxes: Array<SaleTax>;
    /** The total sale amount after taxes and discounts. */
    totalAmount: MoneyV2;
    /** The total amount of discounts allocated to the sale after taxes. */
    totalDiscountAmountAfterTaxes: MoneyV2;
    /** The total discounts allocated to the sale before taxes. */
    totalDiscountAmountBeforeTaxes: MoneyV2;
    /** The total tax amount for the sale. */
    totalTaxAmount: MoneyV2;
  };

/** Represents the tracking information for a fulfillment. */
export type TrackingInformation = {
  __typename?: 'TrackingInformation';
  /** The name of the tracking company. */
  company?: Maybe<Scalars['String']['output']>;
  /** The tracking number for the fulfillment. */
  number?: Maybe<Scalars['String']['output']>;
  /** The URLs to track the fulfillment. */
  url?: Maybe<Scalars['URL']['output']>;
};

/** The details related to the transaction type. */
export type TransactionTypeDetails = {
  __typename?: 'TransactionTypeDetails';
  /** The message of the transaction type. */
  message?: Maybe<Scalars['String']['output']>;
  /** The name of the transaction type. */
  name?: Maybe<Scalars['String']['output']>;
};

/**
 * The custom data attached to a resource. Metafields can be sorted into namespaces and are
 * comprised of keys, values, and value types.
 *
 */
export type UiExtensionMetafield = Node & {
  __typename?: 'UiExtensionMetafield';
  /** The description of a metafield. */
  description?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The key name for a metafield. */
  key: Scalars['String']['output'];
  /** The namespace for a metafield. */
  namespace: Scalars['String']['output'];
  /** The owner ID for a metafield. */
  ownerId: Scalars['ID']['output'];
  /**
   * The type name of the metafield.
   * See the list of [supported types](https://shopify.dev/apps/metafields/definitions/types).
   *
   */
  type: Scalars['String']['output'];
  /** The value of a metafield. */
  value: Scalars['String']['output'];
  /**
   * Represents the metafield value type.
   * @deprecated `valueType` is deprecated and replaced by `type`.
   */
  valueType: MetafieldValueType;
};

/** The input fields for filtering ui extension metafields. */
export type UiExtensionMetafieldFilterInput = {
  /** A metafield key. */
  key: Scalars['String']['input'];
  /** A metafield namespace. */
  namespace: Scalars['String']['input'];
};

/**
 * A session token for a UI extension.
 *
 */
export type UiExtensionSessionToken = {
  __typename?: 'UiExtensionSessionToken';
  /**
   * The second count until the session token expires.
   *
   */
  expiresIn: Scalars['Int']['output'];
  /**
   * The value of the UI extension session token.
   *
   */
  value: Scalars['String']['output'];
};

/**
 * The information about the container for unfulfilled digital line items (excluding gift cards).
 *
 */
export type UnfulfilledDigitalLineItemContainer =
  UnfulfilledLineItemContainerCommonFields & {
    __typename?: 'UnfulfilledDigitalLineItemContainer';
    /** The line items within this container. */
    lineItems: LineItemContainerLineItemConnection;
  };

/**
 * The information about the container for unfulfilled digital line items (excluding gift cards).
 *
 */
export type UnfulfilledDigitalLineItemContainerLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * The information about the container for unfulfilled gift card type line items.
 *
 */
export type UnfulfilledGiftCardLineItemContainer =
  UnfulfilledLineItemContainerCommonFields & {
    __typename?: 'UnfulfilledGiftCardLineItemContainer';
    /** The line items within this container. */
    lineItems: LineItemContainerLineItemConnection;
  };

/**
 * The information about the container for unfulfilled gift card type line items.
 *
 */
export type UnfulfilledGiftCardLineItemContainerLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * The information about the container for unfulfilled line items.
 *
 */
export type UnfulfilledLineItemContainer =
  UnfulfilledLineItemContainerCommonFields & {
    __typename?: 'UnfulfilledLineItemContainer';
    /** The translated state of the line item container (for example, `Unfulfilled`). */
    displayableState: Scalars['String']['output'];
    /** The line items within this container. */
    lineItems: LineItemContainerLineItemConnection;
    /** The state of the line item container (for example, `unfulfilled`). */
    state: Scalars['String']['output'];
  };

/**
 * The information about the container for unfulfilled line items.
 *
 */
export type UnfulfilledLineItemContainerLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The common fields for containers of unfulfilled line items series. */
export type UnfulfilledLineItemContainerCommonFields = {
  /** The line items within this container. */
  lineItems: LineItemContainerLineItemConnection;
};

/** The common fields for containers of unfulfilled line items series. */
export type UnfulfilledLineItemContainerCommonFieldsLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * The information about the container for unfulfilled physical type line items.
 *
 */
export type UnfulfilledPhysicalLineItemContainer =
  UnfulfilledLineItemContainerCommonFields & {
    __typename?: 'UnfulfilledPhysicalLineItemContainer';
    /** The line items within this container. */
    lineItems: LineItemContainerLineItemConnection;
  };

/**
 * The information about the container for unfulfilled physical type line items.
 *
 */
export type UnfulfilledPhysicalLineItemContainerLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * The unit price of the line component. For example, "$9.99 / 100ml".
 *
 */
export type UnitPrice = {
  __typename?: 'UnitPrice';
  /**
   * The unit measurement. For example, "$9.99 / 100ml".
   *
   */
  measurement: UnitPriceMeasurement;
  /**
   * The unit price of the variant. For example, "$1 per xy" where price is "$1".
   *
   */
  price: MoneyV2;
};

/**
 * The unit price measurement of the line component. For example, "$9.99 / 100ml".
 *
 */
export type UnitPriceMeasurement = {
  __typename?: 'UnitPriceMeasurement';
  /**
   * The reference unit for the unit price measurement. For example, "$9.99 / 100ml" where the reference unit is "ml".
   *
   */
  referenceUnit: UnitPriceMeasurementUnit;
  /**
   * The reference value for the unit price measurement. For example, "$9.99 / 100ml" where the reference value is "100".
   *
   */
  referenceValue: Scalars['Int']['output'];
};

/** The valid units of measurement for a unit price measurement. */
export type UnitPriceMeasurementUnit =
  /** 100 centiliters equals 1 liter. */
  | 'CL'
  /** 100 centimeters equals 1 meter. */
  | 'CM'
  /** Metric system unit of weight. */
  | 'G'
  /** 1 kilogram equals 1000 grams. */
  | 'KG'
  /** Metric system unit of volume. */
  | 'L'
  /** Metric system unit of length. */
  | 'M'
  /** Metric system unit of area. */
  | 'M2'
  /** 1 cubic meter equals 1000 liters. */
  | 'M3'
  /** 1000 milligrams equals 1 gram. */
  | 'MG'
  /** 1000 milliliters equals 1 liter. */
  | 'ML'
  /** 1000 millimeters equals 1 meter. */
  | 'MM';

/** This represents new sale types that have been added in future API versions. You may update to a more recent API version to receive additional details about this sale. */
export type UnknownSale = Node &
  Sale & {
    __typename?: 'UnknownSale';
    /** The type of order action represented by the sale. */
    actionType: SaleActionType;
    /** The unique ID of the sale. */
    id: Scalars['ID']['output'];
    /** The line type assocated with the sale. */
    lineType: SaleLineType;
    /** The number of units ordered or intended to be returned. */
    quantity?: Maybe<Scalars['Int']['output']>;
    /** The individual taxes associated with the sale. */
    taxes: Array<SaleTax>;
    /** The total sale amount after taxes and discounts. */
    totalAmount: MoneyV2;
    /** The total amount of discounts allocated to the sale after taxes. */
    totalDiscountAmountAfterTaxes: MoneyV2;
    /** The total discounts allocated to the sale before taxes. */
    totalDiscountAmountBeforeTaxes: MoneyV2;
    /** The total tax amount for the sale. */
    totalTaxAmount: MoneyV2;
  };

/** The error codes that are provided for failed address mutations. */
export type UserErrorsAddressUserErrors = DisplayableError & {
  __typename?: 'UserErrorsAddressUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsAddressUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsAddressUserErrors`. */
export type UserErrorsAddressUserErrorsCode =
  /** The Address1 field is missing. */
  | 'ADDRESS1_MISSING'
  /** The provided address already exists. */
  | 'ADDRESS_ALREADY_EXISTS'
  /** The provided address argument is empty. */
  | 'ADDRESS_ARGUMENT_EMPTY'
  /** The provided address ID doesn't exist. */
  | 'ADDRESS_ID_DOES_NOT_EXIST'
  /** The Country Code field is missing. */
  | 'COUNTRY_CODE_MISSING'
  /** The provided country doesn't exist. */
  | 'COUNTRY_NOT_EXIST'
  /** The default address can't be deleted before setting another one as default. */
  | 'DELETING_DEFAULT_ADDRESS_NOT_ALLOWED'
  /** Demoting the default address isn't allowed. */
  | 'DEMOTING_DEFAULT_ADDRESS_NOT_ALLOWED'
  /** The provided address field isn't valid. */
  | 'INVALID'
  /** The provided value is invalid for the country. */
  | 'INVALID_FOR_COUNTRY'
  /** The provided value is invalid for the country and province. */
  | 'INVALID_FOR_COUNTRY_AND_PROVINCE'
  /** The provided Territory Code isn't valid. */
  | 'INVALID_TERRITORY_CODE'
  /** The provided phone number isn't valid. */
  | 'PHONE_NUMBER_NOT_VALID'
  /** The field is required. */
  | 'REQUIRED'
  /** The Territory Code field is missing. */
  | 'TERRITORY_CODE_MISSING'
  /** The provided address field is too long. */
  | 'TOO_LONG'
  /** The Zone Code field is missing. */
  | 'ZONE_CODE_MISSING';

/** The error codes for failed business contact mutations. */
export type UserErrorsBusinessContactUserErrors = DisplayableError & {
  __typename?: 'UserErrorsBusinessContactUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsBusinessContactUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsBusinessContactUserErrors`. */
export type UserErrorsBusinessContactUserErrorsCode =
  /** Business contact was not found. */
  | 'BUSINESS_CONTACT_NOT_FOUND'
  /** Business contact update input argument is empty. */
  | 'BUSINESS_CONTACT_UPDATE_INPUT_ARGUMENT_EMPTY'
  /** Business contact field is too long. */
  | 'TOO_LONG';

/** The error codes for failed payment instrument mutations. */
export type UserErrorsBusinessLocationPaymentInstrumentUserErrors =
  DisplayableError & {
    __typename?: 'UserErrorsBusinessLocationPaymentInstrumentUserErrors';
    /** The error code. */
    code?: Maybe<UserErrorsBusinessLocationPaymentInstrumentUserErrorsCode>;
    /** The path to the input field that caused the error. */
    field?: Maybe<Array<Scalars['String']['output']>>;
    /** The error message. */
    message: Scalars['String']['output'];
  };

/** Possible error codes that can be returned by `UserErrorsBusinessLocationPaymentInstrumentUserErrors`. */
export type UserErrorsBusinessLocationPaymentInstrumentUserErrorsCode =
  /** Address1 field is missing. */
  | 'ADDRESS1_MISSING'
  /** Address argument is empty. */
  | 'ADDRESS_ARGUMENT_EMPTY'
  /** The card's brand is not supported. */
  | 'BRAND_NOT_SUPPORTED'
  /** Cannot replace a payment instrument with itself. */
  | 'CANNOT_REPLACE_PAYMENT_INSTRUMENT_WITH_ITSELF'
  /** City field is missing. */
  | 'CITY_MISSING'
  /** Company location ID does not exist. */
  | 'COMPANY_LOCATION_ID_DOES_NOT_EXIST'
  /** Country Code field is missing. */
  | 'COUNTRY_CODE_MISSING'
  /** The card was declined. */
  | 'DECLINED'
  /** The card is expired. */
  | 'EXPIRED'
  /** The card's first name is missing. */
  | 'FIRST_NAME_BLANK'
  /** An error occured. */
  | 'GENERIC_ERROR'
  /** The address is incorrect. */
  | 'INCORRECT'
  /** Address field is not valid. */
  | 'INVALID'
  /** Invalid for country. */
  | 'INVALID_FOR_COUNTRY'
  /** Invalid for country and province. */
  | 'INVALID_FOR_COUNTRY_AND_PROVINCE'
  /** Invalid province in country. */
  | 'INVALID_PROVINCE_IN_COUNTRY'
  /** The card's start date or issue number is invalid. */
  | 'INVALID_START_DATE_OR_ISSUE_NUMBER_FOR_DEBIT'
  /** Invalid state in country. */
  | 'INVALID_STATE_IN_COUNTRY'
  /** The card's last name is missing. */
  | 'LAST_NAME_BLANK'
  /** The card's month is invalid. */
  | 'MONTH_INCLUSION'
  /** The card's name is invalid. */
  | 'NAME_INVALID'
  /** The card's number is invalid. */
  | 'NUMBER_INVALID'
  /** The card's number is invalid. */
  | 'NUMBER_INVALID_FORMAT'
  /** Payment instrument ID does not exist. */
  | 'PAYMENT_INSTRUMENT_ID_DOES_NOT_EXIST'
  /** This payment instrument is already on file. */
  | 'PAYMENT_INSTRUMENT_TAKEN'
  /** Phone number is not valid. */
  | 'PHONE_NUMBER_NOT_VALID'
  /** The field is required. */
  | 'REQUIRED'
  /** This test card cannot be used for real transactions. */
  | 'TEST_MODE_LIVE_CARD'
  /** Address field is too long. */
  | 'TOO_LONG'
  /** Too many payment instrument updates. */
  | 'UPDATE_LIMIT_EXCEEDED'
  /** The card's verification value is missing. */
  | 'VERIFICATION_VALUE_BLANK'
  /** The card's verification value is incorrect. */
  | 'VERIFICATION_VALUE_INCORRECT'
  /** The card's verification value is invalid. */
  | 'VERIFICATION_VALUE_INVALID_FOR_CARD_TYPE'
  /** The card's expiry year has passed. */
  | 'YEAR_EXPIRED'
  /** The card's year is invalid. */
  | 'YEAR_INVALID_EXPIRY_YEAR'
  /** The address's zip code is incorrect. */
  | 'ZIP_INCORRECT'
  /** Zone Code field is missing. */
  | 'ZONE_CODE_MISSING';

/** The error codes for failed business location address mutations. */
export type UserErrorsCompanyAddressUserErrors = DisplayableError & {
  __typename?: 'UserErrorsCompanyAddressUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsCompanyAddressUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsCompanyAddressUserErrors`. */
export type UserErrorsCompanyAddressUserErrorsCode =
  /** Address1 field cannot be blank. */
  | 'ADDRESS1_CANNOT_BE_BLANK'
  /** Address1 field is missing. */
  | 'ADDRESS1_MISSING'
  /** Business location billing address doesn't exist. */
  | 'BUSINESS_LOCATION_BILLING_ADDRESS_NOT_FOUND'
  /** Business location doesn't exist. */
  | 'BUSINESS_LOCATION_NOT_FOUND'
  /** Business location shipping address doesn't exist. */
  | 'BUSINESS_LOCATION_SHIPPING_ADDRESS_NOT_FOUND'
  /** Company address create input argument is empty. */
  | 'COMPANY_ADDRESS_CREATE_INPUT_ARGUMENT_EMPTY'
  /** Company address update input argument is empty. */
  | 'COMPANY_ADDRESS_UPDATE_INPUT_ARGUMENT_EMPTY'
  /** Country_code field cannot be blank. */
  | 'COUNTRY_CODE_CANNOT_BE_BLANK'
  /** Country Code field is missing. */
  | 'COUNTRY_CODE_MISSING'
  /** Creating the address failed. */
  | 'FAILED_TO_CREATE'
  /** Deleting the address failed. */
  | 'FAILED_TO_DELETE'
  /** Setting the address failed. */
  | 'FAILED_TO_SET_ADDRESS'
  /** Setting the billing address failed. */
  | 'FAILED_TO_SET_BILLING_ADDRESS'
  /** Setting the shipping address failed. */
  | 'FAILED_TO_SET_SHIPPING_ADDRESS'
  /** Updating the address failed. */
  | 'FAILED_TO_UPDATE'
  /** The input value is invalid. */
  | 'INVALID'
  /** Invalid address field. */
  | 'INVALID_ADDRESS_FIELD'
  /** Invalid address type. */
  | 'INVALID_ADDRESS_TYPE'
  /** Location has already a billing address. */
  | 'LOCATION_HAS_ALREADY_BILLING_ADDRESS'
  /** Location has already a shipping address. */
  | 'LOCATION_HAS_ALREADY_SHIPPING_ADDRESS'
  /** The country does not have zones. */
  | 'NO_ZONE_IN_COUNTRY'
  /** Permission denied. */
  | 'PERMISSION_DENIED'
  /** Phone field cannot be blank. */
  | 'PHONE_CANNOT_BE_BLANK'
  /** Phone number is not valid. */
  | 'PHONE_NUMBER_NOT_VALID'
  /** Recipient and first/last name present at the same time. */
  | 'PRESENT'
  /** The field is required. */
  | 'REQUIRED'
  /** The field value is too long. */
  | 'TOO_LONG'
  /** Unexpected type. */
  | 'UNEXPECTED_TYPE'
  /** Zone_code field cannot be blank. */
  | 'ZONE_CODE_CANNOT_BE_BLANK'
  /** Zone Code field is missing. */
  | 'ZONE_CODE_MISSING';

/** The error codes that are provided for failed address mutations. */
export type UserErrorsCustomerAddressUserErrors = DisplayableError & {
  __typename?: 'UserErrorsCustomerAddressUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsCustomerAddressUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsCustomerAddressUserErrors`. */
export type UserErrorsCustomerAddressUserErrorsCode =
  /** The Address1 field is missing. */
  | 'ADDRESS1_MISSING'
  /** The provided address argument is empty. */
  | 'ADDRESS_ARGUMENT_EMPTY'
  /** The provided address ID doesn't exist. */
  | 'ADDRESS_ID_DOES_NOT_EXIST'
  /** The provided country doesn't exist. */
  | 'COUNTRY_NOT_EXIST'
  /** The provided customer address already exists. */
  | 'CUSTOMER_ADDRESS_ALREADY_EXISTS'
  /** The default address of the customer can't be deleted before setting another one as default. */
  | 'DELETING_CUSTOMER_DEFAULT_ADDRESS_NOT_ALLOWED'
  /** Demoting the default address of the customer isn't allowed. */
  | 'DEMOTING_CUSTOMER_DEFAULT_ADDRESS_NOT_ALLOWED'
  /** The provided address field isn't valid. */
  | 'INVALID'
  /** The provided value is invalid for the country. */
  | 'INVALID_FOR_COUNTRY'
  /** The provided value is invalid for the country and province. */
  | 'INVALID_FOR_COUNTRY_AND_PROVINCE'
  /** The provided Territory Code isn't valid. */
  | 'INVALID_TERRITORY_CODE'
  /** The provided phone number isn't valid. */
  | 'PHONE_NUMBER_NOT_VALID'
  /** The field is required. */
  | 'REQUIRED'
  /** The Territory Code field is missing. */
  | 'TERRITORY_CODE_MISSING'
  /** The provided address field is too long. */
  | 'TOO_LONG'
  /** The Zone Code field is missing. */
  | 'ZONE_CODE_MISSING';

/** Provides error codes for failed marketing opt-in mutations. */
export type UserErrorsCustomerEmailMarketingOptInUserErrors =
  DisplayableError & {
    __typename?: 'UserErrorsCustomerEmailMarketingOptInUserErrors';
    /** The error code. */
    code?: Maybe<UserErrorsCustomerEmailMarketingOptInUserErrorsCode>;
    /** The path to the input field that caused the error. */
    field?: Maybe<Array<Scalars['String']['output']>>;
    /** The error message. */
    message: Scalars['String']['output'];
  };

/** Possible error codes that can be returned by `UserErrorsCustomerEmailMarketingOptInUserErrors`. */
export type UserErrorsCustomerEmailMarketingOptInUserErrorsCode =
  /** The customer is already subscribed. */
  | 'CUSTOMER_ALREADY_SUBSCRIBED'
  /** The customer does not have an email address. */
  | 'EMAIL_ADDRESS_NOT_FOUND'
  /** There was an error. */
  | 'FAILED';

/** Provides error codes for marketing subscribe mutations. */
export type UserErrorsCustomerEmailMarketingUserErrors = DisplayableError & {
  __typename?: 'UserErrorsCustomerEmailMarketingUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsCustomerEmailMarketingUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsCustomerEmailMarketingUserErrors`. */
export type UserErrorsCustomerEmailMarketingUserErrorsCode =
  /** The customer is already subscribed. */
  | 'CUSTOMER_ALREADY_SUBSCRIBED'
  /** The customer does not have an email address. */
  | 'EMAIL_ADDRESS_NOT_FOUND'
  /** Subscription failed. */
  | 'FAILED_TO_SUBSCRIBE'
  /** Unsubscription failed. */
  | 'FAILED_TO_UNSUBSCRIBE';

/** Provides error codes for failed personal information mutations. */
export type UserErrorsCustomerUserErrors = DisplayableError & {
  __typename?: 'UserErrorsCustomerUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsCustomerUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsCustomerUserErrors`. */
export type UserErrorsCustomerUserErrorsCode =
  /** The customer does not exist. */
  | 'CUSTOMER_DOES_NOT_EXIST'
  /** The personal information input argument is empty. */
  | 'CUSTOMER_INPUT_ARGUMENT_EMPTY'
  /** The personal information field is not valid. */
  | 'INVALID'
  /** The personal information field is too long. */
  | 'TOO_LONG';

/** The error codes for failed payment instrument mutations. */
export type UserErrorsPaymentInstrumentUserErrors = DisplayableError & {
  __typename?: 'UserErrorsPaymentInstrumentUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsPaymentInstrumentUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsPaymentInstrumentUserErrors`. */
export type UserErrorsPaymentInstrumentUserErrorsCode =
  /** Address1 field is missing. */
  | 'ADDRESS1_MISSING'
  /** Address argument is empty. */
  | 'ADDRESS_ARGUMENT_EMPTY'
  /** The card's brand is not supported. */
  | 'BRAND_NOT_SUPPORTED'
  /** Cannot find Shop Pay order for redirection. */
  | 'CANNOT_REDIRECT_TO_SHOP_PAY'
  /** Cannot replace a payment instrument with itself. */
  | 'CANNOT_REPLACE_PAYMENT_INSTRUMENT_WITH_ITSELF'
  /** City field is missing. */
  | 'CITY_MISSING'
  /** Country Code field is missing. */
  | 'COUNTRY_CODE_MISSING'
  /** The card was declined. */
  | 'DECLINED'
  /** The card is expired. */
  | 'EXPIRED'
  /** The card's first name is missing. */
  | 'FIRST_NAME_BLANK'
  /** An error occured. */
  | 'GENERIC_ERROR'
  /** The address is incorrect. */
  | 'INCORRECT'
  /** Address field is not valid. */
  | 'INVALID'
  /** Invalid for country. */
  | 'INVALID_FOR_COUNTRY'
  /** Invalid for country and province. */
  | 'INVALID_FOR_COUNTRY_AND_PROVINCE'
  /** Invalid province in country. */
  | 'INVALID_PROVINCE_IN_COUNTRY'
  /** The card's start date or issue number is invalid. */
  | 'INVALID_START_DATE_OR_ISSUE_NUMBER_FOR_DEBIT'
  /** Invalid state in country. */
  | 'INVALID_STATE_IN_COUNTRY'
  /** The card's last name is missing. */
  | 'LAST_NAME_BLANK'
  /** The card's month is invalid. */
  | 'MONTH_INCLUSION'
  /** The card's name is invalid. */
  | 'NAME_INVALID'
  /** The card's number is invalid. */
  | 'NUMBER_INVALID'
  /** The card's number is invalid. */
  | 'NUMBER_INVALID_FORMAT'
  /** Payment instrument ID does not exist. */
  | 'PAYMENT_INSTRUMENT_ID_DOES_NOT_EXIST'
  /** This payment instrument is already on file. */
  | 'PAYMENT_INSTRUMENT_TAKEN'
  /** Phone number is not valid. */
  | 'PHONE_NUMBER_NOT_VALID'
  /** The field is required. */
  | 'REQUIRED'
  /** This test card cannot be used for real transactions. */
  | 'TEST_MODE_LIVE_CARD'
  /** Address field is too long. */
  | 'TOO_LONG'
  /** Payment instrument type is not supported for this operation. */
  | 'UNSUPPORTED_PAYMENT_INSTRUMENT_TYPE'
  /** Too many payment instrument updates. */
  | 'UPDATE_LIMIT_EXCEEDED'
  /** The card's verification value is missing. */
  | 'VERIFICATION_VALUE_BLANK'
  /** The card's verification value is incorrect. */
  | 'VERIFICATION_VALUE_INCORRECT'
  /** The card's verification value is invalid. */
  | 'VERIFICATION_VALUE_INVALID_FOR_CARD_TYPE'
  /** The card's expiry year has passed. */
  | 'YEAR_EXPIRED'
  /** The card's year is invalid. */
  | 'YEAR_INVALID_EXPIRY_YEAR'
  /** The address's zip code is incorrect. */
  | 'ZIP_INCORRECT'
  /** Zone Code field is missing. */
  | 'ZONE_CODE_MISSING';

/** The error codes for failed PayPal token mutations. */
export type UserErrorsPaypalTokenUserErrors = DisplayableError & {
  __typename?: 'UserErrorsPaypalTokenUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsPaypalTokenUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsPaypalTokenUserErrors`. */
export type UserErrorsPaypalTokenUserErrorsCode =
  /** PayPal Express gateway is not enabled. */
  | 'PAYPAL_EXPRESS_GATEWAY_NOT_ENABLED'
  /** PayPal account does not support reference transactions. */
  | 'REFERENCE_TRANSACTIONS_NOT_ENABLED'
  /** PayPal Express token could not be created. */
  | 'TOKEN_COULD_NOT_BE_CREATED';

/** Provides error codes for failed personal information mutations. */
export type UserErrorsPersonalInformationUserErrors = DisplayableError & {
  __typename?: 'UserErrorsPersonalInformationUserErrors';
  /** The error code. */
  code?: Maybe<UserErrorsPersonalInformationUserErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsPersonalInformationUserErrors`. */
export type UserErrorsPersonalInformationUserErrorsCode =
  /** The customer does not exist. */
  | 'CUSTOMER_DOES_NOT_EXIST'
  /** The personal information field is not valid. */
  | 'INVALID'
  /** The personal information input argument is empty. */
  | 'PERSONAL_INFORMATION_INPUT_ARGUMENT_EMPTY'
  /** The personal information field is too long. */
  | 'TOO_LONG';

/** The error codes for failed resending gift card mutations. */
export type UserErrorsResendGiftCardErrors = DisplayableError & {
  __typename?: 'UserErrorsResendGiftCardErrors';
  /** The error code. */
  code?: Maybe<UserErrorsResendGiftCardErrorsCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `UserErrorsResendGiftCardErrors`. */
export type UserErrorsResendGiftCardErrorsCode =
  /** No gift card is associated with the order. */
  | 'GIFT_CARD_NOT_FOUND_FOR_ORDER'
  /** This order does not exist. */
  | 'ORDER_NOT_FOUND';

/** The configuration used for Payment Wallets. */
export type WalletPaymentConfig = ApplePayWalletConfig | GooglePayWalletConfig;

/** A weight, which includes a numeric value and a unit of measurement. */
export type Weight = {
  __typename?: 'Weight';
  /** The unit of measurement for `value`. */
  unit: WeightUnit;
  /** The weight value using the unit system specified with `unit`. */
  value: Scalars['Float']['output'];
};

/** Units of measurement for weight. */
export type WeightUnit =
  /** Metric system unit of mass. */
  | 'GRAMS'
  /** 1 kilogram equals 1000 grams. */
  | 'KILOGRAMS'
  /** Imperial system unit of mass. */
  | 'OUNCES'
  /** 1 pound equals 16 ounces. */
  | 'POUNDS';
