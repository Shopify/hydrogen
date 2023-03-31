import type {ActionFunction, LoaderArgs} from '@shopify/remix-oxygen';
import {redirect} from '@shopify/remix-oxygen';
import {Form} from '@remix-run/react';

export async function loader({context}: LoaderArgs) {
  const {customer} = context;

  if (customer.isAuthenticated) return redirect('/');

  return new Response(null);
}

export const action: ActionFunction = async ({
  request,
  context,
  params: {id, resetToken},
}) => {
  const formData = await request.formData();
  const {customer} = context;

  if (!id || !resetToken) {
    throw new Error('Missing id or resetToken');
  }

  const password = formData.get('password');

  if (!password || typeof password !== 'string') {
    throw new Error('Missing password');
  }

  const {headers, status} = await customer.reset({
    password,
    id,
    resetToken,
  });

  return redirect('/account', {
    headers,
    status,
  });
};

function ResetForm() {
  return (
    <Form method="post">
      <h2>Reset password</h2>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        aria-label="Password"
        minLength={8}
        required
      />
      <button type="submit">Reset</button>
    </Form>
  );
}
export default function Reset() {
  return <ResetForm />;
}
