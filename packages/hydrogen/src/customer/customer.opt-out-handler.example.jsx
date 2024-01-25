import {
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  useLocation,
} from '@remix-run/react';
import {json} from '@shopify/remix-oxygen';

export async function loader({context}) {
  if (!(await context.customerAccount.isLoggedIn())) {
    throw new Response('Customer is not login', {
      status: 401,
    });
  }

  const {data} = await context.customerAccount.query(
    `#graphql
    query getCustomer {
      customer {
        firstName
        lastName
      }
    }
    `,
  );

  return json(
    {customer: data.customer},
    {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();

  if (isRouteErrorResponse(error)) {
    if (error.status == 401) {
      return (
        <a
          href={`/account/login?${new URLSearchParams({
            return_to: location.pathname,
          }).toString()}`}
        >
          Login
        </a>
      );
    }
  }
}

export default function () {
  const {customer} = useLoaderData();

  return (
    <div style={{marginTop: 24}}>
      {customer ? (
        <>
          <div style={{marginBottom: 24}}>
            <b>
              Welcome {customer.firstName} {customer.lastName}
            </b>
          </div>
        </>
      ) : null}
    </div>
  );
}
