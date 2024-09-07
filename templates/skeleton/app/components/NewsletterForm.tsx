import {useFetcher, type FetcherWithComponents} from '@remix-run/react';
import type {ReactNode} from 'react';
import type {NewsletterSubscribeHandlerResponse} from './newsletterSubscribeHandler';

type NewsletterFormProps = {
  /**
   * Children nodes of CartForm.
   * Children can be a render prop that receives the fetcher.
   */
  children:
    | ((
        fetcher: FetcherWithComponents<any>,
        isSuccessful?: NewsletterSubscribeHandlerResponse['isSuccessful'],
        simplifyError?: NewsletterSubscribeHandlerResponse['simplifyError'],
        userErrors?: NewsletterSubscribeHandlerResponse['userErrors'],
        apiErrors?: NewsletterSubscribeHandlerResponse['apiErrors'],
      ) => ReactNode)
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
  const fetcher = useFetcher<NewsletterSubscribeHandlerResponse>({
    key: fetcherKey,
  });

  return (
    <fetcher.Form action={route} method="post">
      {typeof children === 'function'
        ? children(
            fetcher,
            fetcher.data?.isSuccessful,
            fetcher.data?.simplifyError,
            fetcher.data?.userErrors,
            fetcher.data?.apiErrors,
          )
        : children}
    </fetcher.Form>
  );
}
