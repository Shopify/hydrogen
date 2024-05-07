import {Await} from '@remix-run/react';
import {Suspense, useState} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/Cart';
import {
  PredictiveSearchForm,
  PredictiveSearchResults,
} from '~/components/Search';
import {CartAsideProvider, useCartAside} from './CartAsideProvider';

export type LayoutProps = {
  cart: Promise<CartApiQueryFragment | null>;
  children?: React.ReactNode;
  footer: Promise<FooterQuery>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
};

export function Layout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
}: LayoutProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [mobileMenuExpanded, setMobileMenuExpanded] = useState(false);

  return (
    <CartAsideProvider>
      <CartAside cart={cart} />
      <SearchAside expanded={searchExpanded} setExpanded={setSearchExpanded} />
      <MobileMenuAside
        menu={header?.menu}
        shop={header?.shop}
        expanded={mobileMenuExpanded}
        setExpanded={setMobileMenuExpanded}
      />
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          mobileAside={{
            expanded: mobileMenuExpanded,
            setExpanded: setMobileMenuExpanded,
          }}
          searchAside={{
            expanded: searchExpanded,
            setExpanded: setSearchExpanded,
          }}
        />
      )}
      <main>{children}</main>
      <Suspense>
        <Await resolve={footer}>
          {(footer) => <Footer menu={footer?.menu} shop={header?.shop} />}
        </Await>
      </Suspense>
    </CartAsideProvider>
  );
}

function CartAside({cart}: {cart: LayoutProps['cart']}) {
  const {cartVisible, showCart} = useCartAside();

  return (
    <Aside expanded={cartVisible} setExpanded={showCart} heading="CART">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside({
  expanded,
  setExpanded,
}: {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}) {
  return (
    <Aside expanded={expanded} setExpanded={setExpanded} heading="SEARCH">
      <div className="predictive-search">
        <br />
        <PredictiveSearchForm>
          {({fetchResults, inputRef}) => (
            <div>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search"
                ref={inputRef}
                type="search"
              />
              &nbsp;
              <button
                onClick={() => {
                  window.location.href = inputRef?.current?.value
                    ? `/search?q=${inputRef.current.value}`
                    : `/search`;
                }}
              >
                Search
              </button>
            </div>
          )}
        </PredictiveSearchForm>
        <PredictiveSearchResults />
      </div>
    </Aside>
  );
}

function MobileMenuAside({
  menu,
  shop,
  expanded,
  setExpanded,
}: {
  menu: HeaderQuery['menu'];
  shop: HeaderQuery['shop'];
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}) {
  return (
    menu &&
    shop?.primaryDomain?.url && (
      <Aside expanded={expanded} setExpanded={setExpanded} heading="MENU">
        <HeaderMenu
          menu={menu}
          viewport="mobile"
          primaryDomainUrl={shop.primaryDomain.url}
        />
      </Aside>
    )
  );
}
