import {
  json,
  type MetaFunction,
  type LoaderArgs,
  SerializeFrom,
} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import invariant from 'tiny-invariant';
import type {Page as PageType} from '@shopify/hydrogen-react/storefront-api-types';

export async function loader({params, context}: LoaderArgs) {
  invariant(params.pageHandle, 'Missing page handle');

  const {page} = await context.storefront.query<{page: PageType}>(PAGE_QUERY, {
    variables: {
      handle: params.pageHandle,
    },
  });

  if (!page) {
    throw new Response('Not Found', {
      status: 404,
    });
  }

  return json({page});
}

export const handle = {
  seo: (data: SerializeFrom<typeof loader> | undefined) => {
    return {
      title: data?.page?.seo?.title,
      description: data?.page?.seo?.description,
    };
  },
};

export const meta: MetaFunction = ({data}) => {
  const {title, description} = data?.page.seo ?? {};

  return {
    title,
    description,
  };
};

export default function Page() {
  const {page} = useLoaderData<typeof loader>();

  return (
    <>
      <header>
        <h1>{page.title}</h1>
      </header>
      <main dangerouslySetInnerHTML={{__html: page.body}} />
    </>
  );
}

const PAGE_QUERY = `#graphql
    query PageDetails($language: LanguageCode, $handle: String!)
    @inContext(language: $language) {
      page(handle: $handle) {
        id
        title
        body
        seo {
          description
          title
        }
      }
    }
  `;
