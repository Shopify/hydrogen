import {createContext, useContext, useEffect} from 'react';
import {useFetcher} from '@remix-run/react';

const B2BLocationContext = createContext(undefined);

export function B2BLocationProvider({children}) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data || fetcher.state === 'loading') return;

    fetcher.load('/b2blocations');
  }, [fetcher]);

  return (
    <B2BLocationContext.Provider value={fetcher.data}>
      {children}
    </B2BLocationContext.Provider>
  );
}

export function useB2BLocation() {
  return useContext(B2BLocationContext);
}
