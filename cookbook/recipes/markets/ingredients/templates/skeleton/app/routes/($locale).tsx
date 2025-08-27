import type {LoaderFunctionArgs} from 'react-router';
import {localeMatchesPrefix} from '~/lib/i18n';

export async function loader({params}: LoaderFunctionArgs) {
  if (!localeMatchesPrefix(params.locale ?? null)) {
    throw new Response('Invalid locale', {status: 404});
  }

  return null;
}
