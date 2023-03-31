import type {ActionFunction, LoaderArgs} from '@shopify/remix-oxygen';
import {redirect} from '@shopify/remix-oxygen';
import {Form} from '@remix-run/react';

export async function loader({context}: LoaderArgs) {
  const {customer} = context;

  if (customer.isAuthenticated) return redirect('/');

  return new Response(null);
}

export const action: ActionFunction = async ({request, context}) => {
  const formData = await request.formData();
  const {customer} = context;

  const email = formData.get('email');

  if (!email || typeof email !== 'string') {
    throw new Error('Please provide an email address.');
  }

  const {status, headers} = await customer.recover({
    email,
  });

  return new Response(null, {
    status,
    headers,
  });
};

function RecoverForm() {
  return (
    <Form method="post">
      <h2>Recover password</h2>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Email address"
        aria-label="Email address"
      />
      <button type="submit">Send recovery email</button>
    </Form>
  );
}

export default function Recover() {
  return <RecoverForm />;
}

export function ErrorBoundary({error}: {error: Error}) {
  return (
    <div>
      <pre>{error.message}</pre>
      <RecoverForm />
    </div>
  );
}
