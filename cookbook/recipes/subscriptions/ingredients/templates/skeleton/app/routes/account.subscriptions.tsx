import type {SubscriptionBillingPolicyFragment} from 'customer-accountapi.generated';
import {
  data,
  LinksFunction,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {
  useActionData,
  useFetcher,
  useLoaderData,
  type MetaFunction,
} from 'react-router';
import {SUBSCRIPTIONS_CONTRACTS_QUERY} from '../graphql/customer-account/CustomerSubscriptionsQuery';
import {SUBSCRIPTION_CANCEL_MUTATION} from '../graphql/customer-account/CustomerSubscriptionsMutations';

import accountSubscriptionsStyle from '~/styles/account-subscriptions.css?url';

export type ActionResponse = {
  error: string | null;
};

export const meta: MetaFunction = () => {
  return [{title: 'Subscriptions'}];
};

export const links: LinksFunction = () => [
  {rel: 'stylesheet', href: accountSubscriptionsStyle},
];

export async function loader({context}: LoaderFunctionArgs) {
  await context.customerAccount.handleAuthStatus();

  const {data: subscriptions} = await context.customerAccount.query(
    SUBSCRIPTIONS_CONTRACTS_QUERY,
  );

  return {subscriptions};
}

export async function action({request, context}: ActionFunctionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'DELETE') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const subId = form.get('subId');

    if (!subId) {
      throw new Error('Subscription ID is required');
    }

    await customerAccount.mutate(SUBSCRIPTION_CANCEL_MUTATION, {
      variables: {
        subscriptionContractId: subId.toString(),
      },
    });

    return {
      error: null,
    };
  } catch (error: any) {
    return data(
      {
        error: error.message,
      },
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const action = useActionData<ActionResponse>();

  const {subscriptions} = useLoaderData<typeof loader>();

  const fetcher = useFetcher();

  return (
    <div className="account-profile">
      <h2>My subscriptions</h2>
      {action?.error ? (
        <p>
          <mark>
            <small>{action.error}</small>
          </mark>
        </p>
      ) : null}
      <div className="account-subscriptions">
        {subscriptions?.customer?.subscriptionContracts.nodes.map(
          (subscription) => {
            const isBeingCancelled =
              fetcher.state !== 'idle' &&
              fetcher.formData?.get('subId') === subscription.id;
            return (
              <div key={subscription.id} className="subscription-row">
                <div className="subscription-row-content">
                  <div>
                    {subscription.lines.nodes.map((line) => (
                      <div key={line.id}>{line.name}</div>
                    ))}
                  </div>
                  <div>
                    Every{' '}
                    <SubscriptionInterval
                      billingPolicy={subscription.billingPolicy}
                    />
                  </div>
                </div>
                <div className="subscription-row-actions">
                  <div
                    className={
                      subscription.status === 'ACTIVE'
                        ? 'subscription-status-active'
                        : 'subscription-status-inactive'
                    }
                  >
                    {subscription.status}
                  </div>
                  {subscription.status === 'ACTIVE' && (
                    <fetcher.Form key={subscription.id} method="DELETE">
                      <input
                        type="hidden"
                        id="subId"
                        name="subId"
                        value={subscription.id}
                      />
                      <button type="submit" disabled={isBeingCancelled}>
                        {isBeingCancelled ? 'Canceling' : 'Cancel subscription'}
                      </button>
                    </fetcher.Form>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

function SubscriptionInterval({
  billingPolicy,
}: {
  billingPolicy: SubscriptionBillingPolicyFragment;
}) {
  const count = billingPolicy.intervalCount?.count;
  function getInterval() {
    const suffix = count === 1 ? '' : 's';
    switch (billingPolicy.interval) {
      case 'DAY':
        return 'day' + suffix;
      case 'WEEK':
        return 'week' + suffix;
      case 'MONTH':
        return 'month' + suffix;
      case 'YEAR':
        return 'year' + suffix;
    }
  }
  return (
    <span>
      {count} {getInterval()}
    </span>
  );
}
