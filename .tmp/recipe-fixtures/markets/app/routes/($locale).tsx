import type {Route} from './+types/($locale)';
import {localeMatchesPrefix} from '~/lib/i18n';

export async function loader({params}: Route.LoaderArgs) {
  if (!localeMatchesPrefix(params.locale ?? null)) {
    throw new Response('Invalid locale', {status: 404});
  }

  return null;
}
