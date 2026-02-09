import {redirect} from 'react-router';

// fallback wild card for all unauthenticated routes in account section
/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  context.customerAccount.handleAuthStatus();

  return redirect('/account');
}

/** @typedef {import('./+types/account.$').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
