import {
  json,
  type MetaFunction,
  type LoaderArgs,
  type ErrorBoundaryComponent,
} from '@shopify/remix-oxygen';
import {
  useLoaderData,
  type V2_MetaFunction,
  useCatch,
  useRouteError,
  isRouteErrorResponse,
} from '@remix-run/react';
import {Shop} from '@shopify/hydrogen/storefront-api-types';

export async function loader({params, context}: LoaderArgs) {
  const handle = params.policyHandle;

  if (!handle) {
    throw new Response('No handle was passed in', {status: 404});
  }

  const policyName = handle.replace(/-([a-z])/g, (_: unknown, m1: string) =>
    m1.toUpperCase(),
  ) as SelectedPolicies;

  const data = await context.storefront.query<{
    shop: Pick<Shop, SelectedPolicies>;
  }>(POLICY_CONTENT_QUERY, {
    variables: {
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
      language: context.storefront.i18n?.language,
    },
  });

  const policy = data.shop?.[policyName];

  if (!policy) {
    throw new Response('Could not find the policy', {status: 404});
  }

  return json({policy});
}

export const metaV1: MetaFunction<typeof loader> = ({data}) => {
  const title = data?.policy?.title ?? 'Policies';
  return {title};
};

export const meta: V2_MetaFunction<typeof loader> = ({data}) => {
  const title = data?.policy?.title ?? 'Policies';
  return [{title}];
};

export default function Policies() {
  const {policy} = useLoaderData<typeof loader>();

  return (
    <>
      <h1>{policy.title}</h1>
      <div dangerouslySetInnerHTML={{__html: policy.body}} />
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

const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }

  query policy_query(
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
    $refundPolicy: Boolean!
  ) @inContext(language: $language) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...Policy
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...Policy
      }
      termsOfService @include(if: $termsOfService) {
        ...Policy
      }
      refundPolicy @include(if: $refundPolicy) {
        ...Policy
      }
    }
  }
`;

const policies = [
  'privacyPolicy',
  'shippingPolicy',
  'refundPolicy',
  'termsOfService',
] as const;

type SelectedPolicies = (typeof policies)[number];
