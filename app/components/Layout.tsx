import { type EnhancedMenu, type EnhancedMenuItem, isHomePath } from "~/lib/utils";
import {
  Drawer,
  useDrawer,
  Text,
  Input,
  IconAccount,
  IconBag,
  IconSearch,
  Heading,
  IconMenu,
  IconCaret,
  Section,
  CountrySelector,
  CartDetails,
  CartEmpty,
  LinkI18n
} from "~/components";
import { useFetcher } from "@remix-run/react";
import { useWindowScroll } from "react-use";
import { Disclosure } from "@headlessui/react";
import type { LayoutData } from "~/data";
import { getI18nPath } from "./LinkI18n";
import { useEffect } from "react";
import {useCart} from '~/hooks/useCart'


export function Layout({
  children,
  data,
}: {
  children: React.ReactNode;
  data?: {
    layout: LayoutData;
  };
}) {
  const { layout } = data || {};

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <div className="">
          <a href="#mainContent" className="sr-only">
            Skip to content
          </a>
        </div>
        <Header
          title={layout?.shop.name ?? "Hydrogen"}
          menu={layout?.headerMenu}
        />
        <main role="main" id="mainContent" className="flex-grow">
          {children}
        </main>
      </div>
      <Footer
        menu={layout?.footerMenu}
      />
    </>
  );
}

function Header({
  title,
  menu,
}: {
  title: string;
  menu?: EnhancedMenu;
}) {
  const isHome = isHomePath();

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

  return (
    <>
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
      {menu && (
        <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} menu={menu} />
      )}
      <DesktopHeader
        isHome={isHome}
        title={title}
        menu={menu}
        openCart={openCart}
      />
      <MobileHeader
        isHome={isHome}
        title={title}
        openCart={openCart}
        openMenu={openMenu}
      />
    </>
  );
}

function Footer({ menu }: { menu?: EnhancedMenu }) {
  const isHome = isHomePath();
  const itemsCount = menu
    ? menu?.items?.length + 1 > 4
      ? 4
      : menu?.items?.length + 1
    : [];

  return (
    <Section
      divider={isHome ? "none" : "top"}
      as="footer"
      role="contentinfo"
      className={`grid min-h-[25rem] items-start grid-flow-row w-full gap-6 py-8 px-6 md:px-8 lg:px-12
        border-b md:gap-8 lg:gap-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-${itemsCount}
        bg-primary dark:bg-contrast dark:text-primary text-contrast overflow-hidden`}
    >
      <FooterMenu menu={menu} />
      <CountrySelector />
      <div
        className={`self-end pt-8 opacity-50 md:col-span-2 lg:col-span-${itemsCount}`}
      >
        &copy; {new Date().getFullYear()} / Shopify, Inc. Hydrogen is an MIT
        Licensed Open Source project. This website is carbon&nbsp;neutral.
      </div>
    </Section>
  );
}

function CartDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const cart = useCart();
  /**
   * Whenever a component that uses a fetcher is _unmounted_, that fetcher is removed
   * from the internal Remix cache. By defining the fetcher outside of the component,
   * we persist it between mounting and unmounting.
   */
  const topProductsFetcher = useFetcher();

  /**
   * We load the top products, which are only shown as a fallback when the cart as empty.
   * We need to do this here, otherwise we'll incur a network request every time the
   * drawer is opened.
   */
  useEffect(() => {
    isOpen && topProductsFetcher.load("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Drawer open={isOpen} onClose={onClose} heading="Cart" openFrom="right">
      <div className="grid">
        {cart ? (
          <CartDetails
            fetcher={topProductsFetcher}
            layout="drawer"
            onClose={onClose}
            cart={cart}
          />
        ) : (
          <CartEmpty
            fetcher={topProductsFetcher}
            onClose={onClose}
            layout="drawer"
          />
        )}
      </div>
    </Drawer>
  );
}

export function MenuDrawer({
  isOpen,
  onClose,
  menu,
}: {
  isOpen: boolean;
  onClose: () => void;
  menu: EnhancedMenu;
}) {
  return (
    <Drawer open={isOpen} onClose={onClose} openFrom="left" heading="Menu">
      <div className="grid">
        <MenuMobileNav menu={menu} onClose={onClose} />
      </div>
    </Drawer>
  );
}

function MenuMobileNav({
  menu,
  onClose,
}: {
  menu: EnhancedMenu;
  onClose: () => void;
}) {
  return (
    <nav className="grid gap-4 p-6 sm:gap-6 sm:px-12 sm:py-8">
      {/* Top level menu items */}
      {(menu?.items || []).map((item) => (
        <LinkI18n key={item.id} to={item.to} target={item.target} onClick={onClose}>
          <Text as="span" size="copy">
            {item.title}
          </Text>
        </LinkI18n>
      ))}
    </nav>
  );
}

function MobileHeader({
  countryCode,
  title,
  isHome,
  openCart,
  openMenu,
}: {
  countryCode?: string | null;
  title: string;
  isHome: boolean;
  openCart: () => void;
  openMenu: () => void;
}) {
  const { y } = useWindowScroll();

  const styles = {
    button: "relative flex items-center justify-center w-8 h-8",
    container: `${
      isHome
        ? "bg-primary/80 dark:bg-contrast/60 text-contrast dark:text-primary shadow-darkHeader"
        : "bg-contrast/80 text-primary"
    } ${
      y > 50 && !isHome ? "shadow-lightHeader " : ""
    }flex lg:hidden items-center h-nav sticky backdrop-blur-lg z-40 top-0 justify-between w-full leading-none gap-4 px-4 md:px-8`,
  };

  return (
    <header role="banner" className={styles.container}>
      <div className="flex items-center justify-start w-full gap-4">
        <button onClick={openMenu} className={styles.button}>
          <IconMenu />
        </button>
        <form
          action={getI18nPath('/search')}
          className="items-center gap-2 sm:flex"
        >
          <button type="submit" className={styles.button}>
            <IconSearch />
          </button>
          <Input
            className={
              isHome
                ? "focus:border-contrast/20 dark:focus:border-primary/20"
                : "focus:border-primary/20"
            }
            type="search"
            variant="minisearch"
            placeholder="Search"
            name="q"
          />
        </form>
      </div>

      <LinkI18n
        className="flex items-center self-stretch leading-[3rem] md:leading-[4rem] justify-center flex-grow w-full h-full"
        to="/"
      >
        <Heading className="font-bold text-center" as={isHome ? "h1" : "h2"}>
          {title}
        </Heading>
      </LinkI18n>

      <div className="flex items-center justify-end w-full gap-4">
        <LinkI18n to={"/account"} className={styles.button}>
          <IconAccount />
        </LinkI18n>
        <button onClick={openCart} className={styles.button}>
          <IconBag />
          <CartBadge dark={isHome} />
        </button>
      </div>
    </header>
  );
}

function DesktopHeader({
  countryCode,
  isHome,
  menu,
  openCart,
  title,
}: {
  countryCode?: string | null;
  isHome: boolean;
  openCart: () => void;
  menu?: EnhancedMenu;
  title: string;
}) {
  const { y } = useWindowScroll();

  const styles = {
    button:
      "relative flex items-center justify-center w-8 h-8 focus:ring-primary/5",
    container: `${
      isHome
        ? "bg-primary/80 dark:bg-contrast/60 text-contrast dark:text-primary shadow-darkHeader"
        : "bg-contrast/80 text-primary"
    } ${
      y > 50 && !isHome ? "shadow-lightHeader " : ""
    }hidden h-nav lg:flex items-center sticky transition duration-300 backdrop-blur-lg z-40 top-0 justify-between w-full leading-none gap-8 px-12 py-8`,
  };

  return (
    <header role="banner" className={styles.container}>
      <div className="flex gap-12">
        <LinkI18n className={`font-bold`} to="/" prefetch="intent">
          {title}
        </LinkI18n>
        <nav className="flex gap-8">
          {/* Top level menu items */}
          {(menu?.items || []).map((item) => (
            <LinkI18n
              key={item.id}
              to={item.to}
              target={item.target}
              prefetch="intent"
            >
              {item.title}
            </LinkI18n>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <form
          action={getI18nPath('/search')}
          className="flex items-center gap-2"
        >
          <Input
            className={
              isHome
                ? "focus:border-contrast/20 dark:focus:border-primary/20"
                : "focus:border-primary/20"
            }
            type="search"
            variant="minisearch"
            placeholder="Search"
            name="q"
          />
          <button type="submit" className={styles.button}>
            <IconSearch />
          </button>
        </form>
        <LinkI18n to={"/account"} className={styles.button}>
          <IconAccount />
        </LinkI18n>
        <button onClick={openCart} className={styles.button}>
          <IconBag />
          <CartBadge dark={isHome} />
        </button>
      </div>
    </header>
  );
}

function CartBadge({ dark }: { dark: boolean }) {
  const cart = useCart();
  return (
    <div
      className={`${
        dark
          ? "text-primary bg-contrast dark:text-contrast dark:bg-primary"
          : "text-contrast bg-primary"
      } absolute bottom-1 right-1 text-[0.625rem] font-medium subpixel-antialiased h-3 min-w-[0.75rem] flex items-center justify-center leading-none text-center rounded-full w-auto px-[0.125rem] pb-px`}
    >
      <span>{cart?.totalQuantity || ''}</span>
    </div>
  );
}

function FooterMenu({ menu }: { menu?: EnhancedMenu }) {
  const styles = {
    section: "grid gap-4",
    nav: "grid gap-2 pb-6",
  };

  const FooterLink = ({ item }: { item: EnhancedMenuItem }) => {
    if (item.to.startsWith("http")) {
      return (
        <a href={item.to} target={item.target} rel="noopener noreferrer">
          {item.title}
        </a>
      );
    }

    return (
      <LinkI18n to={item.to} target={item.target} prefetch="intent">
        {item.title}
      </LinkI18n>
    );
  };

  return (
    <>
      {(menu?.items || []).map((item: EnhancedMenuItem) => (
        <section key={item.id} className={styles.section}>
          <Disclosure>
            {({ open }) => (
              <>
                <Disclosure.Button className="text-left md:cursor-default">
                  <Heading className="flex justify-between" size="lead" as="h3">
                    {item.title}
                    {item?.items?.length > 0 && (
                      <span className="md:hidden">
                        <IconCaret direction={open ? "up" : "down"} />
                      </span>
                    )}
                  </Heading>
                </Disclosure.Button>
                {item?.items?.length > 0 && (
                  <div
                    className={`${
                      open ? `max-h-48 h-fit` : `max-h-0 md:max-h-fit`
                    } overflow-hidden transition-all duration-300`}
                  >
                    <Disclosure.Panel static>
                      <nav className={styles.nav}>
                        {item.items.map((subItem) => (
                          <FooterLink key={subItem.id} item={subItem} />
                        ))}
                      </nav>
                    </Disclosure.Panel>
                  </div>
                )}
              </>
            )}
          </Disclosure>
        </section>
      ))}{" "}
    </>
  );
}

