import {
  type ActionFunction,
  type AppLoadContext,
  redirect,
} from '@hydrogen/remix';
import {LoaderArgs} from '@remix-run/server-runtime';
import {getSession} from '~/lib/session.server';

export async function logout(
  request: Request,
  context: AppLoadContext,
  params: LoaderArgs['params'],
) {
  const session = await getSession(request, context);
  session.unset('customerAccessToken');

  return redirect(
    params.lang ? `${params.lang}/account/login` : '/account/login',
    {
      headers: {
        'Set-Cookie': await session.commit(),
      },
    },
  );
}

export async function loader({params}: LoaderArgs) {
  return redirect(params.lang ? `${params.lang}/` : '/');
}

export const action: ActionFunction = async ({request, context, params}) => {
  return logout(request, context, params);
};
