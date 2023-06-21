import {Await, useLocation, useMatches} from '@remix-run/react';
import {useWindowScroll} from 'react-use';
import {Suspense, useEffect, useMemo} from 'react';
import clsx from 'clsx';

import {
  Cart,
  CartLoading,
  Drawer,
  Heading,
  IconAccount,
  IconBag,
  IconLogin,
  IconMenu,
  IconSearch,
  Link,
  PredictiveSearchForm,
  PredictiveSearchResults,
  Text,
  useDrawer,
} from '~/components';
import type {LayoutProps} from '~/components/Layout';
import {useIsHomePath} from '~/lib/utils';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import {useCartFetchers} from '~/hooks/useCartFetchers';

type HeaderProps = {
  title: LayoutProps['layout']['shop']['name'];
  menu: LayoutProps['layout']['headerMenu'];
};

export function Header({title, menu}: HeaderProps) {
  const {
    isOpen: serchDrawer,
    openDrawer: openSearch,
    closeDrawer: closeSearch,
  } = useDrawer();

  const {
    isOpen: isCartOpen,
    openDrawer: openCart,
    closeDrawer: closeCart,
  } = useDrawer();

  const {
    isOpen: isMenuOpen,
    openDrawer: openMenu,
    closeDrawer: closeMenu,
  } = useDrawer();

  const addToCartFetchers = useCartFetchers('ADD_TO_CART');

  // toggle cart drawer when adding to cart
  useEffect(() => {
    if (isCartOpen || !addToCartFetchers.length) return;
    openCart();
  }, [addToCartFetchers, isCartOpen, openCart]);

  return (
    <>
      <SearchDrawer
        closeSearch={closeSearch}
        isOpen={serchDrawer}
        onClose={closeSearch}
      />
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
      {menu && (
        <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} menu={menu} />
      )}
      <DesktopHeader
        closeSearch={closeSearch}
        menu={menu}
        openCart={openCart}
        openSearch={openSearch}
        title={title}
      />
      <MobileHeader
        closeSearch={closeSearch}
        openCart={openCart}
        openMenu={openMenu}
        openSearch={openSearch}
        title={title}
      />
    </>
  );
}

type BaseDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

function CartDrawer({isOpen, onClose}: BaseDrawerProps) {
  const [root] = useMatches();

  return (
    <Drawer open={isOpen} onClose={onClose} heading="Cart" openFrom="right">
      <div className="grid">
        <Suspense fallback={<CartLoading />}>
          <Await resolve={root.data?.cart}>
            {(cart) => <Cart layout="drawer" onClose={onClose} cart={cart} />}
          </Await>
        </Suspense>
      </div>
    </Drawer>
  );
}

type SearchDrawerProps = BaseDrawerProps &
  Pick<CommonHeaderProps, 'closeSearch'>;

function SearchDrawer({isOpen, onClose, closeSearch}: SearchDrawerProps) {
  return (
    <Drawer
      heading={
        <PredictiveSearchForm className="flex items-center gap-2 w-full">
          {({fetchResults, inputRef}) => (
            <>
              <fieldset className="w-full flex items-center gap-2 mr-4">
                <label htmlFor="q" className="sr-only">
                  Search
                </label>
                <input
                  className={clsx(
                    'w-full bg-transparent inline-block text-left transition -mb-px px-0 py-1',
                    'appearance-none border-b border-transparent border-b-gray-400 focus:border-transparent focus:border-b-gray-300',
                    'dark:focus:border-b-primary dark:focus:border-transparent dark:focus:ring-transparent',
                    'placeholder:opacity-20 placeholder:text-inherit',
                  )}
                  name="q"
                  onChange={fetchResults}
                  onFocus={fetchResults}
                  placeholder="Search"
                  ref={inputRef}
                  type="search"
                />
                <button
                  className="flex items-center justify-center w-8 h-8 border-left focus:ring-primary/5 mr-2"
                  type="submit"
                >
                  <IconSearch />
                </button>
              </fieldset>
            </>
          )}
        </PredictiveSearchForm>
      }
      open={isOpen}
      onClose={onClose}
      openFrom="right"
    >
      <PredictiveSearchResults closeSearch={closeSearch} />
    </Drawer>
  );
}

type MenuDrawerProps = BaseDrawerProps & {
  menu: HeaderProps['menu'];
};

export function MenuDrawer({isOpen, onClose, menu}: MenuDrawerProps) {
  return (
    <Drawer open={isOpen} onClose={onClose} openFrom="left" heading="Menu">
      <div className="grid">
        <MenuMobileNav menu={menu} onClose={onClose} />
      </div>
    </Drawer>
  );
}

type MenuMobileNavProps = Pick<BaseDrawerProps, 'onClose'> & {
  menu: HeaderProps['menu'];
};

function MenuMobileNav({menu, onClose}: MenuMobileNavProps) {
  return (
    <nav className="grid gap-4 p-6 sm:gap-6 sm:px-12 sm:py-8">
      {/* Top level menu items */}
      {(menu?.items || []).map((item) => (
        <span key={item.id} className="block">
          <Link
            to={item.to}
            target={item.target}
            onClick={onClose}
            className={({isActive}) =>
              isActive ? 'pb-1 border-b -mb-px' : 'pb-1'
            }
          >
            <Text as="span" size="copy">
              {item.title}
            </Text>
          </Link>
        </span>
      ))}
    </nav>
  );
}

export type CommonHeaderProps = {
  closeSearch: () => void;
  openCart: () => void;
  openSearch: () => void;
};

type MobileHeaderProps = Pick<HeaderProps, 'title'> &
  CommonHeaderProps & {
    openMenu: () => void;
  };

function MobileHeader({
  title,
  openCart,
  openMenu,
  openSearch,
}: MobileHeaderProps) {
  const isHome = useIsHomePath();
  return (
    <header
      role="banner"
      className={`${
        isHome
          ? 'bg-primary/80 dark:bg-contrast/60 text-contrast dark:text-primary shadow-darkHeader'
          : 'bg-contrast/80 text-primary'
      } flex lg:hidden items-center h-nav sticky backdrop-blur-lg z-40 top-0 justify-between w-full leading-none gap-4 px-4 md:px-8`}
    >
      <div className="flex items-center justify-start w-full gap-4">
        <button
          onClick={openMenu}
          className="relative flex items-center justify-center w-8 h-8"
        >
          <IconMenu />
        </button>
        <SearchToggle openSearch={openSearch} />
      </div>

      <Link
        className="flex items-center self-stretch leading-[3rem] md:leading-[4rem] justify-center flex-grow w-full h-full"
        to="/"
      >
        <Heading
          className="font-bold text-center leading-none"
          as={isHome ? 'h1' : 'h2'}
        >
          {title}
        </Heading>
      </Link>

      <div className="flex items-center justify-end w-full gap-4">
        <AccountLink className="relative flex items-center justify-center w-8 h-8" />
        <CartToggle openCart={openCart} />
      </div>
    </header>
  );
}

type DesktopHeaderProps = HeaderProps & CommonHeaderProps;

function DesktopHeader({
  openCart,
  openSearch,
  title,
  menu,
}: DesktopHeaderProps) {
  const isHome = useIsHomePath();
  const {y} = useWindowScroll();

  return (
    <header
      role="banner"
      className={`${
        isHome
          ? 'bg-primary/80 dark:bg-contrast/60 text-contrast dark:text-primary shadow-darkHeader'
          : 'bg-contrast/80 text-primary'
      } ${
        !isHome && y > 50 && ' shadow-lightHeader'
      } hidden h-nav lg:flex items-center sticky transition duration-300 backdrop-blur-lg z-40 top-0 justify-between w-full leading-none gap-8 px-12 py-8`}
    >
      <div className="flex gap-12">
        <Link className="font-bold" to="/" prefetch="intent">
          {title}
        </Link>
        <nav className="flex gap-8">
          {/* Top level menu items */}
          {(menu?.items || []).map((item) => (
            <Link
              key={item.id}
              to={item.to}
              target={item.target}
              prefetch="intent"
              className={({isActive}) =>
                isActive ? 'pb-1 border-b -mb-px' : 'pb-1'
              }
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <SearchToggle openSearch={openSearch} />
        <AccountLink className="relative flex items-center justify-center w-8 h-8 focus:ring-primary/5" />
        <CartToggle openCart={openCart} />
      </div>
    </header>
  );
}

function SearchToggle({openSearch}: Pick<CommonHeaderProps, 'openSearch'>) {
  const {pathname} = useLocation();
  const isSearchPage = Boolean(pathname?.includes('/search'));

  useEffect(() => {
    if (isSearchPage) return;

    // If cmd+k or cmd+f is pressed, open the search drawer
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey && event.key === 'k') ||
        (event.metaKey && event.key === 'f')
      ) {
        event.preventDefault();
        openSearch();
        const searchInput: HTMLInputElement | null = document.querySelector(
          'input[type="search"]',
        );
        searchInput?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openSearch, isSearchPage]);

  return (
    <div
      className={clsx(
        'flex items-center justify-center',
        isSearchPage && 'hidden',
        'hover:cursor-pointer',
      )}
    >
      <button onClick={openSearch} className="w-8 h-8 focus:ring-primary/5">
        <IconSearch />
      </button>
    </div>
  );
}

function AccountLink({className}: {className?: string}) {
  const [root] = useMatches();
  const isLoggedIn = root.data?.isLoggedIn;
  return isLoggedIn ? (
    <Link to="/account" className={className}>
      <IconAccount />
    </Link>
  ) : (
    <Link to="/account/login" className={className}>
      <IconLogin />
    </Link>
  );
}

function CartToggle({openCart}: Pick<CommonHeaderProps, 'openCart'>) {
  const isHome = useIsHomePath();
  const [root] = useMatches();

  return (
    <Suspense fallback={<Badge count={0} dark={isHome} openCart={openCart} />}>
      <Await resolve={root.data?.cart}>
        {(cart) => (
          <Badge
            dark={isHome}
            openCart={openCart}
            count={cart?.totalQuantity || 0}
          />
        )}
      </Await>
    </Suspense>
  );
}

type BadgeProps = Pick<CommonHeaderProps, 'openCart'> & {
  dark: boolean;
  count: number;
};

function Badge({openCart, dark, count}: BadgeProps) {
  const isHydrated = useIsHydrated();

  const buttonClass =
    'relative flex items-center justify-center w-8 h-8 focus:ring-primary/5';

  const counterClass = clsx(
    dark
      ? 'text-primary bg-contrast dark:text-contrast dark:bg-primary'
      : 'text-contrast bg-primary',
    'absolute bottom-1 right-1 text-[0.625rem] font-medium subpixel-antialiased h-3 min-w-[0.75rem] flex items-center justify-center leading-none text-center rounded-full w-auto px-[0.125rem] pb-px',
  );

  const BadgeCounter = useMemo(
    () => (
      <>
        <IconBag />
        <div className={counterClass}>
          <span>{count || 0}</span>
        </div>
      </>
    ),
    [count, counterClass],
  );

  return isHydrated ? (
    <button onClick={openCart} className={buttonClass}>
      {BadgeCounter}
    </button>
  ) : (
    <Link to="/cart" className={buttonClass}>
      {BadgeCounter}
    </Link>
  );
}
