import {createContext, type ReactNode} from 'react';

type HydrogenServerContextValue = {
  nonce: string | undefined;
};

type HydrogenServerProviderProps = {
  nonce?: string;
  children: ReactNode;
};

export const HydrogenServerContext = createContext<HydrogenServerContextValue>({
  nonce: undefined,
});

export const HydrogenServerProvider = function ({
  nonce,
  children,
}: HydrogenServerProviderProps) {
  return (
    <HydrogenServerContext.Provider value={{nonce: nonce}}>
      {children}
    </HydrogenServerContext.Provider>
  );
};
