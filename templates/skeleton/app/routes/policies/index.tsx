import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Link} from '@remix-run/react';

export async function loader({context: {storefront}}: LoaderArgs) {
  const data = await storefront.query(POLICIES_QUERY);
  const policies = Object.values(data.shop || {});

  if (policies.length === 0) {
    throw new Response('No policies found', {status: 404});
  }

  return json({policies});
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <ul className="policies">
      {policies.map((policy) => {
        if (!policy) return null;
        return (
          <li key={policy.id}>
            <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
          </li>
        );
      })}
    </ul>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }

  query StorePolicies {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;
