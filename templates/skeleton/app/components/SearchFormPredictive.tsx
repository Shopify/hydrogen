import {useFetcher, useNavigate, type FormProps} from '@remix-run/react';
import React, {useRef, useEffect} from 'react';
import type {action as predictiveSearchAction} from '~/routes/search';
import { useAside } from './Aside';

type SearchFormPredictiveChildren = (args: {
  fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
  goToSearch: () => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  fetcher: ReturnType<typeof useFetcher<typeof predictiveSearchAction>>;
}) => React.ReactNode;

type SearchFormPredictiveProps = Omit<FormProps, 'children'> & {
  children: SearchFormPredictiveChildren | null;
};

/**
 *  Search form component that sends search requests to the `/search` route
 **/
export function SearchFormPredictive({
  children,
  className = 'predictive-search-form',
  ...props
}: SearchFormPredictiveProps) {
  const fetcher = useFetcher<typeof predictiveSearchAction>({key: 'search'});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const aside = useAside();

  /** Reset the input value and blur the input */
  function resetInput(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!inputRef?.current || inputRef.current.value === '') {
      return;
    }
    inputRef.current.blur();
  }

  /** Navigate to the search page with the current input value */
  function goToSearch() {
    const searchUrl = inputRef?.current?.value
      ? `/search?q=${inputRef.current.value}`
      : `/search`;
    navigate(searchUrl);
    aside.close();
    return;
  }

  /** Fetch search results based on the input value */
  function fetchResults(event: React.ChangeEvent<HTMLInputElement>) {
    const term = event.target.value || '';
    const idle = fetcher.state === 'idle';
    const error = fetcher?.data?.error;
    console.log('submit',{term, idle, error})

    // if (!idle || error || !term) return;
    fetcher.submit({q: term, limit: 10}, {method: 'POST', action: '/search'});
    return;
  }

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  if (typeof children !== 'function') {
    return null;
  }

  return (
    <fetcher.Form {...props} className={className} onSubmit={resetInput}>
      {children({inputRef, fetcher, fetchResults, goToSearch})}
    </fetcher.Form>
  );
}
