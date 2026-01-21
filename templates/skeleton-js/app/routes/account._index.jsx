import {redirect} from 'react-router';

export async function loader() {
  return redirect('/account/orders');
}

/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
