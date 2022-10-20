import React, {
  useContext,
  createContext,
  useState,
  useCallback,
  useMemo,
} from 'react';

interface GlobalStateType {
  cartOpen: boolean;
  menuOpen: boolean;
  toggleCart: () => void;
  toggleMenu: () => void;
}

const initialState: GlobalStateType = {
  cartOpen: false,
  menuOpen: false,
  toggleCart: () => null,
  toggleMenu: () => null,
};

const GlobalContext = createContext(initialState);

export const GlobalProvider = ({children}: {children: React.ReactNode}) => {
  const [cartOpen, setCartOpen] = useState<boolean>(initialState.cartOpen);
  const [menuOpen, setMenuOpen] = useState<boolean>(initialState.menuOpen);

  const toggleCart = useCallback(
    () => setCartOpen((cartOpen) => !cartOpen),
    [],
  );

  const toggleMenu = useCallback(
    () => setMenuOpen((menuOpen) => !menuOpen),
    [],
  );

  const value = useMemo(
    () => ({cartOpen, menuOpen, toggleCart, toggleMenu}),
    [cartOpen, menuOpen, toggleCart, toggleMenu],
  );

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
};

export const useGlobal = () => useContext(GlobalContext);
