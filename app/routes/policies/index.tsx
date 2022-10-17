import type {MetaFunction, SerializeFrom} from '@remix-run/cloudflare';
import {json} from '@remix-run/cloudflare';
import {Link, useLoaderData} from '@remix-run/react';

import {getPolicies} from '~/data';
import {PageHeader, Section, Heading} from '~/components';

export async function loader() {
  const policies = await getPolicies();

  return json(
    {policies},
    {
      headers: {
        // TODO cacheLong()
      },
    },
  );
}

export const meta: MetaFunction = ({
  data,
}: {
  data: SerializeFrom<typeof loader> | undefined;
}) => {
  return {
    title: 'Policies',
    description: 'Policies',
  };
};

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading="Policies" />
      <Section padding="x" className="mb-24">
        {policies.map((policy) => {
          return (
            policy && (
              <Heading className="font-normal text-heading" key={policy.id}>
                <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
              </Heading>
            )
          );
        })}
      </Section>
    </>
  );
}
