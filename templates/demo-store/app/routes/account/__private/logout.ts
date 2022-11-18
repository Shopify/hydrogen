import {
  type ActionFunction,
  type AppLoadContext,
  redirect,
} from '@shopify/hydrogen-remix';
import {LoaderArgs} from '@remix-run/server-runtime';
import {getSession} from '~/lib/session.server';
import {getLocaleFromRequest} from '~/lib/utils';

export async function logout(request: Request, context: AppLoadContext) {
  const session = await getSession(request, context);
  session.unset('customerAccessToken');

  const {pathPrefix} = getLocaleFromRequest(request);

  return redirect(`${pathPrefix}/account/login`, {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  });
}

export async function loader({request}: LoaderArgs) {
  const {pathPrefix} = getLocaleFromRequest(request);
  return redirect(pathPrefix);
}

export const action: ActionFunction = async ({request, context}) => {
  return logout(request, context);
};
