import {json, type MetaFunction, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type V2_MetaFunction} from '@remix-run/react';

import {ShopPolicy} from '@shopify/hydrogen/storefront-api-types';

export async function loader({params, context}: LoaderArgs) {
  const handle = params.policyHandle;

  if (!handle) {
    throw new Response(null, {status: 404});
  }

  const policyName = handle.replace(/-([a-z])/g, (_: unknown, m1: string) =>
    m1.toUpperCase(),
  );

  const data = await context.storefront.query<{
    shop: Record<string, ShopPolicy>;
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
    throw new Response(null, {status: 404});
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

const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }

  query PoliciesQuery(
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
