import {
  json,
  type MetaFunction,
  type LoaderArgs,
  SerializeFrom,
} from '@shopify/remix-oxygen';
import {useLoaderData, useCatch} from '@remix-run/react';
import invariant from 'tiny-invariant';
import type {Page as PageType} from '@shopify/hydrogen/storefront-api-types';
import type {SeoHandleFunction} from '@shopify/hydrogen';

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

const seo: SeoHandleFunction<typeof loader> = ({data}) => ({
  title: data?.page?.seo?.title,
  description: data?.page?.seo?.description,
});

// wait what's going on here??
export const handle = {
  seo,
};

export const meta: MetaFunction = ({data}) => {
  try {
    const {title, description} = data?.page.seo ?? {};

    return {
      title,
      description,
    };
  } catch (error) {
    console.error(error);
    return {};
  }
};

export function ErrorBoundary({error}: {error: unknown}) {
  return (
    <div>
      There was an error!
      <div>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    </div>
  );
}

export function CatchBoundary() {
  const {status, statusText, data} = useCatch();
  return (
    <div>
      There was a problem with your request. The server responded with:
      <div>
        <pre>{status}</pre>
      </div>
      <div>
        <pre>{statusText}</pre>
      </div>
      <div>
        <pre>{String(data)}</pre>
      </div>
    </div>
  );
}

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
