import {useEffect, useRef} from 'react';
import {useParams, useFetcher} from '@remix-run/react';
import type {FormProps} from '@remix-run/react';

type ChildrenRenderProps = {
  fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
};

type SearchFromProps = {
  action?: FormProps['action'];
  method?: FormProps['method'];
  className?: string;
  children: (passedProps: ChildrenRenderProps) => React.ReactNode;
};

/**
 *  Search form component that posts search requests to the `/search` route
 **/
export function SearchForm({
  className,
  action,
  children,
  method = 'POST',
}: SearchFromProps) {
  const params = useParams();
  const fetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement | null>(null);

  function fetchResults(event: React.ChangeEvent<HTMLInputElement>) {
    const newSearchTerm = event.target.value || '';
    action = `${
      params.locale
        ? `/${params.locale}/api/predictive-search`
        : `/api/predictive-search`
    }`;
    fetcher.submit({q: newSearchTerm}, {method, action});
  }

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  return (
    <fetcher.Form
      className={className}
      onSubmit={(event) => {
        if (!inputRef?.current || inputRef.current.value === '') {
          event.preventDefault();
          return;
        }
        inputRef.current.blur();
      }}
    >
      {children({fetchResults, inputRef})}
    </fetcher.Form>
  );
}
