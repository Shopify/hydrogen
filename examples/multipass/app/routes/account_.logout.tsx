import {data, redirect} from 'react-router';
import type {Route} from './+types/account_.logout';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Logout'}];
};

export async function loader() {
  return redirect('/account/login');
}

export async function action({request, context}: Route.ActionArgs) {
  const {session} = context;
  session.unset('customerAccessToken');

  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  return redirect('/');
}

export default function Logout() {
  return null;
}
