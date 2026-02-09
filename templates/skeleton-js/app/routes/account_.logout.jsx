import {redirect} from 'react-router';

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login

export async function loader() {
  return redirect('/');
}

/**
 * @param {Route.ActionArgs}
 */
export async function action({context}) {
  return context.customerAccount.logout();
}

/** @typedef {import('./+types/account_.logout').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
