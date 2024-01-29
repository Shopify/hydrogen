import type {
  ClientReturn,
  ClientVariablesInRestParams,
} from '@shopify/hydrogen-codegen';

import type {CrossRuntimeRequest} from '../utils/request';

import type {HydrogenSession} from '../hydrogen';

// Return type of unauthorizedHandler = Return type of loader/action function
// This type is not exported https://github.com/remix-run/react-router/blob/main/packages/router/utils.ts#L167
type DataFunctionValue = Response | NonNullable<unknown> | null;

type CustomerAPIResponse<ReturnType> = {
  data: ReturnType;
  errors: Array<{
    message: string;
    locations?: Array<{line: number; column: number}>;
    path?: Array<string>;
    extensions: {code: string};
  }>;
  extensions: {
    cost: {
      requestQueryCost: number;
      actualQueryCakes: number;
      throttleStatus: {
        maximumAvailable: number;
        currentAvailable: number;
        restoreRate: number;
      };
    };
  };
};

export interface CustomerAccountQueries {
  // Example of how a generated query type looks like:
  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};
}

export interface CustomerAccountMutations {
  // Example of how a generated mutation type looks like:
  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};
}

export type CustomerClient = {
  /** Start the OAuth login flow. This function should be called and returned from a Remix action. It redirects the customer to a Shopify login domain. It also defined the final path the customer lands on at the end of the oAuth flow with the value of the `return_to` query param. (This is automatically setup unless `customAuthStatusHandler` option is in use) */
  login: () => Promise<Response>;
  /** On successful login, the customer redirects back to your app. This function validates the OAuth response and exchanges the authorization code for an access token and refresh token. It also persists the tokens on your session. This function should be called and returned from the Remix loader configured as the redirect URI within the Customer Account API settings in admin. */
  authorize: () => Promise<Response>;
  /** Returns if the customer is logged in. It also checks if the access token is expired and refreshes it if needed. */
  isLoggedIn: () => Promise<boolean>;
  /** Check for a not logged in customer and redirect customer to login page. The redirect can be overwritten with `customAuthStatusHandler` option. */
  handleAuthStatus: () => void | DataFunctionValue;
  /** Returns CustomerAccessToken if the customer is logged in. It also run a expiry check and does a token refresh if needed. */
  getAccessToken: () => Promise<string | undefined>;
  /** Creates the fully-qualified URL to your store's GraphQL endpoint.*/
  getApiUrl: () => string;
  /** Logout the customer by clearing the session and redirecting to the login domain. It should be called and returned from a Remix action. The path app should redirect to after logout can be setup in Customer Account API settings in admin.*/
  logout: () => Promise<Response>;
  /** Execute a GraphQL query against the Customer Account API. This method execute `handleAuthStatus()` ahead of query. */
  query: <
    OverrideReturnType extends any = never,
    RawGqlString extends string = string,
  >(
    query: RawGqlString,
    ...options: ClientVariablesInRestParams<
      CustomerAccountQueries,
      RawGqlString
    >
  ) => Promise<
    CustomerAPIResponse<
      ClientReturn<CustomerAccountQueries, RawGqlString, OverrideReturnType>
    >
  >;
  /** Execute a GraphQL mutation against the Customer Account API. This method execute `handleAuthStatus()` ahead of mutation. */
  mutate: <
    OverrideReturnType extends any = never,
    RawGqlString extends string = string,
  >(
    mutation: RawGqlString,
    ...options: ClientVariablesInRestParams<
      CustomerAccountMutations,
      RawGqlString
    >
  ) => Promise<
    CustomerAPIResponse<
      ClientReturn<CustomerAccountMutations, RawGqlString, OverrideReturnType>
    >
  >;
};

export type CustomerClientOptions = {
  /** The client requires a session to persist the auth and refresh token. By default Hydrogen ships with cookie session storage, but you can use [another session storage](https://remix.run/docs/en/main/utils/sessions) implementation.  */
  session: HydrogenSession;
  /** Unique UUID prefixed with `shp_` associated with the application, this should be visible in the customer account api settings in the Hydrogen admin channel. Mock.shop doesn't automatically supply customerAccountId. Use `h2 env pull` to link your store credentials. */
  customerAccountId: string;
  /** The account URL associated with the application, this should be visible in the customer account api settings in the Hydrogen admin channel. Mock.shop doesn't automatically supply customerAccountUrl. Use `h2 env pull` to link your store credentials. */
  customerAccountUrl: string;
  /** Override the version of the API */
  customerApiVersion?: string;
  /** The object for the current Request. It should be provided by your platform. */
  request: CrossRuntimeRequest;
  /** The waitUntil function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil?: ExecutionContext['waitUntil'];
  /** This is the route in your app that authorizes the customer after logging in. Make sure to call `customer.authorize()` within the loader on this route. It defaults to `/account/authorize`. */
  authUrl?: string;
  /** Use this method to overwrite the default logged-out redirect behavior. The default handler [throws a redirect](https://remix.run/docs/en/main/utils/redirect#:~:text=!session) to `/account/login` with current path as `return_to` query param. */
  customAuthStatusHandler?: () => DataFunctionValue;
};

/** Below are types meant for documentation only. Ensure it stay in sync with the type above. */

export type CustomerClientForDocs = {
  /** Start the OAuth login flow. This function should be called and returned from a Remix action. It redirects the customer to a Shopify login domain. It also defined the final path the customer lands on at the end of the oAuth flow with the value of the `return_to` query param. (This is automatically setup unless `customAuthStatusHandler` option is in use) */
  login?: () => Promise<Response>;
  /** On successful login, the customer redirects back to your app. This function validates the OAuth response and exchanges the authorization code for an access token and refresh token. It also persists the tokens on your session. This function should be called and returned from the Remix loader configured as the redirect URI within the Customer Account API settings in admin. */
  authorize?: () => Promise<Response>;
  /** Returns if the customer is logged in. It also checks if the access token is expired and refreshes it if needed. */
  isLoggedIn?: () => Promise<boolean>;
  /** Check for a not logged in customer and redirect customer to login page. The redirect can be overwritten with `customAuthStatusHandler` option. */
  handleAuthStatus?: () => void | DataFunctionValue;
  /** Returns CustomerAccessToken if the customer is logged in. It also run a expiry check and does a token refresh if needed. */
  getAccessToken?: () => Promise<string | undefined>;
  /** Creates the fully-qualified URL to your store's GraphQL endpoint.*/
  getApiUrl: () => string;
  /** Logout the customer by clearing the session and redirecting to the login domain. It should be called and returned from a Remix action. The path app should redirect to after logout can be setup in Customer Account API settings in admin.*/
  logout?: () => Promise<Response>;
  /** Execute a GraphQL query against the Customer Account API. This method execute `handleAuthStatus()` ahead of query. */
  query?: <TData = any>(
    query: string,
    options: CustomerClientQueryOptionsForDocs,
  ) => Promise<TData>;
  /** Execute a GraphQL mutation against the Customer Account API. This method execute `handleAuthStatus()` ahead of mutation. */
  mutate?: <TData = any>(
    mutation: string,
    options: CustomerClientQueryOptionsForDocs,
  ) => Promise<TData>;
};

export type CustomerClientQueryOptionsForDocs = {
  /** The variables for the GraphQL statement. */
  variables?: Record<string, unknown>;
};
