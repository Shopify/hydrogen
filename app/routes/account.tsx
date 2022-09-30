import { type LoaderArgs, redirect, json } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { flattenConnection } from "@shopify/hydrogen-ui-alpha";
import type {
  Customer,
  Order,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import {
  Button,
  OrderCard,
  PageHeader,
  Text,
  AccountDetails,
} from "~/components";
import { getCustomer } from "~/data";
import { getSession } from "~/lib/session.server";

export async function loader({ request, context }: LoaderArgs) {
  const session = await getSession(request, context);
  const customerAccessToken = await session.get("customerAccessToken");

  if (!customerAccessToken) {
    return redirect("/account/login");
  }

  const customer = await getCustomer({ customerAccessToken, request, context });

  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}.`
      : `Welcome to your account.`
    : "Account Details";

  const orders = flattenConnection(customer?.orders) || [];

  return json({
    customer,
    heading,
    orders,
  });
}

export default function Account() {
  const { customer, orders, heading } = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading={heading}>
        <Form method="post" action="/account/logout">
          <button type="submit" className="text-primary/50">
            Sign out
          </button>
        </Form>
      </PageHeader>
      {orders && <AccountOrderHistory orders={orders as Order[]} />}
      <AccountDetails customer={customer as Customer} />
      {/* <AccountAddressBook
        defaultAddress={defaultAddress}
        addresses={addresses}
      /> */}
      {/* {!orders && (
        <>
          <FeaturedCollections
            title="Popular Collections"
            data={featuredCollections}
          />
          <ProductSwimlane data={featuredProducts} />
        </>
      )} */}
    </>
  );
}

function AccountOrderHistory({ orders }: { orders: Order[] }) {
  return (
    <div className="mt-6">
      <div className="grid w-full gap-4 p-4 py-6 md:gap-8 md:p-8 lg:p-12">
        <h2 className="font-bold text-lead">Order History</h2>
        {orders?.length ? <Orders orders={orders} /> : <EmptyOrders />}
      </div>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div>
      <Text className="mb-1" size="fine" width="narrow" as="p">
        You haven&apos;t placed any orders yet.
      </Text>
      <div className="w-48">
        <Button className="text-sm mt-2 w-full" variant="secondary" to={"/"}>
          Start Shopping
        </Button>
      </div>
    </div>
  );
}

function Orders({ orders }: { orders: Order[] }) {
  return (
    <ul className="grid-flow-row grid gap-2 gap-y-6 md:gap-4 lg:gap-6 grid-cols-1 false  sm:grid-cols-3">
      {orders.map((order) => (
        <OrderCard order={order} key={order.id} />
      ))}
    </ul>
  );
}
