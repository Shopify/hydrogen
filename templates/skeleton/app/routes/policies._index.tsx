import {
  json,
  type LoaderArgs,
  type ErrorBoundaryComponent,
} from '@shopify/remix-oxygen';
import {
  useLoaderData,
  Link,
  useCatch,
  useRouteError,
  isRouteErrorResponse,
} from '@remix-run/react';
import type {Shop} from '@shopify/hydrogen/storefront-api-types';

export async function loader({context: {storefront}}: LoaderArgs) {
  const data = await storefront.query<{
    shop: Pick<Shop, SelectedPolicies>;
  }>(POLICIES_QUERY);

  const policies = Object.values(data.shop || {});

  if (policies.length === 0) {
    throw new Response('Not found', {status: 404});
  }

  return json({
    policies,
  });
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <>
      {policies.map((policy) => {
        return (
          policy && (
            <Link key={policy.id} to={`/policies/${policy.handle}`}>
              {policy.title}
            </Link>
          )
        );
      })}
    </>
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

const POLICIES_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    id
    title
    handle
  }

  query PoliciesQuery {
    shop {
      privacyPolicy {
        ...Policy
      }
      shippingPolicy {
        ...Policy
      }
      termsOfService {
        ...Policy
      }
      refundPolicy {
        ...Policy
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
`;

const policies = [
  'privacyPolicy',
  'shippingPolicy',
  'refundPolicy',
  'termsOfService',
  'subscriptionPolicy',
] as const;

type SelectedPolicies = (typeof policies)[number];
