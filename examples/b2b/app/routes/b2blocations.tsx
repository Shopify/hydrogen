import {defer} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {B2BLocationSelector} from '../components/B2BLocationSelector';
import {CUSTOMER_LOCATIONS_QUERY} from '~/graphql/customer-account/CustomerLocationsQuery';

export async function loader({context}) {
  const {customerAccount} = context;

  const isLoggedIn = await customerAccount.isLoggedIn();

  let companyLocationId = null;
  let company = null;

  if (isLoggedIn) {
    companyLocationId = (await customerAccount.UNSTABLE_getBuyer())
      ?.companyLocationId;

    const customer = await customerAccount.query(CUSTOMER_LOCATIONS_QUERY);
    company =
      customer?.data?.customer?.companyContacts?.edges?.[0]?.node?.company ||
      null;
  }
  if (!companyLocationId && company?.locations?.edges?.length === 1) {
    companyLocationId = company.locations.edges[0].node.id;

    customerAccount.UNSTABLE_setBuyer({
      companyLocationId,
    });
  }
  return defer(
    {company, companyLocationId},
    {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}

export default function CartRoute() {
  const {company} = useLoaderData<typeof loader>();

  return <B2BLocationSelector company={company} />;
}
