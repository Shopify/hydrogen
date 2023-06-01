import clsx from 'clsx';
import {useRef} from 'react';
import {useParams, useFetcher} from '@remix-run/react';

import {IconSearch, Input} from '~/components';
import {useIsHomePath} from '~/lib/utils';

export function SearchInput({className}: {className?: string}) {
  const isHome = useIsHomePath();
  const params = useParams();
  const fetcher = useFetcher();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  function fetchSearchResults(event: React.ChangeEvent<HTMLInputElement>) {
    const newSearchTerm = event.target.value;
    if (!newSearchTerm) return;
    const searchEndpoint = `${
      params.locale
        ? `/${params.locale}/api/predictive-search`
        : `/api/predictive-search`
    }`;
    fetcher.submit(
      {q: newSearchTerm},
      {method: 'POST', action: searchEndpoint},
    );
  }

  return (
    <fetcher.Form
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
    </fetcher.Form>
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
