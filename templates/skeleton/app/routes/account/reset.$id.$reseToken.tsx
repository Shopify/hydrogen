import {json, redirect, type ActionFunction} from '@shopify/remix-oxygen';
import {Form, useActionData, type V2_MetaFunction} from '@remix-run/react';

type ActionResponse = {
  error: string | null;
};

export const meta: V2_MetaFunction = () => {
  return [{title: 'Reset Password'}];
};

export const action: ActionFunction = async ({
  request,
  context,
  params: {id, resetToken},
}) => {
  const {session, storefront} = context;
  try {
    if (!id || !resetToken) {
      throw new Error('customer token or id not found');
    }

    const form = await request.formData();
    const password = form.has('password') ? String(form.get('password')) : '';
    const passwordConfirm = form.has('passwordConfirm')
      ? String(form.get('passwordConfirm'))
      : '';
    const validInputs = Boolean(password && passwordConfirm);
    if (validInputs && password !== passwordConfirm) {
      throw new Error('Please provide matching passwords');
    }

    const {customerReset} = await storefront.mutate(CUSTOMER_RESET_MUTATION, {
      variables: {
        id: `gid://shopify/Customer/${id}`,
        input: {password, resetToken},
      },
    });

    if (!customerReset?.customerUserErrors?.length) {
      throw new Error(customerReset?.customerUserErrors[0].message);
    }

    const {accessToken} = customerReset?.customerAccessToken ?? {};
    if (!accessToken) {
      throw new Error('Access token not found. Please try again.');
    }
    session.set('customerAccessToken', accessToken);

    return redirect('/account', {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Set-Cookie': await session.commit(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return json({error: error.message}, {status: 400});
    }
    return json({error}, {status: 400});
  }
};

export default function Reset() {
  const action = useActionData<ActionResponse>();

  return (
    <div className="account-reset">
      <h1>Reset Password.</h1>
      <p>Enter a new password for your account.</p>
      <Form method="post" noValidate>
        <fieldset>
          <label htmlFor="password">Password</label>
          <input
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
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="current-password"
            placeholder="Re-enter password"
            aria-label="Re-enter password"
            minLength={8}
            required
          />
          {action?.error ? (
            <p>
              <mark>
                <small>{action.error}</small>
              </mark>
            </p>
          ) : (
            <br />
          )}
        </fieldset>
        <button type="submit">Reset</button>
      </Form>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customerreset
const CUSTOMER_RESET_MUTATION = `#graphql
  mutation customerReset($id: ID!, $input: CustomerResetInput!) {
    customerReset(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;
