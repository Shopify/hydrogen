import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LoaderArgs,
  type LinksFunction,
} from '@hydrogen/remix';
import {useLoaderData} from '@remix-run/react';
import {Image} from '@shopify/hydrogen-ui-alpha';
import invariant from 'tiny-invariant';
import {PageHeader, Section} from '~/components';
import {getArticle} from '~/data';
import {ATTR_LOADING_EAGER} from '~/lib/const';
import {getLocalizationFromLang} from '~/lib/utils';
import styles from '../../styles/custom-font.css';

const BLOG_HANDLE = 'journal';

export async function loader({params}: LoaderArgs) {
  const {language, country} = getLocalizationFromLang(params.lang);

  invariant(params.journalHandle, 'Missing journal handle');

  const article = await getArticle({
    blogHandle: BLOG_HANDLE,
    articleHandle: params.journalHandle,
    params,
  });

  const formattedDate = new Intl.DateTimeFormat(`${language}-${country}`, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

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
