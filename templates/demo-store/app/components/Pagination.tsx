import {useCallback, useEffect} from 'react';
import type {PageInfo} from '@shopify/hydrogen-react/storefront-api-types';

import {useInView} from 'react-intersection-observer';
import {useTransition, useLocation, useNavigate} from '@remix-run/react';

import {Button} from '~/components';

type Connection = {
  pageInfo: PageInfo;
  nodes: unknown[];
};

type Props<Resource extends Connection> = {
  connection: Resource;
  autoLoadOnScroll?: boolean;
};

export function Pagination<Resource extends Connection>({
  connection,
  children = () => null,
  autoLoadOnScroll = false,
}: Props<Resource> & {
  children: (props: {nodes: Resource['nodes']}) => React.ReactNode;
}) {
  const transition = useTransition();
  const isIdle = transition.state === 'idle';
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const navigate = useNavigate();

  const {ref, inView} = useInView({
    threshold: 0,
  });

  const {
    pageInfo: {startCursor, endCursor, hasPreviousPage, hasNextPage},
    nodes,
  } = connection;

  const loadNextPage = useCallback(() => {
    if (!autoLoadOnScroll) return;
    if (!inView) return;
    if (!hasNextPage) return;
    if (!endCursor) return;
    if (!isIdle) return;

    const href =
      location.pathname + `?index&cursor=${endCursor}&direction=next`;

    navigate(href, {
      state: {
        nodes,
        pageInfo: {startCursor, endCursor, hasPreviousPage, hasNextPage},
      },
    });
  }, [
    autoLoadOnScroll,
    endCursor,
    hasNextPage,
    hasPreviousPage,
    inView,
    isIdle,
    nodes,
    location.pathname,
    navigate,
    startCursor,
  ]);

  useEffect(loadNextPage, [endCursor, inView]);

  return (
    <>
      {hasPreviousPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={`?${new URLSearchParams({
              q: params.get('q') || '',
              cursor: startCursor || '',
              direction: 'previous',
            }).toString()}`}
            disabled={!isIdle}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              pageInfo: {
                endCursor,
                startCursor,
                hasNextPage,
              },
              nodes,
            }}
          >
            {transition.state === 'loading'
              ? 'Loading...'
              : 'Load previous products'}
          </Button>
        </div>
      )}

      {children({nodes})}

      {hasNextPage && endCursor && (
        <div ref={ref} className="flex items-center justify-center mt-6">
          <Button
            to={`?${new URLSearchParams({
              q: params.get('q') || '',
              cursor: endCursor || '',
              direction: 'next',
            }).toString()}`}
            disabled={!isIdle}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              pageInfo: {
                endCursor,
                startCursor,
                hasPreviousPage,
              },
              nodes,
            }}
          >
            {transition.state !== 'idle' ? 'Loading...' : 'Load more products'}
          </Button>
        </div>
      )}
    </>
  );
}
