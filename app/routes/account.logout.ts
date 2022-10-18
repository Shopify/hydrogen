import {
  type ActionFunction,
  type AppLoadContext,
  redirect,
} from '@hydrogen/remix';
import {getSession} from '~/lib/session.server';

export async function logout(request: Request, context: AppLoadContext) {
  const session = await getSession(request, context);
  session.unset('customerAccessToken');

  return redirect('/account/login', {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  });
}

export async function loader() {
  return redirect('/');
}

export const action: ActionFunction = async ({request, context}) => {
  return logout(request, context);
};
