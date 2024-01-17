import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({context, params}: LoaderFunctionArgs) {
  const locale = params.locale;
  return context.customerAccount.authorize(
    locale ? `/${locale}/account` : '/account',
  );
}
