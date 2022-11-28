import {
  type MetaFunction,
  redirect,
  json,
  type LoaderArgs,
} from '@shopify/hydrogen-remix';
import {useState} from 'react';
import {Link} from '~/components';
import {getCustomerError, getInputStyleClasses} from '~/lib/utils';
import {
  CustomerRecoverForm,
  useCustomerRecovering,
} from '~/routes/__resources/customer/CustomerRecover';

export async function loader({context, params}: LoaderArgs) {
  const {isAuthenticated} = await context.session.getAuth();

  if (isAuthenticated) {
    return redirect(params.lang ? `${params.lang}/account` : '/account');
  }

  return json({});
}

export const meta: MetaFunction = () => {
  return {
    title: 'Recover Password',
  };
};

export default function Recover() {
  const {customerRecoverFetcher} = useCustomerRecovering();
  const resetRequested = customerRecoverFetcher?.data?.resetRequested || false;

  return (
    <div className="flex justify-center my-24 px-4">
      <div className="max-w-md w-full">
        {resetRequested ? (
          <>
            <h1 className="text-4xl">Request Sent.</h1>
            <p className="mt-4">
              If that email address is in our system, you will receive an email
              with instructions about how to reset your password in a few
              minutes.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl">Forgot Password.</h1>
            <p className="mt-4">
              Enter the email address associated with your account to receive a
              link to reset your password.
            </p>
            {/* TODO: Add onSubmit to validate _before_ submission with native? */}
            <RecoverPasswordForm />
          </>
        )}
        <div className="flex items-center mt-8 border-t border-gray-300">
          <p className="align-baseline text-sm mt-6">
            Return to &nbsp;
            <Link className="inline underline" to="/account/login">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function RecoverPasswordForm() {
  const [nativeEmailError, setNativeEmailError] = useState<null | string>(null);

  return (
    <CustomerRecoverForm className="pt-6 pb-8 mt-4 mb-4 space-y-3">
      {({state, errors}) => (
        <>
          {errors?.length && (
            <div className="flex flex-col items-center justify-center mb-6 bg-zinc-500">
              {errors.map((error) => (
                <p key={error.code} className="m-4 text-s text-contrast">
                  {getCustomerError(error)}
                </p>
              ))}
            </div>
          )}
          <div>
            <input
              className={`mb-1 ${getInputStyleClasses(nativeEmailError)}`}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              aria-label="Email address"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              onBlur={(event) => {
                setNativeEmailError(
                  event.currentTarget.value.length &&
                    !event.currentTarget.validity.valid
                    ? 'Invalid email address'
                    : null,
                );
              }}
            />
            {nativeEmailError && (
              <p className="text-red-500 text-xs">{nativeEmailError} &nbsp;</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full"
              type="submit"
            >
              {state === 'idle' ? 'Request Reset Link' : 'Requesting'}
            </button>
          </div>
        </>
      )}
    </CustomerRecoverForm>
  );
}
