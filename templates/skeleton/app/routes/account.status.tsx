import type {ShouldRevalidateFunction} from '@remix-run/react';
import {type LoaderFunctionArgs, json} from '@remix-run/server-runtime';

export const shouldRevalidate: ShouldRevalidateFunction = ({formAction}) => {
  return !!formAction?.startsWith('/account');
};

export async function loader({context}: LoaderFunctionArgs) {
  return json({
    isLoggedIn: await context.customerAccount.isLoggedIn(),
  });
}
