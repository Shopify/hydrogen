import {redirect} from '@hydrogen/remix';
import {getLocalizationFromUrl} from '~/lib/utils';

export async function loader({request}) {
  const {pathPrefix} = getLocalizationFromUrl(request.url);
  return redirect(`${pathPrefix}/products`);
}
