import {redirect, type ActionArgs} from '@shopify/remix-oxygen';

export async function loader() {
  return redirect('/account/login');
}

export async function action({context}: ActionArgs) {
  const {session} = context;
  session.unset('customerAccessToken');

  return redirect(`/account/login`, {
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Set-Cookie': await session.commit(),
    },
  });
}

export default function Logout() {
  return null;
}
