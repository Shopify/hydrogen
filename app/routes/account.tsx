import {
  type LoaderArgs,
  redirect,
  defer,
  type MetaFunction,
} from '@hydrogen/remix';
import {Await, Form, Outlet, useLoaderData, useOutlet} from '@remix-run/react';
import {flattenConnection} from '@shopify/hydrogen-ui-alpha';
import type {
  Collection,
  Customer,
  MailingAddress,
  Order,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {Suspense} from 'react';
import {
  Button,
  OrderCard,
  PageHeader,
  Text,
  AccountDetails,
  AccountAddressBook,
  Modal,
  ProductSwimlane,
} from '~/components';
import {FeaturedCollections} from '~/components/FeaturedCollections';
import {getCustomer, getFeaturedData} from '~/data';
import {getSession} from '~/lib/session.server';
import type {AccountOutletContext} from './account/edit';

export async function loader({request, context, params}: LoaderArgs) {
  const session = await getSession(request, context);
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  const customer = await getCustomer({
    customerAccessToken,
    params,
    request,
    context,
  });

  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}.`
      : `Welcome to your account.`
    : 'Account Details';

  const orders = flattenConnection(customer?.orders) || [];

  return defer({
    customer,
    heading,
    orders,
    addresses: flattenConnection<MailingAddress>(customer.addresses),
    featuredData: getFeaturedData({params}),
  });
}

export const meta: MetaFunction = () => {
  return {
    title: 'Account Details',
  };
};

export default function Account() {
  const {customer, orders, heading, addresses, featuredData} =
    useLoaderData<typeof loader>();
  const outlet = useOutlet();

  return (
    <>
      {!!outlet && (
        <Modal cancelLink=".">
          <Outlet context={{customer} as AccountOutletContext} />
        </Modal>
      )}
      <PageHeader heading={heading}>
        <Form method="post" action="/account/logout">
          <button type="submit" className="text-primary/50">
            Sign out
          </button>
        </Form>
      </PageHeader>
      {orders && <AccountOrderHistory orders={orders as Order[]} />}
      <AccountDetails customer={customer as Customer} />
      <AccountAddressBook
        addresses={addresses as MailingAddress[]}
        customer={customer as Customer}
      />
      {!orders.length && (
        <Suspense>
          <Await
            resolve={featuredData}
            errorElement="There was a problem loading featured products."
          >
            {(data) => (
              <>
                <FeaturedCollections
                  title="Popular Collections"
                  collections={
                    // @ts-expect-error Something is screwy with defer type inference here :thinking:
                    data.featuredCollections as Collection[]
                  }
                />
                <ProductSwimlane
                  // @ts-expect-error Something is screwy with defer type inference here :thinking:
                  products={data.featuredProducts}
                />
              </>
            )}
          </Await>
        </Suspense>
      )}
    </>
  );
}

function AccountOrderHistory({orders}: {orders: Order[]}) {
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
        <Button className="text-sm mt-2 w-full" variant="secondary" to={'/'}>
          Start Shopping
        </Button>
      </div>
    </div>
  );
}

function Orders({orders}: {orders: Order[]}) {
  return (
    <ul className="grid-flow-row grid gap-2 gap-y-6 md:gap-4 lg:gap-6 grid-cols-1 false  sm:grid-cols-3">
      {orders.map((order) => (
        <OrderCard order={order} key={order.id} />
      ))}
    </ul>
  );
}
