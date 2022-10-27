import {
  type ActionFunction,
  type AppLoadContext,
  redirect,
} from '@hydrogen/remix';
import {LoaderArgs} from '@remix-run/server-runtime';
import {getSession} from '~/lib/session.server';
import {getLocalizationFromUrl} from '~/lib/utils';

export async function logout(request: Request, context: AppLoadContext) {
  const session = await getSession(request, context);
  session.unset('customerAccessToken');
  const {pathPrefix} = getLocalizationFromUrl(request.url);

  return redirect(`${pathPrefix}/account/login`, {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  });
}

export async function loader({request}: LoaderArgs) {
  const {pathPrefix} = getLocalizationFromUrl(request.url);
  console.log('logout - loader', pathPrefix);
  return redirect(pathPrefix);
}

export const action: ActionFunction = async ({
  request,
  context,
}: LoaderArgs) => {
  return logout(request, context);
};
