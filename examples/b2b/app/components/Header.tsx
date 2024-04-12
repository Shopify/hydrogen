import {Await, useLocation, NavLink} from '@remix-run/react';
import {CartForm} from '@shopify/hydrogen';
import {useState, Suspense} from 'react';
import type {HeaderQuery} from 'storefrontapi.generated';
import type {LayoutProps} from './Layout';
import {
  type CustomerCompanyLocation,
  type CustomerCompanyLocationConnection,
  useRootLoaderData
} from '~/root';

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
type HeaderProps = Pick<
  LayoutProps,
  'header' | 'cart' | 'isLoggedIn' | 'company' | 'companyLocationId'
>;
/**********   EXAMPLE UPDATE END   ************/
/***********************************************/

type Viewport = 'desktop' | 'mobile';

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
export function Header({
  header,
  isLoggedIn,
  cart,
  company,
  companyLocationId,
}: HeaderProps) {
  /**********   EXAMPLE UPDATE END   ************/
  /***********************************************/
  const {shop, menu} = header;
  return (
    <header className="header">
      <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
        <strong>{shop.name}</strong>
      </NavLink>
      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
      />
      {/***********************************************/
      /**********  EXAMPLE UPDATE STARTS  ************/}
      <HeaderCtas
        isLoggedIn={isLoggedIn}
        cart={cart}
        company={company}
        companyLocationId={companyLocationId}
      />
      {/**********   EXAMPLE UPDATE END   ************/
      /***********************************************/}
    </header>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
  viewport: Viewport;
}) {
  const {publicStoreDomain} = useRootLoaderData();
  const className = `header-menu-${viewport}`;

  function closeAside(event: React.MouseEvent<HTMLAnchorElement>) {
    if (viewport === 'mobile') {
      event.preventDefault();
      window.location.href = event.currentTarget.href;
    }
  }

  return (
    <nav className={className} role="navigation">
      {viewport === 'mobile' && (
        <NavLink
          end
          onClick={closeAside}
          prefetch="intent"
          style={activeLinkStyle}
          to="/"
        >
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={closeAside}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
function HeaderCtas({
  isLoggedIn,
  cart,
  company,
  companyLocationId,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart' | 'company' | 'companyLocationId'>) {
  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
      <LocationDropdown
        company={company}
        companyLocationId={companyLocationId}
      />
      <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
        {isLoggedIn ? 'Account' : 'Sign in'}
      </NavLink>
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}
/**********   EXAMPLE UPDATE END   ************/
/***********************************************/

function HeaderMenuMobileToggle() {
  return (
    <a className="header-menu-mobile-toggle" href="#mobile-menu-aside">
      <h3>☰</h3>
    </a>
  );
}

function SearchToggle() {
  return <a href="#search-aside">Search</a>;
}

function CartBadge({count}: {count: number}) {
  return <a href="#cart-aside">Cart {count}</a>;
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        {(cart) => {
          if (!cart) return <CartBadge count={0} />;
          return <CartBadge count={cart.totalQuantity || 0} />;
        }}
      </Await>
    </Suspense>
  );
}

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
function LocationDropdown({
  company,
  companyLocationId,
}: Pick<HeaderProps, 'company' | 'companyLocationId'>) {
  const location = useLocation();

  const locations = company?.locations?.edges
    ? company.locations.edges.map((location: CustomerCompanyLocationConnection) => {
        return {...location.node};
      })
    : [];

  const [selectedLocation, setSelectedLocation] = useState(
    companyLocationId ?? undefined,
  );

  const setLocation = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const locationId = event.target.value;
    setSelectedLocation(locationId);
  };

  if (locations.length === 1 || !company) return null;

  return (
    <CartForm route="/cart" action={CartForm.ACTIONS.BuyerIdentityUpdate}>
      {(fetcher) => (
        <>
          <select
            name="companyLocationId"
            onChange={(event) => {
              setLocation(event);
              fetcher.submit(event.currentTarget.form, {
                method: 'POST',
              });
            }}
            value={selectedLocation}
            style={{marginRight: '4px'}}
          >
            {locations.map((location: CustomerCompanyLocation) => {
              return (
                <option
                  defaultValue={selectedLocation}
                  value={location.id}
                  key={location.id}
                >
                  {location.name}
                </option>
              );
            })}
          </select>
          <input
            style={{display: 'none'}}
            type="text"
            id="redirectTo"
            name="redirectTo"
            readOnly
            value={location.pathname}
          />
          <button type="submit">Choose Location</button>
        </>
      )}
    </CartForm>
  );
}
/**********   EXAMPLE UPDATE END   ************/
/***********************************************/

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'black',
  };
}
