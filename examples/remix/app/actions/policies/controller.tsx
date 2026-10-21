import { gql } from "@shopify/hydrogen";
import { unsafeHTML } from "remix/component";
import { createController } from "remix/router";

import { localizePath } from "../../lib/public/i18n.ts";
import { contentCache, requireData } from "../../lib/storefront.ts";
import { routes } from "../../routes.ts";
import { Document } from "../../ui/document.tsx";
import { NotFoundPage } from "../../ui/error-pages.tsx";

const POLICIES_QUERY = gql(`
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies($country: CountryCode, $language: LanguageCode)
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

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/Shop
const POLICY_CONTENT_QUERY = gql(`
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query Policy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $refundPolicy: Boolean!
    $shippingPolicy: Boolean!
    $subscriptionPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
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
      # A ShopPolicyWithDefault, so it can't use the ShopPolicy fragment.
      subscriptionPolicy @include(if: $subscriptionPolicy) {
        body
        handle
        id
        title
        url
      }
    }
  }
`);

const POLICY_BY_HANDLE = {
  "privacy-policy": "privacyPolicy",
  "shipping-policy": "shippingPolicy",
  "terms-of-service": "termsOfService",
  "refund-policy": "refundPolicy",
  "subscription-policy": "subscriptionPolicy",
} as const;

export default createController(routes.policies, {
  actions: {
    async index({ locale, render, shopify }) {
      const { shop } = requireData(
        await shopify.storefront.graphql(POLICIES_QUERY, { cache: contentCache() }),
      );
      const policies = [
        shop.privacyPolicy,
        shop.shippingPolicy,
        shop.termsOfService,
        shop.refundPolicy,
        shop.subscriptionPolicy,
      ].filter((policy) => policy != null);

      return render(
        <Document title="Hydrogen | Policies">
          <div class="policies">
            <h1>Policies</h1>
            <div>
              {policies.map((policy) => (
                <fieldset key={policy.id}>
                  <a
                    href={localizePath(
                      routes.policies.show.href({ handle: policy.handle }),
                      locale.pathPrefix,
                    )}
                  >
                    {policy.title}
                  </a>
                </fieldset>
              ))}
            </div>
          </div>
        </Document>,
      );
    },

    async show({ locale, params, render, request, shopify }) {
      const notFound = () =>
        render(<NotFoundPage pathname={new URL(request.url).pathname} />, { status: 404 });
      if (!Object.hasOwn(POLICY_BY_HANDLE, params.handle)) return notFound();
      const policyName = POLICY_BY_HANDLE[params.handle as keyof typeof POLICY_BY_HANDLE];

      const { shop } = requireData(
        await shopify.storefront.graphql(POLICY_CONTENT_QUERY, {
          cache: contentCache(),
          variables: {
            privacyPolicy: false,
            shippingPolicy: false,
            termsOfService: false,
            refundPolicy: false,
            subscriptionPolicy: false,
            [policyName]: true,
          },
        }),
      );
      const policy = shop[policyName];
      if (!policy) return notFound();

      return render(
        <Document title={`Hydrogen | ${policy.title}`}>
          <div class="policy">
            <br />
            <br />
            <div>
              <a href={localizePath(routes.policies.index.href(), locale.pathPrefix)}>
                ← Back to Policies
              </a>
            </div>
            <br />
            <h1>{policy.title}</h1>
            {/* Merchant-authored HTML from the Storefront API. */}
            <div innerHTML={unsafeHTML(policy.body)} />
          </div>
        </Document>,
      );
    },
  },
});
