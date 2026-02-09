/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  return context.customerAccount.authorize();
}

/** @typedef {import('./+types/account_.authorize').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
