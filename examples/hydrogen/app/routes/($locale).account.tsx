import { data as remixData, NavLink, Outlet } from "react-router";

import { CUSTOMER_DETAILS_QUERY } from "~/graphql/customer-account/CustomerDetailsQuery";
import { requireCustomerAccessToken } from "~/lib/customer-account";

import type { Route } from "./+types/($locale).account";

export function shouldRevalidate() {
  return true;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { customerAccount } = context;
  const accessToken = await requireCustomerAccessToken(request, customerAccount);
  const { data, errors } = await customerAccount.client.graphql(CUSTOMER_DETAILS_QUERY, {
    accessToken,
  });

  if (errors?.length || !data?.customer) {
    throw new Error("Customer not found");
  }

  return remixData(
    {
      customer: data.customer,
    },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
}

export default function AccountLayout({ loaderData, params }: Route.ComponentProps) {
  const { customer } = loaderData;
  const logoutPath = getLogoutPath(params.locale);

  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}`
      : `Welcome to your account.`
    : "Account Details";

  return (
    <div className="account">
      <h1>{heading}</h1>
      <br />
      <AccountMenu logoutPath={logoutPath} />
      <br />
      <br />
      <Outlet context={{ customer }} />
    </div>
  );
}

function getLogoutPath(locale: string | undefined) {
  const postLogoutPath = locale ? `/${locale}/` : "/";
  return `/account/logout?return_to=${encodeURIComponent(postLogoutPath)}`;
}

function isActiveStyle({ isActive, isPending }: { isActive: boolean; isPending: boolean }) {
  return {
    fontWeight: isActive ? "bold" : undefined,
    color: isPending ? "grey" : "black",
  };
}

function AccountMenu({ logoutPath }: { logoutPath: string }) {
  return (
    <nav role="navigation">
      <NavLink to="orders" style={isActiveStyle}>
        Orders &nbsp;
      </NavLink>
      &nbsp;|&nbsp;
      <NavLink to="profile" style={isActiveStyle}>
        &nbsp; Profile &nbsp;
      </NavLink>
      &nbsp;|&nbsp;
      <NavLink to="addresses" style={isActiveStyle}>
        &nbsp; Addresses &nbsp;
      </NavLink>
      &nbsp;|&nbsp;
      <Logout logoutPath={logoutPath} />
    </nav>
  );
}

function Logout({ logoutPath }: { logoutPath: string }) {
  return (
    <form className="account-logout" method="POST" action={logoutPath}>
      &nbsp;<button type="submit">Sign out</button>
    </form>
  );
}
