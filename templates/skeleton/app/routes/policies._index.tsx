import {
  json,
  type MetaArgs,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {useLoaderData, Link} from '@remix-run/react';
import {getSeoMeta} from '@shopify/hydrogen';
import {seoPayload} from '~/lib/seo';

export async function loader({context, request}: LoaderFunctionArgs) {
  const data = await context.storefront.query(POLICIES_QUERY);
  const policies = Object.values(data.shop || {}).filter(Boolean);

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }
  const seo = seoPayload.policies({policies, url: request.url});

  return json({policies, seo});
}

export const meta = ({matches}: MetaArgs<typeof loader>) => {
  return getSeoMeta(...matches.map((match) => (match.data as any)?.seo));
};

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <div className="policies">
      <h1>Policies</h1>
      <div>
        {policies.map((policy) => {
          if (!policy) return null;
          return (
            <fieldset key={policy.id}>
              <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
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
