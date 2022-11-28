import type {
  CustomerAccessToken,
  CustomerAccessTokenCreateInput,
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

interface AccessTokenCreateProps {
  input?: CustomerAccessTokenCreateInput;
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
  onSuccess?: (event: LoginEvent) => void;
  onError?: (errors: CustomerUserError[]) => void;
}

interface UseAccessTokenCreateProps extends CustomerAccessTokenCreateInput {
  redirectTo?: false | string;
}

interface LoginEventPayload {
  customerAccessToken?: CustomerAccessToken;
}

interface LoginEvent {
  type: 'login' | 'login_error';
  id: string;
  payload: LoginEventPayload;
}

const ACTION_PATH = `/customer/CustomerAccessTokenCreate`;

/**
 * action that handles the accessTokenCreate mutation
 */
async function action({request, context}: ActionArgs) {
  const formData = await request.formData();
  const {session} = context;

  const input = withoutFalsyProps({
    email: formData.get('email'),
    password: formData.get('password'),
  }) as CustomerAccessTokenCreateInput;

  const requiredInput = 'email' in input && 'password' in input;

  if (!requiredInput) {
    return json({
      errors: [{message: 'Please provide both an email and a password.'}],
    });
  }

  const {customerAccessToken, errors} = await customerAccessTokenCreate({
    input,
    context,
  });

  // Handle graphql errors
  if (errors?.length) {
    // error event
    const event: LoginEvent = {
      type: 'login_error',
      id: crypto.randomUUID(),
      payload: {},
    };

    return json({event, errors});
  }

  // success
  const event: LoginEvent = {
    type: 'login',
    id: crypto.randomUUID(),
    payload: {
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
const CustomerAccessTokenCreateForm = forwardRef(
  (
    {
      input,
      redirectTo,
      children,
      className,
      onSuccess,
      onError,
    }: AccessTokenCreateProps,
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

      if (event.type === 'login') {
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
              defaultValue={input[key as keyof CustomerAccessTokenCreateInput]}
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

function useCustomerAccessTokenCreate(
  onSuccess: (event: LoginEvent) => void = () => {},
  onError: (errors: CustomerUserError[]) => void = () => {},
) {
  const fetcher = useFetcher();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  const localizedAccountPath = usePrefixPathWithLocale('/account');
  const event = fetcher.data?.event;
  const errors = fetcher.data?.errors;

  const customerAccessTokenCreate = useCallback(
    ({email, password, redirectTo}: UseAccessTokenCreateProps) => {
      if (!email) {
        // eslint-disable-next-line no-console
        console.error('`email` not provided');
        return;
      }
      if (!password) {
        // eslint-disable-next-line no-console
        console.error('`password` not provided');
        return;
      }
      const form = new FormData();
      form.set('email', email);
      form.set('password', password);

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

    if (event.type === 'login') {
      onSuccess?.(event);
    }
  }, [event, errors, onSuccess, onError]);

  return {
    customerAccessTokenCreate,
    customerAccessTokenCreateFetcher: fetcher,
  };
}

const LOGIN_MUTATION = `#graphql
  mutation (
    $input: CustomerAccessTokenCreateInput!,
    $country: CountryCode = ZZ,
    $language: LanguageCode,
  )
  @inContext(country: $country, language: $language) {
    customerAccessTokenCreate(input: $input) {
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
 * Mutation to login a user creating a customerAccessToken with an email and password
 * @param email the customer email
 * @param password the customer password
 * @param context the hydrogen context
 * @returns {customerAccessToken, errors}
 */
async function customerAccessTokenCreate({
  context,
  input,
}: {
  context: HydrogenContext;
  input: CustomerAccessTokenCreateInput;
}): Promise<{
  errors: CustomerUserError[];
  customerAccessToken: CustomerAccessToken;
}> {
  const {storefront} = context;

  const {customerAccessTokenCreate} = await storefront.mutate<{
    customerAccessTokenCreate: {
      customerAccessToken: CustomerAccessToken;
      errors: CustomerUserError[];
    };
  }>(LOGIN_MUTATION, {
    variables: {input},
  });

  invariant(
    customerAccessTokenCreate,
    'No data returned from customerAccessToken mutation',
  );

  return customerAccessTokenCreate;
}

export {
  action,
  useCustomerAccessTokenCreate,
  CustomerAccessTokenCreateForm,
  customerAccessTokenCreate,
};
