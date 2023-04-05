import {
  type ActionFunction,
  type LoaderArgs,
  type ErrorBoundaryComponent,
  redirect,
} from '@shopify/remix-oxygen';
import {Form, useCatch} from '@remix-run/react';

export async function loader({context, params}: LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect(params.lang ? `${params.lang}/account` : '/account');
  }

  return new Response(null);
}

export const action: ActionFunction = async ({request}) => {
  const formData = await request.formData();

  const email = formData.get('email');
  const password = formData.get('password');

  if (
    !email ||
    !password ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    throw new Response('Please provide both an email and a password.', {
      status: 400,
    });
  }

  // TODO Add login logic
};

export default function Login() {
  return (
    <Form method="post">
      <input
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
      <button type="submit">Sign in</button>
    </Form>
  );
}

// Remix v1 implementation of ErrorBoundary; for Remix v2, this will need to be updated according to the following documentation:
// https://remix.run/docs/en/1.15.0/pages/v2#catchboundary-and-errorboundary
export const ErrorBoundary: ErrorBoundaryComponent = ({error}) => {
  console.error(error);

  return <div>There was an error.</div>;
};

// Remix v1 implementation of CatchBoundary; for v2, you can remove `CatchBoundary` and implement the error handling in `ErrorBoundary`:
// https://remix.run/docs/en/1.15.0/pages/v2#catchboundary-and-errorboundary
export function CatchBoundary() {
  const caught = useCatch();
  console.error(caught);

  return (
    <div>
      There was an error. Status: {caught.status}. Message:{' '}
      {caught.data?.message}
    </div>
  );
}
