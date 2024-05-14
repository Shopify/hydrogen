import {createContext, type ReactNode, useContext, useState} from 'react';

type Mode = 'search' | 'cart' | 'mobile' | 'closed';
type AsideContextValue = {
  mode: Mode;
  setMode: (mode: Mode) => void;
};

/**
 * A side bar component with Overlay
 * @example
 * ```jsx
 * <Aside mode="search" heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  mode,
}: {
  children?: React.ReactNode;
  mode: Mode;
  heading: React.ReactNode;
}) {
  const {mode: activeMode, setMode} = useAside();
  const expanded = mode === activeMode;

  return (
    <div
      aria-modal
      className={`overlay ${expanded ? 'expanded' : ''}`}
      role="dialog"
    >
      <button className="close-outside" onClick={() => setMode('closed')} />
      <aside>
        <header>
          <h3>{heading}</h3>
          <button className="close reset" onClick={() => setMode('closed')}>
            &times;
          </button>
        </header>
        <main>{children}</main>
      </aside>
    </div>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

export function AsideProvider({children}: {children: ReactNode}) {
  const [mode, setMode] = useState<Mode>('closed');

  return (
    <AsideContext.Provider
      value={{
        mode,
        setMode,
      }}
    >
      {children}
    </AsideContext.Provider>
  );
}

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}
