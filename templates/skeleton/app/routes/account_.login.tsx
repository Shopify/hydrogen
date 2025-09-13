import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({request, context}: LoaderFunctionArgs) {
  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
  });
}
