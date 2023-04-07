import {
  type ActionFunction,
  type LoaderArgs,
  redirect,
  json,
} from '@shopify/remix-oxygen';
import {Form} from '@remix-run/react';

export async function loader({context, params}: LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect(params.lang ? `${params.lang}/account` : '/account');
  }

  return new Response(null);
}

type ActionData = {
  formError?: string;
};

const badRequest = (data: ActionData) => json(data, {status: 400});

export const action: ActionFunction = async ({request, context, params}) => {
  const formData = await request.formData();

  const email = formData.get('email');
  const password = formData.get('password');

  if (
    !email ||
    !password ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return badRequest({
      formError: 'Please provide both an email and a password.',
    });
  }

  // TODO Add register logic
};

export default function Register() {
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
      <button type="submit">Sign up</button>
    </Form>
  );
}
