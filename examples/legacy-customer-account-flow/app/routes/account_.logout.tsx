import {
  data,
  redirect,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';

export const meta: MetaFunction = () => {
  return [{title: 'Logout'}];
};

export async function loader() {
  return redirect('/account/login');
}

export async function action({request, context}: ActionFunctionArgs) {
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
