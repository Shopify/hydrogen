/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
  });
}

/** @typedef {import('./+types/account_.login').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
