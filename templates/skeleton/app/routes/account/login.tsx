import {
  json,
  redirect,
  type ActionArgs,
  type LoaderArgs,
} from '@shopify/remix-oxygen';
import {Form, Link, useActionData} from '@remix-run/react';

type ActionResponse = {
  error: string | null;
  success: boolean;
};

export async function loader({context}: LoaderArgs) {
  if (await context.session.get('customerAccessToken')) {
    return redirect('/account');
  }
  return json({});
}

export async function action({request, context}: ActionArgs) {
  const {session, storefront} = context;

  try {
    const form = await request.formData();
    const email = String(form.has('email') ? form.get('email') : '');
    const password = String(form.has('password') ? form.get('password') : '');
    const validInputs = Boolean(email && password);

    if (!validInputs) {
      throw new Error('Please provide both an email and a password.');
    }

    const {customerAccessTokenCreate} = await storefront.mutate(
      LOGIN_MUTATION,
      {
        variables: {
          input: {email, password},
        },
      },
    );

    if (!customerAccessTokenCreate?.customerAccessToken?.accessToken) {
      throw new Error(customerAccessTokenCreate?.customerUserErrors[0].message);
    }

    const {customerAccessToken} = customerAccessTokenCreate;
    session.set('customerAccessToken', customerAccessToken);

    return redirect('/account', {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Set-Cookie': await session.commit(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return json({error: error.message, success: false}, {status: 400});
    }
    return json({error, success: false}, {status: 400});
  }
}

export default function Login() {
  const data = useActionData<ActionResponse>();
  const error = data?.error || null;
  const success = Boolean(data?.success);
  return (
    <section className="login">
      <h1>Sign in</h1>
      <Form method="post">
        <fieldset>
          <label htmlFor="email">Email address</label>
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
          />
        </fieldset>
        {error ? (
          <p>
            <mark>
              <small>{error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        {success && <p>Successfully logged in!</p>}
        <button type="submit">Sign in</button>
      </Form>
      <p>
        Not yet registered? &nbsp;<Link to="/account/register">Register</Link>
      </p>
    </section>
  );
}

export const LOGIN_MUTATION = `#graphql
  mutation login($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerUserErrors {
        code
        field
        message
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
` as const;
