# Hydrogen Customer

## Creating the Customer Context

### In file: `server.ts`

```tsx
const customer = new CustomerContext(storefront, session);

const handleRequest = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
  getLoadContext: () => ({session, storefront, customer, env}),
});
```

### In file `root.tsx`

```tsx
export async function loader({context}: LoaderArgs) {
  return defer({
    customer: context.customer.get(),
  });
}
```

### In file `account/login.tsx`

```tsx
import {
  type ActionFunction,
  type LoaderArgs,
  redirect,
  json,
} from '@shopify/remix-oxygen';
import {Form, Link} from '@remix-run/react';

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
    return new Response('Please provide both an email and a password.', {
      status: 400,
    });
  }

  const {customer} = context;

  const {headers} = await customer.authenticate({
    email,
    password,
  });

  return redirect(params.lang ? `${params.lang}/account` : '/account', {
    headers,
  });
};

function LoginForm() {
  return (
    <Form method="post">
      <h2>Login</h2>
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
      <button type="submit">Sign in</button>
      <Link to="/account/recover">Forgot?</Link>
    </Form>
  );
}

export default function Login() {
  return <LoginForm />;
}

export function ErrorBoundary({error}: {error: Error}) {
  return (
    <div>
      <pre>{error.message}</pre>
      <LoginForm />
    </div>
  );
}
```

### In file: `account/register.tsx`

```tsx
import {
  type ActionFunction,
  type LoaderArgs,
  redirect,
} from '@shopify/remix-oxygen';
import {Form} from '@remix-run/react';

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
    throw new Error('Please provide both an email and a password.');
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

export default function Register() {
  return <RegisterForm />;
}

export function ErrorBoundary({error}: {error: Error}) {
  return (
    <div>
      <pre>{error.message}</pre>
      <RegisterForm />
    </div>
  );
}
```

### In file: `account/recover.tsx`

```tsx
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
```

### In file: `account/reset.$id.$resetToken.tsx`

```tsx
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
```
