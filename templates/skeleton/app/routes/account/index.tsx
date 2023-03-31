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
