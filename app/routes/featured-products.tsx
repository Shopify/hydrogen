import {json, type LoaderArgs} from '@hydrogen/remix';
import {getFeaturedData} from '~/data';
import {getLocalizationFromUrl} from '~/lib/utils';

export async function loader({request}: LoaderArgs) {
  return json(
    await getFeaturedData({locale: getLocalizationFromUrl(request.url)}),
  );
}
