import {useFetcher, type FetcherWithComponents} from '@remix-run/react';
import type {ReactNode} from 'react';
import type {NewsletterSubscribeResponse} from '~/lib/newsletter';

type NewsletterFormProps = {
  /**
   * Children nodes of CartForm.
   * Children can be a render prop that receives the fetcher.
   */
  children:
    | (({
        fetcher,
        error,
      }: {
        fetcher: FetcherWithComponents<any>;
        error: NewsletterSubscribeResponse['error'];
      }) => ReactNode)
    | ReactNode;
  /**
   * The route to submit the form to.
   */
  route?: string;
  /**
   * Optional key to use for the fetcher.
   * @see https://remix.run/hooks/use-fetcher#key
   */
  fetcherKey?: string;
};

export function NewsletterSubscribeForm({
  children,
  route = '/api/newsletter-subscribe',
  fetcherKey = 'newsletter-subscribe',
}: NewsletterFormProps): JSX.Element {
  const fetcher = useFetcher<NewsletterSubscribeResponse>({
    key: fetcherKey,
  });

  return (
    <fetcher.Form action={route} method="post">
      {typeof children === 'function'
        ? children({
            fetcher,
            error: fetcher?.data?.error || null,
          })
        : children}
    </fetcher.Form>
  );
}
