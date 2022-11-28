import type {
  CustomerAccessToken,
  CustomerResetInput,
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
import {usePrefixPathWithLocale} from '~/lib/utils';
import {useFetcher, useFetchers, useParams} from '@remix-run/react';

interface CustomerResetProps {
  password?: string;
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
  onSuccess?: (event: CustomerResetEvent) => void;
  onError?: (errors: CustomerUserError[]) => void;
}

interface UseAccessTokenCreateProps {
  email: string;
  redirectTo?: false | string;
}

interface CustomerResetEventError {
  type: 'reset_error';
  id: string;
  payload: null;
}

interface CustomerResetEventSuccess {
  type: 'reset';
  id: string;
  payload: {
    customerAccessToken: CustomerAccessToken;
  };
}

type CustomerResetEvent = CustomerResetEventError | CustomerResetEventSuccess;

const ACTION_PATH = `/customer/CustomerReset`;

/**
 * action that handles the accessTokenCreate mutation
 */
async function action({request, context}: ActionArgs) {
  const formData = await request.formData();
  const {session} = context;

  let event: CustomerResetEvent = {
    type: 'reset_error',
    id: crypto.randomUUID(),
    payload: null,
  };

  const id = formData.get('id');
  const resetToken = formData.get('resetToken');

  if (typeof id !== 'string' || typeof resetToken !== 'string') {
    return json({
      event,
      errors: [
        {
          message: 'id or resetToken not found',
        },
      ],
    });
  }

  const [password, confirmPassword] = formData.getAll('password');

  if (typeof password !== 'string' || typeof confirmPassword !== 'string') {
    return json({
      event,
      errors: [
        {
          message: 'Please provide both password and confirm password',
        },
      ],
    });
  }

  if (password !== confirmPassword) {
    return json({
      event,
      errors: [{message: "Passwords don't match"}],
    });
  }

  const {customerAccessToken, errors} = await customerReset({
    context,
    id,
    input: {
      password,
      resetToken,
    },
  });

  // Handle graphql errors
  if (errors?.length) {
    return json({event, errors});
  }

  session.set('customerAccessToken', JSON.stringify(customerAccessToken));
  session.flash('event', JSON.stringify(event));

  const headersInit = {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  };

  // success
  event = {
    type: 'reset',
    id: crypto.randomUUID(),
    payload: {
      customerAccessToken,
    },
  };

  const redirectTo = (formData.get('redirectTo') ?? '') as string;
  if (redirectTo) {
    return redirect(redirectTo, headersInit);
  }

  return json({event, errors: null}, headersInit);
}

/**
 * Form component that resets a customer password
 */
const CustomerResetForm = forwardRef(
  (
    {
      password,
      redirectTo,
      children,
      className,
      onSuccess,
      onError,
    }: CustomerResetProps,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const redirectToInProps = typeof redirectTo !== 'undefined';
    const formId = useId();
    const fetcher = useFetcher();
    const params = useParams();
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

      if (event.type === 'reset') {
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
        {password && (
          <>
            <input type="hidden" name="password" defaultValue={password} />
            <input type="hidden" name="password" defaultValue={password} />
          </>
        )}
        {/* pass `id` and `resetToken` params */}
        {Object.keys(params).map((paramKey) => (
          <input
            type="hidden"
            key={paramKey}
            name={paramKey}
            defaultValue={String(params[paramKey])}
          />
        ))}
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

function useCustomerReset(
  onSuccess: (event: CustomerResetEvent) => void = () => {},
  onError: (errors: CustomerUserError[]) => void = () => {},
) {
  const fetcher = useFetcher();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  const localizedAccountPath = usePrefixPathWithLocale('/account');
  const event = fetcher.data?.event;
  const errors = fetcher.data?.errors;

  const CustomerReset = useCallback(
    ({email, redirectTo}: UseAccessTokenCreateProps) => {
      if (!email) {
        // eslint-disable-next-line no-console
        console.error('`email` not provided');
        return;
      }
      const form = new FormData();
      form.set('email', email);

      if (redirectTo !== false) {
        const localizedRedirectTo = redirectTo
          ? redirectTo
          : localizedAccountPath;

        form.set('redirectTo', localizedRedirectTo);
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

    if (event.type === 'reset') {
      onSuccess?.(event);
    }
  }, [event, errors, onSuccess, onError]);

  return {
    CustomerReset,
    CustomerResetFetcher: fetcher,
  };
}

/**
 * Utility hook to get the active discountCodesUpdate fetcher
 * @returns fetcher
 */
function useCustomerResetFetcher() {
  const fetchers = useFetchers();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  return fetchers.find(
    (fetcher) => fetcher?.submission?.action === localizedActionPath,
  );
}

/**
 * Utility hook to retrieve the discountCodes currently being updated
 * @returns {CustomerResetFetcher}
 */
function useCustomerResetting() {
  const CustomerResetFetcher = useCustomerResetFetcher();
  return {CustomerResetFetcher};
}

const CUSTOMER_RESET_MUTATION = `#graphql
  mutation ($id: ID!, $input: CustomerResetInput!) {
    customerReset(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
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
 * Mutation that resets the customer password with an id and resetToken
 * @param input CustomerResetInput password and resetToken
 * @param context the hydrogen context
 * @returns {customerAccessToken, errors}
 */
async function customerReset({
  context,
  input,
  id,
}: {
  context: HydrogenContext;
  id: string;
  input: CustomerResetInput;
}): Promise<{
  customerAccessToken: CustomerAccessToken;
  errors: CustomerUserError[];
}> {
  const {storefront} = context;

  const {customerReset} = await storefront.mutate<{
    customerReset: {
      customerAccessToken: CustomerAccessToken;
      errors: CustomerUserError[];
    };
  }>(CUSTOMER_RESET_MUTATION, {
    variables: {id: `gid://shopify/Customer/${id}`, input},
  });

  invariant(customerReset, 'No data returned from customerReset mutation');

  return customerReset;
}

export {
  action,
  customerReset,
  CustomerResetForm,
  useCustomerReset,
  useCustomerResetting,
};
