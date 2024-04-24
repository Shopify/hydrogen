import {createContext, useContext, useEffect, useMemo} from 'react';
import {useFetcher} from '@remix-run/react';
import {CustomerCompany} from '../root';

export type B2BLocationContextValue = {
  company?: CustomerCompany;
  companyLocationId?: string;
};

const defaultB2BLocationContextValue = {
  company: undefined,
  companyLocationId: undefined,
};

const B2BLocationContext = createContext<B2BLocationContextValue>(
  defaultB2BLocationContextValue,
);

export function B2BLocationProvider({children}: {children: React.ReactNode}) {
  const fetcher = useFetcher<B2BLocationContextValue>();

  useEffect(() => {
    if (fetcher.data || fetcher.state === 'loading') return;

    fetcher.load('/b2blocations');
  }, [fetcher]);

  const value = useMemo<B2BLocationContextValue>(() => {
    return fetcher.data || defaultB2BLocationContextValue;
  }, [fetcher]);

  return (
    <B2BLocationContext.Provider value={value}>
      {children}
    </B2BLocationContext.Provider>
  );
}

export function useB2BLocation(): B2BLocationContextValue {
  return useContext(B2BLocationContext);
}
