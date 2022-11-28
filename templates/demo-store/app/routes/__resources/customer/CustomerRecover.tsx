import type {CustomerUserError} from '@shopify/hydrogen-react/storefront-api-types';
import {
  type ActionArgs,
  redirect,
  json,
  HydrogenContext,
} from '@shopify/hydrogen-remix';
import {forwardRef, useCallback, useEffect, useId, useState} from 'react';
import invariant from 'tiny-invariant';
import {usePrefixPathWithLocale} from '~/lib/utils';
import {useFetcher, useFetchers, useLocation} from '@remix-run/react';
import {useIsHydrated} from '~/hooks/useIsHydrated';

interface CustomerRecoverProps {
  email?: string;
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
  onSuccess?: (event: CustomerRecoverEvent) => void;
  onError?: (errors: CustomerUserError[]) => void;
}

interface UseAccessTokenCreateProps {
  email: string;
  redirectTo?: false | string;
}

interface CustomerRecoverEvent {
  type: 'recover' | 'recover_error';
  id: string;
  payload: null;
}

const ACTION_PATH = `/customer/CustomerRecover`;

/**
 * action that handles the accessTokenCreate mutation
 */
async function action({request, context}: ActionArgs) {
  const formData = await request.formData();

  const email = formData.get('email');

  if (!email || typeof email !== 'string') {
    return json({
      errors: [{code: '', message: 'Please provide an email address'}],
    });
  }

  const {errors} = await customerRecover({
    email,
    context,
  });

  // Handle graphql errors
  if (errors?.length) {
    const event: CustomerRecoverEvent = {
      type: 'recover_error',
      id: crypto.randomUUID(),
      payload: null,
    };

    return json({event, errors, resetRequested: false});
  }

  // success
  const event: CustomerRecoverEvent = {
    type: 'recover',
    id: crypto.randomUUID(),
    payload: null,
  };

  const redirectTo = (formData.get('redirectTo') ?? '') as string;
  if (redirectTo) {
    return redirect(redirectTo);
  }

  return json({event, errors: null, resetRequested: true});
}

/**
 * Form component that recovers a customer password
 */
const CustomerRecoverForm = forwardRef(
  (
    {
      email,
      redirectTo,
      children,
      className,
      onSuccess,
      onError,
    }: CustomerRecoverProps,
    ref: React.Ref<HTMLFormElement>,
  ) => {
    const redirectToInProps = typeof redirectTo !== 'undefined';
    const isHydrated = useIsHydrated();
    const formId = useId();
    const fetcher = useFetcher();
    const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
    const {pathname, search} = useLocation();
    const localizedCurrentPath = usePrefixPathWithLocale(
      `${pathname}${search}`,
    );
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

      if (event.type === 'recover') {
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
        {email && <input type="hidden" name="email" defaultValue={email} />}
        {/* used to trigger a redirect back to the same url when JS is disabled */}
        {!isHydrated ? (
          redirectToInProps ? (
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
              defaultValue={localizedCurrentPath}
            />
          )
        ) : null}
        {children({
          state: fetcher.state,
          errors,
          resetErrors: () => setErrors(null),
        })}
      </fetcher.Form>
    );
  },
);

function useCustomerRecover(
  onSuccess: (event: CustomerRecoverEvent) => void = () => {},
  onError: (errors: CustomerUserError[]) => void = () => {},
) {
  const fetcher = useFetcher();
  const localizedActionPath = usePrefixPathWithLocale(ACTION_PATH);
  const {pathname, search} = useLocation();
  const localizedCurrentPath = usePrefixPathWithLocale(`${pathname}${search}`);
  const event = fetcher.data?.event;
  const errors = fetcher.data?.errors;

  const customerRecover = useCallback(
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
          : localizedCurrentPath;

        form.set('redirectTo', localizedRedirectTo);
      }

      fetcher.submit(form, {
        method: 'post',
        action: localizedActionPath,
        replace: false,
      });
    },
    [fetcher, localizedCurrentPath, localizedActionPath],
  );

  useEffect(() => {
    if (!event) return;

    if (errors) {
      onError?.(errors);
      return;
    }

    if (event.type === 'recover') {
      onSuccess?.(event);
    }
  }, [event, errors, onSuccess, onError]);

  return {
    customerRecover,
    customerRecoverFetcher: fetcher,
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
 * @returns {customerRecoverFetcher}
 */
function useCustomerRecovering() {
  const customerRecoverFetcher = useCustomerResetFetcher();
  return {customerRecoverFetcher};
}

const CUSTOMER_RECOVER_MUTATION = `#graphql
  mutation ($email: String!) {
    customerRecover(email: $email) {
      errors: customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

/**
 * Mutation that sends an email with a password recovery url
 * @param email the customer email
 * @param context the hydrogen context
 * @returns {errors}
 */
async function customerRecover({
  context,
  email,
}: {
  context: HydrogenContext;
  email: string;
}): Promise<{
  errors: CustomerUserError[];
}> {
  const {storefront} = context;

  const {customerRecover} = await storefront.mutate<{
    customerRecover: {
      errors: CustomerUserError[];
    };
  }>(CUSTOMER_RECOVER_MUTATION, {
    variables: {email},
  });

  invariant(customerRecover, 'No data returned from customerRecover mutation');

  return customerRecover;
}

export {
  action,
  useCustomerRecover,
  useCustomerRecovering,
  CustomerRecoverForm,
  customerRecover,
};
