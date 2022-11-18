import {
  type ActionFunction,
  type AppLoadContext,
  redirect,
} from '@shopify/hydrogen-remix';
import {LoaderArgs} from '@remix-run/server-runtime';

export async function logout(
  context: AppLoadContext,
  params: LoaderArgs['params'],
) {
  const {session, sessionStorage} = context;
  session.unset('customerAccessToken');

  return redirect(
    params.lang ? `${params.lang}/account/login` : '/account/login',
    {
      headers: {
        'Set-Cookie': await sessionStorage.commitSession(session),
      },
    },
  );
}

export async function loader({params}: LoaderArgs) {
  return redirect(params.lang ? `${params.lang}/` : '/');
}

export const action: ActionFunction = async ({context, params}) => {
  return await logout(context, params);
};
