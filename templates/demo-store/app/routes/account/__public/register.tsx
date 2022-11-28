import {redirect, json, type LoaderArgs} from '@shopify/hydrogen-remix';
import {
  getCustomerError,
  getInputStyleClasses,
  usePrefixPathWithLocale,
} from '~/lib/utils';
import {Link} from '~/components';
import {CustomerCreateForm} from '~/routes/__resources/customer/CustomerCreate';

export async function loader({context, params}: LoaderArgs) {
  const {isAuthenticated} = await context.session.getAuth();

  if (isAuthenticated) {
    return redirect(params.lang ? `${params.lang}/account` : '/account');
  }

  return json({isAuthenticated: false});
}

export function meta() {
  return {
    title: 'Login',
  };
}

export default function Register() {
  const localizedLoginUrl = usePrefixPathWithLocale('/account/login');
  return (
    <div className="flex justify-center my-24 px-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl">Create an Account.</h1>
        <RegisterForm />
        <div className="flex items-center mt-8 border-t border-gray-300">
          <p className="align-baseline text-sm mt-6">
            Already have an account? &nbsp;
            <Link className="inline underline" to={localizedLoginUrl}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function RegisterForm() {
  return (
    <CustomerCreateForm className="pt-6 pb-8 mt-4 mb-4 space-y-3">
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
              className={`mb-2 ${getInputStyleClasses()}`}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              aria-label="Email address"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <input
              className={`mb-2 ${getInputStyleClasses()}`}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              minLength={8}
              required
            />
            <input
              className={`mb-4 ${getInputStyleClasses()}`}
              id="confirm-password"
              name="password"
              type="password"
              placeholder="Confirm Password"
              aria-label="Confirm Password"
              minLength={8}
              required
            />
          </div>
          <button
            className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full"
            type="submit"
          >
            {state === 'idle' ? 'Create Account' : 'Creating Account...'}
          </button>
        </>
      )}
    </CustomerCreateForm>
  );
}
