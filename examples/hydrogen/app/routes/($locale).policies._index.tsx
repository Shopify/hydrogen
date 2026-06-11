import { gql } from "@shopify/hydrogen";
import { useLoaderData, Link } from "react-router";

import type { Route } from "./+types/($locale).policies._index";

export async function loader({ context }: Route.LoaderArgs) {
  const data = await context.storefront.query(POLICIES_QUERY);

  const shopPolicies = data.shop;
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
    shopPolicies?.subscriptionPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  if (!policies.length) {
    throw new Response("No policies found", { status: 404 });
  }

  return { policies };
}

export default function Policies() {
  const { policies } = useLoaderData<typeof loader>();

  return (
    <div className="policies">
      <h1>Policies</h1>
      <div>
        {policies.map((policy) => (
          <fieldset key={policy.id}>
            <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

const POLICIES_QUERY = gql(`
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
`);

type PolicyItemFragment = {
  id: string;
  title: string;
  handle: string;
};

type PoliciesQuery = {
  shop?: {
    privacyPolicy?: PolicyItemFragment | null;
    shippingPolicy?: PolicyItemFragment | null;
    termsOfService?: PolicyItemFragment | null;
    refundPolicy?: PolicyItemFragment | null;
    subscriptionPolicy?: PolicyItemFragment | null;
  } | null;
};
