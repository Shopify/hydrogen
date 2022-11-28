import {type MetaFunction} from '@shopify/hydrogen-remix';
import {getCustomerError, getInputStyleClasses} from '~/lib/utils';
import {CustomerResetForm} from '~/routes/__resources/customer/CustomerReset';

export const meta: MetaFunction = () => {
  return {
    title: 'Reset Password',
  };
};

export default function Reset() {
  return (
    <div className="flex justify-center my-24 px-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl">Reset Password.</h1>
        <p className="mt-4">Enter a new password for your account.</p>
        <ResetForm />
      </div>
    </div>
  );
}

function ResetForm() {
  return (
    <CustomerResetForm className="pt-6 pb-8 mt-4 mb-4 space-y-3">
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
          <div className="mb-3">
            <input
              className={`mb-1 ${getInputStyleClasses()}`}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              minLength={8}
              required
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          <div className="mb-3">
            <input
              className={`mb-1 ${getInputStyleClasses()}`}
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autoComplete="current-password"
              placeholder="Re-enter password"
              aria-label="Re-enter password"
              minLength={8}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full"
              type="submit"
            >
              {state === 'idle' ? 'Save' : 'Saving..'}
            </button>
          </div>
        </>
      )}
    </CustomerResetForm>
  );
}
