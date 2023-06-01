import type {
  CustomerCreatePayload,
  CustomerRecoverPayload,
  CustomerResetPayload,
  CustomerUserError,
  CustomerUpdatePayload,
  CustomerResetInput,
  CustomerCreateInput,
  Customer as CustomerType,
  CustomerAccessTokenCreatePayload,
  MutationCustomerRecoverArgs,
  CustomerUpdateInput,
  CustomerAccessTokenCreateInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import {createStorefrontClient} from '../storefront';

const debug =
  (prefix: string) =>
  (...args: Parameters<Console['log']>) =>
    console.log(`[H2:${prefix}]`, ...args);

const log = debug('customer');

type Storefront = ReturnType<typeof createStorefrontClient>['storefront'];

interface CustomerOptions {
  customerFragment?: string;
}

interface TokenStorage {
  get(key: string): string | null;
  set(key: string, value: string | null): void;
  remove(key: string): void;
  commit(): Promise<string>;
}

interface Result {
  token?: string;
  customer?: CustomerType | null;
  errors: CustomerUserError[];
}

interface OperationOptions {
  customerFragment?: string;
}

export class CustomerContext {
  private customerFragment: string;
  public headers = new Headers();

  constructor(
    private storefront: Storefront,
    private storage: TokenStorage,
    options: CustomerOptions,
  ) {
    log('Creating customer client');
    this.customerFragment = options.customerFragment || customerFragment;
  }

  get token() {
    const token = this.storage.get('token');
    log('Getting token', token);

    return token;
  }

  set token(token: string | null) {
    log('Setting token', token);
    if (token === null) {
      this.storage.remove('token');
      return;
    }

    this.storage.set('token', token);
  }

  get isAuthenticated() {
    log('isAuthenticated()', this.token);

    return Boolean(this.token);
  }

  async get(options: OperationOptions = {}) {
    log('Getting customer');

    if (!this.isAuthenticated) {
      return null;
    }

    const {customer} = await this.storefront.query<{
      customer: CustomerType;
    }>(customerQuery(options.customerFragment || this.customerFragment), {
      variables: {
        customerAccessToken: this.token,
      },
    });

    return customer;
  }

  async authenticate(
    input: CustomerAccessTokenCreateInput,
    options: OperationOptions = {},
  ) {
    log('authenticate()', this.isAuthenticated);

    if (this.isAuthenticated) {
      const response = await this.respond(
        {errors: [], customer: await this.get()},
        options,
      );

      return response;
    }

    const {customerAccessTokenCreate} = await this.storefront.mutate<{
      customerAccessTokenCreate: CustomerAccessTokenCreatePayload;
    }>(loginMutation(), {
      variables: {input},
    });

    const response = await this.respond(
      {
        token: customerAccessTokenCreate?.customerAccessToken?.accessToken,
        customer: await this.get(),
        errors: customerAccessTokenCreate.customerUserErrors,
      },
      options,
    );

    console.log(response);
    return response;
  }

  async create(input: CustomerCreateInput, options: OperationOptions = {}) {
    if (this.isAuthenticated) {
      const response = this.respond(
        {
          errors: [
            {
              message: 'Customer already authenticated',
            },
          ],
        },
        options,
      );

      return response;
    }

    const data = await this.storefront.mutate<{
      customerCreate: CustomerCreatePayload;
    }>(customerCreateMutation(this.customerFragment), {
      variables: {
        input,
      },
    });

    if (data?.customerCreate?.customer?.id) {
      return this.authenticate(input, options);
    }

    return this.respond(
      {
        errors: data.customerCreate?.customerUserErrors,
      },
      options,
    );
  }

  async update(customer: CustomerUpdateInput, options: OperationOptions = {}) {
    if (!this.isAuthenticated) {
      const response = this.respond(
        {
          errors: [
            {
              message: 'Customer not authenticated',
            },
          ],
        },
        options,
      );

      return response;
    }

    const {customerUpdate} = await this.storefront.mutate<{
      customerUpdate: CustomerUpdatePayload;
    }>(customerUpdateMutation(this.customerFragment), {
      variables: {
        customer,
        customerAccessToken: this.token,
      },
    });

    const response = await this.respond(
      {
        customer: customerUpdate.customer,
        token: customerUpdate.customerAccessToken?.accessToken,
        errors: customerUpdate.customerUserErrors,
      },
      options,
    );

    return response;
  }

  async recover(
    email: MutationCustomerRecoverArgs,
    options: OperationOptions = {},
  ) {
    const {customerRecover} = await this.storefront.mutate<{
      customerRecover: CustomerRecoverPayload;
    }>(customerRecoverMutation(), {
      variables: email,
    });

    const response = await this.respond(
      {
        errors: customerRecover.customerUserErrors,
      },
      options,
    );

    return response;
  }

  async reset(
    input: CustomerResetInput & {id: string},
    options: OperationOptions = {},
  ) {
    const {customerReset} = await this.storefront.mutate<{
      customerReset: CustomerResetPayload;
    }>(customerResetMutation(this.customerFragment), {
      variables: {
        id: `gid://shopify/Customer/${input.id}`,
        input: {
          password: input.password,
          resetToken: input.resetToken,
        },
      },
    });

    if (customerReset?.customer?.id) {
      return this.authenticate(
        {
          email: customerReset.customer.email || '',
          password: input.password,
        },
        options,
      );
    }

    return this.respond(
      {
        errors: customerReset?.customerUserErrors,
      },
      options,
    );
  }

  async logout() {
    this.storage.set('token', null);
    this.headers.set('Set-Cookie', await this.storage.commit());

    return {headers: this.headers, status: 200};
  }

  async addresses(): Promise<CustomerType | null> {
    // TODO: implement
    return Promise.resolve(null);
  }

  async orders(): Promise<CustomerType | null> {
    // TODO: implement
    return Promise.resolve(null);
  }

  private async respond(
    result: Result,
    options: OperationOptions = {},
  ): Promise<{data: Result; headers: Headers; status: number}> {
    let status = 200;

    if (result.errors?.length) {
      status = 400;

      throw new Error(result.errors[0].message);
    }

    this.token = result?.token || this.token;

    this.headers.set('Set-Cookie', await this.storage.commit());

    return {data: result, headers: this.headers, status};
  }
}

/**
 * QUERIES
 */
export const customerQuery = (
  customerFragment: string,
): string => /* GraphQL */ `
  query Customer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      ...Customer
    }
  }
  ${customerFragment}
`;

/**
 * FRAGMENTS
 */
export const customerFragment = /* GraphQL */ `
  fragment Customer on Customer {
    id
    firstName
    lastName
    phone
    email
    metafield(namespace: "custom", key: "athlete") {
      key
      value
    }
    defaultAddress {
      id
      formatted
      firstName
      lastName
      company
      address1
      address2
      country
      province
      city
      zip
      phone
    }
  }
`;

export const errorFragment = /* GraphQL */ `
  fragment Error on CustomerUserError {
    message
    field
    code
  }
`;

/**
 * MUTATIONS
 */

export const loginMutation = (): string => /* GraphQL */ `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerUserErrors {
        ...Error
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
  ${errorFragment}
`;

export const customerCreateMutation = (
  customerFragment: string,
): string => /* GraphQL */ `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        ...Customer
      }
      customerUserErrors {
        ...Error
      }
    }
  }
  ${customerFragment}
  ${errorFragment}
`;

export const customerUpdateMutation = (
  customerFragment: string,
): string => /* GraphQL */ `
  mutation customerUpdate(
    $customerAccessToken: String!
    $customer: CustomerUpdateInput!
  ) {
    customerUpdate(
      customerAccessToken: $customerAccessToken
      customer: $customer
    ) {
      customerUserErrors {
        ...Error
      }
      customer {
        ...Customer
      }
    }
  }
  ${customerFragment}
  ${errorFragment}
`;

export const customerRecoverMutation = (): string => /* GraphQL */ `
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        ...Error
      }
    }
  }
  ${errorFragment}
`;

export const customerResetMutation = (
  customerFragment: string,
): string => /* GraphQL */ `
  mutation customerReset($id: ID!, $input: CustomerResetInput!) {
    customerReset(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        ...Error
      }
      customer {
        ...Customer
      }
    }
  }
  ${customerFragment}
  ${errorFragment}
`;
