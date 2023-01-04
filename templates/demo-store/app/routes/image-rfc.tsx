import {type LoaderArgs} from '@remix-run/server-runtime';
import {useLoaderData} from '@remix-run/react';
import {json} from '@shopify/remix-oxygen';
import {Image} from '@shopify/hydrogen';

/* @TODO: 
  - [ ] Support original aspect ratio
  - [ ] Picture element
  - [ ] Support for non-100% widths
  - [ ] Support for third party data loaders
  - [ ] Create guide/docs
  - [ ] Scale seems auto-detected; confirm true, and if so, remove prop
  - [ ] Consider `loaded` render prop, for blurred placeholder
  - [ ] Write tests
  - [ ] Bikeshed on prop names
  - [ ] Improve types / intellisense support
*/

const IMAGE_FRAGMENT = `#graphql
  fragment Image on Image {
    altText
    url
  }
`;

type ImageRFCData = {
  product: {
    featuredImage: {
      altText: string;
      url: string;
    };
  };
};

export async function loader({context: {storefront}}: LoaderArgs) {
  const data: ImageRFCData = await storefront.query(
    `#graphql
    query {
      product(handle: "snowboard") {
       featuredImage {
         ...Image
       }
      }
    }
    ${IMAGE_FRAGMENT}
  `,
    {
      variables: {},
    },
  );

  return json(data.product.featuredImage);
}

export default function ImageRFC() {
  const {altText, url} = useLoaderData<typeof loader>();

  return <Image src={url} alt={altText} aspectRatio="1/1" sizes="100vw" />;

  /* Picture component should look something like:
      <Picture
        width="100%"
        {...props}>
        <Image 
          src={data.src} 
          aspectRatio="4/5" 
          sizes="100vw" 
          media="(min-width: 800px)" />
        <Image 
          src={data.src} 
          aspectRatio="2/3" 
          sizes="100vw" 
          media="(min-width: 1200px)" />
    </Picture>

    When inside <Picture /> the <Image /> component should render a <source> element,
    the last <Image /> component should render an <img> element.
  */
}
