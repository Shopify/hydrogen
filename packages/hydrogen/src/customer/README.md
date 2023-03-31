# Hydrogen Customer

## Table of Contents

- Creating the CustomerContext
- Getting Customer Data
- Authenticating a Customer
- Creating a Customer
- Resetting their password
- Updating Customer Data
- Logging out

## Creating the CustomerContext

This abstraction follows the same general rules as my initial Cart abstraction POC: a) Create remix-agnostic context in the server entry, b) inject it into loaders and actions, c) orchestrate calling these methods along with other business logic inside the route files.

Pulling more out of server.ts is the longer-term vision with these context providers. For example, I think a `createHydrogenContext` would make sense or even a `createHydrogenRequestHandler` instead. Either way we go there, this is the first right step and will always be an option for users with more bespoke needs that want to create each bit of context individually.

### In file: `server.ts`

The first step is to pass the `storefront` and `session` to a new `CustomerContext` class that we then add to the app context; making it available in all loaders and actions within the app's route modules.

```tsx
// Instantiate a customer class
const customer = new CustomerContext(storefront, session);

const handleRequest = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
  // Add it to the context
  // Note, TS users will have to change the types slightly in remix.d.ts for context.
  getLoadContext: () => ({session, storefront, customer, env}),
});
```

`CustomerContext` also takes a third argument for a custom `customerFragment` that will override the default one defined within the module.

```ts
// Example with `customerFragment` override

const customer = new CustomerContext(storefront, session, {
  customerFragment: /* GraphQL */ `
    fragment Customer on Customer {
      id
      email
      firstName
      lastName
    }
  `;
});

```

This `customerFragment` can also be overwritten on a per-operation basis, but more on that later!

## Getting Customer Data

Now that we have the context setup, it is super easy to get our customer data in the loader. We just call `context.customer.get()`. If we have a logged in customer, we return the data, and `null` if not.

### In file `root.tsx`

```tsx
export async function loader({context}: LoaderArgs) {
  return defer({
    customer: context.customer.get(),
  });
}
```

This data can be called once in the root and the response will be available everywhere using a `useCustomer` hook. The `useCustomer` hook will live in the user's codebase (perhaps generated automatically). This is both tied to remix and requires them to return the customer object at the root of their app in order to work, so abstracting this would be difficult and unlikely to provide any real value.

### In file `components/Layout.tsx`

You can see an example implementation of `useCustomer` below and how it can be used inside a component to show/hide navigation links based on the customer's logged in state.

```tsx
import {NavLink} from '@remix-run/react';
import {useMemo} from 'react';
import {useMatches} from '@remix-run/react';
import type {Customer as CustomerType} from '@shopify/hydrogen/storefront-api-types';

interface LayoutProps {
  children?: React.ReactNode;
  title?: string;
  description?: string | null;
}

export function Layout({children, title, description}: LayoutProps) {
  const customer = useCustomer();
  return (
    <div className="Layout">
      {!customer && (
        <nav>
          <NavLink
            style={({isActive}) => {
              return {
                fontWeight: isActive ? 'bold' : '',
              };
            }}
            to="/account/login"
          >
            Login
          </NavLink>{' '}
          <NavLink
            style={({isActive}) => {
              return {
                fontWeight: isActive ? 'bold' : '',
              };
            }}
            to="/account/register"
          >
            Register
          </NavLink>
        </nav>
      )}
      {customer && (
        <form method="post" action="/account/logout">
          <button className="unstyled" type="submit">
            Log out
          </button>
        </form>
      )}

      <h1>{title} (skeleton)</h1>
      <h2>{description}</h2>

      {children}
    </div>
  );
}

export function useMatchesData(id: string) {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id],
  );

  return route?.data;
}

export function useCustomer(): CustomerType | undefined {
  const data = useMatchesData('root');

  return data?.customer;
}
```

## Authenticating a Customer

Authenticating a customer is as easy as calling `context.customer.authenticate` and passing in the Email/Password payload. We could easily provide a strategy to interface with `remix-auth`, but I've opted to keep things as open and simple as possible in this initial exploration.

As we will continue to see, all operations return `data`, `status` and `headers` which can be used when `redirecting` or displaying error messages.

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

## Creating a Customer

As with login, we call `context.customer.create` with the payload.

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

## Resetting the password

A new route module for the recover form will call `context.customer.recover` with the email that is submitted in via the Form element.

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

This will trigger a reset email with a button that directs the user to the route module below (note the name of the file used to get the params).

This route will parse the `resetToken` and `id` from the route params, and pass that to the `context.customer.reset` method along with the new password that is submitted via the form element.

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

## Updating Customer Data

We can update the customer data via `context.customer.update` and passing in the values from the form (just as we've done a number of times now). Below we are only updating the first and last name for simplicity.

In the example below, we've done something different by overriding the returned `customerFragment` . This gives us a smaller slice of the customer data (found on the `data` key returned from the method) on this operation only. This gives the user more control over the amount of data sent back.

### In file: `account/index.tsx`

```tsx
import {
  type LoaderArgs,
  type ActionFunction,
  defer,
  redirect,
} from '@shopify/remix-oxygen';
import {useLoaderData, Form} from '@remix-run/react';

export async function loader({context, params}: LoaderArgs) {
  const {customer} = context;

  if (!customer.isAuthenticated)
    return redirect(
      params.lang ? `${params.lang}/account/login` : '/account/login',
    );

  return defer({customer: await customer.get({customerFragment})});
}

export const action: ActionFunction = async ({request, context}) => {
  const formData = await request.formData();
  const {customer} = context;

  const firstName = formData.get('firstName');
  const lastName = formData.get('lastName');

  if (!firstName || typeof firstName !== 'string') {
    throw new Error('Please provide a first name.');
  }

  if (!lastName || typeof lastName !== 'string') {
    throw new Error('Please provide a last name.');
  }

  const {status, headers} = await customer.update({
    firstName,
    lastName,
  });

  return new Response(null, {
    status,
    headers,
  });
};

function UpdateForm() {
  const data = useLoaderData();

  return (
    <Form method="post">
      <h2>
        Welcome, {data?.customer?.firstName} {data?.customer?.lastName}
      </h2>

      <input
        id="firstName"
        name="firstName"
        type="text"
        autoComplete="given-name"
        required
        placeholder="First name"
        aria-label="First name"
        defaultValue={data?.customer?.firstName}
      />

      <input
        id="lastName"
        name="lastName"
        type="text"
        autoComplete="family-name"
        required
        placeholder="Last name"
        aria-label="Last name"
        defaultValue={data?.customer?.lastName}
      />

      <button type="submit">Update</button>
    </Form>
  );
}

export default function Account() {
  return <UpdateForm />;
}

export function ErrorBoundary({error}: {error: Error}) {
  return (
    <div>
      <pre>{error.message}</pre>
      <UpdateForm />
    </div>
  );
}

const customerFragment = /* GraphQL */ `
  fragment Customer on Customer {
    id
    email
    firstName
    lastName
  }
`;
```

## Logging out

Finally when logging out, we call `customer.logout` in the action.

### In file `accounts/logout.tsx`

```tsx
import {redirect, type ActionFunction} from '@shopify/remix-oxygen';

export const action: ActionFunction = async ({context}) => {
  const {customer} = context;

  const {headers} = await customer.logout();

  return redirect('/', {headers});
};

export async function loader() {
  return redirect('/');
}

export default function Logout() {
  return null;
}
```

This could also be done in the `loader` but we do not reccommend that as it will cause unexpected behaviour if `Link` elements pointing to this route have the `prefetch="intent"` prop.
