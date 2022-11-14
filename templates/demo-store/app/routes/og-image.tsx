import {getShareableImage} from '~/lib/seo/image';
import type {LoaderFunction} from '@shopify/hydrogen-remix';

function SharableImage(props: any) {
  const {title} = props;
  return (
    <svg>
      <text>{title}</text>
    </svg>
  );
}

export const loader: LoaderFunction = async ({request}) => {
  const searchParams = new URL(request.url).searchParams;
  const props = Object.fromEntries(searchParams.entries());
  const response = await getShareableImage(<SharableImage {...props} />);

  return response;
};
