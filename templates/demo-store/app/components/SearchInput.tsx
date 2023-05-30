import clsx from 'clsx';
import React, {useEffect} from 'react';
import {useParams, Form} from '@remix-run/react';
import type {FetcherWithComponents} from '@remix-run/react';

import {IconSearch, Input} from '~/components';

export function SearchInput({
  isHome,
  searchInputRef,
  searchFetcher,
  className,
}: {
  isHome: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  // FIX: type this <FetcherWithComponent
  searchFetcher: FetcherWithComponents<any>;
  className?: string;
}) {
  const params = useParams();

  function fetchSearchResults(event: React.ChangeEvent<HTMLInputElement>) {
    const newSearchTerm = event.target.value;
    if (!newSearchTerm) return;
    const searchTermURI = encodeURIComponent(newSearchTerm);
    const searchEndpoint = `${
      params.locale
        ? `/${params.locale}/api/predictive-search?q=${searchTermURI}`
        : `/api/predictive-search?q=${searchTermURI}`
    }`;
    searchFetcher.load(searchEndpoint);
  }

  // If cmd+K is pressed, focus the search input
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchInputRef]);

  return (
    <Form
      method="get"
      className="flex items-center gap-2"
      onSubmit={(event) => {
        if (!searchInputRef?.current || searchInputRef.current.value === '') {
          event.preventDefault();
          return;
        }
        searchInputRef.current.blur();
      }}
    >
      <Input
        className={clsx(
          isHome
            ? 'focus:border-contrast/20 dark:focus:border-primary/20'
            : 'focus:border-primary/20',
        )}
        name="q"
        onChange={fetchSearchResults}
        onFocus={fetchSearchResults}
        placeholder="Search"
        ref={searchInputRef}
        type="search"
        value={searchInputRef.current?.value || ''}
        variant="minisearch"
      />
      <button type="submit" className={className}>
        <IconSearch />
      </button>
    </Form>
  );
}

/**
<SearchForm className="flex items-center gap-2" >
  {({fetchSearchResults, searchInputRef}) => {
    return (
      <>
        <input
          onChange={fetchSearchResults}
          onFocus={fetchSearchResults}
          type="search"
          name="q"
          placeholder="Search"
          ref={searchInputRef}
        />
        <button type="submit">
          <IconSearch />
        </button>
      </>
    )
  }}
</SearchForm>
**/
