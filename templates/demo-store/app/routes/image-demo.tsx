import {type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {json} from '@shopify/remix-oxygen';
import {Image} from '@shopify/hydrogen';

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

export default function ImageRFC() {
  const {altText, url} = useLoaderData<typeof loader>();

  return (
    <>
      <Image
        loading="eager"
        src={url}
        alt={altText}
        aspectRatio="1/1"
        sizes="100vw"
      />
      <Image
        src={url}
        alt={altText}
        aspectRatio="4/3"
        width="50vw"
        sizes="50vw"
      />
      <Image src={url} alt={altText} width="30vw" sizes="30vw" />
      <Image src={url} alt={altText} width={100} height={200} />
      <Image src={url} alt={altText} width="5rem" />
    </>
  );

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
