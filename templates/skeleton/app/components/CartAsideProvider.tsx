import {createContext, useContext, useState} from 'react';

const CartAsideContext = createContext<{
  showCart: (visible: boolean) => void;
  cartVisible: boolean;
} | null>(null);

export function CartAsideProvider({children}: {children: React.ReactNode}) {
  const [asideCartDisplayed, setAsideCartDisplayed] = useState(false);

  return (
    <CartAsideContext.Provider
      value={{cartVisible: asideCartDisplayed, showCart: setAsideCartDisplayed}}
    >
      {children}
    </CartAsideContext.Provider>
  );
}

export function useCartAside() {
  const context = useContext(CartAsideContext);
  if (context === null)
    throw new Error('useCartAside must be used within a CartAsideProvider');
  return context;
}
