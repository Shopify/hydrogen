import {
  Await,
  Form,
  Outlet,
  useLoaderData,
  useMatches,
  useOutlet,
} from '@remix-run/react';
import type {
  Product,
  Collection,
  Customer,
  MailingAddress,
  Order,
} from '@shopify/hydrogen-react/storefront-api-types';
import {Suspense, useEffect} from 'react';
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
import {
  type LoaderArgs,
  type SerializeFrom,
  redirect,
  json,
  defer,
} from '@shopify/hydrogen-remix';
import {flattenConnection} from '@shopify/hydrogen-react';
import {getCustomer} from '~/data';
import {getFeaturedData} from './featured-products';
import type {PartialDeep} from 'type-fest';

interface NotAuthAccountProps {
  customer: null;
  orders: null;
  heading: null;
  addresses: null;
  featuredData: null;
}

interface AuthAccountProps {
  customer: Customer | null;
  orders: Order[] | null;
  heading: string | null;
  addresses: MailingAddress[] | null;
  featuredData: Promise<
    SerializeFrom<{
      featuredCollections: PartialDeep<Collection, {recurseIntoArrays: true}>[];
      featuredProducts: PartialDeep<Product, {recurseIntoArrays: true}>[];
    }>
  >;
}
type AccountProps = NotAuthAccountProps | AuthAccountProps;

export async function loader({request, context, params}: LoaderArgs) {
  const {session} = context;
  const {pathname} = new URL(request.url);
  const lang = params.lang;
  const [auth, event] = await Promise.all([
    session.getAuth(),
    session.getEvent(),
  ]);

  const loginPath = lang ? `${lang}/account/login` : '/account/login';

  const isPublicSubRoute = () =>
    /\/account\/login$/.test(pathname) ||
    /\/account\/register$/.test(pathname) ||
    /\/account\/recover$/.test(pathname) ||
    /\/account\/reset\//.test(pathname) ||
    /\/account\/activate\//.test(pathname);

  if (!auth.isAuthenticated) {
    if (isPublicSubRoute()) {
      return json({
        addresses: null,
        customer: null,
        event: null,
        featuredData: null,
        heading: null,
        isAuthenticated: false,
        orders: null,
      });
    }

    // redirect to login any other un-auth  sub-route
    return redirect(loginPath);
  }

  // is authenticated
  const customer = await getCustomer(context, {
    customerAccessToken: auth.customerAccessToken.accessToken,
    request,
  });

  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}.`
      : `Welcome to your account.`
    : 'Account Details';

  const orders = flattenConnection(customer?.orders) as Order[];

  // reset flashed event is available
  let responseInit = {};
  if (event) {
    responseInit = {
      headers: {
        'Set-Cookie': await session.commit(),
      },
    };
  }

  return defer(
    {
      addresses: flattenConnection(customer.addresses) as MailingAddress[],
      customer,
      event,
      featuredData: getFeaturedData(context.storefront),
      heading,
      isAuthenticated: auth.isAuthenticated,
      orders,
    },
    responseInit,
  );
}

export default function Authenticated() {
  const {isAuthenticated, event, ...data} = useLoaderData<typeof loader>();
  const outlet = useOutlet();
  const matches = useMatches();

  // routes that export handle { renderInModal: true }
  const renderOutletInModal = matches.some((match) => {
    return match?.handle?.renderInModal;
  });

  // capture login and register
  useEffect(() => {
    if (!event) return;
    // @todo
    navigator.sendBeacon('/events', JSON.stringify(event));
  }, [event]);

  // Public routes
  if (!isAuthenticated) {
    return <Outlet />;
  }

  // Authenticated routes
  if (outlet) {
    if (renderOutletInModal) {
      return (
        <>
          <Modal cancelLink="/account">
            <Outlet context={{customer: data.customer} as any} />
          </Modal>
          <Account {...data} />
        </>
      );
    } else {
      return <Outlet context={{customer: data.customer} as any} />;
    }
  }

  return <Account {...data} />;
}

function Account({
  customer,
  orders,
  heading,
  addresses,
  featuredData,
}: AccountProps) {
  return (
    <>
      <PageHeader heading={heading || ''}>
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
      {!orders?.length && (
        <Suspense>
          <Await
            resolve={featuredData}
            errorElement="There was a problem loading featured products."
          >
            {(data) => (
              <>
                {data?.featuredCollections && (
                  <FeaturedCollections
                    title="Popular Collections"
                    collections={data.featuredCollections as Collection[]}
                  />
                )}
                {data?.featuredProducts && (
                  <ProductSwimlane
                    products={data.featuredProducts as Product[]}
                  />
                )}
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
