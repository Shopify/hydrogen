import {
  type ActionFunction,
  type LoaderArgs,
  type ErrorBoundaryComponent,
  redirect,
} from '@shopify/remix-oxygen';
import {
  Form,
  useCatch,
  useRouteError,
  isRouteErrorResponse,
} from '@remix-run/react';

export async function loader({context, params}: LoaderArgs) {
  const {customer} = context;

  if (customer.isAuthenticated)
    return redirect(params.lang ? `${params.lang}/account` : '/account');

  return new Response(null);
}

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
    throw new Response('Please provide both an email and a password.', {
      status: 404,
    });
  }

  const {customer} = context;

  const {headers} = await customer.create({
    email,
    password,
  });

  return redirect(params.lang ? `${params.lang}/account` : '/account', {
    headers,
  });
};

function RegisterForm() {
  return (
    <Form method="post">
      <h2>Register</h2>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Email address"
        aria-label="Email address"
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
      />
      <button type="submit">Sign up</button>
    </Form>
  );
}

export const ErrorBoundaryV1: ErrorBoundaryComponent = ({error}) => {
  console.error(error);

  return <div>There was an error.</div>;
};

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

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    console.error(error.status, error.statusText, error.data);
    return <div>Route Error</div>;
  } else {
    console.error((error as Error).message);
    return <div>Thrown Error</div>;
  }
}

export default function Register() {
  return <RegisterForm />;
}
