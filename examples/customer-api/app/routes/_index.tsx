import {Form, useLoaderData, useRouteError} from '@remix-run/react';
import {type LoaderFunctionArgs, json} from '@shopify/remix-oxygen';

export async function loader({context}: LoaderFunctionArgs) {
  if (await context.customer.isLoggedIn()) {
    const {data} = await context.customer.query<{
      customer: {firstName: string; lastName: string};
    }>(`#graphql:customer
      query getCustomer {
        customer {
          firstName
          lastName
        }
      }
      `);

    return json(
      {
        customer: data.customer,
      },
      {
        headers: {
          'Set-Cookie': await context.session.commit(),
        },
      },
    );
  }

  return json(
    {customer: null},
    {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}

export function ErrorBoundary() {
  const error = useRouteError() as Error;
  return (
    <>
      <h2>
        <b>Error loading the user:</b>
      </h2>
      <p>{error.message}</p>

      <Form method="post" action="/logout" style={{marginTop: 24}}>
        <button>Logout</button>
      </Form>
    </>
  );
}

export default function () {
  const {customer} = useLoaderData<typeof loader>();

  return (
    <div style={{marginTop: 24}}>
      {customer ? (
        <>
          <div style={{marginBottom: 24}}>
            <b>
              Welcome {customer.firstName} {customer.lastName}
            </b>
          </div>
          <div>
            <Form method="post" action="/logout">
              <button>Logout</button>
            </Form>
          </div>
        </>
      ) : null}
      {!customer ? (
        <Form method="post" action="/authorize">
          <button>Login</button>
        </Form>
      ) : null}
    </div>
  );
}
