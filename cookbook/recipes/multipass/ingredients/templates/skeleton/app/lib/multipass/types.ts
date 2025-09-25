/*
  multipass and multipassify types
*/
export interface MultipassResponse {
  /* the multipass-authenticated targetUrl */
  url: string | null;
  /* the multipass-authenticated token */
  token: string | null;
  /* Errors that occurred while authenticating via multipass. Includes any errors return from /multipass api route */
  error?: string | null;
}

export interface MultipassCustomer {
  /* The customer email of the customer used during authentication */
  email: string;
  /* The `targetUrl` passed in for authentication */
  return_to: string;
  /* additional customer properties such as `acceptsMarketing`, addresses etc. */
  [key: string]: string | boolean | object | object[];
}

export interface MultipassCustomerData {
  customer?: MultipassCustomer;
}

export interface NotAuthResponseType {
  url: string | null;
  error: string | null;
}

export type MultipassOptions = {
  redirect: boolean;
  return_to: string;
};

/*
  api handlers
*/
export interface QueryError {
  message: string;
  code: string;
  field: string;
}

export interface CustomerInfoType {
  email: string;
  return_to: string;
  [key: string]: string | boolean | object | object[];
}

export type MultipassRequestBody = MultipassOptions;

export interface CustomerDataResponseType {
  data: MultipassRequestBody;
  errors: string | null;
}

export interface NotLoggedInResponseType {
  url: string | null;
  error: string | null;
}

export interface MultipassTokenResponseType {
  data: {
    url: string;
    token: string;
  };
  error: string | null;
}
