import {
  Await,
  Form,
  Outlet,
  useLoaderData,
  useMatches,
  useOutlet,
} from '@remix-run/react';
import {Suspense} from 'react';
import {
  defer,
  redirect,
  type LoaderFunctionArgs,
  type AppLoadContext,
} from '@shopify/remix-oxygen';
import {flattenConnection} from '@shopify/hydrogen';
import type {
  CustomerDetailsFragment,
  OrderCardFragment,
} from 'customer-accountapi.generated';

import {
  getFeaturedData,
  type FeaturedData,
} from './($locale).featured-products';
import {doLogout} from './($locale).account_.logout';

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
import {usePrefixPathWithLocale} from '~/lib/utils';
import {CACHE_NONE, routeHeaders} from '~/data/cache';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

export const headers = routeHeaders;

export async function loader({request, context, params}: LoaderFunctionArgs) {
  const locale = params.locale;

  if (!(await context.customerAccount.isLoggedIn())) {
    const loginUrl =
      (locale ? `/${locale}/account/login` : '/account/login') +
      `?${new URLSearchParams(`redirectBack=${request.url}`).toString()}`;

    return redirect(loginUrl, {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    });
  }

  try {
    const {data, errors} = await context.customerAccount.query(
      CUSTOMER_DETAILS_QUERY,
    );

    /**
     * If the customer failed to load, we assume their access token is invalid.
     */
    if (errors?.length || !data?.customer) {
      throw await doLogout(context);
    }

    const customer = data?.customer;

    const heading = customer
      ? customer.firstName
        ? `Welcome, ${customer.firstName}.`
        : `Welcome to your account.`
      : 'Account Details';

    return defer(
      {
        customer,
        heading,
        featuredDataPromise: getFeaturedData(context.storefront),
      },
      {
        headers: {
          'Cache-Control': CACHE_NONE,
          'Set-Cookie': await context.session.commit(),
        },
      },
    );
  } catch (error) {
    throw new Response(error instanceof Error ? error.message : undefined, {
      status: 404,
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    });
  }
}

export default function Authenticated() {
  const data = useLoaderData<typeof loader>();
  const outlet = useOutlet();
  const matches = useMatches();

  // routes that export handle { renderInModal: true }
  const renderOutletInModal = matches.some((match) => {
    const handle = match?.handle as {renderInModal?: boolean};
    return handle?.renderInModal;
  });

  if (outlet) {
    if (renderOutletInModal) {
      return (
        <>
          <Modal cancelLink="/account">
            <Outlet context={{customer: data.customer}} />
          </Modal>
          <Account {...data} />
        </>
      );
    } else {
      return <Outlet context={{customer: data.customer}} />;
    }
  }

  return <Account {...data} />;
}

interface AccountType {
  customer: CustomerDetailsFragment;
  featuredDataPromise: Promise<FeaturedData>;
  heading: string;
}

function Account({customer, heading, featuredDataPromise}: AccountType) {
  const orders = flattenConnection(customer.orders);
  const addresses = flattenConnection(customer.addresses);

  return (
    <>
      <PageHeader heading={heading}>
        <Form method="post" action={usePrefixPathWithLocale('/account/logout')}>
          <button type="submit" className="text-primary/50">
            Sign out
          </button>
        </Form>
      </PageHeader>
      {orders && <AccountOrderHistory orders={orders} />}
      <AccountDetails customer={customer} />
      <AccountAddressBook addresses={addresses} customer={customer} />
      {!orders.length && (
        <Suspense>
          <Await
            resolve={featuredDataPromise}
            errorElement="There was a problem loading featured products."
          >
            {(data) => (
              <>
                <FeaturedCollections
                  title="Popular Collections"
                  collections={data.featuredCollections}
                />
                <ProductSwimlane products={data.featuredProducts} />
              </>
            )}
          </Await>
        </Suspense>
      )}
    </>
  );
}

type OrderCardsProps = {
  orders: OrderCardFragment[];
};

function AccountOrderHistory({orders}: OrderCardsProps) {
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
        <Button
          className="w-full mt-2 text-sm"
          variant="secondary"
          to={usePrefixPathWithLocale('/')}
        >
          Start Shopping
        </Button>
      </div>
    </div>
  );
}

function Orders({orders}: OrderCardsProps) {
  return (
    <ul className="grid grid-flow-row grid-cols-1 gap-2 gap-y-6 md:gap-4 lg:gap-6 false sm:grid-cols-3">
      {orders.map((order) => (
        <OrderCard order={order} key={order.id} />
      ))}
    </ul>
  );
}
