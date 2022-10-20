import {json, type LoaderArgs, type MetaFunction} from '@hydrogen/remix';
import {useLoaderData} from '@remix-run/react';
import {getPolicyContent} from '~/data';

import {PageHeader, Section, Button} from '~/components';
import invariant from 'tiny-invariant';

export async function loader({params}: LoaderArgs) {
  invariant(params.policyHandle, 'Missing policy handle');

  const policy = await getPolicyContent({
    handle: params.policyHandle,
    params,
  });

  return json(
    {policy},
    {
      headers: {
        // TODO cacheLong()
      },
    },
  );
}

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return {
    title: data?.policy?.title ?? 'Policies',
  };
};

export default function Policies() {
  const {policy} = useLoaderData<typeof loader>();

  return (
    <>
      <Section
        padding="all"
        display="flex"
        className="flex-col items-baseline w-full gap-8 md:flex-row"
      >
        <PageHeader
          heading={policy.title}
          className="grid items-start flex-grow gap-4 md:sticky top-36 md:w-5/12"
        >
          <Button
            className="justify-self-start"
            variant="inline"
            to={'/policies'}
          >
            &larr; Back to Policies
          </Button>
        </PageHeader>
        <div className="flex-grow w-full md:w-7/12">
          <div
            dangerouslySetInnerHTML={{__html: policy.body}}
            className="prose dark:prose-invert"
          />
        </div>
      </Section>
    </>
  );
}
