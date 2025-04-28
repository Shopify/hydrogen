import type {
  CustomerFragment,
  SubscriptionBillingPolicyFragment,
} from 'customer-accountapi.generated';
import {
  data,
  LinksFunction,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  type MetaFunction,
} from '@remix-run/react';
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
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();

  const {subscriptions} = useLoaderData<typeof loader>();

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
                    <Form key={subscription.id} method="DELETE">
                      <input
                        type="hidden"
                        id="subId"
                        name="subId"
                        value={subscription.id}
                      />
                      <button type="submit" disabled={state !== 'idle'}>
                        {state !== 'idle' ? 'Canceling' : 'Cancel subscription'}
                      </button>
                    </Form>
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
