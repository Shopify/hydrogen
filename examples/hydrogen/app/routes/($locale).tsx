import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params, context }: LoaderFunctionArgs) {
  // The `$locale` segment matched something the i18n definition does not recognize (the default
  // locale is served unprefixed, so `/en-us/...` lands here too). One canonical URL per page.
  if (params.locale && !context.storefront.locale.pathPrefix) {
    throw new Response(null, { status: 404 });
  }

  return null;
}
