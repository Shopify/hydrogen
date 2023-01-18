import {
  redirect,
  type ActionFunction,
  type AppLoadContext,
  type LoaderArgs,
} from '@shopify/remix-oxygen';

export async function logout(context: AppLoadContext) {
  const {session} = context;
  session.unset('customerAccessToken');

  return redirect(`${context.storefront.i18n.pathPrefix}/account/login`, {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  });
}

export async function loader({context}: LoaderArgs) {
  return redirect(context.storefront.i18n.pathPrefix);
}

export const action: ActionFunction = async ({context}) => {
  return logout(context);
};
