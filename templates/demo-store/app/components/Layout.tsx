import {Await, useMatches} from '@remix-run/react';
import {useLocation, useWindowScroll} from 'react-use';
import {Disclosure} from '@headlessui/react';
import {Suspense, useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';

import type {LayoutQuery} from 'storefrontapi.generated';
import {
  Cart,
  CartLoading,
  CountrySelector,
  Drawer,
  Heading,
  IconAccount,
  IconBag,
  IconCaret,
  IconLogin,
  IconMenu,
  IconSearch,
  Link,
  SearchForm,
  SearchResults,
  Section,
  Text,
  useDrawer,
} from '~/components';
import type {ChildEnhancedMenuItem} from '~/lib/utils';
import {type EnhancedMenu, useIsHomePath} from '~/lib/utils';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import {useCartFetchers} from '~/hooks/useCartFetchers';

type LayoutProps = {
  children: React.ReactNode;
  layout: Pick<LayoutQuery, 'shop'> & {
    headerMenu?: EnhancedMenu | null;
    footerMenu?: EnhancedMenu | null;
  };
};

export function Layout({children, layout}: LayoutProps) {
  const {headerMenu, footerMenu} = layout;
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <div className="">
          <a href="#mainContent" className="sr-only">
            Skip to content
          </a>
        </div>
        {headerMenu && <Header title={layout.shop.name} menu={headerMenu} />}
        <main role="main" id="mainContent" className="flex-grow">
          {children}
        </main>
      </div>
      {footerMenu && <Footer menu={footerMenu} />}
    </>
  );
}

type HeaderProps = {
  title: LayoutProps['layout']['shop']['name'];
  menu: LayoutProps['layout']['headerMenu'];
};

function Header({title, menu}: HeaderProps) {
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
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
      <SearchDrawer
        closeSearch={closeSearch}
        isOpen={serchDrawer}
        onClose={closeSearch}
      />
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
  const isHome = useIsHomePath();
  return (
    <Drawer
      heading={
        <SearchForm className="flex items-center gap-2 w-full">
          {({fetchResults, inputRef}) => (
            <>
              <fieldset className="w-full border flex items-center gap-2 mr-4">
                <label htmlFor="q" className="sr-only">
                  Search
                </label>
                <input
                  className={clsx(
                    'w-full bg-transparent inline-block text-left transition border-transparent -mb-px appearance-none py-1 focus:ring-transparent placeholder:opacity-20 placeholder:text-inherit',
                    isHome
                      ? 'focus:border-contrast/20 dark:focus:border-primary/20'
                      : 'focus:border-primary/20',
                  )}
                  name="q"
                  onChange={fetchResults}
                  onFocus={fetchResults}
                  placeholder="Search"
                  ref={inputRef}
                  type="search"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center w-8 h-8 border-left focus:ring-primary/5 mr-2"
                >
                  <IconSearch />
                </button>
              </fieldset>
            </>
          )}
        </SearchForm>
      }
      open={isOpen}
      onClose={onClose}
      openFrom="right"
    >
      <SearchResults closeSearch={closeSearch} />
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
        <SearchIcon openSearch={openSearch} />
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
        <CartCount openCart={openCart} />
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
        <SearchIcon openSearch={openSearch} />
        <AccountLink className="relative flex items-center justify-center w-8 h-8 focus:ring-primary/5" />
        <CartCount openCart={openCart} />
      </div>
    </header>
  );
}

function SearchIcon({openSearch}: Pick<CommonHeaderProps, 'openSearch'>) {
  const {pathname} = useLocation();
  const isSearchPage = pathname?.includes('/search');

  useEffect(() => {
    // If cmd+K is pressed, open the search drawer
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey && event.key === 'k') {
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
  }, [openSearch]);

  return (
    <div
      className={clsx(
        'flex items-center justify-center',
        isSearchPage && 'hidden',
      )}
    >
      <p className="mr-4 hidden md:block">
        <span className="mr-4 text-xs text-gray-500">Search</span>
        <span className="border border-gray-500 rounded p-2 h-4 text-xs text-gray-500">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </p>
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

function CartCount({openCart}: Pick<CommonHeaderProps, 'openCart'>) {
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

  const BadgeCounter = useMemo(
    () => (
      <>
        <IconBag />
        <div
          className={`${
            dark
              ? 'text-primary bg-contrast dark:text-contrast dark:bg-primary'
              : 'text-contrast bg-primary'
          } absolute bottom-1 right-1 text-[0.625rem] font-medium subpixel-antialiased h-3 min-w-[0.75rem] flex items-center justify-center leading-none text-center rounded-full w-auto px-[0.125rem] pb-px`}
        >
          <span>{count || 0}</span>
        </div>
      </>
    ),
    [count, dark],
  );

  return isHydrated ? (
    <button
      onClick={openCart}
      className="relative flex items-center justify-center w-8 h-8 focus:ring-primary/5"
    >
      {BadgeCounter}
    </button>
  ) : (
    <Link
      to="/cart"
      className="relative flex items-center justify-center w-8 h-8 focus:ring-primary/5"
    >
      {BadgeCounter}
    </Link>
  );
}

type FooterProps = {
  menu: LayoutProps['layout']['footerMenu'];
};

function Footer({menu}: FooterProps) {
  const isHome = useIsHomePath();
  const itemsCount = menu
    ? menu?.items?.length + 1 > 4
      ? 4
      : menu?.items?.length + 1
    : [];

  return (
    <Section
      divider={isHome ? 'none' : 'top'}
      as="footer"
      role="contentinfo"
      className={`grid min-h-[25rem] items-start grid-flow-row w-full gap-6 py-8 px-6 md:px-8 lg:px-12 md:gap-8 lg:gap-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-${itemsCount}
        bg-primary dark:bg-contrast dark:text-primary text-contrast overflow-hidden`}
    >
      <FooterMenu menu={menu} />
      <CountrySelector />
      <div
        className={`self-end pt-8 opacity-50 md:col-span-2 lg:col-span-${itemsCount}`}
      >
        &copy; {new Date().getFullYear()} / Shopify, Inc. Hydrogen is an MIT
        Licensed Open Source project.
      </div>
    </Section>
  );
}

function FooterMenu({menu}: FooterProps) {
  const styles = {
    section: 'grid gap-4',
    nav: 'grid gap-2 pb-6',
  };

  return (
    <>
      {(menu?.items || []).map((item) => (
        <section key={item.id} className={styles.section}>
          <Disclosure>
            {({open}) => (
              <>
                <Disclosure.Button className="text-left md:cursor-default">
                  <Heading className="flex justify-between" size="lead" as="h3">
                    {item.title}
                    {item?.items?.length > 0 && (
                      <span className="md:hidden">
                        <IconCaret direction={open ? 'up' : 'down'} />
                      </span>
                    )}
                  </Heading>
                </Disclosure.Button>
                {item?.items?.length > 0 ? (
                  <div
                    className={`${
                      open ? `max-h-48 h-fit` : `max-h-0 md:max-h-fit`
                    } overflow-hidden transition-all duration-300`}
                  >
                    <Suspense data-comment="This suspense fixes a hydration bug in Disclosure.Panel with static prop">
                      <Disclosure.Panel static>
                        <nav className={styles.nav}>
                          {item.items.map((subItem: ChildEnhancedMenuItem) => (
                            <FooterLink key={subItem.id} item={subItem} />
                          ))}
                        </nav>
                      </Disclosure.Panel>
                    </Suspense>
                  </div>
                ) : null}
              </>
            )}
          </Disclosure>
        </section>
      ))}
    </>
  );
}

function FooterLink({item}: {item: ChildEnhancedMenuItem}) {
  if (item.to.startsWith('http')) {
    return (
      <a href={item.to} target={item.target} rel="noopener noreferrer">
        {item.title}
      </a>
    );
  }

  return (
    <Link to={item.to} target={item.target} prefetch="intent">
      {item.title}
    </Link>
  );
}
