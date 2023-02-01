import {
  redirect,
  type ActionFunction,
  type AppLoadContext,
  type LoaderArgs,
  type ActionArgs,
} from '@shopify/remix-oxygen';
import {I18nLocale} from '~/lib/type';

export async function doLogout(context: AppLoadContext) {
  const {session} = context;
  session.unset('customerAccessToken');

  // The only file where I have to explicitly type cast i18n to pass typecheck
  return redirect(
    `${(context.storefront.i18n as I18nLocale).pathPrefix}/account/login`,
    {
      headers: {
        'Set-Cookie': await session.commit(),
      },
    },
  );
}

export async function loader({context}: LoaderArgs) {
  return redirect((context.storefront.i18n as I18nLocale).pathPrefix);
}

export const action: ActionFunction = async ({context}: ActionArgs) => {
  return doLogout(context);
};
