import type {
  Customer,
  CustomerAccessToken,
  CustomerCreateInput,
  CustomerCreatePayload,
  CustomerUserError,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type ActionArgs,
  redirect,
  json,
  HydrogenContext,
} from '@shopify/hydrogen-remix';
import {forwardRef, useCallback, useEffect, useId, useState} from 'react';
import invariant from 'tiny-invariant';
import {usePrefixPathWithLocale, withoutFalsyProps} from '~/lib/utils';
import {useFetcher} from '@remix-run/react';
import {customerAccessTokenCreate} from './CustomerAccessTokenCreate';

interface CustomerCreateProps {
  input?: CustomerCreateInput;
  redirectTo?: string | boolean;
  className?: string;
  children: ({
    state,
    errors,
    resetErrors,
  }: {
    state: 'idle' | 'submitting' | 'loading';
    errors: CustomerUserError[] | null;
    resetErrors: () => void;
  }) => React.ReactNode;
  onSuccess?: (event: RegisterEvent) => void;
  onError?: (errors: CustomerUserError[]) => void;
}

interface UseCustomerCreateProps {
  input?: CustomerCreateInput;
  redirectTo?: false | string;
}

interface RegisterEventPayload {
  customerAccessToken: CustomerAccessToken;
  customer: Customer;
}

interface RegisterEventSuccess {
  type: 'register';
  id: string;
  payload: RegisterEventPayload;
}

interface RegisterEventError {
  type: 'register_error';
  id: string;
  payload: null;
}

type RegisterEvent = RegisterEventSuccess | RegisterEventError;

const ACTION_PATH = `/customer/CustomerCreate`;

/**
 * action that handles the accessTokenCreate mutation
 */
async function action({request, context}: ActionArgs) {
  const formData = await request.formData();
  const {session} = context;

  let event: RegisterEvent = {
    type: 'register_error',
    id: crypto.randomUUID(),
    payload: null,
  };

  const acceptsMarketing =
    typeof formData.get('acceptsMarketing') === 'string'
      ? JSON.parse(String(formData.get('acceptsMarketing')))
      : false;

  const [password, confirmPassword] = formData.getAll('password')?.length
    ? formData.getAll('password')
    : [null, null];

  if (!password || !confirmPassword) {
    return json({
      event,
      errors: [
        {
          code: 'MISSING_PASSWORD',
          message: 'Password or confirm password not provided',
        },
      ],
    });
  }

  if (password !== confirmPassword) {
    return json({
      errors: [{code: 'PASSWORDS_MISMATCH', message: 'Passwords do not match'}],
    });
  }

  const input = withoutFalsyProps({
    acceptsMarketing,
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    password,
    phone: formData.get('phone'),
  }) as CustomerCreateInput;

  const requiredInput = 'email' in input && 'password' in input;

  if (!requiredInput) {
    return json({
      event,
      errors: [
        {
          code: 'MISSING_REQUIRED_INPUT',
          message: 'Please provide both an email and a password.',
        },
      ],
    });
  }

  // register customer
  const {customer, errors} = await customerCreate({
    input,
    context,
  });

  // Handle graphql errors
  if (errors?.length) {
    // error event
    return json({errors, event});
  }

  // login new customer
  const {customerAccessToken, errors: tokenErrors} =
    await customerAccessTokenCreate({
      context,
      input: {
        email: input.email,
        password: input.password,
      },
    });

  // success
  event = {
    type: 'register',
    id: crypto.randomUUID(),
    payload: {
      customer,
      customerAccessToken,
    },
  };

  session.set('customerAccessToken', JSON.stringify(customerAccessToken));
  session.flash('event', JSON.stringify(event));

  const headersInit = {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  };

  const redirectTo = (formData.get('redirectTo') ?? '') as string;
  if (redirectTo) {
    return redirect(redirectTo, headersInit);
  }

  return json({event, errors: null}, headersInit);
}

/**
 * Form component to login a customer
 */
const CustomerCreateForm = forwardRef(
  (
    {
      input,
      redirectTo,
      children,
      className,
      onSuccess,
      onError,
    }: CustomerCreateProps,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const redirectToInProps = typeof redirectTo !== 'undefined';
    const formId = useId();
    const fetcher = useFetcher();
    const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
    const localizedAccountPath = usePrefixPathWithLocale('/account');
    const localizedRedirectToPath = usePrefixPathWithLocale(
      typeof redirectTo === 'string' ? redirectTo : '',
    );
    const event = fetcher.data?.event;
    const [errors, setErrors] = useState<null | CustomerUserError[]>(
      fetcher.data?.errors || null,
    );

    useEffect(() => {
      setErrors(fetcher.data?.errors);
    }, [fetcher.data?.errors, setErrors, event?.id]);

    useEffect(() => {
      if (!event) return;

      if (errors) {
        onError?.(errors);
        return;
      }

      if (event.type === 'register') {
        onSuccess?.(event);
      }
    }, [event, errors, onSuccess, onError]);

    return (
      <fetcher.Form
        id={formId}
        method="post"
        action={localizedActionPath}
        className={className}
        ref={ref}
      >
        {input &&
          Object.keys(input).map((key) => (
            <input
              key={key}
              type="hidden"
              name={key}
              defaultValue={String(input[key as keyof CustomerCreateInput])}
            />
          ))}
        {/* used to trigger a redirect back to the same url when JS is disabled */}
        {redirectToInProps ? (
          redirectTo ? (
            <input
              type="hidden"
              name="redirectTo"
              defaultValue={localizedRedirectToPath}
            />
          ) : null
        ) : (
          <input
            type="hidden"
            name="redirectTo"
            defaultValue={localizedAccountPath}
          />
        )}
        {children({
          state: fetcher.state,
          errors,
          resetErrors: () => setErrors(null),
        })}
      </fetcher.Form>
    );
  },
);

function useCustomerCreate(
  onSuccess: (event: RegisterEvent) => void = () => {},
  onError: (errors: CustomerUserError[]) => void = () => {},
) {
  const fetcher = useFetcher();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  const localizedAccountPath = usePrefixPathWithLocale('/account');
  const event = fetcher.data?.event;
  const errors = fetcher.data?.errors;

  const customerCreate = useCallback(
    ({input, redirectTo}: UseCustomerCreateProps) => {
      if (!input?.email) {
        // eslint-disable-next-line no-console
        console.error('`input.email` not provided');
        return;
      }
      if (!input?.password) {
        // eslint-disable-next-line no-console
        console.error('`input.password` not provided');
        return;
      }
      const form = new FormData();

      Object.keys(input).map((key) => {
        form.set(key, JSON.stringify(input[key as keyof CustomerCreateInput]));
      });

      if (redirectTo !== false) {
        form.set('redirectTo', localizedAccountPath);
      }

      fetcher.submit(form, {
        method: 'post',
        action: localizedActionPath,
        replace: false,
      });
    },
    [fetcher, localizedAccountPath, localizedActionPath],
  );

  useEffect(() => {
    if (!event) return;

    if (errors) {
      onError?.(errors);
      return;
    }

    if (event.type === 'register') {
      onSuccess?.(event);
    }
  }, [event, errors, onSuccess, onError]);

  return {
    customerCreate,
    customerCreateFetcher: fetcher,
  };
}

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation ($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      errors: customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

/**
 * Mutation that registers a user
 * @param email The customer’s email.
 * @param firstName? The customer’s first name.
 * @param lastName? The customer’s last name.
 * @param password The login password used by the customer.
 * @param acceptsMarketing? Indicates whether the customer has consented to be sent marketing material via email.
 * @param phone? A unique phone number for the customer. Formatted using E.164 standard. For example, +16135551111.
 * @param context the hydrogen context
 * @returns {customer, errors}
 */
async function customerCreate({
  context,
  input,
}: {
  context: HydrogenContext;
  input: CustomerCreateInput;
}): Promise<{
  errors: CustomerUserError[];
  customer: Customer;
}> {
  const {storefront} = context;

  const {customerCreate} = await storefront.mutate<{
    customerCreate: {
      errors: CustomerUserError[];
      customer: Customer;
    };
  }>(CUSTOMER_CREATE_MUTATION, {
    variables: {input},
  });

  invariant(
    customerCreate,
    'No data returned from customerAccessToken mutation',
  );

  return customerCreate;
}

export {action, useCustomerCreate, CustomerCreateForm, customerCreate};
