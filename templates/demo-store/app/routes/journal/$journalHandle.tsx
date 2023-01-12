import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LinksFunction,
  type LoaderArgs,
} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {Image} from '@shopify/hydrogen-react';
import {Blog} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {PageHeader, Section} from '~/components';
import {ATTR_LOADING_EAGER} from '~/lib/const';
import {getLocaleFromRequest} from '~/lib/utils';
import styles from '../../styles/custom-font.css';

const BLOG_HANDLE = 'journal';

export const handle = {
  seo: {
    title: 'Journal',
    description: 'A description',
  },
};

export async function loader({params, request, context}: LoaderArgs) {
  const {language, country} = getLocaleFromRequest(request);

  invariant(params.journalHandle, 'Missing journal handle');

  const {blog} = await context.storefront.query<{
    blog: Blog;
  }>(ARTICLE_QUERY, {
    variables: {
      blogHandle: BLOG_HANDLE,
      articleHandle: params.journalHandle,
      language: context.storefront.i18n?.language,
    },
  });

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  const article = blog.articleByHandle;

  const formattedDate = new Intl.DateTimeFormat(`${language}-${country}`, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article?.publishedAt!));

  return json(
    {article, formattedDate},
    {
      headers: {
        // TODO cacheLong()
      },
    },
  );
}

export const meta: MetaFunction = ({
  data,
}: {
  data: SerializeFrom<typeof loader> | undefined;
}) => {
  return {
    title: data?.article?.seo?.title ?? 'Article',
    description: data?.article?.seo?.description,
  };
};

export const links: LinksFunction = () => {
  return [{rel: 'stylesheet', href: styles}];
};

export default function Article() {
  const {article, formattedDate} = useLoaderData<typeof loader>();

  const {title, image, contentHtml, author} = article;

  return (
    <>
      <PageHeader heading={title} variant="blogPost">
        <span>
          {formattedDate} &middot; {author.name}
        </span>
      </PageHeader>
      <Section as="article" padding="x">
        {image && (
          <Image
            data={image}
            className="w-full mx-auto mt-8 md:mt-16 max-w-7xl"
            sizes="90vw"
            widths={[400, 800, 1200]}
            width="100px"
            loading={ATTR_LOADING_EAGER}
            loaderOptions={{
              scale: 2,
              crop: 'center',
            }}
          />
        )}
        <div
          dangerouslySetInnerHTML={{__html: contentHtml}}
          className="article"
        />
      </Section>
    </>
  );
}

const ARTICLE_QUERY = `#graphql
  query ArticleDetails(
    $language: LanguageCode
    $blogHandle: String!
    $articleHandle: String!
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
`;
