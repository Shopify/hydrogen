import {redirect, json, type LoaderArgs} from '@shopify/hydrogen-remix';
import {
  getCustomerError,
  getInputStyleClasses,
  usePrefixPathWithLocale,
} from '~/lib/utils';
import {Link} from '~/components';
import {CustomerAccessTokenCreateForm} from '~/routes/__resources/customer/CustomerAccessTokenCreate';
import clsx from 'clsx';

export const handle = {
  isPublic: true,
};

export async function loader({context, params}: LoaderArgs) {
  const {session} = context;
  const {isAuthenticated} = await session.getAuth();

  if (isAuthenticated) {
    return redirect(params.lang ? `${params.lang}/account` : '/account');
  }

  return json({});
}

export function meta() {
  return {
    title: 'Login',
  };
}

export default function Login() {
  const localizedRegisterUrl = usePrefixPathWithLocale('/account/register');
  const localizedRecoverUrl = usePrefixPathWithLocale('/account/recover');

  return (
    <div className="flex justify-center my-24 px-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl">Sign in.</h1>
        <LoginForm />
        <div className="flex justify-between items-center mt-8 border-t border-gray-300">
          <p className="align-baseline text-sm mt-6">
            New to Hydrogen? &nbsp;
            <Link className="inline underline" to={localizedRegisterUrl}>
              Create an account
            </Link>
          </p>
          <Link
            className="mt-6 inline-block align-baseline text-sm text-primary/50"
            to={localizedRecoverUrl}
          >
            Forgot password
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  return (
    <CustomerAccessTokenCreateForm className="pt-6 pb-8 mt-4 mb-4 space-y-3">
      {({state, errors}) => {
        return (
          <div className="flex flex-col">
            {errors?.length && (
              <div className="flex flex-col items-center justify-center mb-6 bg-zinc-500">
                {errors.map((error) => (
                  <p key={error.code} className="m-4 text-s text-contrast">
                    {getCustomerError(error)}
                  </p>
                ))}
              </div>
            )}
            <input
              aria-label="Email address"
              autoComplete="email"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className={clsx(['mb-2', getInputStyleClasses()])}
              id="email"
              name="email"
              placeholder="Email address"
              required
              type="email"
            />
            <input
              aria-label="Password"
              autoComplete="current-password"
              className={clsx(['mb-4', getInputStyleClasses()])}
              id="password"
              minLength={8}
              name="password"
              placeholder="Password"
              required
              type="password"
            />
            <div className="flex items-center justify-between">
              <button
                className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full"
                type="submit"
              >
                {state === 'idle' ? 'Sign in' : 'Signing in'}
              </button>
            </div>
          </div>
        );
      }}
    </CustomerAccessTokenCreateForm>
  );
}
