import {NavLink} from '@remix-run/react';
import {useMemo} from 'react';
import {useMatches} from '@remix-run/react';
import type {Customer as CustomerType} from '@shopify/hydrogen/storefront-api-types';

interface LayoutProps {
  children?: React.ReactNode;
  title?: string;
  description?: string | null;
}

export function Layout({children, title, description}: LayoutProps) {
  const customer = useCustomer();
  return (
    <div className="Layout">
      {!customer && (
        <nav>
          <NavLink
            style={({isActive}) => {
              return {
                fontWeight: isActive ? 'bold' : '',
              };
            }}
            to="/account/login"
          >
            Login
          </NavLink>{' '}
          <NavLink
            style={({isActive}) => {
              return {
                fontWeight: isActive ? 'bold' : '',
              };
            }}
            to="/account/register"
          >
            Register
          </NavLink>
        </nav>
      )}
      {customer && (
        <form method="post" action="/account/logout">
          <button className="unstyled" type="submit">
            Log out
          </button>
        </form>
      )}

      <h1>{title} (skeleton)</h1>
      <h2>{description}</h2>

      {children}
    </div>
  );
}

export function useMatchesData(id: string) {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id],
  );

  return route?.data;
}

export function useCustomer(): CustomerType | undefined {
  const data = useMatchesData('root');

  return data?.customer;
}
