import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Link} from '@remix-run/react';

export async function loader({context: {storefront}}: LoaderArgs) {
  const data = await storefront.query(POLICIES_QUERY);
  const policies = Object.values(data.shop || {});

  // TODO: I need to sort out the 404 throwing response catching/page
  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return json({policies});
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <section className="policies">
      <h1>Policies</h1>
      <div className="policies">
        {policies.map((policy) => {
          if (!policy) return null;
          return (
            <fieldset key={policy.id}>
              <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}

const POLICIES_QUERY = `#graphql
  query Policies {
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
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
` as const;
